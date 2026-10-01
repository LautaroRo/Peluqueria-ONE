// Cálculo de las estadísticas del panel. Funciones puras: la ruta trae los datos y esto los agrupa.
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { abreElDia, diaSemanaDe, horariosDelDia, minutosDeHora } from "./horarios";

export type Punto = {
  clave: string;
  etiqueta: string; // corta, para el eje: "14/10", "oct"
  titulo: string; // larga, para el tooltip: "Martes 14 de octubre"
  atendidos: number;
  cancelados: number;
  ingresos: number;
};

export type Comparacion = { actual: number; anterior: number };

export type Estadisticas = {
  series: { dia: Punto[]; semana: Punto[]; mes: Punto[] };
  kpis: {
    atendidos: Comparacion;
    ingresos: Comparacion;
    ticket: Comparacion;
    cancelacion: Comparacion; // 0 a 1
    nuevos: Comparacion;
    recurrentes: number; // 0 a 1: de los clientes del mes, cuántos ya habían venido antes
    online: number; // 0 a 1: reservas del mes que se sacaron desde la web
  };
  calor: { dias: number[]; horas: number[]; valores: number[][]; max: number };
  servicios: { nombre: string; cantidad: number; ingresos: number }[];
  topClientes: { nombre: string; telefono: number; visitas: number; ultima: string }[];
  semanaQueViene: { reservados: number; capacidad: number; ingresos: number };
  hayPrecios: boolean;
  desde: string;
};

export type RegistroHist = {
  Turno: { Dia: string; Hora: string };
  Estado: "Success" | "Cancelled";
  Servicio?: { Nombre?: string; Precio?: number | null };
  Telefono_Cliente: number;
  Nombre_Cliente: string;
  Origen?: "web" | "panel";
};

export type RegistroPendiente = {
  Turno: { Dia: string; Hora: string };
  Bloques?: string[];
  Servicio?: { Precio?: number | null };
  Origen?: "web" | "panel";
};

// --- Fechas como "YYYY-MM-DD", sin depender de la zona horaria ---
const partes = (s: string) => s.split("-").map(Number) as [number, number, number];
const aLocal = (s: string) => {
  const [y, m, d] = partes(s);
  return new Date(y, m - 1, d, 12);
};
const aTexto = (y: number, m: number, d: number) => {
  const f = new Date(Date.UTC(y, m - 1, d));
  return f.toISOString().slice(0, 10);
};
export const sumarDias = (s: string, n: number) => {
  const [y, m, d] = partes(s);
  return aTexto(y, m, d + n);
};
const lunesDe = (s: string) => sumarDias(s, -((diaSemanaDe(s) + 6) % 7));
const mesDe = (s: string) => s.slice(0, 7);
const sumarMeses = (s: string, n: number) => {
  const [y, m] = partes(s);
  return aTexto(y, m + n, 1);
};

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const precio = (r: { Servicio?: { Precio?: number | null } }) => r.Servicio?.Precio ?? null;

// Primer día de la ventana que leen las estadísticas: 12 meses contando el actual
export const desdeEstadisticas = (hoy: string) => sumarMeses(`${mesDe(hoy)}-01`, -11);

export function calcularEstadisticas(
  hist: RegistroHist[],
  pendientes: RegistroPendiente[],
  primeraVisita: Map<number, string>,
  nuevos: Comparacion,
  hoy: string,
): Estadisticas {
  const vacio = (clave: string, etiqueta: string, titulo: string): Punto => ({ clave, etiqueta, titulo, atendidos: 0, cancelados: 0, ingresos: 0 });

  // --- Ejes de cada serie ---
  const dias: Punto[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = sumarDias(hoy, -i);
    if (!abreElDia(diaSemanaDe(d))) continue; // los días cerrados serían ceros que no dicen nada
    const f = aLocal(d);
    dias.push(vacio(d, format(f, "d/M"), capital(format(f, "EEEE d 'de' MMMM", { locale: es }))));
  }
  const semanas: Punto[] = [];
  for (let i = 11; i >= 0; i--) {
    const l = sumarDias(lunesDe(hoy), -7 * i);
    semanas.push(vacio(l, format(aLocal(l), "d/M"), `Semana del ${format(aLocal(l), "d 'de' MMMM", { locale: es })}`));
  }
  const meses: Punto[] = [];
  for (let i = 11; i >= 0; i--) {
    const m = sumarMeses(`${mesDe(hoy)}-01`, -i);
    meses.push(vacio(mesDe(m), format(aLocal(m), "MMM", { locale: es }).replace(".", ""), capital(format(aLocal(m), "MMMM yyyy", { locale: es }))));
  }
  const indice = (lista: Punto[]) => new Map(lista.map((p) => [p.clave, p]));
  const iDia = indice(dias), iSem = indice(semanas), iMes = indice(meses);

  // --- Rangos para comparar: lo que va del mes contra el mismo tramo del mes anterior ---
  const { inicioMes, inicioAnt, finAnt } = rangosMes(hoy);
  const k = {
    act: { at: 0, ca: 0, ing: 0, conPrecio: 0 },
    ant: { at: 0, ca: 0, ing: 0, conPrecio: 0 },
  };
  const clientesMes = new Set<number>();
  let online = 0, conOrigen = 0;

  // --- Mapa de calor: últimos 90 días ---
  const diasCalor = [0, 1, 2, 3, 4, 5, 6].filter(abreElDia);
  const todasLasHoras = diasCalor.flatMap((d) => horariosDelDia(d).map((h) => Math.floor(minutosDeHora(h) / 60)));
  const horasCalor = todasLasHoras.length
    ? Array.from({ length: Math.max(...todasLasHoras) - Math.min(...todasLasHoras) + 1 }, (_, i) => Math.min(...todasLasHoras) + i)
    : [];
  const valores = diasCalor.map(() => horasCalor.map(() => 0));
  const desdeCalor = sumarDias(hoy, -90);

  const servicios = new Map<string, { nombre: string; cantidad: number; ingresos: number }>();
  const clientes = new Map<number, { nombre: string; telefono: number; visitas: number; ultima: string }>();
  let hayPrecios = false;

  for (const r of hist) {
    const dia = r.Turno.Dia;
    const ok = r.Estado === "Success";
    const p = precio(r);
    if (p !== null) hayPrecios = true;

    for (const punto of [iDia.get(dia), iSem.get(lunesDe(dia)), iMes.get(mesDe(dia))]) {
      if (!punto) continue;
      if (ok) {
        punto.atendidos++;
        punto.ingresos += p ?? 0;
      } else punto.cancelados++;
    }

    const tramo = dia >= inicioMes && dia <= hoy ? k.act : dia >= inicioAnt && dia <= finAnt ? k.ant : null;
    if (tramo) {
      if (ok) {
        tramo.at++;
        if (p !== null) {
          tramo.ing += p;
          tramo.conPrecio++;
        }
      } else tramo.ca++;
    }
    if (dia >= inicioMes) {
      conOrigen++;
      if (r.Origen !== "panel") online++;
    }

    if (!ok) continue;
    if (dia >= inicioMes) clientesMes.add(r.Telefono_Cliente);

    if (dia >= desdeCalor) {
      const fila = diasCalor.indexOf(diaSemanaDe(dia));
      const col = horasCalor.indexOf(Math.floor(minutosDeHora(r.Turno.Hora) / 60));
      if (fila >= 0 && col >= 0) valores[fila][col]++;
    }

    const nombreServ = r.Servicio?.Nombre || "Corte";
    const s = servicios.get(nombreServ) ?? { nombre: nombreServ, cantidad: 0, ingresos: 0 };
    s.cantidad++;
    s.ingresos += p ?? 0;
    servicios.set(nombreServ, s);

    const c = clientes.get(r.Telefono_Cliente) ?? { nombre: r.Nombre_Cliente, telefono: r.Telefono_Cliente, visitas: 0, ultima: dia };
    c.visitas++;
    if (dia >= c.ultima) {
      c.ultima = dia;
      c.nombre = r.Nombre_Cliente;
    }
    clientes.set(r.Telefono_Cliente, c);
  }

  // Lo que ya está reservado para el resto del mes también cuenta como reserva online o del panel
  const finSemana = sumarDias(hoy, 6);
  const semanaQueViene = { reservados: 0, capacidad: 0, ingresos: 0 };
  for (let i = 0; i < 7; i++) semanaQueViene.capacidad += horariosDelDia(diaSemanaDe(sumarDias(hoy, i))).length;
  for (const t of pendientes) {
    if (mesDe(t.Turno.Dia) === mesDe(hoy)) {
      conOrigen++;
      if (t.Origen !== "panel") online++;
    }
    if (t.Turno.Dia >= hoy && t.Turno.Dia <= finSemana) {
      semanaQueViene.reservados += t.Bloques?.length || 1;
      semanaQueViene.ingresos += precio(t) ?? 0;
    }
  }

  const recurrentes = [...clientesMes].filter((tel) => (primeraVisita.get(tel) ?? inicioMes) < inicioMes).length;
  const tasa = (t: typeof k.act) => (t.at + t.ca ? t.ca / (t.at + t.ca) : 0);
  const ticket = (t: typeof k.act) => (t.conPrecio ? Math.round(t.ing / t.conPrecio) : 0);

  return {
    series: { dia: dias, semana: semanas, mes: meses },
    kpis: {
      atendidos: { actual: k.act.at, anterior: k.ant.at },
      ingresos: { actual: k.act.ing, anterior: k.ant.ing },
      ticket: { actual: ticket(k.act), anterior: ticket(k.ant) },
      cancelacion: { actual: tasa(k.act), anterior: tasa(k.ant) },
      nuevos,
      recurrentes: clientesMes.size ? recurrentes / clientesMes.size : 0,
      online: conOrigen ? online / conOrigen : 0,
    },
    calor: { dias: diasCalor, horas: horasCalor, valores, max: Math.max(0, ...valores.flat()) },
    servicios: [...servicios.values()].sort((a, b) => b.cantidad - a.cantidad),
    topClientes: [...clientes.values()].sort((a, b) => b.visitas - a.visitas || (a.ultima < b.ultima ? 1 : -1)).slice(0, 5),
    semanaQueViene,
    hayPrecios: hayPrecios || pendientes.some((t) => precio(t) !== null),
    desde: desdeEstadisticas(hoy),
  };
}

// Lo que va del mes y el mismo tramo del mes anterior (al 31, contra el último día de un mes de 30)
export function rangosMes(hoy: string) {
  const inicioMes = `${mesDe(hoy)}-01`;
  const inicioAnt = sumarMeses(inicioMes, -1);
  const tope = sumarDias(inicioMes, -1);
  const mismoDia = `${mesDe(inicioAnt)}-${hoy.slice(8)}`;
  return { inicioMes, inicioAnt, finAnt: mismoDia < tope ? mismoDia : tope };
}
