"use client";

import { useEffect, useState } from "react";
import { format, getDay, startOfToday } from "date-fns";
import { Calendario } from "../../../components/calendario";
import { horariosDelDia } from "../../../lib/horarios";
import { fechaLarga } from "../../../lib/formato";
import { fechaDe } from "./util";
import type { Aviso } from "./tipos";

type Bloqueo = { _id: string; Dia: string; Horas: string[]; Motivo: string; turnos: number };

const MOTIVOS = ["Vacaciones", "Feriado", "Trámite", "Capacitación"];

export default function Bloqueos({ onAviso, onCambio }: { onAviso: (a: Aviso) => void; onCambio: () => void }) {
  const [lista, setLista] = useState<Bloqueo[] | null>(null);
  const [mes, setMes] = useState(startOfToday());
  const [dia, setDia] = useState<Date | null>(null);
  const [diaEntero, setDiaEntero] = useState(true);
  const [horas, setHoras] = useState<string[]>([]);
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const res = await fetch("/api/bloqueos", { cache: "no-store" });
      const data = await res.json();
      setLista(Array.isArray(data) ? data : []);
    } catch {
      setLista([]);
    }
  };

  useEffect(() => {
    const t = window.setTimeout(cargar, 0);
    return () => window.clearTimeout(t);
  }, []);

  const delDia = dia ? horariosDelDia(getDay(dia)) : [];
  const listo = dia && (diaEntero || horas.length);

  const bloquear = async () => {
    if (!dia || !listo) return;
    setGuardando(true);
    try {
      const res = await fetch("/api/bloqueos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Dia: format(dia, "yyyy-MM-dd"), Horas: diaEntero ? [] : horas, Motivo: motivo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Probá de nuevo.");
      onAviso({
        ok: true,
        titulo: diaEntero ? "Día bloqueado" : "Horarios bloqueados",
        texto: data.turnos
          ? `Ojo: ese día ya hay ${data.turnos} ${data.turnos === 1 ? "turno reservado" : "turnos reservados"}. Siguen en la agenda: avisales o reprogramalos.`
          : "Los clientes ya no pueden reservar ahí.",
      });
      setDia(null);
      setHoras([]);
      setMotivo("");
      setDiaEntero(true);
      await cargar();
      onCambio();
    } catch (e) {
      onAviso({ ok: false, titulo: "No se pudo bloquear", texto: (e as Error).message });
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async (b: Bloqueo) => {
    const res = await fetch(`/api/bloqueos?id=${b._id}`, { method: "DELETE" });
    if (res.ok) {
      await cargar();
      onCambio();
    } else onAviso({ ok: false, titulo: "No se pudo desbloquear", texto: "Probá de nuevo en un momento." });
  };

  return (
    <div className="bloq">
      <p className="est-nota">Bloqueá un día entero o algunos horarios: los clientes no los van a poder reservar.</p>

      <div className="bloq-grilla">
        <section className="est-tarjeta">
          <Calendario
            mes={mes}
            onMes={setMes}
            seleccion={dia}
            onSeleccion={(d) => {
              setDia(d);
              setHoras([]);
            }}
          />
        </section>

        <section className="est-tarjeta bloq-form">
          {dia ? (
            <>
              <h3>{fechaLarga(dia)}</h3>
              <div className="segmentos">
                <button type="button" className={diaEntero ? "activo" : ""} onClick={() => setDiaEntero(true)}>
                  Todo el día
                </button>
                <button type="button" className={!diaEntero ? "activo" : ""} onClick={() => setDiaEntero(false)}>
                  Algunos horarios
                </button>
              </div>

              {!diaEntero && (
                <div className="bloq-horas">
                  {delDia.map((h) => (
                    <button
                      key={h}
                      type="button"
                      className={`horario ${horas.includes(h) ? "activo" : ""}`}
                      onClick={() => setHoras((x) => (x.includes(h) ? x.filter((y) => y !== h) : [...x, h]))}
                      aria-pressed={horas.includes(h)}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}

              <input className="buscador" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (opcional, solo lo ves vos)" maxLength={80} />
              <div className="chips chips--envolver">
                {MOTIVOS.map((m) => (
                  <button key={m} type="button" className={`chip ${motivo === m ? "activo" : ""}`} onClick={() => setMotivo(m)}>
                    {m}
                  </button>
                ))}
              </div>

              <button type="button" className="btn btn-blanco" onClick={bloquear} disabled={!listo || guardando}>
                {guardando ? <span className="cargando-icono" /> : diaEntero ? "Bloquear el día" : `Bloquear ${horas.length || ""} ${horas.length === 1 ? "horario" : "horarios"}`}
              </button>
            </>
          ) : (
            <p className="vacio">Elegí un día en el calendario.</p>
          )}
        </section>
      </div>

      <h3 className="bloq-titulo">Próximos bloqueos</h3>
      {lista === null ? (
        <p className="vacio">Cargando…</p>
      ) : lista.length ? (
        <div className="lista">
          {lista.map((b) => (
            <div key={b._id} className="turno">
              <span className="turno-hora">{format(fechaDe(b.Dia), "dd/MM")}</span>
              <div className="turno-info">
                <strong>{b.Horas.length ? `${b.Horas.length} ${b.Horas.length === 1 ? "horario" : "horarios"}: ${b.Horas.join(", ")}` : "Todo el día"}</strong>
                <span className="turno-sub">
                  {fechaLarga(fechaDe(b.Dia))}
                  {b.Motivo && ` · ${b.Motivo}`}
                  {b.turnos > 0 && ` · ⚠ ${b.turnos} ${b.turnos === 1 ? "turno reservado" : "turnos reservados"}`}
                </span>
              </div>
              <button type="button" className="accion" onClick={() => quitar(b)}>
                Desbloquear
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="vacio">No hay días ni horarios bloqueados.</p>
      )}
    </div>
  );
}
