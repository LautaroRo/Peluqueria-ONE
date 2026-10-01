import "server-only";
import Turnos from "../models/Turnos";
import Bloqueos from "../models/Bloqueos";
import { diaSemanaDe, horariosDelDia } from "./horarios";

type BloqueoDoc = { Dia: string; Horas: string[] };
type TurnoOcupa = { _id: { toString(): string }; Turno: { Hora: string }; Bloques?: string[] };

// Los turnos de antes de los servicios no tienen "Bloques": se completan una vez por instancia,
// para que el índice único también los cubra y un servicio largo no se les monte encima.
let bloquesCompletos = false;
export async function completarBloques() {
  if (bloquesCompletos) return;
  // Driver nativo: Mongoose 9 no deja usar un pipeline en updateMany sin una opción extra
  await Turnos.collection.updateMany({ Bloques: { $exists: false } }, [{ $set: { Bloques: ["$Turno.Hora"] } }]);
  bloquesCompletos = true;
}

// Medias horas bloqueadas por Héctor en un día (el día entero si el bloqueo no tiene horas)
export async function horasBloqueadas(dia: string): Promise<string[]> {
  const bloqueos = await Bloqueos.find({ Dia: dia }, { Horas: 1, _id: 0 }).lean<BloqueoDoc[]>();
  if (!bloqueos.length) return [];
  if (bloqueos.some((b) => !b.Horas?.length)) return horariosDelDia(diaSemanaDe(dia));
  return [...new Set(bloqueos.flatMap((b) => b.Horas))];
}

// Todo lo que no se puede reservar en un día: turnos (con su duración) y bloqueos.
// `excluir` deja afuera un turno, para reprogramarlo sin que choque consigo mismo.
export async function ocupadosDelDia(dia: string, excluir?: string): Promise<string[]> {
  const [turnos, bloqueadas] = await Promise.all([
    Turnos.find({ "Turno.Dia": dia }, { "Turno.Hora": 1, Bloques: 1 }).lean<TurnoOcupa[]>(),
    horasBloqueadas(dia),
  ]);
  const ocupados = new Set(bloqueadas);
  for (const t of turnos) {
    if (excluir && t._id.toString() === excluir) continue;
    for (const b of t.Bloques?.length ? t.Bloques : [t.Turno.Hora]) ocupados.add(b);
  }
  return [...ocupados];
}
