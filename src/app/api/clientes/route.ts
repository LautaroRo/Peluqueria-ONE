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

// Notas internas de un cliente (lo único editable desde el panel)
export async function PATCH(request: Request) {
  if (!(await esAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !/^[a-f0-9]{24}$/i.test(id)) return NextResponse.json({ error: "ID requerido." }, { status: 400 });
    const body = await request.json().catch(() => null);
    const notas = String(body?.notas ?? "").trim().slice(0, 500);

    await connectDB();
    const cliente = await Clientes.findByIdAndUpdate(id, { $set: { notas } }, { returnDocument: "after" }).lean();
    if (!cliente) return NextResponse.json({ error: "El cliente no existe." }, { status: 404 });
    return NextResponse.json(cliente);
  } catch (error) {
    console.error("PATCH /api/clientes", error);
    return NextResponse.json({ error: "No se pudieron guardar las notas." }, { status: 500 });
  }
}
