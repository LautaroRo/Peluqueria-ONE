import { connectDB } from "@/src/app/lib/MongoDB";
import Turnos from "../../models/Turnos/index"; // Asegurate de apuntar al archivo correcto

export async function POST(req: Request) {
    try {
        const body = await req.json();
        await connectDB();


        console.log("Datos recibidos:", body);

        const nuevoTurno = await Turnos.create(body);
        return Response.json(nuevoTurno);
    } catch (error: any) {
        console.error("EL ERROR ES ESTE:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const dia = searchParams.get("dia");

    // Si pasamos un día, filtramos. Si no, traemos todos.
    const filtro = dia ? { "Turno.Dia": dia } : {};
    const turnos = await Turnos.find(filtro);

    return Response.json(turnos);
  } catch (error) {
    return Response.json({ error: "Error al obtener turnos" }, { status: 500 });
  }
}


export async function DELETE(req: Request) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        console.log("Intentando eliminar el turno con ID:", id);

        if (!id) {
            return Response.json({ error: "ID no proporcionado" }, { status: 400 });
        }

        const turnoEliminado = await Turnos.findByIdAndDelete(id);

        if (!turnoEliminado) {
            return Response.json({ error: "Turno no encontrado" }, { status: 404 });
        }

        return Response.json({ message: "Turno eliminado correctamente" });
    } catch (error) {
        console.error("Error en el DELETE:", error);
        return Response.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}