"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { compararTurnos } from "../../../lib/horarios";
import { formatearPrecio } from "../../../lib/servicios";
import { IconoWhatsapp, fechaDe, linkWhatsapp, servicioDe } from "./util";
import type { Cliente, HistorialItem, Turno } from "./tipos";

export default function FichaCliente({
  cliente,
  historial,
  turnos,
  onCerrar,
  onNotas,
}: {
  cliente: Cliente;
  historial: HistorialItem[];
  turnos: Turno[];
  onCerrar: () => void;
  onNotas: (id: string, notas: string) => void;
}) {
  const [notas, setNotas] = useState(cliente.notas ?? "");
  const [estado, setEstado] = useState<"" | "guardando" | "ok" | "error">("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  const tel = Number(cliente.telefono);
  const resumen = useMemo(() => {
    const suyos = historial.filter((h) => h.Telefono_Cliente === tel).sort((a, b) => compararTurnos(b.Turno, a.Turno));
    const atendidos = suyos.filter((h) => h.Estado === "Success");
    const conteo = new Map<string, number>();
    for (const h of atendidos) conteo.set(servicioDe(h).Nombre, (conteo.get(servicioDe(h).Nombre) ?? 0) + 1);
    const favorito = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const proximo = turnos.filter((t) => t.Telefono_Cliente === tel).sort((a, b) => compararTurnos(a.Turno, b.Turno))[0];
    return {
      suyos,
      visitas: atendidos.length,
      cancelados: suyos.length - atendidos.length,
      gastado: atendidos.reduce((s, h) => s + (servicioDe(h).Precio ?? 0), 0),
      ultima: atendidos[0]?.Turno.Dia,
      favorito,
      proximo,
    };
  }, [historial, turnos, tel]);

  const guardar = async () => {
    setEstado("guardando");
    try {
      const res = await fetch(`/api/clientes?id=${cliente._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notas }),
      });
      if (!res.ok) throw new Error();
      onNotas(cliente._id, notas.trim());
      setEstado("ok");
    } catch {
      setEstado("error");
    }
  };

  const nombre = `${cliente.nombre} ${cliente.apellido !== "—" ? cliente.apellido : ""}`.trim();

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-label={`Ficha de ${nombre}`} onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal reprogramar ficha">
        <div className="reprogramar-cabecera">
          <div className="ficha-titulo">
            <span className="turno-hora turno-inicial">{cliente.nombre.charAt(0).toUpperCase()}</span>
            <div>
              <h3>{nombre}</h3>
              <p className="turno-sub">
                Cliente desde {cliente.createdAt ? format(new Date(cliente.createdAt), "dd/MM/yyyy") : "—"}
              </p>
            </div>
          </div>
          <button type="button" className="cerrar" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="ficha-datos">
          <div>
            <span>Visitas</span>
            <strong>{resumen.visitas}</strong>
          </div>
          <div>
            <span>Gastado</span>
            <strong>{resumen.gastado ? formatearPrecio(resumen.gastado) : "—"}</strong>
          </div>
          <div>
            <span>Última vez</span>
            <strong>{resumen.ultima ? format(fechaDe(resumen.ultima), "dd/MM/yy") : "—"}</strong>
          </div>
          <div>
            <span>Cancelados</span>
            <strong>{resumen.cancelados}</strong>
          </div>
        </div>

        {(resumen.proximo || resumen.favorito) && (
          <p className="ficha-linea">
            {resumen.proximo && (
              <>
                Próximo turno: <strong>{format(fechaDe(resumen.proximo.Turno.Dia), "dd/MM")} a las {resumen.proximo.Turno.Hora}</strong>.{" "}
              </>
            )}
            {resumen.favorito && (
              <>
                Suele pedir: <strong>{resumen.favorito}</strong>.
              </>
            )}
          </p>
        )}

        <label className="ficha-notas">
          <span className="etiqueta">Notas</span>
          <textarea
            value={notas}
            onChange={(e) => {
              setNotas(e.target.value);
              setEstado("");
            }}
            maxLength={500}
            rows={3}
            placeholder="Cómo se corta, número de máquina, preferencias…"
          />
        </label>
        <div className="ficha-guardar">
          <span className="turno-sub">
            {estado === "ok" ? "Guardado ✓" : estado === "error" ? "No se pudo guardar" : "Solo las ves vos"}
          </span>
          <button type="button" className="btn btn-blanco btn-chico" onClick={guardar} disabled={estado === "guardando" || notas.trim() === (cliente.notas ?? "")}>
            {estado === "guardando" ? <span className="cargando-icono" /> : "Guardar notas"}
          </button>
        </div>

        <p className="etiqueta ficha-sub">Historial</p>
        {resumen.suyos.length ? (
          <div className="lista ficha-hist">
            {resumen.suyos.slice(0, 12).map((h) => (
              <div key={h._id} className="turno turno--hist">
                <span className="turno-hora">{h.Turno.Hora}</span>
                <div className="turno-info">
                  <strong>{servicioDe(h).Nombre}</strong>
                  <span className="turno-sub">{format(fechaDe(h.Turno.Dia), "dd/MM/yyyy")}</span>
                </div>
                <span className={`estado ${h.Estado === "Success" ? "estado--ok" : ""}`}>{h.Estado === "Success" ? "Atendido" : "Cancelado"}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="vacio">Todavía no tiene turnos cerrados.</p>
        )}

        <div className="modal-acciones">
          <a href={linkWhatsapp(cliente.telefono)} target="_blank" rel="noopener noreferrer" className="btn btn-blanco">
            <IconoWhatsapp /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
