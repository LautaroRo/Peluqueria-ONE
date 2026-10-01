"use client";

import { useEffect, useMemo, useState } from "react";
import { format, getDay, isSameDay, startOfToday } from "date-fns";
import { Calendario, SelectorHorario } from "../../../components/calendario";
import { ahoraEnCordoba, horariosDelDia } from "../../../lib/horarios";
import { Servicio, formatearDuracion, formatearPrecio } from "../../../lib/servicios";
import type { Cliente } from "./tipos";

// Para los turnos que llegan por teléfono, WhatsApp o en persona
export default function NuevoTurno({
  clientes,
  onCerrar,
  onCreado,
}: {
  clientes: Cliente[];
  onCerrar: () => void;
  onCreado: (texto: string) => void;
}) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [mes, setMes] = useState(startOfToday());
  const [dia, setDia] = useState<Date | null>(null);
  const [hora, setHora] = useState("");
  const [ocupados, setOcupados] = useState<string[]>([]);
  const [cargandoHoras, setCargandoHoras] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/servicios")
      .then((r) => r.json())
      .then((l: Servicio[]) => {
        if (!Array.isArray(l)) return;
        setServicios(l);
        setServicio(l[0] ?? null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  // Clientes que ya vinieron: escribiendo el nombre o el teléfono aparece y se completa solo
  const sugeridos = useMemo(() => {
    const nq = nombre.trim().toLowerCase();
    const tq = telefono.replace(/\D/g, "");
    if (nq.length < 2 && tq.length < 3) return [];
    return clientes
      .filter(
        (c) =>
          (nq.length >= 2 && `${c.nombre} ${c.apellido}`.toLowerCase().includes(nq)) || (tq.length >= 3 && c.telefono.includes(tq)),
      )
      .slice(0, 4);
  }, [clientes, nombre, telefono]);
  const yaElegido = sugeridos.length === 1 && sugeridos[0].telefono === telefono.replace(/\D/g, "");

  const elegirDia = async (d: Date) => {
    setDia(d);
    setHora("");
    setCargandoHoras(true);
    try {
      const res = await fetch(`/api/turnos?dia=${format(d, "yyyy-MM-dd")}`, { cache: "no-store" });
      const data = await res.json();
      setOcupados(Array.isArray(data) ? data.map((x: { Turno: { Hora: string } }) => x.Turno.Hora) : []);
    } catch {
      setOcupados([]);
    } finally {
      setCargandoHoras(false);
    }
  };

  const guardar = async () => {
    if (!dia || !hora || !servicio) return;
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Nombre_Cliente: nombre,
          Telefono_Cliente: telefono,
          Turno: { Dia: format(dia, "yyyy-MM-dd"), Hora: hora },
          Servicio: servicio.clave,
          Origen: "panel",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "No se pudo guardar.");
        if (res.status === 409) elegirDia(dia);
        return;
      }
      onCreado(`${nombre} · ${servicio.nombre} · ${format(dia, "dd/MM")} a las ${hora} hs.`);
    } catch {
      setError("Sin conexión. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const esHoy = dia && isSameDay(dia, startOfToday());
  const listo = nombre.trim().length >= 2 && telefono.replace(/\D/g, "").length >= 8 && dia && hora && servicio;

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Nuevo turno">
      <div className="modal reprogramar nuevo-turno">
        <div className="reprogramar-cabecera">
          <div>
            <p className="etiqueta">Cargar turno</p>
            <h3>Nuevo turno</h3>
          </div>
          <button type="button" className="cerrar" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="nt-campos">
          <input className="buscador" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" autoFocus />
          <input className="buscador" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono" inputMode="numeric" />
        </div>
        {!yaElegido && sugeridos.length > 0 && (
          <div className="nt-sugeridos">
            {sugeridos.map((c) => (
              <button
                key={c._id}
                type="button"
                className="chip"
                onClick={() => {
                  setNombre(`${c.nombre} ${c.apellido !== "—" ? c.apellido : ""}`.trim());
                  setTelefono(c.telefono);
                }}
              >
                {c.nombre} {c.apellido !== "—" ? c.apellido : ""} · {c.telefono}
              </button>
            ))}
          </div>
        )}

        <p className="etiqueta nt-titulo">Servicio</p>
        <div className="chips chips--envolver">
          {servicios.map((s) => (
            <button
              key={s._id}
              type="button"
              className={`chip ${servicio?._id === s._id ? "activo" : ""}`}
              onClick={() => {
                if (s.duracion !== servicio?.duracion) setHora("");
                setServicio(s);
              }}
            >
              {s.nombre} · {formatearDuracion(s.duracion)}
              {s.precio !== null && ` · ${formatearPrecio(s.precio)}`}
            </button>
          ))}
        </div>

        <p className="etiqueta nt-titulo">Día y horario</p>
        <Calendario mes={mes} onMes={setMes} seleccion={dia} onSeleccion={elegirDia} />
        {dia && (
          <div className="reprogramar-horarios">
            <SelectorHorario
              horarios={horariosDelDia(getDay(dia))}
              ocupados={ocupados}
              elegido={hora}
              onElegir={setHora}
              pasadosHasta={esHoy ? ahoraEnCordoba().minutos : -1}
              cargando={cargandoHoras}
              duracion={servicio?.duracion ?? 30}
            />
          </div>
        )}

        {error && (
          <p className="nt-error" role="alert">
            {error}
          </p>
        )}

        <div className="modal-acciones">
          <button type="button" className="btn btn-borde" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="button" className="btn btn-blanco" onClick={guardar} disabled={!listo || enviando}>
            {enviando ? <span className="cargando-icono" /> : hora ? `Guardar ${hora}` : "Completá los datos"}
          </button>
        </div>
      </div>
    </div>
  );
}
