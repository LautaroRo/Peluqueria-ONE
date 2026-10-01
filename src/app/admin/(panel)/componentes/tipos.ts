import type { ServicioTurno } from "../../../lib/servicios";

export interface Turno {
  _id: string;
  Nombre_Cliente: string;
  Telefono_Cliente: number;
  Turno: { Dia: string; Hora: string };
  Servicio?: ServicioTurno;
  Origen?: "web" | "panel";
}

export interface Cliente {
  _id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  notas?: string;
  createdAt?: string;
}

export interface HistorialItem extends Turno {
  Estado: "Success" | "Cancelled";
  createdAt: string;
}

export type Aviso = { ok: boolean; titulo: string; texto: string } | null;
