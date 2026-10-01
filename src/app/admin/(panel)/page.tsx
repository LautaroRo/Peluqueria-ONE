"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, getDay, isSameDay, startOfToday } from "date-fns";
import Modal from "../../components/modal";
import { Calendario, SelectorHorario } from "../../components/calendario";
import { ahoraEnCordoba, compararTurnos, horariosDelDia, minutosDeHora } from "../../lib/horarios";
import { fechaLarga } from "../../lib/formato";
import "./estilos.css";

interface Turno {
  _id: string;
  Nombre_Cliente: string;
  Telefono_Cliente: number;
  Turno: { Dia: string; Hora: string };
}

interface Cliente {
  _id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  createdAt?: string;
}

interface HistorialItem extends Turno {
  Estado: "Success" | "Cancelled";
  createdAt: string;
}

type Vista = "agenda" | "clientes" | "historial";
type Accion = { tipo: "atendido" | "cancelar"; turno: Turno } | null;

const fechaDe = (dia: string) => new Date(`${dia}T12:00:00`);

// wa.me necesita el número internacional: a los de Argentina sin código de país se les agrega 549
const linkWhatsapp = (tel: string | number) => {
  const d = String(tel).replace(/\D/g, "");
  return `https://wa.me/${d.startsWith("54") ? d : `549${d}`}`;
};

const IconoWhatsapp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.3 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.8a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.72.97 1-3.62-.24-.37a9.8 9.8 0 0 1-1.5-5.22c0-5.42 4.42-9.83 9.84-9.83 2.63 0 5.1 1.02 6.95 2.88a9.77 9.77 0 0 1 2.88 6.96c0 5.42-4.42 9.82-9.84 9.82zm8.37-18.2A11.76 11.76 0 0 0 12.05.13C5.5.13.17 5.46.17 12.01c0 2.1.55 4.14 1.6 5.94L.07 24l6.2-1.62a11.84 11.84 0 0 0 5.77 1.47c6.55 0 11.88-5.33 11.88-11.88 0-3.17-1.24-6.16-3.5-8.4z" />
  </svg>
);

export default function AdminPage() {
  const router = useRouter();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<Vista>("agenda");
  const [busqueda, setBusqueda] = useState("");
  const [filtroHist, setFiltroHist] = useState<"todos" | "Success" | "Cancelled">("todos");
  const [accion, setAccion] = useState<Accion>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; titulo: string; texto: string } | null>(null);

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
  const deHoy = turnos.filter((t) => t.Turno.Dia === hoyStr).sort((a, b) => compararTurnos(a.Turno, b.Turno));
  const proximo = deHoy.find((t) => minutosDeHora(t.Turno.Hora) + 30 > ahoraMin);
  const atendidos = historial.filter((h) => h.Estado === "Success").length;

  // Agenda agrupada por día
  const porDia = useMemo(() => {
    const mapa = new Map<string, Turno[]>();
    for (const t of [...turnos].sort((a, b) => compararTurnos(a.Turno, b.Turno))) {
      if (!mapa.has(t.Turno.Dia)) mapa.set(t.Turno.Dia, []);
      mapa.get(t.Turno.Dia)!.push(t);
    }
    return [...mapa.entries()];
  }, [turnos]);

  const q = busqueda.trim().toLowerCase();
  const clientesFiltrados = clientes.filter((c) => !q || `${c.nombre} ${c.apellido} ${c.telefono}`.toLowerCase().includes(q));
  const historialFiltrado = historial.filter(
    (h) =>
      (filtroHist === "todos" || h.Estado === filtroHist) &&
      (!q || `${h.Nombre_Cliente} ${h.Telefono_Cliente}`.toLowerCase().includes(q)),
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

  const abrirEdicion = (t: Turno) => {
    const f = fechaDe(t.Turno.Dia);
    setEditando(t);
    setMes(f);
    setDia(f);
    setHora(t.Turno.Hora);
    cargarOcupados(t.Turno.Dia);
  };

  const cargarOcupados = async (d: string) => {
    try {
      const res = await fetch(`/api/turnos?dia=${d}`, { cache: "no-store" });
      const data = await res.json();
      setOcupados(Array.isArray(data) ? data.map((x: { Turno: { Hora: string } }) => x.Turno.Hora) : []);
    } catch {
      setOcupados([]);
    }
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

  // El horario actual del turno que se edita no cuenta como ocupado
  const ocupadosEdicion =
    editando && dia && format(dia, "yyyy-MM-dd") === editando.Turno.Dia ? ocupados.filter((h) => h !== editando.Turno.Hora) : ocupados;
  const esHoyEdicion = dia && isSameDay(dia, startOfToday());

  // Función y no componente: declarado adentro, React lo remontaría en cada render
  const filaTurno = (t: Turno, destacado = false) => (
    <div key={t._id} className={`turno ${destacado ? "turno--proximo" : ""}`}>
      <span className="turno-hora">{t.Turno.Hora}</span>
      <div className="turno-info">
        <strong>{t.Nombre_Cliente}</strong>
        <a href={linkWhatsapp(t.Telefono_Cliente)} target="_blank" rel="noopener noreferrer" className="turno-tel">
          <IconoWhatsapp /> {t.Telefono_Cliente}
        </a>
      </div>
      <div className="turno-acciones">
        <button type="button" className="accion accion--ok" onClick={() => setAccion({ tipo: "atendido", turno: t })} title="Marcar como atendido">
          ✓ <span>Atendido</span>
        </button>
        <button type="button" className="accion" onClick={() => abrirEdicion(t)} title="Reprogramar">
          ↻ <span>Mover</span>
        </button>
        <button type="button" className="accion accion--borrar" onClick={() => setAccion({ tipo: "cancelar", turno: t })} title="Cancelar turno">
          ✕ <span>Cancelar</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="panel">
      <header className="panel-cabecera">
        <div>
          <p className="panel-logo">ONE</p>
          <p className="panel-fecha">{fechaLarga(new Date())}</p>
        </div>
        <div className="panel-botones">
          <button type="button" className="btn btn-borde btn-chico" onClick={cargar} disabled={cargando}>
            {cargando ? <span className="cargando-icono" /> : "Actualizar"}
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
          { n: atendidos, t: "Atendidos" },
          { n: clientes.length, t: "Clientes" },
        ].map((s, i) => (
          <div key={s.t} className="stat" style={{ animationDelay: `${i * 70}ms` }}>
            <span className="stat-numero">{cargando && !turnos.length ? "–" : s.n}</span>
            <span className="stat-texto">{s.t}</span>
          </div>
        ))}
      </section>

      {/* Hoy */}
      <section className="hoy">
        <div className="hoy-cabecera">
          <h2>Hoy</h2>
          {proximo && (
            <span className="hoy-proximo">
              Próximo: <strong>{proximo.Turno.Hora}</strong> · {proximo.Nombre_Cliente}
            </span>
          )}
        </div>
        {deHoy.length ? (
          <div className="lista">
            {deHoy.map((t) => filaTurno(t, t._id === proximo?._id))}
          </div>
        ) : (
          <p className="vacio">{cargando ? "Cargando…" : "No hay turnos para hoy."}</p>
        )}
      </section>

      {/* Pestañas */}
      <nav className="tabs" aria-label="Secciones del panel">
        {(["agenda", "clientes", "historial"] as Vista[]).map((v) => (
          <button key={v} type="button" className={`tab ${vista === v ? "activa" : ""}`} onClick={() => setVista(v)}>
            {v === "agenda" ? "Agenda" : v === "clientes" ? "Clientes" : "Historial"}
          </button>
        ))}
      </nav>

      {vista !== "agenda" && (
        <div className="filtros">
          <input
            className="buscador"
            type="search"
            placeholder={vista === "clientes" ? "Buscar por nombre o teléfono…" : "Buscar en el historial…"}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {vista === "historial" && (
            <div className="chips">
              {(["todos", "Success", "Cancelled"] as const).map((f) => (
                <button key={f} type="button" className={`chip ${filtroHist === f ? "activo" : ""}`} onClick={() => setFiltroHist(f)}>
                  {f === "todos" ? "Todos" : f === "Success" ? "Atendidos" : "Cancelados"}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <section key={vista} className="vista">
        {vista === "agenda" &&
          (porDia.length ? (
            porDia.map(([d, lista]) => (
              <div key={d} className="dia-grupo">
                <p className="dia-titulo">
                  {fechaLarga(fechaDe(d))}
                  <span>{lista.length} {lista.length === 1 ? "turno" : "turnos"}</span>
                </p>
                <div className="lista">
                  {lista.map((t) => filaTurno(t))}
                </div>
              </div>
            ))
          ) : (
            <p className="vacio">{cargando ? "Cargando…" : "No hay turnos pendientes."}</p>
          ))}

        {vista === "clientes" &&
          (clientesFiltrados.length ? (
            <div className="lista">
              {clientesFiltrados.map((c) => (
                <div key={c._id} className="turno">
                  <span className="turno-hora turno-inicial">{c.nombre.charAt(0).toUpperCase()}</span>
                  <div className="turno-info">
                    <strong>
                      {c.nombre} {c.apellido !== "—" ? c.apellido : ""}
                    </strong>
                    <span className="turno-sub">Desde {c.createdAt ? format(new Date(c.createdAt), "dd/MM/yyyy") : "—"}</span>
                  </div>
                  <a href={linkWhatsapp(c.telefono)} target="_blank" rel="noopener noreferrer" className="accion">
                    <IconoWhatsapp /> <span>{c.telefono}</span>
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="vacio">{q ? "Nadie coincide con la búsqueda." : "Todavía no hay clientes."}</p>
          ))}

        {vista === "historial" &&
          (historialFiltrado.length ? (
            <div className="lista">
              {historialFiltrado.map((h) => (
                <div key={h._id} className="turno turno--hist">
                  <span className="turno-hora">{h.Turno.Hora}</span>
                  <div className="turno-info">
                    <strong>{h.Nombre_Cliente}</strong>
                    <span className="turno-sub">{format(fechaDe(h.Turno.Dia), "dd/MM/yyyy")} · {h.Telefono_Cliente}</span>
                  </div>
                  <span className={`estado ${h.Estado === "Success" ? "estado--ok" : ""}`}>
                    {h.Estado === "Success" ? "Atendido" : "Cancelado"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="vacio">El historial está vacío.</p>
          ))}
      </section>

      {/* Reprogramar */}
      {editando && (
        <div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Reprogramar turno">
          <div className="modal reprogramar">
            <div className="reprogramar-cabecera">
              <div>
                <p className="etiqueta">Reprogramar</p>
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
                cargarOcupados(format(d, "yyyy-MM-dd"));
              }}
            />

            {dia && (
              <div className="reprogramar-horarios">
                <SelectorHorario
                  horarios={horariosDelDia(getDay(dia))}
                  ocupados={ocupadosEdicion}
                  elegido={hora}
                  onElegir={setHora}
                  pasadosHasta={esHoyEdicion ? ahoraMin : -1}
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
            {accion.turno.Nombre_Cliente} · {format(fechaDe(accion.turno.Turno.Dia), "d/MM")} a las {accion.turno.Turno.Hora} hs.
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
