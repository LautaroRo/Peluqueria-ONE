import { connectDB } from "@/src/app/lib/MongoDB";
import Historial from "../../models/Historial";
import { NextResponse } from "next/server";
import { esAdmin } from "../../lib/auth";

export const dynamic = "force-dynamic";

// Historial de turnos con nombres y teléfonos: solo para el panel
export async function GET() {
  if (!(await esAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    await connectDB();
    const registros = await Historial.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(registros);
  } catch (e) {
    console.error("GET /api/historial", e);
    return NextResponse.json({ error: "No se pudo obtener el historial." }, { status: 500 });
  }
}
