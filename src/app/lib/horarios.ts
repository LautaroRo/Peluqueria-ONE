// Horarios del local: única fuente de verdad para la web, las reservas y el servidor.
// Si cambian, se cambian acá y se actualiza todo (landing, calendario y validaciones).

export type Dia = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo

// [apertura, cierre] en "HH:MM". El último turno arranca media hora antes del cierre.
export const HORARIOS: Partial<Record<Dia, [string, string]>> = {
  2: ["10:00", "20:00"],
  3: ["10:00", "20:00"],
  4: ["10:00", "20:00"],
  5: ["10:00", "20:00"],
  6: ["09:00", "19:00"],
};

export const DURACION_TURNO_MIN = 30;

// Para la sección de horarios de la landing
export const HORARIOS_TEXTO = [
  { dias: "Martes a Viernes", horas: "10:00 - 20:00" },
  { dias: "Sábados", horas: "09:00 - 19:00" },
];
export const DIAS_CERRADO_TEXTO = "Domingos y Lunes cerrado";

// Horas de anticipación mínimas para modificar o cancelar un turno
export const HORAS_ANTICIPACION = 8;

// Córdoba está en UTC-3 todo el año (sin horario de verano)
const OFFSET = "-03:00";

const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// Las horas se guardan como "9:00" / "10:30" (sin cero adelante), igual que los turnos ya cargados
const aHora = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

export const minutosDeHora = aMinutos;

// Turnos que se pueden reservar un día de la semana dado
export function horariosDelDia(diaSemana: number): string[] {
  const rango = HORARIOS[diaSemana as Dia];
  if (!rango) return [];
  const [desde, hasta] = rango.map(aMinutos);
  const lista: string[] = [];
  for (let m = desde; m + DURACION_TURNO_MIN <= hasta; m += DURACION_TURNO_MIN) lista.push(aHora(m));
  return lista;
}

export const abreElDia = (diaSemana: number) => !!HORARIOS[diaSemana as Dia];

// Día de la semana de un "YYYY-MM-DD" (sin depender de la zona horaria de quien lo calcula)
export function diaSemanaDe(dia: string): number {
  const [y, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// Momento exacto de un turno, en hora de Córdoba. En el servidor (Vercel corre en UTC)
// esto evita que los turnos se den por terminados tres horas antes.
export function instanteTurno(dia: string, hora: string): Date {
  const [h, m] = hora.split(":");
  return new Date(`${dia}T${h.padStart(2, "0")}:${m}:00${OFFSET}`);
}

// Fecha y hora actuales en Córdoba, como texto
export function ahoraEnCordoba(now = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Cordoba",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(now);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const semana = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return {
    dia: `${get("year")}-${get("month")}-${get("day")}`,
    minutos: Number(get("hour")) * 60 + Number(get("minute")),
    diaSemana: semana,
  };
}

// ¿Está abierto ahora? Para el cartel de la landing
export function estadoDelLocal(now = new Date()): { abierto: boolean; texto: string } {
  const { diaSemana, minutos } = ahoraEnCordoba(now);
  const rango = HORARIOS[diaSemana as Dia];
  if (rango) {
    const [desde, hasta] = rango.map(aMinutos);
    if (minutos >= desde && minutos < hasta) return { abierto: true, texto: `Abierto · cierra a las ${rango[1]}` };
    if (minutos < desde) return { abierto: false, texto: `Cerrado · abre hoy a las ${rango[0]}` };
  }
  for (let i = 1; i <= 7; i++) {
    const proximo = (diaSemana + i) % 7;
    const r = HORARIOS[proximo as Dia];
    if (r) {
      const nombre = i === 1 ? "mañana" : ["el domingo", "el lunes", "el martes", "el miércoles", "el jueves", "el viernes", "el sábado"][proximo];
      return { abierto: false, texto: `Cerrado · abre ${nombre} a las ${r[0]}` };
    }
  }
  return { abierto: false, texto: "Cerrado" };
}

// Ordena turnos por día y hora real ("9:00" va antes que "10:00")
export const compararTurnos = (a: { Dia: string; Hora: string }, b: { Dia: string; Hora: string }) =>
  a.Dia === b.Dia ? aMinutos(a.Hora) - aMinutos(b.Hora) : a.Dia < b.Dia ? -1 : 1;
