import { NextResponse } from "next/server";
import { connectDB } from "@/src/app/lib/MongoDB";
import Bloqueos from "../../models/Bloqueos";
import Turnos from "../../models/Turnos";
import { esAdmin } from "../../lib/auth";
import { ahoraEnCordoba, diaSemanaDe, horariosDelDia } from "../../lib/horarios";

export const dynamic = "force-dynamic";

const error = (mensaje: string, status: number) => NextResponse.json({ error: mensaje }, { status });
const DIA_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[a-f0-9]{24}$/i;

type BloqueoDoc = { _id: { toString(): string }; Dia: string; Horas: string[]; Motivo: string };

// Público: solo qué días están cerrados por completo (para tachar el calendario).
// Panel: todos los bloqueos desde hoy, con motivo y cuántos turnos caen esos días.
export async function GET() {
  try {
    await connectDB();
    const { dia: hoy } = ahoraEnCordoba();
    const bloqueos = await Bloqueos.find({ Dia: { $gte: hoy } }).sort({ Dia: 1 }).lean<BloqueoDoc[]>();

    if (!(await esAdmin())) {
      return NextResponse.json({ cerrados: [...new Set(bloqueos.filter((b) => !b.Horas?.length).map((b) => b.Dia))] });
    }

    const dias = [...new Set(bloqueos.map((b) => b.Dia))];
    const turnos = await Turnos.find({ "Turno.Dia": { $in: dias } }, { "Turno.Dia": 1, _id: 0 }).lean<{ Turno: { Dia: string } }[]>();
    const porDia = new Map<string, number>();
    for (const t of turnos) porDia.set(t.Turno.Dia, (porDia.get(t.Turno.Dia) ?? 0) + 1);

    return NextResponse.json(
      bloqueos.map((b) => ({ _id: b._id.toString(), Dia: b.Dia, Horas: b.Horas ?? [], Motivo: b.Motivo, turnos: porDia.get(b.Dia) ?? 0 })),
    );
  } catch (e) {
    console.error("GET /api/bloqueos", e);
    return error("No se pudieron cargar los días bloqueados.", 500);
  }
}

export async function POST(request: Request) {
  if (!(await esAdmin())) return error("No autorizado.", 401);
  try {
    await connectDB();
    const body = await request.json().catch(() => null);
    const dia = body?.Dia;
    if (typeof dia !== "string" || !DIA_RE.test(dia)) return error("La fecha no es válida.", 400);
    if (dia < ahoraEnCordoba().dia) return error("Ese día ya pasó.", 400);

    const delDia = horariosDelDia(diaSemanaDe(dia));
    if (!delDia.length) return error("Ese día el local ya está cerrado.", 400);
    const horas = Array.isArray(body?.Horas) ? [...new Set<string>(body.Horas.map(String))] : [];
    if (horas.some((h) => !delDia.includes(h))) return error("Alguno de los horarios no existe ese día.", 400);

    const nuevo = await Bloqueos.create({
      Dia: dia,
      // Si marcó todas las horas, es el día entero
      Horas: horas.length === delDia.length ? [] : horas,
      Motivo: String(body?.Motivo ?? "").trim().slice(0, 80),
    });
    const turnos = await Turnos.countDocuments({ "Turno.Dia": dia });
    return NextResponse.json({ bloqueo: nuevo, turnos }, { status: 201 });
  } catch (e) {
    console.error("POST /api/bloqueos", e);
    return error("No se pudo bloquear.", 500);
  }
}

export async function DELETE(request: Request) {
  if (!(await esAdmin())) return error("No autorizado.", 401);
  try {
    await connectDB();
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !ID_RE.test(id)) return error("ID requerido.", 400);
    await Bloqueos.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/bloqueos", e);
    return error("No se pudo desbloquear.", 500);
  }
}
