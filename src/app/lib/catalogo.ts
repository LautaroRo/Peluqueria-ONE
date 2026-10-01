import "server-only";
import { connectDB } from "./MongoDB";
import Servicios from "../models/Servicios";
import { SERVICIOS_BASE, Servicio } from "./servicios";

type ServicioDoc = Omit<Servicio, "_id"> & { _id: { toString(): string } };

const serializar = (s: ServicioDoc): Servicio => ({
  _id: s._id.toString(),
  clave: s.clave,
  nombre: s.nombre,
  descripcion: s.descripcion ?? "",
  precio: s.precio ?? null,
  duracion: s.duracion ?? 30,
  activo: !!s.activo,
  orden: s.orden ?? 0,
});

// La primera vez que se pide el catálogo, se carga la lista base (ver lib/servicios.ts)
async function sembrar() {
  if (await Servicios.estimatedDocumentCount()) return;
  // ordered:false + clave única: si dos pedidos siembran a la vez, el segundo no duplica nada
  await Servicios.insertMany(SERVICIOS_BASE, { ordered: false }).catch(() => {});
}

export async function listarServicios(todos = false): Promise<Servicio[]> {
  await connectDB();
  await sembrar();
  const lista = await Servicios.find(todos ? {} : { activo: true })
    .sort({ orden: 1, nombre: 1 })
    .lean<ServicioDoc[]>();
  return lista.map(serializar);
}

export async function buscarServicio(clave: unknown): Promise<Servicio | null> {
  if (typeof clave !== "string" || !clave) return null;
  await connectDB();
  await sembrar();
  const s = await Servicios.findOne({ clave, activo: true }).lean<ServicioDoc>();
  return s ? serializar(s) : null;
}
