"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfToday,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { abreElDia, entraEnElDia, minutosDeHora } from "../../lib/horarios";
import "./estilos.css";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type CalendarioProps = {
  mes: Date;
  onMes: (mes: Date) => void;
  seleccion: Date | null;
  onSeleccion: (dia: Date) => void;
  // Por defecto: días pasados y días que el local está cerrado van bloqueados
  bloqueado?: (dia: Date) => boolean;
};

export function Calendario({ mes, onMes, seleccion, onSeleccion, bloqueado }: CalendarioProps) {
  const hoy = startOfToday();
  const dias = eachDayOfInterval({ start: startOfMonth(mes), end: endOfMonth(mes) });
  const huecos = getDay(startOfMonth(mes));
  const estaBloqueado = bloqueado ?? ((d: Date) => isBefore(d, hoy) || !abreElDia(getDay(d)));

  return (
    <div className="cal">
      <div className="cal-cabecera">
        <button
          type="button"
          className="cal-flecha"
          onClick={() => onMes(subMonths(mes, 1))}
          disabled={isSameMonth(mes, hoy)}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        {/* La key reinicia la animación al cambiar de mes */}
        <p key={mes.toISOString()} className="cal-mes">
          {format(mes, "MMMM yyyy", { locale: es })}
        </p>
        <button type="button" className="cal-flecha" onClick={() => onMes(addMonths(mes, 1))} aria-label="Mes siguiente">
          ›
        </button>
      </div>

      <div key={`g-${mes.toISOString()}`} className="cal-grilla">
        {DIAS.map((d) => (
          <span key={d} className="cal-semana">
            {d}
          </span>
        ))}
        {Array.from({ length: huecos }).map((_, i) => (
          <span key={`v${i}`} />
        ))}
        {dias.map((d, i) => {
          const off = estaBloqueado(d);
          const activo = seleccion && isSameDay(d, seleccion);
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={off}
              onClick={() => onSeleccion(d)}
              className={`cal-dia ${activo ? "activo" : ""} ${isSameDay(d, hoy) ? "hoy" : ""}`}
              style={{ animationDelay: `${i * 12}ms` }}
              aria-pressed={!!activo}
              aria-label={format(d, "EEEE d 'de' MMMM", { locale: es })}
            >
              {format(d, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type HorariosProps = {
  horarios: string[];
  ocupados: string[];
  elegido: string;
  onElegir: (h: string) => void;
  // Minutos del día que ya pasaron (solo si el día elegido es hoy)
  pasadosHasta?: number;
  cargando?: boolean;
  // Minutos del servicio elegido: uno de una hora necesita dos medias horas libres seguidas
  duracion?: number;
};

export function SelectorHorario({ horarios, ocupados, elegido, onElegir, pasadosHasta = -1, cargando, duracion = 30 }: HorariosProps) {
  if (cargando) {
    return (
      <div className="horarios-grilla">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="horario esqueleto" />
        ))}
      </div>
    );
  }

  const grupos = [
    { titulo: "Mañana", lista: horarios.filter((h) => minutosDeHora(h) < 13 * 60) },
    { titulo: "Tarde", lista: horarios.filter((h) => minutosDeHora(h) >= 13 * 60) },
  ].filter((g) => g.lista.length);

  const libre = (h: string) => minutosDeHora(h) > pasadosHasta && entraEnElDia(h, duracion, horarios, ocupados);
  const libres = horarios.filter(libre).length;
  if (!libres) return <p className="horarios-vacio">No quedan horarios libres este día. Probá con otro.</p>;

  return (
    <div className="horarios">
      {grupos.map((g) => (
        <div key={g.titulo}>
          <p className="etiqueta horarios-titulo">{g.titulo}</p>
          <div className="horarios-grilla">
            {g.lista.map((h, i) => {
              const off = !libre(h);
              return (
                <button
                  key={h}
                  type="button"
                  disabled={off}
                  onClick={() => onElegir(h)}
                  className={`horario ${elegido === h ? "activo" : ""}`}
                  style={{ animationDelay: `${i * 18}ms` }}
                  aria-pressed={elegido === h}
                  aria-label={off ? `${h} no disponible` : `${h} libre`}
                >
                  {h}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
