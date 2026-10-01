import { connectDB } from "@/src/app/lib/MongoDB";
import Turnos from "../../models/Turnos";
import Clientes from "../../models/Clientes";
import Historial from "../../models/Historial";
import { NextResponse } from "next/server";
import { esAdmin } from "../../lib/auth";
import { buscarServicio, listarServicios } from "../../lib/catalogo";
import { completarBloques, ocupadosDelDia } from "../../lib/agenda";
import { SERVICIO_SIN_DATO, ServicioTurno } from "../../lib/servicios";
import {
  HORAS_ANTICIPACION,
  ahoraEnCordoba,
  bloquesDe,
  compararTurnos,
  diaSemanaDe,
  horariosDelDia,
  instanteTurno,
} from "../../lib/horarios";

export const dynamic = "force-dynamic";

type TurnoDoc = {
  _id: { toString(): string };
  Nombre_Cliente: string;
  Telefono_Cliente: number;
  Turno: { Dia: string; Hora: string };
  Servicio?: ServicioTurno;
  Origen?: "web" | "panel";
};

const error = (mensaje: string, status: number) => NextResponse.json({ error: mensaje }, { status });

const DIA_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[a-f0-9]{24}$/i;
const soloDigitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");

const aHistorial = (t: TurnoDoc, Estado: "Success" | "Cancelled") => ({
  Nombre_Cliente: t.Nombre_Cliente,
  Telefono_Cliente: t.Telefono_Cliente,
  Turno: { Dia: t.Turno.Dia, Hora: t.Turno.Hora },
  Servicio: t.Servicio ?? SERVICIO_SIN_DATO,
  Origen: t.Origen,
  Estado,
});

// Pasa al historial los turnos que ya ocurrieron. Una consulta para buscar y dos para mover,
// en vez de una por turno; y solo mira hasta hoy, que es donde puede haber vencidos.
async function autoFinalizarTurnos() {
  const { dia: hoy } = ahoraEnCordoba();
  const candidatos = await Turnos.find({ "Turno.Dia": { $lte: hoy } }).lean<TurnoDoc[]>();
  const ahora = Date.now();
  const vencidos = candidatos.filter((t) => instanteTurno(t.Turno.Dia, t.Turno.Hora).getTime() < ahora);
  if (!vencidos.length) return;

  await Historial.insertMany(vencidos.map((t) => aHistorial(t, "Success")));
  await Turnos.deleteMany({ _id: { $in: vencidos.map((t) => t._id) } });
}

// ¿El servicio entra ese día a esa hora y está en el futuro? Devuelve el motivo si no.
function validarHorario(dia: unknown, hora: unknown, duracion: number): string | null {
  if (typeof dia !== "string" || !DIA_RE.test(dia)) return "La fecha no es válida.";
  if (typeof hora !== "string") return "El horario no es válido.";
  const delDia = horariosDelDia(diaSemanaDe(dia));
  if (!delDia.includes(hora)) return "Ese horario no está disponible ese día.";
  if (!bloquesDe(hora, duracion).every((b) => delDia.includes(b))) {
    return "El servicio no termina antes del cierre. Elegí un horario más temprano.";
  }
  if (instanteTurno(dia, hora).getTime() <= Date.now()) return "Ese horario ya pasó.";
  return null;
}

// Chequeo previo contra turnos y bloqueos (el índice único es el que cierra la carrera)
async function chocaCon(dia: string, bloques: string[], excluir?: string) {
  const ocupados = await ocupadosDelDia(dia, excluir);
  return bloques.some((b) => ocupados.includes(b));
}

const faltanMenosDe = (t: TurnoDoc, horas: number) =>
  instanteTurno(t.Turno.Dia, t.Turno.Hora).getTime() - Date.now() < horas * 3600 * 1000;

const esDuplicado = (e: unknown) => (e as { code?: number })?.code === 11000;

export async function GET(request: Request) {
  try {
    await connectDB();
    await autoFinalizarTurnos();

    const { searchParams } = new URL(request.url);
    const telefono = soloDigitos(searchParams.get("telefono"));
    const dia = searchParams.get("dia");

    // Turno de un cliente, por su teléfono (público: es como el cliente consulta su reserva)
    if (searchParams.has("telefono")) {
      if (telefono.length < 8) return error("Ingresá un teléfono válido.", 400);
      const turno = await Turnos.findOne(
        { Telefono_Cliente: Number(telefono) },
        { Nombre_Cliente: 1, Telefono_Cliente: 1, Turno: 1, Servicio: 1 },
      ).lean<TurnoDoc>();
      if (!turno) return error("No tenés turnos pendientes.", 404);
      return NextResponse.json(turno);
    }

    // Medias horas ocupadas de un día (público). Solo las horas: nada de nombres ni teléfonos.
    if (dia) {
      if (!DIA_RE.test(dia)) return error("La fecha no es válida.", 400);
      await completarBloques();
      const excluir = searchParams.get("excluir");
      const ocupados = await ocupadosDelDia(dia, excluir && ID_RE.test(excluir) ? excluir : undefined);
      return NextResponse.json(ocupados.map((Hora) => ({ Turno: { Hora } })));
    }

    // La agenda completa es solo para el panel
    if (!(await esAdmin())) return error("No autorizado.", 401);
    const turnos = await Turnos.find().lean<TurnoDoc[]>();
    turnos.sort((a, b) => compararTurnos(a.Turno, b.Turno));
    return NextResponse.json(turnos);
  } catch (e) {
    console.error("GET /api/turnos", e);
    return error("No se pudo consultar la agenda.", 500);
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json().catch(() => null);
    const admin = await esAdmin();

    const nombre = String(body?.Nombre_Cliente ?? "").trim().replace(/\s+/g, " ");
    const telefono = soloDigitos(body?.Telefono_Cliente);
    const dia = body?.Turno?.Dia;
    const hora = body?.Turno?.Hora;

    if (nombre.length < 2 || nombre.length > 80) return error("Ingresá tu nombre y apellido.", 400);
    if (telefono.length < 8 || telefono.length > 15) return error("Ingresá un teléfono válido.", 400);

    // Sin servicio (un formulario viejo en caché) se toma el primero del catálogo
    const servicio = (await buscarServicio(body?.Servicio)) ?? (await listarServicios())[0];
    if (!servicio) return error("No hay servicios disponibles.", 503);

    const problema = validarHorario(dia, hora, servicio.duracion);
    if (problema) return error(problema, 400);

    await autoFinalizarTurnos();
    await completarBloques();

    // Un turno activo por persona (el panel puede cargar más de uno, por ejemplo para un padre y su hijo)
    if (!admin && (await Turnos.exists({ Telefono_Cliente: Number(telefono) }))) {
      return error("Ya tenés un turno agendado con este número. No podés tener dos a la vez.", 409);
    }

    const bloques = bloquesDe(hora, servicio.duracion);
    if (await chocaCon(dia, bloques)) return error("Ese horario ya no está disponible. Elegí otro, por favor.", 409);

    const [primero, ...resto] = nombre.split(" ");
    await Clientes.findOneAndUpdate(
      { telefono },
      { $setOnInsert: { nombre: primero, apellido: resto.join(" ") || "—" } },
      { upsert: true },
    );

    const nuevo = await Turnos.create({
      Nombre_Cliente: nombre,
      Telefono_Cliente: Number(telefono),
      Turno: { Dia: dia, Hora: hora },
      Servicio: { Clave: servicio.clave, Nombre: servicio.nombre, Precio: servicio.precio, Duracion: servicio.duracion },
      Bloques: bloques,
      Origen: admin && body?.Origen === "panel" ? "panel" : "web",
    });

    return NextResponse.json(nuevo, { status: 201 });
  } catch (e) {
    if (esDuplicado(e)) return error("Ese horario se acaba de ocupar. Elegí otro, por favor.", 409);
    console.error("POST /api/turnos", e);
    return error("No se pudo guardar el turno.", 500);
  }
}

// Reprogramar: el panel puede mover cualquiera; el cliente solo el suyo (con su teléfono)
// y con la anticipación mínima.
export async function PATCH(request: Request) {
  try {
    await connectDB();
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !ID_RE.test(id)) return error("ID requerido.", 400);

    const body = await request.json().catch(() => null);
    const dia = body?.Turno?.Dia;
    const hora = body?.Turno?.Hora;

    const turno = await Turnos.findById(id).lean<TurnoDoc>();
    if (!turno) return error("El turno no existe.", 404);

    const admin = await esAdmin();
    if (!admin) {
      const telefono = soloDigitos(body?.Telefono_Cliente);
      if (Number(telefono) !== turno.Telefono_Cliente) return error("No autorizado.", 403);
      if (faltanMenosDe(turno, HORAS_ANTICIPACION)) {
        return error(`Los turnos no se pueden modificar con menos de ${HORAS_ANTICIPACION} horas de anticipación.`, 403);
      }
    }

    const duracion = turno.Servicio?.Duracion ?? 30;
    const problema = validarHorario(dia, hora, duracion);
    if (problema) return error(problema, 400);

    await completarBloques();
    const bloques = bloquesDe(hora, duracion);
    if (await chocaCon(dia, bloques, id)) return error("Ese horario ya está ocupado.", 409);

    // Solo se puede cambiar el día y la hora: nada de campos sueltos
    const actualizado = await Turnos.findByIdAndUpdate(
      id,
      { $set: { "Turno.Dia": dia, "Turno.Hora": hora, Bloques: bloques } },
      { returnDocument: "after", runValidators: true },
    );
    return NextResponse.json(actualizado);
  } catch (e) {
    if (esDuplicado(e)) return error("Ese horario ya está ocupado.", 409);
    console.error("PATCH /api/turnos", e);
    return error("No se pudo modificar el turno.", 500);
  }
}

// Cerrar un turno: el panel lo marca como atendido o cancelado; el cliente solo puede
// cancelar el suyo, con su teléfono y la anticipación mínima. Siempre queda en el historial.
export async function DELETE(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id || !ID_RE.test(id)) return error("ID requerido.", 400);

    const turno = await Turnos.findById(id).lean<TurnoDoc>();
    if (!turno) return error("El turno no existe.", 404);

    const admin = await esAdmin();
    if (!admin) {
      const telefono = soloDigitos(searchParams.get("telefono"));
      if (Number(telefono) !== turno.Telefono_Cliente) return error("No autorizado.", 403);
      if (faltanMenosDe(turno, HORAS_ANTICIPACION)) {
        return error(`Los turnos no se pueden cancelar con menos de ${HORAS_ANTICIPACION} horas de anticipación.`, 403);
      }
    }

    const estado = admin && searchParams.get("accion") === "Success" ? "Success" : "Cancelled";

    await Historial.create(aHistorial(turno, estado));
    await Turnos.findByIdAndDelete(id);

    return NextResponse.json({ message: "Turno procesado e historizado", estado });
  } catch (e) {
    console.error("DELETE /api/turnos", e);
    return error("No se pudo procesar el turno.", 500);
  }
}
