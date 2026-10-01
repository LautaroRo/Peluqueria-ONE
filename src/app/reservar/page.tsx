"use client";

import { FormEvent, Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, getDay, isSameDay, startOfToday } from "date-fns";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import Modal, { TipoModal } from "../components/modal";
import { Calendario, SelectorHorario } from "../components/calendario";
import { DURACION_TURNO_MIN, ahoraEnCordoba, horariosDelDia, instanteTurno } from "../lib/horarios";
import { DIRECCION } from "../lib/local";
import { fechaLarga as formatearFecha } from "../lib/formato";
import "./estilos.css";

type Aviso = { tipo: TipoModal; titulo: string; mensaje: string; alCerrar?: () => void } | null;

const PASOS = ["Día", "Horario", "Tus datos"];

// Link para sumar el turno a Google Calendar
function linkCalendario(dia: string, hora: string) {
  const inicio = instanteTurno(dia, hora);
  const fin = new Date(inicio.getTime() + DURACION_TURNO_MIN * 60_000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: "Turno en ONE Peluquería",
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

  const [paso, setPaso] = useState(0);
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

  // Solo vale la respuesta del último día pedido (si se toca rápido otro día, la anterior se descarta)
  const pedidoRef = useRef("");

  const cargarOcupados = async (d: string) => {
    pedidoRef.current = d;
    setCargandoHoras(true);
    try {
      const res = await fetch(`/api/turnos?dia=${d}`, { cache: "no-store" });
      const data = await res.json();
      if (pedidoRef.current !== d) return;
      setOcupados(Array.isArray(data) ? data.map((t: { Turno: { Hora: string } }) => t.Turno.Hora) : []);
    } catch {
      if (pedidoRef.current === d) setOcupados([]);
    } finally {
      if (pedidoRef.current === d) setCargandoHoras(false);
    }
  };

  const elegirDia = (d: Date) => {
    setDia(d);
    setHora("");
    cargarOcupados(format(d, "yyyy-MM-dd"));
    // Avanza solo al horario: un toque menos
    window.setTimeout(() => setPaso(1), 180);
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
            body: JSON.stringify({ Nombre_Cliente: nombre, Telefono_Cliente: telefono, Turno: turno }),
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
        setPaso(1);
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
            const habilitado = i === 0 || (i === 1 && dia) || (i === 2 && dia && hora);
            return (
              <li key={p}>
                <button
                  type="button"
                  className={`paso-chip ${paso === i ? "actual" : ""} ${paso > i ? "hecho" : ""}`}
                  onClick={() => habilitado && setPaso(i)}
                  disabled={!habilitado}
                  aria-current={paso === i ? "step" : undefined}
                >
                  <span>{paso > i ? "✓" : i + 1}</span>
                  {editId && i === 2 ? "Confirmar" : p}
                </button>
              </li>
            );
          })}
        </ol>

        <div className="reserva">
          <section className="tarjeta reserva-panel">
            {paso === 0 && (
              <div key="p0" className="reserva-paso">
                <Calendario mes={mes} onMes={setMes} seleccion={dia} onSeleccion={elegirDia} />
              </div>
            )}

            {paso === 1 && (
              <div key="p1" className="reserva-paso">
                <div className="reserva-paso-cabecera">
                  <button type="button" className="volver" onClick={() => setPaso(0)}>
                    ← Cambiar día
                  </button>
                  <p className="reserva-fecha">{fechaLarga}</p>
                </div>
                <SelectorHorario
                  horarios={horarios}
                  ocupados={ocupados}
                  elegido={hora}
                  onElegir={setHora}
                  pasadosHasta={pasadosHasta}
                  cargando={cargandoHoras}
                />
                <button type="button" className="btn btn-blanco reserva-continuar" disabled={!hora} onClick={() => setPaso(2)}>
                  {hora ? `Continuar con las ${hora}` : "Elegí un horario"}
                </button>
              </div>
            )}

            {paso === 2 && (
              <div key="p2" className="reserva-paso">
                <div className="reserva-paso-cabecera">
                  <button type="button" className="volver" onClick={() => setPaso(1)}>
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
            <div className={`resumen-fila ${dia ? "lleno" : ""}`}>
              <span>Día</span>
              <strong>{fechaLarga ?? "—"}</strong>
            </div>
            <div className={`resumen-fila ${hora ? "lleno" : ""}`}>
              <span>Horario</span>
              <strong>{hora ? `${hora} hs` : "—"}</strong>
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
              <a href={linkCalendario(confirmado.dia, confirmado.hora)} target="_blank" rel="noopener noreferrer" className="btn btn-borde">
                Agendar
              </a>
              <button type="button" className="btn btn-blanco" onClick={() => router.replace("/consultar")}>
                Ver mi turno
              </button>
            </>
          }
        >
          <p>
            Te esperamos el <strong className="modal-resaltado">{fechaLarga?.toLowerCase()}</strong> a las{" "}
            <strong className="modal-resaltado">{confirmado.hora} hs</strong>.
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

