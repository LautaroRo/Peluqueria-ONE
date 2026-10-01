"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, getDay, isSameDay, startOfToday } from "date-fns";
import Modal from "../../components/modal";
import { Calendario, SelectorHorario } from "../../components/calendario";
import { ahoraEnCordoba, compararTurnos, horariosDelDia, minutosDeHora } from "../../lib/horarios";
import { fechaLarga } from "../../lib/formato";
import { formatearPrecio } from "../../lib/servicios";
import { sumarDias } from "../../lib/estadisticas";
import Estadisticas from "./componentes/Estadisticas";
import Servicios from "./componentes/Servicios";
import Bloqueos from "./componentes/Bloqueos";
import NuevoTurno from "./componentes/NuevoTurno";
import FichaCliente from "./componentes/FichaCliente";
import { IconoWhatsapp, descargarCSV, fechaDe, linkWhatsapp, mensajeRecordatorio, servicioDe } from "./componentes/util";
import type { Aviso, Cliente, HistorialItem, Turno } from "./componentes/tipos";
import "./estilos.css";

type Vista = "agenda" | "estadisticas" | "clientes" | "historial" | "servicios" | "bloqueos";
type Accion = { tipo: "atendido" | "cancelar"; turno: Turno } | null;
type Orden = "recientes" | "visitas" | "nombre";

const VISTAS: { v: Vista; t: string }[] = [
  { v: "agenda", t: "Agenda" },
  { v: "estadisticas", t: "Estadísticas" },
  { v: "clientes", t: "Clientes" },
  { v: "historial", t: "Historial" },
  { v: "servicios", t: "Servicios" },
  { v: "bloqueos", t: "Bloqueos" },
];

export default function AdminPage() {
  const router = useRouter();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [cargando, setCargando] = useState(true);
  // Sube con cada cambio en la agenda: las estadísticas se vuelven a pedir solas
  const [version, setVersion] = useState(0);
  const [vista, setVista] = useState<Vista>("agenda");
  const [busqueda, setBusqueda] = useState("");
  const [filtroHist, setFiltroHist] = useState<"todos" | "Success" | "Cancelled">("todos");
  const [orden, setOrden] = useState<Orden>("recientes");
  const [accion, setAccion] = useState<Accion>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [nuevoTurno, setNuevoTurno] = useState(false);
  const [ficha, setFicha] = useState<Cliente | null>(null);

  // Reprogramar
  const [editando, setEditando] = useState<Turno | null>(null);
  const [mes, setMes] = useState(startOfToday());
  const [dia, setDia] = useState<Date | null>(null);
  const [hora, setHora] = useState("");
  const [ocupados, setOcupados] = useState<string[]>([]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [rT, rC, rH] = await Promise.all([
        fetch("/api/turnos", { cache: "no-store" }),
        fetch("/api/clientes", { cache: "no-store" }),
        fetch("/api/historial", { cache: "no-store" }),
      ]);
      // La sesión venció o se cambió la contraseña
      if ([rT, rC, rH].some((r) => r.status === 401)) {
        router.replace("/admin/login");
        return;
      }
      const [dT, dC, dH] = await Promise.all([rT.json(), rC.json(), rH.json()]);
      setTurnos(Array.isArray(dT) ? dT : []);
      setClientes(dC?.success ? dC.clientes : []);
      setHistorial(Array.isArray(dH) ? dH : []);
      setVersion((v) => v + 1);
    } catch {
      setAviso({ ok: false, titulo: "Sin conexión", texto: "No se pudieron cargar los datos. Probá con Actualizar." });
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    // Primera carga y cada 2 minutos, para ver las reservas nuevas sin tocar nada
    const primero = window.setTimeout(cargar, 0);
    const timer = window.setInterval(cargar, 120_000);
    return () => {
      window.clearTimeout(primero);
      window.clearInterval(timer);
    };
  }, [cargar]);

  const salir = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  };

  const { dia: hoyStr, minutos: ahoraMin } = ahoraEnCordoba();
  const mananaStr = sumarDias(hoyStr, 1);
  const deHoy = turnos.filter((t) => t.Turno.Dia === hoyStr).sort((a, b) => compararTurnos(a.Turno, b.Turno));
  const proximo = deHoy.find((t) => minutosDeHora(t.Turno.Hora) + servicioDe(t).Duracion > ahoraMin);
  const atendidosHoy = historial.filter((h) => h.Estado === "Success" && h.Turno.Dia === hoyStr);
  const atendidosMes = historial.filter((h) => h.Estado === "Success" && h.Turno.Dia.startsWith(hoyStr.slice(0, 7))).length;
  const previstoHoy = [...deHoy, ...atendidosHoy].reduce((s, t) => s + (servicioDe(t).Precio ?? 0), 0);

  // Agenda agrupada por día
  const porDia = useMemo(() => {
    const mapa = new Map<string, Turno[]>();
    for (const t of [...turnos].sort((a, b) => compararTurnos(a.Turno, b.Turno))) {
      if (!mapa.has(t.Turno.Dia)) mapa.set(t.Turno.Dia, []);
      mapa.get(t.Turno.Dia)!.push(t);
    }
    return [...mapa.entries()];
  }, [turnos]);

  // Visitas por teléfono, una sola pasada por el historial
  const visitas = useMemo(() => {
    const m = new Map<number, { n: number; ultima: string }>();
    for (const h of historial) {
      if (h.Estado !== "Success") continue;
      const v = m.get(h.Telefono_Cliente) ?? { n: 0, ultima: "" };
      v.n++;
      if (h.Turno.Dia > v.ultima) v.ultima = h.Turno.Dia;
      m.set(h.Telefono_Cliente, v);
    }
    return m;
  }, [historial]);

  const q = busqueda.trim().toLowerCase();
  const clientesFiltrados = useMemo(() => {
    const lista = clientes.filter((c) => !q || `${c.nombre} ${c.apellido} ${c.telefono}`.toLowerCase().includes(q));
    if (orden === "visitas") lista.sort((a, b) => (visitas.get(Number(b.telefono))?.n ?? 0) - (visitas.get(Number(a.telefono))?.n ?? 0));
    if (orden === "nombre") lista.sort((a, b) => `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`, "es"));
    return lista;
  }, [clientes, q, orden, visitas]);
  const historialFiltrado = historial.filter(
    (h) =>
      (filtroHist === "todos" || h.Estado === filtroHist) &&
      (!q || `${h.Nombre_Cliente} ${h.Telefono_Cliente} ${servicioDe(h).Nombre}`.toLowerCase().includes(q)),
  );

  const ejecutarAccion = async () => {
    if (!accion) return;
    const { tipo, turno } = accion;
    setAccion(null);
    const res = await fetch(`/api/turnos?id=${turno._id}&accion=${tipo === "atendido" ? "Success" : "Cancelled"}`, { method: "DELETE" });
    if (res.ok) {
      await cargar();
      setAviso({
        ok: true,
        titulo: tipo === "atendido" ? "Marcado como atendido" : "Turno cancelado",
        texto: `${turno.Nombre_Cliente} · ${turno.Turno.Hora} hs. Quedó en el historial.`,
      });
    } else {
      setAviso({ ok: false, titulo: "No se pudo", texto: "Probá de nuevo en un momento." });
    }
  };

  const cargarOcupados = async (d: string, excluir: string) => {
    try {
      const res = await fetch(`/api/turnos?dia=${d}&excluir=${excluir}`, { cache: "no-store" });
      const data = await res.json();
      setOcupados(Array.isArray(data) ? data.map((x: { Turno: { Hora: string } }) => x.Turno.Hora) : []);
    } catch {
      setOcupados([]);
    }
  };

  const abrirEdicion = (t: Turno) => {
    const f = fechaDe(t.Turno.Dia);
    setEditando(t);
    setMes(f);
    setDia(f);
    setHora(t.Turno.Hora);
    cargarOcupados(t.Turno.Dia, t._id);
  };

  const guardarEdicion = async () => {
    if (!editando || !dia || !hora) return;
    const res = await fetch(`/api/turnos?id=${editando._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Turno: { Dia: format(dia, "yyyy-MM-dd"), Hora: hora } }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setEditando(null);
      await cargar();
      setAviso({ ok: true, titulo: "Turno reprogramado", texto: `${editando.Nombre_Cliente} · ${fechaLarga(dia).toLowerCase()} a las ${hora} hs.` });
    } else {
      setAviso({ ok: false, titulo: "No se pudo reprogramar", texto: data?.error ?? "Probá con otro horario." });
    }
  };

  const esHoyEdicion = dia && isSameDay(dia, startOfToday());

  const exportarClientes = () =>
    descargarCSV("clientes", [
      ["Nombre", "Apellido", "Teléfono", "Visitas", "Última visita", "Cliente desde", "Notas"],
      ...clientesFiltrados.map((c) => {
        const v = visitas.get(Number(c.telefono));
        return [
          c.nombre,
          c.apellido !== "—" ? c.apellido : "",
          c.telefono,
          v?.n ?? 0,
          v?.ultima ? format(fechaDe(v.ultima), "dd/MM/yyyy") : "",
          c.createdAt ? format(new Date(c.createdAt), "dd/MM/yyyy") : "",
          c.notas ?? "",
        ];
      }),
    ]);

  const exportarHistorial = () =>
    descargarCSV("historial", [
      ["Fecha", "Hora", "Cliente", "Teléfono", "Servicio", "Precio", "Estado"],
      ...historialFiltrado.map((h) => [
        format(fechaDe(h.Turno.Dia), "dd/MM/yyyy"),
        h.Turno.Hora,
        h.Nombre_Cliente,
        h.Telefono_Cliente,
        servicioDe(h).Nombre,
        servicioDe(h).Precio ?? "",
        h.Estado === "Success" ? "Atendido" : "Cancelado",
      ]),
    ]);

  // Función y no componente: declarado adentro, React lo remontaría en cada render
  const filaTurno = (t: Turno, destacado = false) => {
    const s = servicioDe(t);
    return (
      <div key={t._id} className={`turno ${destacado ? "turno--proximo" : ""}`}>
        <span className="turno-hora">{t.Turno.Hora}</span>
        <div className="turno-info">
          <strong>{t.Nombre_Cliente}</strong>
          <span className="turno-sub">
            <span className="etiqueta-servicio">{s.Nombre}</span>
            {s.Duracion > 30 && <span>{s.Duracion} min</span>}
            {s.Precio != null && <span>{formatearPrecio(s.Precio)}</span>}
            {t.Origen === "panel" && <span title="Cargado desde el panel">· panel</span>}
          </span>
        </div>
        <div className="turno-acciones">
          <button type="button" className="accion accion--ok" onClick={() => setAccion({ tipo: "atendido", turno: t })} title="Marcar como atendido">
            ✓ <span>Atendido</span>
          </button>
          <a
            href={linkWhatsapp(t.Telefono_Cliente, mensajeRecordatorio(t, hoyStr, mananaStr))}
            target="_blank"
            rel="noopener noreferrer"
            className="accion"
            title={`Mandar recordatorio por WhatsApp a ${t.Telefono_Cliente}`}
          >
            <IconoWhatsapp /> <span>Recordar</span>
          </a>
          <button type="button" className="accion" onClick={() => abrirEdicion(t)} title="Reprogramar">
            ↻ <span>Mover</span>
          </button>
          <button type="button" className="accion accion--borrar" onClick={() => setAccion({ tipo: "cancelar", turno: t })} title="Cancelar turno">
            ✕ <span>Cancelar</span>
          </button>
        </div>
      </div>
    );
  };

  const conBuscador = vista === "clientes" || vista === "historial";

  return (
    <div className="panel">
      <header className="panel-cabecera">
        <div>
          <p className="panel-logo">ONE</p>
          <p className="panel-fecha">{fechaLarga(new Date())}</p>
        </div>
        <div className="panel-botones">
          <button type="button" className="btn btn-blanco btn-chico" onClick={() => setNuevoTurno(true)}>
            + Turno
          </button>
          <button type="button" className="btn btn-borde btn-chico" onClick={cargar} disabled={cargando} aria-label="Actualizar">
            {cargando ? <span className="cargando-icono" /> : "↻"}
          </button>
          <button type="button" className="btn btn-borde btn-chico" onClick={salir}>
            Salir
          </button>
        </div>
      </header>

      <section className="stats">
        {[
          { n: deHoy.length, t: "Turnos hoy" },
          { n: turnos.length, t: "Pendientes" },
          { n: atendidosMes, t: "Atendidos este mes" },
          { n: clientes.length, t: "Clientes" },
        ].map((s, i) => (
          <div key={s.t} className="stat" style={{ animationDelay: `${i * 70}ms` }}>
            <span className="stat-numero">{cargando && !turnos.length && !historial.length ? "–" : s.n}</span>
            <span className="stat-texto">{s.t}</span>
          </div>
        ))}
      </section>

      {/* Hoy */}
      <section className="hoy">
        <div className="hoy-cabecera">
          <div>
            <h2>Hoy</h2>
            <p className="hoy-resumen">
              {atendidosHoy.length} {atendidosHoy.length === 1 ? "atendido" : "atendidos"} · {deHoy.length} por atender
              {previstoHoy > 0 && ` · ${formatearPrecio(previstoHoy)} estimado`}
            </p>
          </div>
          {proximo && (
            <span className="hoy-proximo">
              Próximo: <strong>{proximo.Turno.Hora}</strong> · {proximo.Nombre_Cliente}
            </span>
          )}
        </div>
        {deHoy.length + atendidosHoy.length > 0 && (
          <div className="hoy-progreso" role="img" aria-label={`${atendidosHoy.length} de ${deHoy.length + atendidosHoy.length} turnos de hoy atendidos`}>
            <span style={{ transform: `scaleX(${atendidosHoy.length / (deHoy.length + atendidosHoy.length)})` }} />
          </div>
        )}
        {deHoy.length ? (
          <div className="lista">{deHoy.map((t) => filaTurno(t, t._id === proximo?._id))}</div>
        ) : (
          <p className="vacio">{cargando ? "Cargando…" : atendidosHoy.length ? "Listo por hoy. ¡Buen trabajo!" : "No hay turnos para hoy."}</p>
        )}
      </section>

      {/* Pestañas */}
      <nav className="tabs" aria-label="Secciones del panel">
        {VISTAS.map(({ v, t }) => (
          <button
            key={v}
            type="button"
            className={`tab ${vista === v ? "activa" : ""}`}
            onClick={() => {
              setVista(v);
              setBusqueda("");
            }}
          >
            {t}
          </button>
        ))}
      </nav>

      {conBuscador && (
        <div className="filtros">
          <input
            className="buscador"
            type="search"
            placeholder={vista === "clientes" ? "Buscar por nombre o teléfono…" : "Buscar por cliente, teléfono o servicio…"}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <div className="chips">
            {vista === "historial"
              ? (["todos", "Success", "Cancelled"] as const).map((f) => (
                  <button key={f} type="button" className={`chip ${filtroHist === f ? "activo" : ""}`} onClick={() => setFiltroHist(f)}>
                    {f === "todos" ? "Todos" : f === "Success" ? "Atendidos" : "Cancelados"}
                  </button>
                ))
              : (["recientes", "visitas", "nombre"] as Orden[]).map((o) => (
                  <button key={o} type="button" className={`chip ${orden === o ? "activo" : ""}`} onClick={() => setOrden(o)}>
                    {o === "recientes" ? "Recientes" : o === "visitas" ? "Más visitas" : "A-Z"}
                  </button>
                ))}
            <button type="button" className="chip" onClick={vista === "clientes" ? exportarClientes : exportarHistorial} title="Descargar para Excel">
              ⤓ Excel
            </button>
          </div>
        </div>
      )}

      <section key={vista} className="vista">
        {vista === "agenda" &&
          (porDia.length ? (
            porDia.map(([d, lista]) => (
              <div key={d} className="dia-grupo">
                <p className="dia-titulo">
                  {d === hoyStr ? "Hoy" : d === mananaStr ? "Mañana" : fechaLarga(fechaDe(d))}
                  <span>
                    {lista.length} {lista.length === 1 ? "turno" : "turnos"}
                    {lista.some((t) => servicioDe(t).Precio != null) && ` · ${formatearPrecio(lista.reduce((s, t) => s + (servicioDe(t).Precio ?? 0), 0))}`}
                  </span>
                </p>
                <div className="lista">{lista.map((t) => filaTurno(t))}</div>
              </div>
            ))
          ) : (
            <p className="vacio">{cargando ? "Cargando…" : "No hay turnos pendientes."}</p>
          ))}

        {vista === "estadisticas" && <Estadisticas version={version} />}

        {vista === "clientes" &&
          (clientesFiltrados.length ? (
            <div className="lista">
              {clientesFiltrados.map((c) => {
                const v = visitas.get(Number(c.telefono));
                return (
                  <button key={c._id} type="button" className="turno turno--boton" onClick={() => setFicha(c)}>
                    <span className="turno-hora turno-inicial">{c.nombre.charAt(0).toUpperCase()}</span>
                    <span className="turno-info">
                      <strong>
                        {c.nombre} {c.apellido !== "—" ? c.apellido : ""}
                      </strong>
                      <span className="turno-sub">
                        {v ? `${v.n} ${v.n === 1 ? "visita" : "visitas"} · última ${format(fechaDe(v.ultima), "dd/MM/yy")}` : "Sin visitas todavía"}
                        {c.notas && " · con notas"}
                      </span>
                    </span>
                    <span className="turno-tel">{c.telefono}</span>
                    <span className="turno-flecha" aria-hidden>
                      →
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="vacio">{q ? "Nadie coincide con la búsqueda." : "Todavía no hay clientes."}</p>
          ))}

        {vista === "historial" &&
          (historialFiltrado.length ? (
            <div className="lista">
              {historialFiltrado.slice(0, 200).map((h) => (
                <div key={h._id} className="turno turno--hist">
                  <span className="turno-hora">{h.Turno.Hora}</span>
                  <div className="turno-info">
                    <strong>{h.Nombre_Cliente}</strong>
                    <span className="turno-sub">
                      {format(fechaDe(h.Turno.Dia), "dd/MM/yyyy")} · {servicioDe(h).Nombre}
                      {servicioDe(h).Precio != null && ` · ${formatearPrecio(servicioDe(h).Precio!)}`}
                    </span>
                  </div>
                  <span className={`estado ${h.Estado === "Success" ? "estado--ok" : ""}`}>{h.Estado === "Success" ? "Atendido" : "Cancelado"}</span>
                </div>
              ))}
              {historialFiltrado.length > 200 && <p className="vacio">Se muestran los últimos 200. Para ver todo, descargalo en Excel.</p>}
            </div>
          ) : (
            <p className="vacio">{q || filtroHist !== "todos" ? "Nada coincide con el filtro." : "El historial está vacío."}</p>
          ))}

        {vista === "servicios" && <Servicios onAviso={setAviso} />}

        {vista === "bloqueos" && <Bloqueos onAviso={setAviso} onCambio={() => setVersion((v) => v + 1)} />}
      </section>

      {/* Reprogramar */}
      {editando && (
        <div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Reprogramar turno">
          <div className="modal reprogramar">
            <div className="reprogramar-cabecera">
              <div>
                <p className="etiqueta">Reprogramar · {servicioDe(editando).Nombre}</p>
                <h3>{editando.Nombre_Cliente}</h3>
              </div>
              <button type="button" className="cerrar" onClick={() => setEditando(null)} aria-label="Cerrar">
                ✕
              </button>
            </div>

            <Calendario
              mes={mes}
              onMes={setMes}
              seleccion={dia}
              onSeleccion={(d) => {
                setDia(d);
                setHora("");
                cargarOcupados(format(d, "yyyy-MM-dd"), editando._id);
              }}
            />

            {dia && (
              <div className="reprogramar-horarios">
                <SelectorHorario
                  horarios={horariosDelDia(getDay(dia))}
                  ocupados={ocupados}
                  elegido={hora}
                  onElegir={setHora}
                  pasadosHasta={esHoyEdicion ? ahoraMin : -1}
                  duracion={servicioDe(editando).Duracion}
                />
              </div>
            )}

            <div className="modal-acciones">
              <button type="button" className="btn btn-borde" onClick={() => setEditando(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-blanco" onClick={guardarEdicion} disabled={!dia || !hora}>
                {hora ? `Guardar ${hora}` : "Elegí horario"}
              </button>
            </div>
          </div>
        </div>
      )}

      {nuevoTurno && (
        <NuevoTurno
          clientes={clientes}
          onCerrar={() => setNuevoTurno(false)}
          onCreado={async (texto) => {
            setNuevoTurno(false);
            await cargar();
            setAviso({ ok: true, titulo: "Turno cargado", texto });
          }}
        />
      )}

      {ficha && (
        <FichaCliente
          cliente={ficha}
          historial={historial}
          turnos={turnos}
          onCerrar={() => setFicha(null)}
          onNotas={(id, notas) => setClientes((l) => l.map((c) => (c._id === id ? { ...c, notas } : c)))}
        />
      )}

      {accion && (
        <Modal
          tipo={accion.tipo === "atendido" ? "ok" : "aviso"}
          titulo={accion.tipo === "atendido" ? "¿Marcar como atendido?" : "¿Cancelar el turno?"}
          onCerrar={() => setAccion(null)}
          acciones={
            <>
              <button type="button" className="btn btn-borde" onClick={() => setAccion(null)}>
                Volver
              </button>
              <button type="button" className="btn btn-blanco" onClick={ejecutarAccion}>
                Sí, confirmar
              </button>
            </>
          }
        >
          <p>
            {accion.turno.Nombre_Cliente} · {servicioDe(accion.turno).Nombre} · {format(fechaDe(accion.turno.Turno.Dia), "d/MM")} a las{" "}
            {accion.turno.Turno.Hora} hs.
          </p>
        </Modal>
      )}

      {aviso && (
        <Modal
          tipo={aviso.ok ? "ok" : "error"}
          titulo={aviso.titulo}
          onCerrar={() => setAviso(null)}
          acciones={
            <button type="button" className="btn btn-blanco" onClick={() => setAviso(null)}>
              Listo
            </button>
          }
        >
          <p>{aviso.texto}</p>
        </Modal>
      )}
    </div>
  );
}
