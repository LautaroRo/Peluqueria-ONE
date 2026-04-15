"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import "./estilos.css";

interface Turno {
  _id: string;
  Nombre_Cliente: string;
  Telefono_Cliente: number;
  Turno: {
    Dia: string;
    Hora: string;
  };
  Estado: string;
}

export default function AdminPage() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cargando, setCargando] = useState(true);

  // 1. Función para obtener los turnos de la API
  const obtenerTurnos = async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/turnos");
      const data = await res.json();
      
      // Ordenamos los turnos por fecha y luego por hora
      const ordenados = data.sort((a: Turno, b: Turno) => 
        a.Turno.Dia.localeCompare(b.Turno.Dia) || a.Turno.Hora.localeCompare(b.Turno.Hora)
      );
      
      setTurnos(ordenados);
    } catch (error) {
      console.error("Error al cargar los turnos:", error);
    } finally {
      setCargando(false);
    }
  };

  // 2. Efecto de carga inicial
  useEffect(() => {
    obtenerTurnos();
  }, []);

  const eliminarTurno = async (id: string) => {
    if (!confirm("¿Deseas eliminar este turno?")) return;

    try {
      const res = await fetch(`/api/turnos?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setTurnos(turnos.filter((t) => t._id !== id));
      } else {
        alert("Error al intentar eliminar el turno.");
      }
    } catch (error) {
      console.error("Error en la petición DELETE:", error);
    }
  };

  if (cargando) {
    return (
      <div className="admin-container">
        <p className="loading-text">Cargando la agenda...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Panel de Turnos</h1>
        <button onClick={obtenerTurnos} className="refresh-btn">
          🔄 Actualizar Lista
        </button>
      </header>

      <div className="tabla-container">
        {turnos.length === 0 ? (
          <div className="no-data">
            <p>No hay turnos registrados en la base de datos.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {turnos.map((t) => (
                <tr key={t._id}>
                  <td data-label="Fecha">
                    {/* El T00:00:00 evita errores de zona horaria al formatear */}
                    {format(new Date(t.Turno.Dia + "T00:00:00"), "dd/MM/yyyy")}
                  </td>
                  <td data-label="Hora">
                    <span className="hora-badge">{t.Turno.Hora}</span>
                  </td>
                  <td data-label="Cliente">{t.Nombre_Cliente}</td>
                  <td data-label="Teléfono">
                    <a 
                      href={`https://wa.me/${t.Telefono_Cliente}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="wa-link"
                    >
                      {t.Telefono_Cliente}
                    </a>
                  </td>
                  <td data-label="Acción">
                    <button 
                      onClick={() => eliminarTurno(t._id)} 
                      className="delete-btn"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}