import { connectDB } from "@/src/app/lib/MongoDB";
import Clientes from "../../models/Clientes";
import { NextResponse } from "next/server";
import { esAdmin } from "../../lib/auth";

export const dynamic = "force-dynamic";

// Datos personales de los clientes: solo para el panel
export async function GET() {
  if (!(await esAdmin())) {
    return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    await connectDB();
    const listaClientes = await Clientes.find().sort({ createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      total: listaClientes.length,
      clientes: listaClientes,
    });
  } catch (error) {
    console.error("GET /api/clientes", error);
    return NextResponse.json({ success: false, error: "No se pudieron obtener los clientes." }, { status: 500 });
  }
}
