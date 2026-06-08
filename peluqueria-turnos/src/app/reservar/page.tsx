"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  format,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  isBefore,
  startOfToday,
  startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import "./estilos.css";
import Footer from "../components/footer";
import Navbar from "../components/navbar";

function ReservasContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const editId = searchParams.get("edit");
  const nombreUrl = searchParams.get("nombre")
    ? decodeURIComponent(searchParams.get("nombre")!)
    : "";
  const telUrl = searchParams.get("tel") || "";

  const [fechaReferencia, setFechaReferencia] = useState(new Date());
  const [seleccion, setSeleccion] = useState<Date | null>(null);
  const [paso, setPaso] = useState(1);
  const [horario, setHorario] = useState("");
  const [turnosOcupados, setTurnosOcupados] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);

  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    tipo: "success" | "error" | "warning";
    mensaje: string;
    accionOk?: () => void;
  }>({
    visible: false,
    tipo: "success",
    mensaje: "",
  });

  const [datos, setDatos] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
  });

  const hoy = startOfToday();
  const inicioMes = startOfMonth(fechaReferencia);
  const finMes = endOfMonth(fechaReferencia);

  const diasDelMes = eachDayOfInterval({
    start: inicioMes,
    end: finMes,
  });

  const espaciosVacios = Array.from({
    length: getDay(inicioMes),
  });

  const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const horariosDisponibles = [];

  for (let h = 9; h <= 20; h++) {
    horariosDisponibles.push(`${h}:00`, `${h}:30`);
  }
  horariosDisponibles.push("21:00");

  useEffect(() => {
    if (seleccion) {
      const buscarOcupados = async () => {
        try {
          const fechaStr = format(seleccion, "yyyy-MM-dd");
          const res = await fetch(`/api/turnos?dia=${fechaStr}`);
          const data = await res.json();

          setTurnosOcupados(data.map((t: any) => t.Turno.Hora));
          setHorario("");
        } catch (error) {
          console.error(error);
        }
      };
      buscarOcupados();
    }
  }, [seleccion]);

  const mostrarAlerta = (
    tipo: "success" | "error" | "warning",
    mensaje: string,
    accionOk?: () => void
  ) => {
    setStatusModal({
      visible: true,
      tipo,
      mensaje,
      accionOk,
    });
  };

  const manejarEnvio = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!horario || !seleccion) {
      return mostrarAlerta(
        "warning",
        "Por favor, seleccioná un horario antes de continuar."
      );
    }

    const nombreFinal = editId
      ? nombreUrl
      : `${datos.nombre} ${datos.apellido}`.trim();

    const telefonoLimpio = editId
      ? telUrl.toString().replace(/\D/g, "")
      : datos.telefono.toString().replace(/\D/g, "");

    const telefonoFinal = Number(telefonoLimpio);

    if (!nombreFinal || !telefonoFinal) {
      return mostrarAlerta(
        "warning",
        "Completá los datos de contacto necesarios."
      );
    }

    setCargando(true);

    try {
      if (!editId) {
        const checkRes = await fetch(`/api/turnos?telefono=${telefonoFinal}`, {
          cache: "no-store",
        });
        const existeTurno = await checkRes.json();

        if (checkRes.ok && existeTurno) {
          mostrarAlerta(
            "error",
            "Ya tenés un turno agendado con este número. No podés tener dos a la vez."
          );
          setCargando(false);
          return;
        }
      }

      const turnoData = {
        Nombre_Cliente: nombreFinal,
        Telefono_Cliente: telefonoFinal,
        Turno: {
          Dia: format(seleccion, "yyyy-MM-dd"),
          Hora: horario,
          Estado: "Pending",
        },
      };

      const url = editId ? `/api/turnos?id=${editId}` : "/api/turnos";
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(turnoData),
      });

      if (res.ok) {
        mostrarAlerta(
          "success",
          editId
            ? "¡Tu turno se actualizó correctamente!"
            : "¡Tu reserva fue confirmada con éxito!",
          () => {
            router.replace("/consultar");
          }
        );
      } else {
        mostrarAlerta(
          "error",
          "Ocurrió un error al intentar guardar en la base de datos."
        );
      }
    } catch (error) {
      mostrarAlerta("error", "Hubo un error de conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="one-container">
      <Navbar />

      <h1 className="one-title">
        {editId ? (
          <>MODIFICAR <span>TURNO</span></>
        ) : (
          <>RESERVAR <span>TURNO</span></>
        )}
      </h1>

      <div className="one-calendario-card">
        {paso === 1 ? (
          <div className="one-animate-fade-in">
            <div className="one-calendario-header">
              <button
                className="one-nav-btn"
                onClick={() => {
                  setFechaReferencia(subMonths(fechaReferencia, 1));
                  setSeleccion(null);
                }}
                disabled={
                  format(fechaReferencia, "MM-yyyy") === format(hoy, "MM-yyyy")
                }
              >
                {"<"}
              </button>

              <h2 className="one-mes-titulo">
                {format(fechaReferencia, "MMMM yyyy", { locale: es })}
              </h2>

              <button
                className="one-nav-btn"
                onClick={() => {
                  setFechaReferencia(addMonths(fechaReferencia, 1));
                  setSeleccion(null);
                }}
              >
                {">"}
              </button>
            </div>

            <div className="one-calendario-grid">
              {diasSemana.map((d) => (
                <div key={d} className="one-dia-semana-label">
                  {d}
                </div>
              ))}

              {espaciosVacios.map((_, i) => (
                <div key={i} className="one-dia-vacio" />
              ))}

              {diasDelMes.map((dia) => {
                const estaBloqueado =
                  isBefore(startOfDay(dia), startOfDay(hoy)) ||
                  [0, 1].includes(getDay(dia));

                return (
                  <div
                    key={dia.toString()}
                    className={`one-dia-celda ${
                      seleccion && isSameDay(dia, seleccion)
                        ? "one-seleccionado"
                        : ""
                    } ${estaBloqueado ? "one-deshabilitado" : ""}`}
                    onClick={() => !estaBloqueado && setSeleccion(dia)}
                  >
                    {format(dia, "d")}
                  </div>
                );
              })}
            </div>

            <div className="one-calendario-footer">
              {seleccion ? (
                <div className="one-info-turno">
                  <span>
                    Día:{" "}
                    <strong>
                      {format(seleccion, "eeee d 'de' MMMM", { locale: es })}
                    </strong>
                  </span>

                  <button className="one-confirm-btn" onClick={() => setPaso(2)}>
                    CONFIRMAR DÍA
                  </button>
                </div>
              ) : (
                <p className="one-placeholder-text">Elige un día disponible</p>
              )}
            </div>
          </div>
        ) : (
          <div className="one-form-detalles one-animate-fade-in">
            <button
              type="button"
              className="one-back-link"
              onClick={() => setPaso(1)}
            >
              ← Volver
            </button>

            <h2 className="one-titulo-form">
              {editId ? "Nuevo Horario" : "Detalles"}
            </h2>

            <p className="one-fecha-form">
              {format(seleccion!, "dd 'de' MMMM", { locale: es })}
            </p>

            <div className="one-input-group">
              <label>Horario disponible:</label>

              <div className="one-horarios-carrusel">
                {horariosDisponibles.map((h) => {
                  const estaOcupado = turnosOcupados.includes(h);
                  const esHoy = seleccion && isSameDay(seleccion, hoy);
                  let esHoraPasada = false;

                  if (esHoy) {
                    const [hT, mT] = h.split(":").map(Number);
                    const ahora = new Date();

                    if (
                      hT < ahora.getHours() ||
                      (hT === ahora.getHours() && mT <= ahora.getMinutes())
                    ) {
                      esHoraPasada = true;
                    }
                  }

                  const deshabilitado = estaOcupado || esHoraPasada;

                  return (
                    <button
                      key={h}
                      type="button"
                      disabled={deshabilitado}
                      className={`one-horario-card ${
                        horario === h ? "one-active" : ""
                      } ${deshabilitado ? "one-ocupado" : ""}`}
                      onClick={() => !deshabilitado && setHorario(h)}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {editId ? (
              <div
                style={{
                  marginTop: "30px",
                  borderTop: "1px solid #222",
                  paddingTop: "20px",
                }}
              >
                <p
                  style={{
                    color: "#888",
                    marginBottom: "15px",
                    fontSize: "14px",
                  }}
                >
                  Modificando turno de:{" "}
                  <strong style={{ color: "#fff" }}>{nombreUrl}</strong>
                </p>

                <button
                  onClick={() => manejarEnvio()}
                  className="one-confirm-btn one-final"
                  disabled={!horario || cargando}
                >
                  {cargando
                    ? "PROCESANDO..."
                    : horario
                    ? `CONFIRMAR PARA LAS ${horario} HS`
                    : "ELEGÍ UN HORARIO"}
                </button>
              </div>
            ) : (
              <form onSubmit={manejarEnvio}>
                <div className="one-input-group">
                  <input
                    type="text"
                    placeholder="Nombre"
                    required
                    onChange={(e) =>
                      setDatos({ ...datos, nombre: e.target.value })
                    }
                  />

                  <input
                    type="text"
                    placeholder="Apellido"
                    required
                    onChange={(e) =>
                      setDatos({ ...datos, apellido: e.target.value })
                    }
                  />

                  <input
                    type="number"
                    placeholder="Teléfono"
                    required
                    onChange={(e) =>
                      setDatos({ ...datos, telefono: e.target.value })
                    }
                  />
                </div>

                <button
                  type="submit"
                  className="one-confirm-btn one-final"
                  disabled={cargando}
                >
                  {cargando ? "VERIFICANDO..." : "Finalizar Reserva"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {statusModal.visible && (
        <div className="one-feedback-modal-overlay">
          <div className="one-feedback-modal-card one-animate-pop-in">
            <div className="one-icon-wrapper">
              {statusModal.tipo === "success" && (
                <div className="one-success-checkmark">
                  <div className="one-check-icon">
                    <span className="one-icon-line one-line-tip"></span>
                    <span className="one-icon-line one-line-long"></span>
                    <div className="one-icon-circle"></div>
                    <div className="one-icon-fix"></div>
                  </div>
                </div>
              )}

              {statusModal.tipo === "error" && (
                <div className="one-error-xmark">
                  <div className="one-x-icon">
                    <span className="one-x-line one-line-left"></span>
                    <span className="one-x-line one-line-right"></span>
                  </div>
                </div>
              )}

              {statusModal.tipo === "warning" && (
                <div className="one-warning-mark">!</div>
              )}
            </div>

            <p className="one-feedback-mensaje">{statusModal.mensaje}</p>

            <button
              className="one-feedback-btn"
              onClick={() => {
                setStatusModal({ ...statusModal, visible: false });
                if (statusModal.accionOk) statusModal.accionOk();
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ReservasContent />
    </Suspense>
  );
}