import { connectDB } from "@/src/app/lib/MongoDB";
import Historial from "../../models/Historial"; // 📜 Importamos tu modelo
import { NextResponse } from "next/server";

// 🚀 Forzar a Next.js a que no guarde esta ruta en caché de forma estática
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();

    // Traemos todo el historial ordenado por la fecha en que se cerró (de más reciente a más antiguo)
    const registros = await Historial.find()
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(registros);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}