"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import type { Estadisticas as Datos, Punto } from "../../../lib/estadisticas";
import { formatearPrecio } from "../../../lib/servicios";
import { fechaDe, linkWhatsapp } from "./util";

type Periodo = "dia" | "semana" | "mes";
type Metrica = "atendidos" | "ingresos";

const PERIODOS: { v: Periodo; t: string; sub: string }[] = [
  { v: "dia", t: "Día", sub: "últimos 30 días" },
  { v: "semana", t: "Semana", sub: "últimas 12 semanas" },
  { v: "mes", t: "Mes", sub: "últimos 12 meses" },
];

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_LARGOS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const compacto = new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 });
const porcentaje = (n: number) => `${Math.round(n * 100)}%`;

// Ancho real del contenedor: el gráfico se dibuja en píxeles, así el texto no se achica en el celular
function useAncho<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.floor(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho] as const;
}

// Máximo "redondo" del eje y su paso. Si son turnos, el paso es entero (no existe medio turno).
function escala(max: number, enteros: boolean) {
  if (max <= 0) return { tope: enteros ? 4 : 1, paso: enteros ? 1 : 0.25 };
  const crudo = max / 4;
  const p = 10 ** Math.floor(Math.log10(crudo));
  const n = crudo / p;
  let paso = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  if (enteros) paso = Math.max(1, Math.ceil(paso));
  return { tope: paso * 4, paso };
}

// Barra con las puntas de arriba redondeadas (la base queda apoyada en el eje)
const barra = (x: number, y: number, w: number, h: number) => {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
};

function GraficoBarras({ puntos, metrica }: { puntos: Punto[]; metrica: Metrica }) {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const [activo, setActivo] = useState<number | null>(null);
  const alto = 240;
  const m = { t: 14, r: 4, b: 26, l: metrica === "ingresos" ? 54 : 30 };
  const valor = (p: Punto) => (metrica === "ingresos" ? p.ingresos : p.atendidos);
  const formato = (n: number) => (metrica === "ingresos" ? formatearPrecio(n) : String(n));
  const formatoEje = (n: number) => (metrica === "ingresos" ? `$${compacto.format(n)}` : String(n));

  const { tope, paso } = escala(Math.max(0, ...puntos.map(valor)), metrica === "atendidos");
  const iw = Math.max(0, ancho - m.l - m.r);
  const ih = alto - m.t - m.b;
  const banda = puntos.length ? iw / puntos.length : 0;
  const bw = Math.max(3, Math.min(34, banda - 2)); // al menos 2 px de aire entre barras
  const y = (v: number) => m.t + ih - (v / tope) * ih;
  // Una etiqueta cada tanto, para que no se pisen (~46 px cada una)
  const cada = Math.max(1, Math.ceil(puntos.length / Math.max(1, Math.floor(iw / 46))));
  const ticks = Array.from({ length: 5 }, (_, i) => i * paso);
  const p = activo !== null ? puntos[activo] : null;

  return (
    <div className="grafico" ref={ref} onPointerLeave={(e) => e.pointerType === "mouse" && setActivo(null)}>
      {ancho > 0 && (
        <svg width={ancho} height={alto} role="img" aria-label={`Gráfico de barras: ${metrica === "ingresos" ? "ingresos" : "turnos atendidos"}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={ancho - m.r} y1={y(t)} y2={y(t)} className={t === 0 ? "grafico-base" : "grafico-grilla"} />
              <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="grafico-eje">
                {formatoEje(t)}
              </text>
            </g>
          ))}
          {puntos.map((pt, i) => {
            const v = valor(pt);
            const cx = m.l + banda * i + banda / 2;
            const h = (v / tope) * ih;
            return (
              <g key={pt.clave}>
                {v > 0 && (
                  <path
                    d={barra(cx - bw / 2, y(v), bw, h)}
                    className={`grafico-barra ${activo !== null && activo !== i ? "apagada" : ""}`}
                  />
                )}
                {i % cada === 0 && (
                  <text x={cx} y={alto - 8} textAnchor="middle" className="grafico-eje">
                    {pt.etiqueta}
                  </text>
                )}
                {/* Zona sensible: toda la columna, más grande que la barra */}
                <rect
                  x={m.l + banda * i}
                  y={m.t}
                  width={banda}
                  height={ih}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${pt.titulo}: ${formato(v)}`}
                  onPointerEnter={() => setActivo(i)}
                  onPointerDown={() => setActivo(i)}
                  onFocus={() => setActivo(i)}
                  onBlur={() => setActivo(null)}
                />
              </g>
            );
          })}
        </svg>
      )}

      {p && activo !== null && (
        <div
          className="grafico-tooltip"
          style={{
            left: Math.min(Math.max(m.l + banda * activo + banda / 2, 80), ancho - 80),
            top: Math.max(0, y(valor(p)) - 12),
          }}
        >
          <strong>{p.titulo}</strong>
          <span>
            {p.atendidos} {p.atendidos === 1 ? "atendido" : "atendidos"}
            {p.cancelados > 0 && ` · ${p.cancelados} ${p.cancelados === 1 ? "cancelado" : "cancelados"}`}
          </span>
          {p.ingresos > 0 && <span>{formatearPrecio(p.ingresos)}</span>}
        </div>
      )}

      {/* La misma información en tabla, para lectores de pantalla */}
      <table className="solo-lector">
        <thead>
          <tr>
            <th>Período</th>
            <th>Atendidos</th>
            <th>Cancelados</th>
            <th>Ingresos</th>
          </tr>
        </thead>
        <tbody>
          {puntos.map((pt) => (
            <tr key={pt.clave}>
              <td>{pt.titulo}</td>
              <td>{pt.atendidos}</td>
              <td>{pt.cancelados}</td>
              <td>{formatearPrecio(pt.ingresos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MapaCalor({ calor }: { calor: Datos["calor"] }) {
  const [activo, setActivo] = useState<{ d: number; h: number; v: number } | null>(null);
  if (!calor.max) return <p className="vacio">Todavía no hay turnos atendidos en los últimos 90 días.</p>;

  return (
    <div className="calor-wrap">
      <div className="calor" style={{ gridTemplateColumns: `34px repeat(${calor.horas.length}, minmax(18px, 1fr))` }} onPointerLeave={(e) => e.pointerType === "mouse" && setActivo(null)}>
        <span />
        {calor.horas.map((h) => (
          <span key={h} className="calor-hora">
            {h}
          </span>
        ))}
        {calor.dias.map((d, fila) => (
          <div key={d} className="calor-fila">
            <span className="calor-dia">{DIAS_CORTOS[d]}</span>
            {calor.horas.map((h, col) => {
              const v = calor.valores[fila][col];
              const t = v / calor.max;
              return (
                <span
                  key={h}
                  className={`calor-celda ${t > 0.55 ? "fuerte" : ""}`}
                  style={{ background: v ? `rgba(255,255,255,${0.1 + t * 0.9})` : undefined }}
                  onPointerEnter={() => setActivo({ d, h, v })}
                  onPointerDown={() => setActivo({ d, h, v })}
                  aria-label={`${DIAS_LARGOS[d]} ${h} hs: ${v} turnos`}
                  role="img"
                >
                  {v || ""}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <p className="calor-pie">
        {activo
          ? `${DIAS_LARGOS[activo.d]} de ${activo.h} a ${activo.h + 1} hs · ${activo.v} ${activo.v === 1 ? "turno" : "turnos"}`
          : "Turnos atendidos por día y hora, últimos 90 días. Más blanco = más movimiento."}
      </p>
    </div>
  );
}

// Variación contra el mismo tramo del mes pasado. `menosEsMejor` para la tasa de cancelación.
function Variacion({ actual, anterior, menosEsMejor = false, puntos = false }: { actual: number; anterior: number; menosEsMejor?: boolean; puntos?: boolean }) {
  if (!anterior && !actual) return <span className="kpi-var">Igual que el mes pasado</span>;
  // Un porcentaje se compara en puntos aunque el mes pasado haya sido 0; un número contra 0 no tiene variación
  if (!anterior && !puntos) return <span className="kpi-var">El mes pasado, a esta altura: 0</span>;
  const diff = puntos ? Math.round((actual - anterior) * 100) : Math.round(((actual - anterior) / anterior) * 100);
  if (diff === 0) return <span className="kpi-var">= igual que el mes pasado</span>;
  const sube = diff > 0;
  const bien = sube !== menosEsMejor;
  return (
    <span className={`kpi-var ${bien ? "bien" : "mal"}`}>
      {sube ? "▲" : "▼"} {Math.abs(diff)}
      {puntos ? " pts" : "%"} vs. mes pasado
    </span>
  );
}

export default function Estadisticas({ version }: { version: number }) {
  const router = useRouter();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>("dia");
  const [metrica, setMetrica] = useState<Metrica>("atendidos");

  // Se vuelve a pedir cuando cambia algo en la agenda (version)
  useEffect(() => {
    let vivo = true;
    fetch("/api/estadisticas", { cache: "no-store" })
      .then((r) => {
        if (r.status === 401) router.replace("/admin/login");
        return r.ok ? r.json() : Promise.reject();
      })
      .then((d) => vivo && (setDatos(d), setError(false)))
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
    };
  }, [version, router]);

  if (error && !datos) return <p className="vacio">No se pudieron cargar las estadísticas. Probá con Actualizar.</p>;
  if (!datos) {
    return (
      <div className="est">
        <div className="kpis">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="kpi esqueleto" />
          ))}
        </div>
        <div className="est-tarjeta esqueleto" style={{ height: 320 }} />
      </div>
    );
  }

  const { kpis } = datos;
  const met = datos.hayPrecios ? metrica : "atendidos";
  const puntos = datos.series[periodo];
  const total = puntos.reduce((s, p) => s + (met === "ingresos" ? p.ingresos : p.atendidos), 0);
  const conDatos = puntos.filter((p) => (met === "ingresos" ? p.ingresos : p.atendidos) > 0);
  const mejor = conDatos.length ? conDatos.reduce((a, b) => ((met === "ingresos" ? b.ingresos > a.ingresos : b.atendidos > a.atendidos) ? b : a)) : null;
  const fmt = (n: number) => (met === "ingresos" ? formatearPrecio(n) : String(n));
  const promedio = puntos.length ? total / puntos.length : 0;
  const nombrePeriodo = { dia: "por día", semana: "por semana", mes: "por mes" }[periodo];
  const ocupacion = datos.semanaQueViene.capacidad ? datos.semanaQueViene.reservados / datos.semanaQueViene.capacidad : 0;
  const maxServ = Math.max(1, ...datos.servicios.map((s) => s.cantidad));

  return (
    <div className="est">
      {/* --- Números del mes --- */}
      <p className="est-nota">Lo que va del mes, comparado con el mismo tramo del mes pasado.</p>
      <div className="kpis">
        <div className="kpi">
          <span className="kpi-titulo">Atendidos</span>
          <strong className="kpi-numero">{kpis.atendidos.actual}</strong>
          <Variacion {...kpis.atendidos} />
        </div>
        <div className="kpi">
          <span className="kpi-titulo">Ingresos estimados</span>
          <strong className="kpi-numero">{datos.hayPrecios ? formatearPrecio(kpis.ingresos.actual) : "—"}</strong>
          {datos.hayPrecios ? <Variacion {...kpis.ingresos} /> : <span className="kpi-var">Cargá precios en Servicios</span>}
        </div>
        <div className="kpi">
          <span className="kpi-titulo">Ticket promedio</span>
          <strong className="kpi-numero">{kpis.ticket.actual ? formatearPrecio(kpis.ticket.actual) : "—"}</strong>
          {kpis.ticket.actual ? <Variacion {...kpis.ticket} /> : <span className="kpi-var">Por cliente atendido</span>}
        </div>
        <div className="kpi">
          <span className="kpi-titulo">Cancelaciones</span>
          <strong className="kpi-numero">{porcentaje(kpis.cancelacion.actual)}</strong>
          <Variacion {...kpis.cancelacion} menosEsMejor puntos />
        </div>
        <div className="kpi">
          <span className="kpi-titulo">Clientes nuevos</span>
          <strong className="kpi-numero">{kpis.nuevos.actual}</strong>
          <Variacion {...kpis.nuevos} />
        </div>
        <div className="kpi">
          <span className="kpi-titulo">Vuelven</span>
          <strong className="kpi-numero">{porcentaje(kpis.recurrentes)}</strong>
          <span className="kpi-var">{porcentaje(kpis.online)} de las reservas, por la web</span>
        </div>
      </div>

      {/* --- Tendencia --- */}
      <section className="est-tarjeta">
        <div className="est-cabecera">
          <div>
            <h3>Tendencia</h3>
            <p className="est-sub">
              {met === "ingresos" ? "Ingresos" : "Turnos atendidos"} {nombrePeriodo} · {PERIODOS.find((x) => x.v === periodo)!.sub}
            </p>
          </div>
          <div className="est-controles">
            <div className="segmentos" role="group" aria-label="Agrupar por">
              {PERIODOS.map((x) => (
                <button key={x.v} type="button" className={periodo === x.v ? "activo" : ""} onClick={() => setPeriodo(x.v)} aria-pressed={periodo === x.v}>
                  {x.t}
                </button>
              ))}
            </div>
            {datos.hayPrecios && (
              <div className="segmentos" role="group" aria-label="Qué medir">
                {(["atendidos", "ingresos"] as Metrica[]).map((x) => (
                  <button key={x} type="button" className={met === x ? "activo" : ""} onClick={() => setMetrica(x)} aria-pressed={met === x}>
                    {x === "atendidos" ? "Turnos" : "Ingresos"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="est-resumen">
          <div>
            <span>Total</span>
            <strong>{fmt(total)}</strong>
          </div>
          <div>
            <span>Promedio {nombrePeriodo}</span>
            <strong>{met === "ingresos" ? formatearPrecio(Math.round(promedio)) : promedio.toFixed(1).replace(".", ",")}</strong>
          </div>
          <div>
            <span>Mejor</span>
            <strong>{mejor ? `${mejor.etiqueta} · ${fmt(met === "ingresos" ? mejor.ingresos : mejor.atendidos)}` : "—"}</strong>
          </div>
        </div>

        <GraficoBarras key={`${periodo}-${met}`} puntos={puntos} metrica={met} />
      </section>

      <div className="est-grilla">
        {/* --- Horarios con más movimiento --- */}
        <section className="est-tarjeta">
          <h3>Horarios más pedidos</h3>
          <MapaCalor calor={datos.calor} />
        </section>

        {/* --- Próximos 7 días --- */}
        <section className="est-tarjeta">
          <h3>Próximos 7 días</h3>
          <p className="est-grande">{porcentaje(ocupacion)}</p>
          <div className="medidor" role="img" aria-label={`Agenda ocupada al ${porcentaje(ocupacion)}`}>
            <span style={{ transform: `scaleX(${Math.min(1, ocupacion)})` }} />
          </div>
          <p className="est-sub">
            {datos.semanaQueViene.reservados} de {datos.semanaQueViene.capacidad} medias horas reservadas
            {datos.semanaQueViene.ingresos > 0 && ` · ${formatearPrecio(datos.semanaQueViene.ingresos)} previstos`}
          </p>
        </section>
      </div>

      <div className="est-grilla">
        {/* --- Servicios --- */}
        <section className="est-tarjeta">
          <h3>Servicios</h3>
          <p className="est-sub">Atendidos en los últimos 12 meses</p>
          {datos.servicios.length ? (
            <div className="ranking">
              {datos.servicios.map((s) => (
                <div key={s.nombre} className="ranking-fila">
                  <div className="ranking-texto">
                    <span>{s.nombre}</span>
                    <strong>
                      {s.cantidad}
                      {s.ingresos > 0 && <em> · {formatearPrecio(s.ingresos)}</em>}
                    </strong>
                  </div>
                  <div className="ranking-barra">
                    <span style={{ transform: `scaleX(${s.cantidad / maxServ})` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="vacio">Todavía no hay turnos atendidos.</p>
          )}
        </section>

        {/* --- Mejores clientes --- */}
        <section className="est-tarjeta">
          <h3>Clientes más fieles</h3>
          <p className="est-sub">Más visitas en los últimos 12 meses</p>
          {datos.topClientes.length ? (
            <ol className="top">
              {datos.topClientes.map((c, i) => (
                <li key={c.telefono}>
                  <span className="top-pos">{i + 1}</span>
                  <div className="top-info">
                    <strong>{c.nombre}</strong>
                    <span>Última vez: {format(fechaDe(c.ultima), "dd/MM/yyyy")}</span>
                  </div>
                  <span className="top-visitas">{c.visitas}</span>
                  <a href={linkWhatsapp(c.telefono)} target="_blank" rel="noopener noreferrer" className="top-wa" aria-label={`WhatsApp a ${c.nombre}`}>
                    ↗
                  </a>
                </li>
              ))}
            </ol>
          ) : (
            <p className="vacio">Todavía no hay turnos atendidos.</p>
          )}
        </section>
      </div>
    </div>
  );
}
