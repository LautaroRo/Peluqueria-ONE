import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/src/app/lib/MongoDB";
import Servicios from "../../models/Servicios";
import { esAdmin } from "../../lib/auth";
import { listarServicios } from "../../lib/catalogo";
import { DURACIONES } from "../../lib/servicios";

export const dynamic = "force-dynamic";

const error = (mensaje: string, status: number) => NextResponse.json({ error: mensaje }, { status });
const ID_RE = /^[a-f0-9]{24}$/i;

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "servicio";

// Solo los campos editables, validados. `parcial` permite mandar uno solo (prender/apagar, el precio).
function limpiar(body: Record<string, unknown> | null, parcial: boolean) {
  const datos: Record<string, unknown> = {};
  if (!body) return { problema: "Faltan datos." };

  if (!parcial || "nombre" in body) {
    const nombre = String(body.nombre ?? "").trim().replace(/\s+/g, " ");
    if (nombre.length < 2 || nombre.length > 60) return { problema: "El nombre tiene que tener entre 2 y 60 letras." };
    datos.nombre = nombre;
  }
  if ("descripcion" in body) datos.descripcion = String(body.descripcion ?? "").trim().slice(0, 200);
  if ("precio" in body) {
    const p = body.precio === "" || body.precio === null ? null : Number(body.precio);
    if (p !== null && (!Number.isFinite(p) || p < 0 || p > 10_000_000)) return { problema: "El precio no es válido." };
    datos.precio = p === null ? null : Math.round(p);
  }
  if ("duracion" in body) {
    const d = Number(body.duracion);
    if (!DURACIONES.includes(d)) return { problema: "La duración tiene que ser de 30, 60 o 90 minutos." };
    datos.duracion = d;
  }
  if ("activo" in body) datos.activo = !!body.activo;
  if ("orden" in body && Number.isFinite(Number(body.orden))) datos.orden = Number(body.orden);
  return { datos };
}

// La landing muestra los servicios: se regenera al cambiar el catálogo
const refrescar = () => revalidatePath("/");

export async function GET(request: Request) {
  try {
    const todos = new URL(request.url).searchParams.has("todos") && (await esAdmin());
    return NextResponse.json(await listarServicios(todos));
  } catch (e) {
    console.error("GET /api/servicios", e);
    return error("No se pudieron cargar los servicios.", 500);
  }
}

export async function POST(request: Request) {
  if (!(await esAdmin())) return error("No autorizado.", 401);
  try {
    await connectDB();
    const { datos, problema } = limpiar(await request.json().catch(() => null), false);
    if (problema) return error(problema, 400);

    const base = slug(String(datos!.nombre));
    let clave = base;
    for (let i = 2; await Servicios.exists({ clave }); i++) clave = `${base}-${i}`;
    const ultimo = await Servicios.findOne({}, { orden: 1 }).sort({ orden: -1 }).lean<{ orden?: number }>();

    const nuevo = await Servicios.create({ orden: (ultimo?.orden ?? 0) + 1, ...datos, clave });
    refrescar();
    return NextResponse.json(nuevo, { status: 201 });
  } catch (e) {
    console.error("POST /api/servicios", e);
    return error("No se pudo crear el servicio.", 500);
  }
}

export async function PATCH(request: Request) {
  if (!(await esAdmin())) return error("No autorizado.", 401);
  try {
    await connectDB();
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !ID_RE.test(id)) return error("ID requerido.", 400);
    const { datos, problema } = limpiar(await request.json().catch(() => null), true);
    if (problema) return error(problema, 400);

    // La clave no cambia: los turnos guardados la referencian
    const actualizado = await Servicios.findByIdAndUpdate(id, { $set: datos }, { returnDocument: "after", runValidators: true });
    if (!actualizado) return error("El servicio no existe.", 404);
    refrescar();
    return NextResponse.json(actualizado);
  } catch (e) {
    console.error("PATCH /api/servicios", e);
    return error("No se pudo guardar el servicio.", 500);
  }
}

// Borrar no afecta a los turnos: cada uno guarda su propia copia del servicio
export async function DELETE(request: Request) {
  if (!(await esAdmin())) return error("No autorizado.", 401);
  try {
    await connectDB();
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !ID_RE.test(id)) return error("ID requerido.", 400);
    if ((await Servicios.countDocuments({ activo: true, _id: { $ne: id } })) < 1) {
      return error("Tiene que quedar al menos un servicio activo.", 400);
    }
    await Servicios.findByIdAndDelete(id);
    refrescar();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/servicios", e);
    return error("No se pudo borrar el servicio.", 500);
  }
}
