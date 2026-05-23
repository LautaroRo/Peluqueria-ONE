"use client";
import { useState } from "react";
import { format, isValid, differenceInHours } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import "./estilos.css";

export default function ConsultarTurno() {
  const [telefono, setTelefono] = useState("");
  const [turno, setTurno] = useState<any>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const buscarTurno = async (e: any) => {
    if (e) e.preventDefault();
    if (!telefono) {
      setError("Meté un número primero.");
      return;
    }
    setCargando(true);
    setError("");
    setTurno(null);

    try {
      const res = await fetch(`/api/turnos?telefono=${telefono}`, {
        method: "GET",
        cache: "no-store",
      });
      const data = await res.json();

      if (res.ok && data) {
        setTurno(data);
      } else {
        setError(data?.error || "Error al buscar el turno.");
      }
    } catch (err) {
      setError("Error de red o servidor offline.");
    } finally {
      setCargando(false);
    }
  };

  const eliminarTurno = async () => {
    if (!esEditable()) {
      alert("No podés cancelar turnos con menos de 8 horas de anticipación.");
      return;
    }

    const confirmar = window.confirm(
      "¿Estás seguro de que querés cancelar tu turno?",
    );
    if (!confirmar) return;

    setCargando(true);
    try {
      const res = await fetch(`/api/turnos?id=${turno._id}&accion=Cancelled`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Turno cancelado correctamente.");
        setTurno(null);
        setTelefono("");
      } else {
        alert("Hubo un problema al cancelar.");
      }
    } catch (err) {
      alert("Error de conexión.");
    } finally {
      setCargando(false);
    }
  };

  const esEditable = () => {
    if (!turno?.Turno?.Dia || !turno?.Turno?.Hora) return false;

    const [year, month, day] = turno.Turno.Dia.split("-").map(Number);
    const [hour, minute] = turno.Turno.Hora.split(":").map(Number);

    const fechaTurno = new Date(year, month - 1, day, hour, minute);
    const ahora = new Date();

    const horasDiferencia = differenceInHours(fechaTurno, ahora);
    return horasDiferencia >= 8;
  };

  const obtenerFechaFormateada = () => {
    if (!turno?.Turno?.Dia) return "";

    const [year, month, day] = turno.Turno.Dia.split("-").map(Number);
    const fecha = new Date(year, month - 1, day);

    return isValid(fecha)
      ? format(fecha, "eeee d 'de' MMMM", { locale: es })
      : "Fecha no válida";
  };

  const editable = esEditable();

  return (
    <div className="one-main-wrapper">
      <nav className="one-navbar-consultar">
        <Link href="/" className="one-logo-link">
          <h2 className="one-logo-consultar">ONE</h2>
        </Link>
        <div className="one-nav-actions">
          <Link href="/reservar" className="one-btn-nav-consultar">
            RESERVAR
          </Link>
          <Link href="/" className="one-btn-nav-consultar">
            INICIO
          </Link>
        </div>
      </nav>

      <div className="one-container-consultar">
        <h2 className="one-main-title">
          MI <span>TURNO</span>
        </h2>

        {!turno ? (
          <div className="one-location-card one-buscar-card">
            <p className="one-buscar-text">
              Ingresá tu teléfono para verificar tu reserva.
            </p>
            <input
              type="text"
              placeholder="Ej: 351..."
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="one-input-premium-propio"
            />
            {error && (
              <p
                className="one-error-text"
                style={{
                  color: "#ff4444",
                  marginTop: "10px",
                  fontSize: "14px",
                }}
              >
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={buscarTurno}
              className="one-btn-form-main"
              disabled={cargando}
            >
              {cargando ? "BUSCANDO..." : "BUSCAR RESERVA"}
            </button>
          </div>
        ) : (
          <div className="one-review-card one-turno-confirmado">
            <p className="one-turno-badge">TURNO CONFIRMADO</p>
            <h3 className="one-turno-title">
              Hola, <span>{turno.Nombre_Cliente}</span>
            </h3>
            <p className="one-turno-text">Tu cita es el</p>
            <div className="one-turno-fecha">{obtenerFechaFormateada()}</div>
            <p className="one-turno-hora">
              a las <strong>{turno.Turno.Hora} hs</strong>
            </p>

            {!editable && (
              <p
                style={{
                  color: "#ff4444",
                  fontSize: "12px",
                  marginTop: "15px",
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                * Los turnos no pueden modificarse ni cancelarse con menos de 8
                horas de antelación.
              </p>
            )}

            <div className="one-acciones-container">
              {editable ? (
                <Link
                  href={`/reservar?edit=${turno._id}&nombre=${encodeURIComponent(turno.Nombre_Cliente)}&tel=${turno.Telefono_Cliente}`}
                  className="one-btn-form-main one-btn-block"
                >
                  MODIFICAR TURNO
                </Link>
              ) : (
                <button
                  className="one-btn-form-main one-btn-block"
                  style={{ opacity: 0.5, cursor: "not-allowed" }}
                  disabled
                >
                  MODIFICACIÓN BLOQUEADA
                </button>
              )}

              <button
                onClick={eliminarTurno}
                className="one-btn-cancelar"
                disabled={cargando || !editable}
                style={!editable ? { opacity: 0.5, cursor: "not-allowed" } : {}}
              >
                {cargando ? "CANCELANDO..." : "CANCELAR TURNO"}
              </button>
            </div>

            <button
              onClick={() => {
                setTurno(null);
                setError("");
              }}
              className="one-btn-volver-simple"
            >
              ← BUSCAR OTRO TELÉFONO
            </button>
          </div>
        )}
      </div>
    </div>
  );
}