import { connectDB } from "@/src/app/lib/MongoDB";
import Turnos from "../../models/Turnos/index";
import Clientes from "../../models/Clientes";
import Historial from "../../models/Historial"; // 📜 Importamos tu nuevo modelo de Historial
import { NextResponse } from "next/server";

// 🔄 MIGRACIÓN AUTOMÁTICA: Pasa los turnos viejos al historial y los limpia de la agenda
async function autoFinalizarTurnos() {
  try {
    await connectDB();

    const ahora = new Date();
    // Traemos todos los turnos agendados (ya no filtramos por Estado)
    const activos = await Turnos.find();

    for (const turno of activos) {
      // Desarmamos el string del Día (YYYY-MM-DD) y la Hora (HH:MM)
      const [year, month, day] = turno.Turno.Dia.split("-");
      const [hour, minute] = turno.Turno.Hora.split(":");

      // Creamos el objeto Date nativo del turno para comparar tiempos
      const fechaTurno = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute)
      );

      // ⏳ Si la hora del turno ya quedó en el pasado...
      if (fechaTurno < ahora) {
        
        // A) Lo respaldamos en la tabla de historial con estado "Success"
        await Historial.create({
          Nombre_Cliente: turno.Nombre_Cliente,
          Telefono_Cliente: turno.Telefono_Cliente,
          Turno: {
            Dia: turno.Turno.Dia,
            Hora: turno.Turno.Hora
          },
          Estado: "Success" 
        });

        // B) Lo eliminamos definitivamente de la agenda activa
        await Turnos.findByIdAndDelete(turno._id);
        
        console.log(`[Auto-Cierre] El turno de ${turno.Nombre_Cliente} expiró y se movió al historial.`);
      }
    }
  } catch (error) {
    console.error("Error en el proceso de auto-finalización:", error);
  }
}

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const telefono = searchParams.get("telefono");
    const dia = searchParams.get("dia");

    // ⚡ Ejecuta la migración y limpieza automática antes de consultar o listar
    await autoFinalizarTurnos(); 

    // 📋 BUSCAR TURNO ACTIVO POR TELÉFONO (Sin mención a Estado)
    if (telefono) {
      const telefonoNum = Number(telefono);

      const turno = await Turnos.findOne({
        Telefono_Cliente: telefonoNum,
      }).lean();

      if (!turno) {
        return NextResponse.json(
          { error: "No tenés turnos pendientes." },
          { status: 404 }
        );
      }

      return NextResponse.json(turno);
    }

    // 📅 BUSCAR TURNOS ACTIVOS POR DÍA (Sin mención a Estado)
    if (dia) {
      const turnos = await Turnos.find({
        "Turno.Dia": dia,
      }).lean();

      return NextResponse.json(turnos);
    }

    // 📋 LISTAR TODOS LOS TURNOS ACTIVOS
    const turnos = await Turnos.find()
      .sort({
        "Turno.Dia": -1,
        "Turno.Hora": -1,
      })
      .lean();

    return NextResponse.json(turnos);

  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();
    const { Nombre_Cliente, Telefono_Cliente } = body;

    const nombreSeccionado = Nombre_Cliente.trim().split(" ");
    const nombre = nombreSeccionado[0];
    const apellido = nombreSeccionado.slice(1).join(" ") || "—";

    // 1. CONTROL AUTOMÁTICO DE CLIENTES
    await Clientes.findOneAndUpdate(
      { telefono: String(Telefono_Cliente).trim() },
      { 
        $setOnInsert: { 
          nombre: nombre,
          apellido: apellido
        } 
      },
      { new: true, upsert: true }
    );

    // 2. GUARDAR EL TURNO (Tu front ya no necesita mandar un "Estado", va directo)
    const nuevoTurno = await Turnos.create(body);

    return NextResponse.json(nuevoTurno);
  } catch (e: any) {
    console.error("Error al automatizar cliente/turno:", e);
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "ID requerido" },
        { status: 400 }
      );
    }

    // Modificación general de datos del turno activo (por ejemplo, cambio de día u hora)
    const actualizado = await Turnos.findByIdAndUpdate(
      id,
      { $set: body },
      { returnDocument: "after" }
    );

    return NextResponse.json(actualizado);

  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}

// 🗑️ ACCIONES MANUALES DESDE EL PANEL (Borrar / Finalizar con un click)
export async function DELETE(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const accion = searchParams.get("accion"); // "?accion=Success" o si no se pasa, asume "Cancelled"

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    // Buscamos el turno antes de borrarlo de la agenda para copiar sus datos
    const turnoABorrar = await Turnos.findById(id);

    if (turnoABorrar) {
      // Si mandás ?accion=Success se guarda como completado, si no, va como Cancelled (Eliminado)
      const estadoFinal = accion === "Success" ? "Success" : "Cancelled";

      // 🔄 Pasamos los datos a la colección de Historial
      await Historial.create({
        Nombre_Cliente: turnoABorrar.Nombre_Cliente,
        Telefono_Cliente: turnoABorrar.Telefono_Cliente,
        Turno: {
          Dia: turnoABorrar.Turno.Dia,
          Hora: turnoABorrar.Turno.Hora
        },
        Estado: estadoFinal
      });

      // Lo removemos de la tabla de turnos activos
      await Turnos.findByIdAndDelete(id);
      
      return NextResponse.json({ message: "Turno procesado e historizado" });
    }

    return NextResponse.json({ error: "El turno no existe" }, { status: 404 });

  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}