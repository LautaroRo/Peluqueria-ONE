import { NextResponse } from "next/server";
import { connectDB } from "@/src/app/lib/MongoDB";
import Historial from "../../models/Historial";
import Turnos from "../../models/Turnos";
import Clientes from "../../models/Clientes";
import { esAdmin } from "../../lib/auth";
import { ahoraEnCordoba } from "../../lib/horarios";
import {
  RegistroHist,
  RegistroPendiente,
  calcularEstadisticas,
  desdeEstadisticas,
  rangosMes,
} from "../../lib/estadisticas";

export const dynamic = "force-dynamic";

// Todo el tablero en un solo pedido: lee 12 meses de historial (solo los campos que usa)
// y agrupa en el servidor, así el panel no descarga ni calcula de más.
export async function GET() {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    await connectDB();
    const { dia: hoy } = ahoraEnCordoba();
    const { inicioMes, inicioAnt, finAnt } = rangosMes(hoy);
    // createdAt es un instante: los límites van en hora de Córdoba
    const instante = (dia: string, fin = false) => new Date(`${dia}T${fin ? "23:59:59.999" : "00:00:00"}-03:00`);

    const [hist, pendientes, primeras, nuevosAct, nuevosAnt] = await Promise.all([
      Historial.find(
        { "Turno.Dia": { $gte: desdeEstadisticas(hoy) } },
        { Turno: 1, Estado: 1, "Servicio.Nombre": 1, "Servicio.Precio": 1, Telefono_Cliente: 1, Nombre_Cliente: 1, Origen: 1, _id: 0 },
      ).lean<RegistroHist[]>(),
      Turnos.find({}, { Turno: 1, Bloques: 1, "Servicio.Precio": 1, Origen: 1, _id: 0 }).lean<RegistroPendiente[]>(),
      // Primera visita de cada cliente, en toda la historia: para saber quién vuelve
      Historial.aggregate<{ _id: number; primera: string }>([
        { $match: { Estado: "Success" } },
        { $group: { _id: "$Telefono_Cliente", primera: { $min: "$Turno.Dia" } } },
      ]),
      Clientes.countDocuments({ createdAt: { $gte: instante(inicioMes), $lte: instante(hoy, true) } }),
      Clientes.countDocuments({ createdAt: { $gte: instante(inicioAnt), $lte: instante(finAnt, true) } }),
    ]);

    const datos = calcularEstadisticas(
      hist,
      pendientes,
      new Map(primeras.map((p) => [p._id, p.primera])),
      { actual: nuevosAct, anterior: nuevosAnt },
      hoy,
    );
    return NextResponse.json(datos);
  } catch (e) {
    console.error("GET /api/estadisticas", e);
    return NextResponse.json({ error: "No se pudieron calcular las estadísticas." }, { status: 500 });
  }
}
