"use client";
import { useState } from "react";
import { format, isValid, differenceInHours } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import Footer from "../components/footer";
import "./estilos.css";
import Navbar from "../components/navbar";

// 1. Interfaz para TypeScript
interface TurnoData {
  _id: string;
  Nombre_Cliente: string;
  Telefono_Cliente: string;
  Turno: {
    Dia: string;
    Hora: string;
  };
}

export default function ConsultarTurno() {
  const [telefono, setTelefono] = useState("");
  const [turno, setTurno] = useState<TurnoData | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  
  // Estados para modales personalizados
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [mostrarModalExito, setMostrarModalExito] = useState(false);

  // Agregamos que 'e' pueda ser un FormEvent o null para llamarlo desde el onClick
  const buscarTurno = async (e: React.FormEvent | null) => {
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

  const solicitarCancelacion = () => {
    if (!esEditable()) {
      alert("No podés cancelar turnos con menos de 8 horas de anticipación.");
      return;
    }
    setConfirmarEliminar(true);
  };

  const ejecutarEliminacion = async () => {
    if (!turno) return; 
    
    setConfirmarEliminar(false);
    setCargando(true);
    try {
      const res = await fetch(`/api/turnos?id=${turno._id}&accion=Cancelled`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMostrarModalExito(true);
      } else {
        alert("Hubo un problema al cancelar.");
      }
    } catch (err) {
      alert("Error de conexión.");
    } finally {
      setCargando(false);
    }
  };

  const cerrarModalExito = () => {
    setMostrarModalExito(false);
    setTurno(null);
    setTelefono("");
  };

  const esEditable = () => {
    // Si no hay turno o faltan datos, frena acá
    if (!turno || !turno.Turno?.Dia || !turno.Turno?.Hora) return false;

    const [year, month, day] = turno.Turno.Dia.split("-").map(Number);
    const [hour, minute] = turno.Turno.Hora.split(":").map(Number);

    const fechaTurno = new Date(year, month - 1, day, hour, minute);
    const ahora = new Date();

    const horasDiferencia = differenceInHours(fechaTurno, ahora);
    return horasDiferencia >= 8;
  };

  const obtenerFechaFormateada = () => {
    // Si no hay turno o falta el día, frena acá
    if (!turno || !turno.Turno?.Dia) return "";

    const [year, month, day] = turno.Turno.Dia.split("-").map(Number);
    const fecha = new Date(year, month - 1, day);

    return isValid(fecha)
      ? format(fecha, "eeee d 'de' MMMM", { locale: es })
      : "Fecha no válida";
  };

  const editable = esEditable();

  return (
    <div className="one-main-wrapper">
      
      {/* 1. MODAL DE CONFIRMACIÓN */}
      {confirmarEliminar && (
        <div className="one-modal-overlay">
          <div className="one-modal-card one-modal-critical">
            <div className="one-modal-icon-wrapper">
              <div className="one-modal-icon-warning">⚠️</div>
            </div>
            <h3 className="one-modal-title">¿Eliminar Turno?</h3>
            <p className="one-modal-text">
              Esta acción removerá permanentemente la reserva seleccionada del panel de control.
            </p>
            <div className="one-modal-actions-row">
              <button
                onClick={() => setConfirmarEliminar(false)}
                className="one-btn-modal-back"
              >
                VOLVER
              </button>
              <button
                onClick={ejecutarEliminacion}
                className="one-btn-modal-confirm-delete"
              >
                SÍ, ELIMINAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL DE ÉXITO */}
      {mostrarModalExito && (
        <div className="one-modal-overlay">
          <div className="one-modal-card">
            <div className="one-modal-icon-wrapper">
              <div className="one-modal-checkmark-success">
                <span className="checkmark-icon-badge">✓</span>
              </div>
            </div>
            <h3 className="one-modal-title">Turno Cancelado</h3>
            <p className="one-modal-text">
              Tu reserva fue dada de baja correctamente. ¡Te esperamos la próxima!
            </p>
            <button
              onClick={cerrarModalExito}
              className="one-btn-form-main"
              style={{ width: "100%", padding: "12px" }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <Navbar/>

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
              onClick={() => buscarTurno(null)}
              className="one-btn-buscar-reserva"
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
                  marginTop: "5px",
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
                  className="one-btn-form-main"
                >
                  Modificar
                </Link>
              ) : (
                <button
                  className="one-btn-form-main"
                  style={{ opacity: 0.4, cursor: "not-allowed" }}
                  disabled
                >
                  Bloqueado
                </button>
              )}

              <button
                onClick={solicitarCancelacion}
                className="one-btn-cancelar"
                disabled={cargando || !editable}
                style={!editable ? { opacity: 0.4, cursor: "not-allowed" } : {}}
              >
                {cargando ? "CANCELANDO..." : "Cancelar"}
              </button>
            </div>

            <button
              onClick={() => {
                setTurno(null);
                setError("");
                setTelefono("");
              }}
              className="one-btn-volver-simple"
            >
              ← BUSCAR OTRO TELÉFONO
            </button>
          </div>
        )}
      </div>
      <Footer/>
    </div>
  );
}