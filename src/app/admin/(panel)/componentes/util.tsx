import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SERVICIO_SIN_DATO } from "../../../lib/servicios";
import { DIRECCION } from "../../../lib/local";
import type { Turno } from "./tipos";

export const fechaDe = (dia: string) => new Date(`${dia}T12:00:00`);

export const servicioDe = (t: Pick<Turno, "Servicio">) => t.Servicio ?? SERVICIO_SIN_DATO;

const soloDigitos = (tel: string | number) => String(tel).replace(/\D/g, "");

// wa.me necesita el número internacional: a los de Argentina sin código de país se les agrega 549
export const linkWhatsapp = (tel: string | number, texto?: string) => {
  const d = soloDigitos(tel);
  const base = `https://wa.me/${d.startsWith("54") ? d : `549${d}`}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
};

// Mensaje de recordatorio listo para mandar por WhatsApp
export function mensajeRecordatorio(t: Turno, hoy: string, manana: string) {
  const nombre = t.Nombre_Cliente.split(" ")[0];
  const cuando =
    t.Turno.Dia === hoy ? "hoy" : t.Turno.Dia === manana ? "mañana" : `el ${format(fechaDe(t.Turno.Dia), "EEEE d 'de' MMMM", { locale: es })}`;
  return (
    `¡Hola ${nombre}! Te recordamos tu turno en ONE Peluquería ${cuando} a las ${t.Turno.Hora} hs ` +
    `(${servicioDe(t).Nombre}). Te esperamos en ${DIRECCION.calle}. ` +
    `Si no podés venir, avisanos o cancelalo desde la web en "Mi turno". ¡Gracias!`
  );
}

// Descarga una tabla como CSV que Excel abre bien (BOM para los acentos y ";" como separador)
export function descargarCSV(nombre: string, filas: (string | number | null | undefined)[][]) {
  const celda = (v: string | number | null | undefined) => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "﻿" + filas.map((f) => f.map(celda).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre}-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export const IconoWhatsapp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.3 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.8a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.72.97 1-3.62-.24-.37a9.8 9.8 0 0 1-1.5-5.22c0-5.42 4.42-9.83 9.84-9.83 2.63 0 5.1 1.02 6.95 2.88a9.77 9.77 0 0 1 2.88 6.96c0 5.42-4.42 9.82-9.84 9.82zm8.37-18.2A11.76 11.76 0 0 0 12.05.13C5.5.13.17 5.46.17 12.01c0 2.1.55 4.14 1.6 5.94L.07 24l6.2-1.62a11.84 11.84 0 0 0 5.77 1.47c6.55 0 11.88-5.33 11.88-11.88 0-3.17-1.24-6.16-3.5-8.4z" />
  </svg>
);
