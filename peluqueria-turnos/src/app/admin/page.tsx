"use client";
import { useEffect, useState } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay, 
  subMonths, 
  addMonths, 
  isSameDay, 
  isBefore, 
  startOfToday 
} from "date-fns";
import { es } from "date-fns/locale";
import "./estilos.css";

interface Turno {
  _id: string;
  Nombre_Cliente: string;
  Telefono_Cliente: number;
  Turno: {
    Dia: string;
    Hora: string;
  };
}

interface Cliente {
  _id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  createdAt?: string;
}

interface HistorialItem {
  _id: string;
  Nombre_Cliente: string;
  Telefono_Cliente: number;
  Turno: {
    Dia: string;
    Hora: string;
  };
  Estado: "Success" | "Cancelled";
  createdAt: string;
}

export default function AdminPage() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]); 
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [totalClientes, setTotalClientes] = useState(0);   
  const [cargando, setCargando] = useState(true);
  
  // Estados para controlar la edición interactiva
  const [turnoAEditar, setTurnoAEditar] = useState<Turno | null>(null);
  const [fechaReferencia, setFechaReferencia] = useState(new Date());
  const [seleccion, setSeleccion] = useState<Date | null>(null);
  const [horaSeleccionada, setHoraSeleccionada] = useState("");
  const [turnosOcupados, setTurnosOcupados] = useState<string[]>([]);

  const [vistaActiva, setVistaActiva] = useState<"turnos" | "clientes" | "historial">("turnos");

  // Configuración del calendario (Lógica exacta de tu formulario de reservas)
  const hoy = startOfToday();
  const inicioMes = startOfMonth(fechaReferencia);
  const finMes = endOfMonth(fechaReferencia);
  const diasDelMes = eachDayOfInterval({ start: inicioMes, end: finMes });
  const espaciosVacios = Array.from({ length: getDay(inicioMes) });
  const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  // Generador de turnos idéntico al tuyo
  const horariosDisponibles = [];
  for (let h = 9; h <= 20; h++) {
    horariosDisponibles.push(`${h}:00`, `${h}:30`);
  }
  horariosDisponibles.push("21:00");

  const obtenerDatos = async () => {
    try {
      setCargando(true);
      const [resTurnos, resClientes, resHistorial] = await Promise.all([
        fetch("/api/turnos", { cache: "no-store" }),
        fetch("/api/clientes", { cache: "no-store" }),
        fetch("/api/historial", { cache: "no-store" })
      ]);

      const dataTurnos = await resTurnos.json();
      const dataClientes = await resClientes.json();
      
      setTurnos(dataTurnos);

      if (dataClientes && dataClientes.success) {
        setClientes(dataClientes.clientes);
        setTotalClientes(dataClientes.total);
      }

      if (resHistorial.ok) {
        const dataHistorial = await resHistorial.json();
        setHistorial(dataHistorial);
      }
    } catch (error) {
      console.error("Error al cargar los datos en el panel:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerDatos();
  }, []);

  // Busca los turnos ocupados cuando el administrador cambia el día elegido en el modal
  useEffect(() => {
    if (seleccion) {
      const buscarOcupados = async () => {
        try {
          const fechaStr = format(seleccion, "yyyy-MM-dd");
          const res = await fetch(`/api/turnos?dia=${fechaStr}`);
          const data = await res.json();
          setTurnosOcupados(data.map((t: any) => t.Turno.Hora));
        } catch (error) { 
          console.error(error); 
        }
      };
      buscarOcupados();
    }
  }, [seleccion]);

  const turnosFinalizados = historial.filter((h) => h.Estado === "Success").length;

  const guardarCambios = async () => {
    if (!seleccion || !horaSeleccionada || !turnoAEditar) return;
    try {
      const fechaStr = format(seleccion, "yyyy-MM-dd");
      const res = await fetch(`/api/turnos?id=${turnoAEditar._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Turno: { Dia: fechaStr, Hora: horaSeleccionada },
        }),
      });
      if (res.ok) {
        setTurnoAEditar(null);
        setSeleccion(null);
        setHoraSeleccionada("");
        obtenerDatos();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const eliminarTurno = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este turno?")) return;
    try {
      const res = await fetch(`/api/turnos?id=${id}`, { method: "DELETE" });
      if (res.ok) obtenerDatos();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Panel de Administración</h1>
        <button onClick={obtenerDatos} className="refresh-btn">🔄 Actualizar</button>
      </header>

      <div className="stats-dashboard-grid">
        <div className="stat-dashboard-card">
          <h3>Clientes Totales</h3>
          <p className="stat-number-highlight">{totalClientes}</p>
        </div>
        <div className="stat-dashboard-card">
          <h3>Turnos Pendientes</h3>
          <p className="stat-number-highlight values-pending">{turnos.length}</p>
        </div>
        <div className="stat-dashboard-card">
          <h3>Turnos Finalizados</h3>
          <p className="stat-number-highlight values-success">{turnosFinalizados}</p>
        </div>
      </div>

      <div className="admin-view-switcher">
        <button 
          onClick={() => setVistaActiva("turnos")} 
          className={`switcher-tab-btn ${vistaActiva === "turnos" ? "active" : ""}`}
        >
          📅 Ver Turnos
        </button>
        <button 
          onClick={() => setVistaActiva("clientes")} 
          className={`switcher-tab-btn ${vistaActiva === "clientes" ? "active" : ""}`}
        >
          👥 Ver Clientes
        </button>
        <button 
          onClick={() => setVistaActiva("historial")} 
          className={`switcher-tab-btn ${vistaActiva === "historial" ? "active" : ""}`}
        >
          📜 Ver Historial
        </button>
      </div>

      <div className="tabla-container">
        {cargando ? (
          <p>Cargando datos...</p>
        ) : vistaActiva === "turnos" ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {turnos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="tabla-vacia">
                    No hay turnos activos en la agenda.
                  </td>
                </tr>
              ) : (
                turnos.map((t) => (
                  <tr key={t._id}>
                    <td data-label="Fecha">{format(new Date(t.Turno.Dia + "T00:00:00"), "dd/MM/yyyy")}</td>
                    <td data-label="Hora"><span className="hora-badge">{t.Turno.Hora}</span></td>
                    <td data-label="Cliente">{t.Nombre_Cliente}</td>
                    <td data-label="Acciones">
                      <div className="btn-group">
                        <button 
                          className="edit-btn" 
                          onClick={() => {
                            setTurnoAEditar(t);
                            const fechaOriginal = new Date(t.Turno.Dia + "T00:00:00");
                            setFechaReferencia(fechaOriginal);
                            setSeleccion(fechaOriginal);
                            setHoraSeleccionada(t.Turno.Hora);
                          }}
                        >Modificar</button>
                        <button className="delete-btn" onClick={() => eliminarTurno(t._id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : vistaActiva === "clientes" ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Teléfono</th>
                <th>Registrado el</th>
              </tr>
            </thead>
            <tbody>
              {clientes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="tabla-vacia">
                    No hay clientes cargados en el sistema.
                  </td>
                </tr>
              ) : (
                clientes.map((c) => (
                  <tr key={c._id}>
                    <td data-label="Nombre" className="cliente-nombre-resaltado">{c.nombre}</td>
                    <td data-label="Apellido">{c.apellido}</td>
                    <td data-label="Teléfono">
                      <span className="hora-badge cliente-telefono-badge">
                        {c.telefono}
                      </span>
                    </td>
                    <td data-label="Registrado ">
                      {c.createdAt ? format(new Date(c.createdAt), "dd/MM/yyyy") : "---"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha Cita</th>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Estado Final</th>
              </tr>
            </thead>
            <tbody>
              {historial.length === 0 ? (
                <tr>
                  <td colSpan={5} className="tabla-vacia">
                    El historial está vacío.
                  </td>
                </tr>
              ) : (
                historial.map((h) => {
                  const esSuccess = h.Estado === "Success";
                  return (
                    <tr key={h._id} className="fila-historial">
                      <td data-label="Fecha Cita">
                        {format(new Date(h.Turno.Dia + "T00:00:00"), "dd/MM/yyyy")}
                      </td>
                      <td data-label="Hora">
                        <span className="hora-badge-historial">
                          {h.Turno.Hora}
                        </span>
                      </td>
                      <td data-label="Cliente">{h.Nombre_Cliente}</td>
                      <td data-label="Teléfono">{h.Telefono_Cliente}</td>
                      <td data-label="Estado Final">
                        <span className={`status-pill ${esSuccess ? "success" : "cancelled-propio"}`}>
                          {esSuccess ? "Atendido" : "Cancelado"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 🛠️ MODAL CON EL CALENDARIO INTERACTIVO Y EL CARRUSEL DEL COMPONENTE RESERVAS */}
      {turnoAEditar && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" }}>
          <div className="calendario-card animate-fade-in" style={{ maxWidth: "450px", width: "100%", margin: 0 }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h2 className="titulo-form" style={{ margin: 0, fontSize: "1.2rem" }}>Reagendar Turno</h2>
              <button onClick={() => setTurnoAEditar(null)} style={{ background: "transparent", border: "none", color: "#888", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            <p style={{ color: "#888", fontSize: "14px", marginBottom: "15px" }}>
              Cliente: <strong style={{ color: "#fff" }}>{turnoAEditar.Nombre_Cliente}</strong>
            </p>

            {/* Cabecera del calendario */}
            <div className="calendario-header">
              <button className="nav-btn" onClick={() => setFechaReferencia(subMonths(fechaReferencia, 1))} disabled={format(fechaReferencia, "MM-yyyy") === format(hoy, "MM-yyyy")}> &lt; </button>
              <h2 className="mes-titulo">{format(fechaReferencia, "MMMM yyyy", { locale: es })}</h2>
              <button className="nav-btn" onClick={() => setFechaReferencia(addMonths(fechaReferencia, 1))}> &gt; </button>
            </div>

            {/* Grilla interactiva de días */}
            <div className="calendario-grid">
              {diasSemana.map((d) => <div key={d} className="dia-semana-label">{d}</div>)}
              {espaciosVacios.map((_, i) => <div key={i} className="dia-vacio" />)}
              {diasDelMes.map((dia) => {
                const estaBloqueado = isBefore(dia, hoy) || [0, 1].includes(getDay(dia));
                return (
                  <div key={dia.toString()} 
                       className={`dia-celda ${seleccion && isSameDay(dia, seleccion) ? "seleccionado" : ""} ${estaBloqueado ? "deshabilitado" : ""}`}
                       onClick={() => !estaBloqueado && setSeleccion(dia)}>
                    {format(dia, "d")}
                  </div>
                );
              })}
            </div>

            {/* Sección de Horarios con Carrusel */}
            {seleccion && (
              <div className="form-detalles animate-fade-in" style={{ padding: 0, background: "transparent", marginTop: "20px", border: "none" }}>
                <p className="fecha-form" style={{ marginBottom: "10px", fontSize: "14px" }}>
                  Día seleccionado: {format(seleccion, "dd 'de' MMMM", { locale: es })}
                </p>

                <div className="input-group">
                  <div className="horarios-carrusel">
                    {horariosDisponibles.map((h) => {
                      const estaOcupado = turnosOcupados.includes(h);
                      const esHoy = isSameDay(seleccion, hoy);
                      let esHoraPasada = false;
                      
                      if (esHoy) {
                        const [hT, mT] = h.split(":").map(Number);
                        const ahora = new Date();
                        if (hT < ahora.getHours() || (hT === ahora.getHours() && mT <= ahora.getMinutes())) {
                          esHoraPasada = true;
                        }
                      }

                      const deshabilitado = estaOcupado || esHoraPasada;
                      return (
                        <button key={h} type="button" disabled={deshabilitado}
                          className={`horario-card ${horaSeleccionada === h ? "active" : ""} ${deshabilitado ? "ocupado" : ""}`}
                          onClick={() => !deshabilitado && setHoraSeleccionada(h)}> {h} </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Footer con el botón de confirmación final */}
            <div style={{ marginTop: "25px", borderTop: "1px solid #222", paddingTop: "20px", display: "flex", gap: "10px" }}>
              <button onClick={() => setTurnoAEditar(null)} className="confirm-btn" style={{ background: "#333", margin: 0, flex: 1 }}>
                CANCELAR
              </button>
              <button 
                onClick={guardarCambios} 
                className="confirm-btn final" 
                disabled={!seleccion || !horaSeleccionada}
                style={{ margin: 0, flex: 2 }}
              >
                {horaSeleccionada ? `GUARDAR (${horaSeleccionada} HS)` : "ELEGÍ UN HORARIO"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}