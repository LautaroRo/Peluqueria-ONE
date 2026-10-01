"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import Modal from "../components/modal";
import { HORAS_ANTICIPACION, ahoraEnCordoba, instanteTurno } from "../lib/horarios";
import { capitalizar, diasHasta } from "../lib/formato";
import { DIRECCION, LINK_COMO_LLEGAR } from "../lib/local";
import { SERVICIO_SIN_DATO, formatearDuracion, formatearPrecio } from "../lib/servicios";
import "./estilos.css";

interface TurnoData {
  _id: string;
  Nombre_Cliente: string;
  Telefono_Cliente: number;
  Turno: { Dia: string; Hora: string };
  Servicio?: { Nombre: string; Precio: number | null; Duracion: number };
}

export default function ConsultarTurno() {
  const [telefono, setTelefono] = useState("");
  const [turno, setTurno] = useState<TurnoData | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [cancelado, setCancelado] = useState(false);
  const [errorModal, setErrorModal] = useState("");

  const buscar = async (e: FormEvent) => {
    e.preventDefault();
    const tel = telefono.replace(/\D/g, "");
    if (tel.length < 8) {
      setError("Ingresá tu número completo, con característica.");
      return;
    }
    setCargando(true);
    setError("");
    try {
      const res = await fetch(`/api/turnos?telefono=${tel}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setTurno(data);
      else setError(data?.error ?? "No encontramos tu turno.");
    } catch {
      setError("No pudimos conectarnos. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  const cancelar = async () => {
    if (!turno) return;
    setConfirmarCancelar(false);
    setCargando(true);
    try {
      const res = await fetch(`/api/turnos?id=${turno._id}&telefono=${turno.Telefono_Cliente}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setCancelado(true);
      else setErrorModal(data?.error ?? "No se pudo cancelar el turno.");
    } catch {
      setErrorModal("No pudimos conectarnos. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  const reiniciar = () => {
    setTurno(null);
    setTelefono("");
    setCancelado(false);
    setError("");
  };

  const instante = turno ? instanteTurno(turno.Turno.Dia, turno.Turno.Hora) : null;
  const faltanHoras = instante ? (instante.getTime() - Date.now()) / 3_600_000 : 0;
  const editable = faltanHoras >= HORAS_ANTICIPACION;
  const fecha = turno ? new Date(`${turno.Turno.Dia}T12:00:00`) : null;
  // Los turnos de antes de los servicios no lo tienen guardado
  const servicio = turno?.Servicio ?? SERVICIO_SIN_DATO;

  // Por días de calendario: "Es hoy", "Es mañana", "Es pasado mañana", "Faltan 5 días"
  const dias = turno ? diasHasta(turno.Turno.Dia, ahoraEnCordoba().dia) : 0;
  const cuenta =
    dias <= 0
      ? faltanHoras >= 1
        ? `Es hoy · faltan ${Math.floor(faltanHoras)} h`
        : "Es hoy, en un rato"
      : dias === 1
        ? "Es mañana"
        : dias === 2
          ? "Es pasado mañana"
          : `Faltan ${dias} días`;

  return (
    <div className="pagina">
      <Navbar />

      <main className="pagina-contenido consultar">
        <h1 className="titulo pagina-titulo">
          Mi <span>turno</span>
        </h1>

        {!turno ? (
          <>
            <p className="pagina-bajada">Ingresá el teléfono con el que reservaste para ver, cambiar o cancelar tu turno.</p>
            <form className="tarjeta buscar" onSubmit={buscar}>
              <div className="campo">
                <input
                  id="tel"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder=" "
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
                <label htmlFor="tel">Tu teléfono</label>
              </div>
              {error && (
                <p className="buscar-error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="btn btn-blanco" disabled={cargando}>
                {cargando ? <span className="cargando-icono" /> : "Buscar mi turno"}
              </button>
              <p className="buscar-pie">
                ¿Todavía no tenés? <Link href="/reservar">Reservá acá</Link>
              </p>
            </form>
          </>
        ) : (
          <div className="ticket">
            <div className="ticket-cabecera">
              <span className="ticket-badge">Turno confirmado</span>
              <span className="ticket-cuenta">{cuenta}</span>
            </div>

            <p className="ticket-hola">
              Hola, <strong>{turno.Nombre_Cliente}</strong>
            </p>

            <div className="ticket-fecha">
              <span className="ticket-dia">{fecha && format(fecha, "d")}</span>
              <div>
                <p className="ticket-mes">{fecha && format(fecha, "MMMM", { locale: es })}</p>
                <p className="ticket-semana">{fecha && capitalizar(format(fecha, "EEEE", { locale: es }))}</p>
              </div>
              <span className="ticket-hora">{turno.Turno.Hora} hs</span>
            </div>

            {/* Corte de ticket */}
            <div className="ticket-corte" aria-hidden />

            <div className="ticket-datos">
              <div className="ticket-servicio">
                <span>Servicio</span>
                <strong>
                  {servicio.Nombre} · {formatearDuracion(servicio.Duracion)}
                  {servicio.Precio != null && <em>{formatearPrecio(servicio.Precio)}</em>}
                </strong>
              </div>
              <div>
                <span>Con</span>
                <strong>Héctor Rodríguez</strong>
              </div>
              <div>
                <span>Dónde</span>
                <a href={LINK_COMO_LLEGAR} target="_blank" rel="noopener noreferrer">
                  {DIRECCION.calle} ↗
                </a>
              </div>
            </div>

            {!editable && (
              <p className="ticket-aviso">
                Faltan menos de {HORAS_ANTICIPACION} horas: el turno ya no se puede modificar ni cancelar desde la web.
              </p>
            )}

            <div className="ticket-acciones">
              {editable ? (
                <Link
                  href={`/reservar?${new URLSearchParams({
                    edit: turno._id,
                    nombre: turno.Nombre_Cliente,
                    tel: String(turno.Telefono_Cliente),
                    serv: servicio.Nombre,
                    dur: String(servicio.Duracion),
                  })}`}
                  className="btn btn-blanco"
                >
                  Cambiar día u hora
                </Link>
              ) : (
                <span className="btn btn-blanco" aria-disabled="true">
                  Cambiar día u hora
                </span>
              )}
              <button
                type="button"
                className="btn btn-borde"
                onClick={() => setConfirmarCancelar(true)}
                disabled={!editable || cargando}
              >
                Cancelar turno
              </button>
            </div>

            <button type="button" className="volver ticket-otro" onClick={reiniciar}>
              ← Buscar otro teléfono
            </button>
          </div>
        )}
      </main>

      {confirmarCancelar && (
        <Modal
          tipo="aviso"
          titulo="¿Cancelar el turno?"
          onCerrar={() => setConfirmarCancelar(false)}
          acciones={
            <>
              <button type="button" className="btn btn-borde" onClick={() => setConfirmarCancelar(false)}>
                Volver
              </button>
              <button type="button" className="btn btn-blanco" onClick={cancelar}>
                Sí, cancelar
              </button>
            </>
          }
        >
          <p>El horario queda libre para otra persona. Si querés, podés sacar uno nuevo cuando quieras.</p>
        </Modal>
      )}

      {cancelado && (
        <Modal
          tipo="ok"
          titulo="Turno cancelado"
          onCerrar={reiniciar}
          acciones={
            <>
              <button type="button" className="btn btn-borde" onClick={reiniciar}>
                Listo
              </button>
              <Link href="/reservar" className="btn btn-blanco">
                Sacar otro
              </Link>
            </>
          }
        >
          <p>Tu reserva se dio de baja. ¡Te esperamos la próxima!</p>
        </Modal>
      )}

      {errorModal && (
        <Modal
          tipo="error"
          titulo="No se pudo cancelar"
          onCerrar={() => setErrorModal("")}
          acciones={
            <button type="button" className="btn btn-blanco" onClick={() => setErrorModal("")}>
              Entendido
            </button>
          }
        >
          <p>{errorModal}</p>
        </Modal>
      )}

      <Footer />
    </div>
  );
}
