"use client";
import { useState, useEffect } from "react";
import { 
  eachDayOfInterval, startOfMonth, endOfMonth, format, 
  getDay, addMonths, subMonths, isSameDay, isBefore, startOfToday 
} from "date-fns";
import { es } from "date-fns/locale";
import "./estilos.css";

export default function Page() {
  const [fechaReferencia, setFechaReferencia] = useState(new Date()); 
  const [seleccion, setSeleccion] = useState<Date | null>(null);
  const [paso, setPaso] = useState(1);
  
  const [horario, setHorario] = useState("");
  const [turnosOcupados, setTurnosOcupados] = useState<string[]>([]); // Horas ya reservadas
  const [datos, setDatos] = useState({ nombre: "", apellido: "", dni: "", telefono: "" });

  const hoy = startOfToday();
  const inicioMes = startOfMonth(fechaReferencia);
  const finMes = endOfMonth(fechaReferencia);
  const diasDelMes = eachDayOfInterval({ start: inicioMes, end: finMes });
  const espaciosVacios = Array.from({ length: getDay(inicioMes) });
  const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  // Generar horarios de 9:00 a 21:00
  const horariosDisponibles = [];
  for (let h = 9; h <= 20; h++) {
    horariosDisponibles.push(`${h}:00`);
    horariosDisponibles.push(`${h}:30`);
  }
  horariosDisponibles.push("21:00");

  // EFECTO: Buscar turnos ocupados cuando cambia el día seleccionado
  useEffect(() => {
    if (seleccion) {
      const buscarOcupados = async () => {
        try {
          const fechaStr = format(seleccion, "yyyy-MM-dd");
          const res = await fetch(`/api/turnos?dia=${fechaStr}`);
          const data = await res.json();
          // Mapeamos para obtener solo las horas: ["10:00", "14:30"]
          const horas = data.map((t: any) => t.Turno.Hora);
          setTurnosOcupados(horas);
          setHorario(""); // Limpiamos selección de hora previa si cambia el día
        } catch (error) {
          console.error("Error cargando ocupados:", error);
        }
      };
      buscarOcupados();
    }
  }, [seleccion]);

  const esMesActual = format(fechaReferencia, "MM-yyyy") === format(hoy, "MM-yyyy");

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!horario) return alert("Por favor selecciona un horario");

const turnoData = {
  Nombre_Cliente: `${datos.nombre} ${datos.apellido}`,
  Telefono_Cliente: Number(datos.telefono),
  // Ya no incluimos el DNI aquí
  Turno: {
    Dia: format(seleccion!, "yyyy-MM-dd"),
    Hora: horario
  },
  Estado: "Pending"
};

    try {
      const response = await fetch("/api/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(turnoData),
      });

      if (response.ok) {
        alert("¡Turno reservado con éxito!");
        setSeleccion(null);
        setHorario("");
        setPaso(1);
      } else {
        alert("Error al guardar el turno");
      }
    } catch (error) {
      alert("Error de conexión");
    }
  };

  return (
    <main className="container">
      <div className="calendario-card">
        {paso === 1 ? (
          <div className="animate-fade-in">
            <div className="calendario-header">
              <button className="nav-btn" onClick={() => setFechaReferencia(subMonths(fechaReferencia, 1))} disabled={esMesActual}>&lt;</button>
              <h2 className="mes-titulo">{format(fechaReferencia, "MMMM yyyy", { locale: es })}</h2>
              <button className="nav-btn" onClick={() => setFechaReferencia(addMonths(fechaReferencia, 1))}>&gt;</button>
            </div>

            <div className="calendario-grid">
              {diasSemana.map((d) => <div key={d} className="dia-semana-label">{d}</div>)}
              {espaciosVacios.map((_, i) => <div key={`empty-${i}`} className="dia-vacio" />)}
              {diasDelMes.map((dia) => {
                const estaSeleccionado = seleccion && isSameDay(dia, seleccion);
                const esPasado = isBefore(dia, hoy);
                return (
                  <div
                    key={dia.toString()}
                    className={`dia-celda ${estaSeleccionado ? "seleccionado" : ""} ${esPasado ? "deshabilitado" : ""}`}
                    onClick={() => !esPasado && setSeleccion(dia)}
                  >
                    {format(dia, "d")}
                  </div>
                );
              })}
            </div>

            <div className="calendario-footer">
              {seleccion ? (
                <div className="info-turno">
                  <span>Día: <strong>{format(seleccion, "eeee d 'de' MMMM", { locale: es })}</strong></span>
                  <button className="confirm-btn" onClick={() => setPaso(2)}>Confirmar Día</button>
                </div>
              ) : (
                <p className="placeholder-text">Elige un día disponible</p>
              )}
            </div>
          </div>
        ) : (
          <form className="form-detalles animate-fade-in" onSubmit={manejarEnvio}>
            <button type="button" className="back-link" onClick={() => setPaso(1)}>← Volver</button>
            <h2 className="titulo-form">Detalles</h2>
            <p className="fecha-form">{format(seleccion!, "dd 'de' MMMM", { locale: es })}</p>

            <div className="input-group">
              <label>Horario disponible:</label>
              <div className="horarios-carrusel">
                {horariosDisponibles.map((h) => {
                  const estaOcupado = turnosOcupados.includes(h);
                  return (
                    <button
                      key={h}
                      type="button"
                      disabled={estaOcupado}
                      className={`horario-card ${horario === h ? "active" : ""} ${estaOcupado ? "ocupado" : ""}`}
                      onClick={() => !estaOcupado && setHorario(h)}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="input-group">
              <input type="text" placeholder="Nombre" required onChange={(e) => setDatos({...datos, nombre: e.target.value})} />
              <input type="text" placeholder="Apellido" required onChange={(e) => setDatos({...datos, apellido: e.target.value})} />
              <input type="number" placeholder="Teléfono" required onChange={(e) => setDatos({...datos, telefono: e.target.value})} />
            </div>

            <button type="submit" className="confirm-btn final">Finalizar Reserva</button>
          </form>
        )}
      </div>
    </main>
  );
}