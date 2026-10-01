import { format } from "date-fns";
import { es } from "date-fns/locale";

// Mayúscula solo en la primera letra: "Sábado 3 de octubre" (el CSS capitalize ponía "De Octubre")
export const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const fechaLarga = (d: Date) => capitalizar(format(d, "EEEE d 'de' MMMM", { locale: es }));

const utc = (dia: string) => {
  const [y, m, d] = dia.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

// Días de calendario entre dos "YYYY-MM-DD" (no horas: un jueves a la noche, el sábado es "pasado mañana")
export const diasHasta = (dia: string, hoy: string) => Math.round((utc(dia) - utc(hoy)) / 86_400_000);
