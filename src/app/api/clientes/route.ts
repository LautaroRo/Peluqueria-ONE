import { connectDB } from "@/src/app/lib/MongoDB";
import Clientes from "../../models/Clientes";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Conectamos a la base de datos usando tu función
    await connectDB();

    // Buscamos todos los documentos de la colección clientes
    const listaClientes = await Clientes.find().lean();

    // Devolvemos la respuesta con la estructura que espera el AdminPage
    return NextResponse.json({
      success: true,
      total: listaClientes.length,
      clientes: listaClientes,
    });
  } catch (error) {
    console.error("Error en GET /api/clientes:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener los clientes de la base de datos" },
      { status: 500 }
    );
  }
}