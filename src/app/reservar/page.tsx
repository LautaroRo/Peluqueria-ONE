"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, getDay, isBefore, isSameDay, startOfToday } from "date-fns";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import Modal, { TipoModal } from "../components/modal";
import { Calendario, SelectorHorario } from "../components/calendario";
import { abreElDia, ahoraEnCordoba, horariosDelDia, instanteTurno } from "../lib/horarios";
import { Servicio, formatearDuracion, formatearPrecio } from "../lib/servicios";
import { DIRECCION } from "../lib/local";
import { fechaLarga as formatearFecha } from "../lib/formato";
import "./estilos.css";

type Aviso = { tipo: TipoModal; titulo: string; mensaje: string; alCerrar?: () => void } | null;

const PASOS = ["Servicio", "Día", "Horario", "Tus datos"];

// Link para sumar el turno a Google Calendar
function linkCalendario(dia: string, hora: string, duracion: number, servicio: string) {
  const inicio = instanteTurno(dia, hora);
  const fin = new Date(inicio.getTime() + duracion * 60_000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `${servicio} · ONE Peluquería`,
    dates: `${f(inicio)}/${f(fin)}`,
    details: "Turno con Héctor Rodríguez. Para modificarlo o cancelarlo, entrá a Mi turno en la web.",
    location: `${DIRECCION.calle}, ${DIRECCION.zona}`,
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

function Reservar() {
  const params = useSearchParams();
  const router = useRouter();

  const editId = params.get("edit");
  const nombreEdit = params.get("nombre") ?? "";
  const telEdit = (params.get("tel") ?? "").replace(/\D/g, "");
  // Al cambiar un turno el servicio no se toca: se respeta su duración
  const durEdit = Number(params.get("dur")) || 30;
  const servEdit = params.get("serv") || "Corte";
  const servPedido = params.get("servicio");

  const [paso, setPaso] = useState(editId ? 1 : 0);
  const [servicios, setServicios] = useState<Servicio[] | null>(null);
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [cerrados, setCerrados] = useState<Set<string>>(new Set());
  const [mes, setMes] = useState(startOfToday());
  const [dia, setDia] = useState<Date | null>(null);
  const [hora, setHora] = useState("");
  const [ocupados, setOcupados] = useState<string[]>([]);
  const [cargandoHoras, setCargandoHoras] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [datos, setDatos] = useState({ nombre: "", apellido: "", telefono: "" });
  const [aviso, setAviso] = useState<Aviso>(null);
  const [confirmado, setConfirmado] = useState<{ dia: string; hora: string } | null>(null);

  const diaStr = dia ? format(dia, "yyyy-MM-dd") : "";
  const horarios = dia ? horariosDelDia(getDay(dia)) : [];
  const esHoy = dia && isSameDay(dia, startOfToday());
  // Los horarios de hoy que ya pasaron quedan bloqueados (con hora de Córdoba)
  const pasadosHasta = esHoy ? ahoraEnCordoba().minutos : -1;

  const duracion = editId ? durEdit : (servicio?.duracion ?? 30);
  const nombreServicio = editId ? servEdit : (servicio?.nombre ?? "");

  // Catálogo y días cerrados por Héctor: dos pedidos chicos, en paralelo, una sola vez
  useEffect(() => {
    let vivo = true;
    fetch("/api/servicios")
      .then((r) => r.json())
      .then((lista: Servicio[]) => {
        if (!vivo) return;
        const ok = Array.isArray(lista) ? lista : [];
        setServicios(ok);
        // Si vino desde una tarjeta de la landing, el servicio ya está elegido
        const pedido = !editId && ok.find((x) => x.clave === servPedido);
        if (pedido) {
          setServicio(pedido);
          setPaso(1);
        }
      })
      .catch(() => vivo && setServicios([]));
    fetch("/api/bloqueos")
      .then((r) => r.json())
      .then((d) => vivo && Array.isArray(d?.cerrados) && setCerrados(new Set(d.cerrados)))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [editId, servPedido]);

  const hoy = startOfToday();
  const diaBloqueado = (d: Date) => isBefore(d, hoy) || !abreElDia(getDay(d)) || cerrados.has(format(d, "yyyy-MM-dd"));

  // Solo vale la respuesta del último día pedido (si se toca rápido otro día, la anterior se descarta)
  const pedidoRef = useRef("");

  const cargarOcupados = async (d: string) => {
    pedidoRef.current = d;
    setCargandoHoras(true);
    try {
      // Al reprogramar, el propio turno no cuenta como ocupado
      const excluir = editId ? `&excluir=${editId}` : "";
      const res = await fetch(`/api/turnos?dia=${d}${excluir}`, { cache: "no-store" });
      const data = await res.json();
      if (pedidoRef.current !== d) return;
      setOcupados(Array.isArray(data) ? data.map((t: { Turno: { Hora: string } }) => t.Turno.Hora) : []);
    } catch {
      if (pedidoRef.current === d) setOcupados([]);
    } finally {
      if (pedidoRef.current === d) setCargandoHoras(false);
    }
  };

  const elegirServicio = (s: Servicio) => {
    // Un servicio más largo puede no entrar en el horario que ya estaba elegido
    if (s.duracion !== servicio?.duracion) setHora("");
    setServicio(s);
    window.setTimeout(() => setPaso(dia ? 2 : 1), 180);
  };

  const elegirDia = (d: Date) => {
    setDia(d);
    setHora("");
    cargarOcupados(format(d, "yyyy-MM-dd"));
    // Avanza solo al horario: un toque menos
    window.setTimeout(() => setPaso(2), 180);
  };

  const enviar = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!dia || !hora) return;

    const nombre = editId ? nombreEdit : `${datos.nombre} ${datos.apellido}`.trim();
    const telefono = editId ? telEdit : datos.telefono.replace(/\D/g, "");

    if (!editId && (datos.nombre.trim().length < 2 || datos.apellido.trim().length < 1)) {
      return setAviso({ tipo: "aviso", titulo: "Faltan datos", mensaje: "Completá tu nombre y apellido." });
    }
    if (telefono.length < 8) {
      return setAviso({ tipo: "aviso", titulo: "Revisá el teléfono", mensaje: "Ingresá tu número con característica, por ejemplo 351 123 4567." });
    }

    setEnviando(true);
    try {
      const turno = { Dia: diaStr, Hora: hora };
      const res = editId
        ? await fetch(`/api/turnos?id=${editId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Turno: turno, Telefono_Cliente: telefono }),
          })
        : await fetch("/api/turnos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Nombre_Cliente: nombre, Telefono_Cliente: telefono, Turno: turno, Servicio: servicio?.clave }),
          });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setConfirmado({ dia: diaStr, hora });
        return;
      }

      // Si alguien ganó el horario mientras completaba los datos, vuelve a elegir con la lista al día
      if (res.status === 409 && !String(data?.error).includes("Ya tenés")) {
        await cargarOcupados(diaStr);
        setHora("");
        setPaso(2);
      }
      setAviso({ tipo: "error", titulo: "No se pudo reservar", mensaje: data?.error ?? "Probá de nuevo en un momento." });
    } catch {
      setAviso({ tipo: "error", titulo: "Sin conexión", mensaje: "No pudimos comunicarnos con el servidor. Probá de nuevo." });
    } finally {
      setEnviando(false);
    }
  };

  const fechaLarga = dia ? formatearFecha(dia) : null;

  return (
    <div className="pagina">
      <Navbar />

      <main className="pagina-contenido">
        <h1 className="titulo pagina-titulo">
          {editId ? "Cambiar" : "Reservar"} <span>turno</span>
        </h1>
        {editId && <p className="pagina-bajada">Elegí el nuevo día y horario para el turno de {nombreEdit}.</p>}

        {/* Pasos */}
        <ol className="pasos-barra" aria-label="Pasos de la reserva">
          {PASOS.map((p, i) => {
            if (editId && i === 0) return null;
            const habilitado = (i === 0 && !editId) || (i === 1 && (servicio || editId)) || (i === 2 && dia) || (i === 3 && dia && hora);
            const numero = editId ? i : i + 1;
            return (
              <li key={p}>
                <button
                  type="button"
                  className={`paso-chip ${paso === i ? "actual" : ""} ${paso > i ? "hecho" : ""}`}
                  onClick={() => habilitado && setPaso(i)}
                  disabled={!habilitado}
                  aria-current={paso === i ? "step" : undefined}
                >
                  <span>{paso > i ? "✓" : numero}</span>
                  <em>{editId && i === 3 ? "Confirmar" : p}</em>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="reserva">
          <section className="tarjeta reserva-panel">
            {paso === 0 && (
              <div key="p0" className="reserva-paso">
                <p className="etiqueta reserva-subtitulo">¿Qué te hacés?</p>
                {servicios === null ? (
                  <div className="servicios-lista">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="servicio-opcion esqueleto" />
                    ))}
                  </div>
                ) : (
                  <div className="servicios-lista">
                    {servicios.map((s, i) => (
                      <button
                        key={s._id}
                        type="button"
                        className={`servicio-opcion ${servicio?._id === s._id ? "activo" : ""}`}
                        onClick={() => elegirServicio(s)}
                        aria-pressed={servicio?._id === s._id}
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <span className="servicio-opcion-texto">
                          <strong>{s.nombre}</strong>
                          {s.descripcion && <small>{s.descripcion}</small>}
                        </span>
                        <span className="servicio-opcion-meta">
                          {s.precio !== null && <b>{formatearPrecio(s.precio)}</b>}
                          <small>{formatearDuracion(s.duracion)}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {paso === 1 && (
              <div key="p1" className="reserva-paso">
                {!editId && (
                  <div className="reserva-paso-cabecera">
                    <button type="button" className="volver" onClick={() => setPaso(0)}>
                      ← Cambiar servicio
                    </button>
                    <p className="reserva-fecha">{nombreServicio}</p>
                  </div>
                )}
                <Calendario mes={mes} onMes={setMes} seleccion={dia} onSeleccion={elegirDia} bloqueado={diaBloqueado} />
              </div>
            )}

            {paso === 2 && (
              <div key="p2" className="reserva-paso">
                <div className="reserva-paso-cabecera">
                  <button type="button" className="volver" onClick={() => setPaso(1)}>
                    ← Cambiar día
                  </button>
                  <p className="reserva-fecha">{fechaLarga}</p>
                </div>
                {duracion > 30 && (
                  <p className="reserva-nota">
                    {nombreServicio} dura {formatearDuracion(duracion)}: te mostramos los horarios donde entra completo.
                  </p>
                )}
                <SelectorHorario
                  horarios={horarios}
                  ocupados={ocupados}
                  elegido={hora}
                  onElegir={setHora}
                  pasadosHasta={pasadosHasta}
                  cargando={cargandoHoras}
                  duracion={duracion}
                />
                <button type="button" className="btn btn-blanco reserva-continuar" disabled={!hora} onClick={() => setPaso(3)}>
                  {hora ? `Continuar con las ${hora}` : "Elegí un horario"}
                </button>
              </div>
            )}

            {paso === 3 && (
              <div key="p3" className="reserva-paso">
                <div className="reserva-paso-cabecera">
                  <button type="button" className="volver" onClick={() => setPaso(2)}>
                    ← Cambiar horario
                  </button>
                </div>

                {editId ? (
                  <div className="reserva-edit">
                    <p>
                      Vas a mover el turno de <strong>{nombreEdit}</strong> al <strong>{fechaLarga}</strong> a las{" "}
                      <strong>{hora} hs</strong>.
                    </p>
                    <button type="button" className="btn btn-blanco reserva-continuar" onClick={() => enviar()} disabled={enviando}>
                      {enviando ? <span className="cargando-icono" /> : "Confirmar cambio"}
                    </button>
                  </div>
                ) : (
                  <form className="reserva-form" onSubmit={enviar} noValidate>
                    <div className="reserva-form-fila">
                      <div className="campo">
                        <input
                          id="nombre"
                          placeholder=" "
                          autoComplete="given-name"
                          value={datos.nombre}
                          onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
                          required
                        />
                        <label htmlFor="nombre">Nombre</label>
                      </div>
                      <div className="campo">
                        <input
                          id="apellido"
                          placeholder=" "
                          autoComplete="family-name"
                          value={datos.apellido}
                          onChange={(e) => setDatos({ ...datos, apellido: e.target.value })}
                          required
                        />
                        <label htmlFor="apellido">Apellido</label>
                      </div>
                    </div>
                    <div className="campo">
                      <input
                        id="telefono"
                        type="tel"
                        inputMode="numeric"
                        placeholder=" "
                        autoComplete="tel"
                        value={datos.telefono}
                        onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
                        required
                      />
                      <label htmlFor="telefono">Teléfono (lo usás para ver tu turno)</label>
                    </div>
                    <p className="reserva-politica">
                      Podés cambiar o cancelar tu turno desde <strong>Mi turno</strong> hasta 8 horas antes.
                    </p>
                    <button type="submit" className="btn btn-blanco reserva-continuar" disabled={enviando}>
                      {enviando ? <span className="cargando-icono" /> : "Confirmar reserva"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </section>

          {/* Resumen que se va completando */}
          <aside className="tarjeta resumen" aria-live="polite">
            <p className="etiqueta">Tu turno</p>
            <div className={`resumen-fila ${nombreServicio ? "lleno" : ""}`}>
              <span>Servicio</span>
              <strong>
                {nombreServicio || "—"}
                {!editId && servicio?.precio != null && <em className="resumen-precio">{formatearPrecio(servicio.precio)}</em>}
              </strong>
            </div>
            <div className={`resumen-fila ${dia ? "lleno" : ""}`}>
              <span>Día</span>
              <strong>{fechaLarga ?? "—"}</strong>
            </div>
            <div className={`resumen-fila ${hora ? "lleno" : ""}`}>
              <span>Horario</span>
              <strong>{hora ? `${hora} hs · ${formatearDuracion(duracion)}` : "—"}</strong>
            </div>
            <div className="resumen-fila lleno">
              <span>Con</span>
              <strong>Héctor Rodríguez</strong>
            </div>
            <div className="resumen-fila lleno">
              <span>Dónde</span>
              <strong>{DIRECCION.calle}</strong>
            </div>
          </aside>
        </div>
      </main>

      {aviso && (
        <Modal
          tipo={aviso.tipo}
          titulo={aviso.titulo}
          onCerrar={() => setAviso(null)}
          acciones={
            <button type="button" className="btn btn-blanco" onClick={() => setAviso(null)}>
              Entendido
            </button>
          }
        >
          <p>{aviso.mensaje}</p>
        </Modal>
      )}

      {confirmado && (
        <Modal
          tipo="ok"
          titulo={editId ? "¡Turno actualizado!" : "¡Turno confirmado!"}
          acciones={
            <>
              <a
                href={linkCalendario(confirmado.dia, confirmado.hora, duracion, nombreServicio)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-borde"
              >
                Agendar
              </a>
              <button type="button" className="btn btn-blanco" onClick={() => router.replace("/consultar")}>
                Ver mi turno
              </button>
            </>
          }
        >
          <p>
            <strong className="modal-resaltado">{nombreServicio}</strong> el{" "}
            <strong className="modal-resaltado">{fechaLarga?.toLowerCase()}</strong> a las{" "}
            <strong className="modal-resaltado">{confirmado.hora} hs</strong>. ¡Te esperamos!
          </p>
        </Modal>
      )}

      <Footer />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="pagina" />}>
      <Reservar />
    </Suspense>
  );
}
