"use client";

import { useEffect, useState } from "react";
import { DURACIONES, Servicio, formatearDuracion } from "../../../lib/servicios";
import type { Aviso } from "./tipos";

type Borrador = { nombre: string; descripcion: string; precio: string; duracion: number };

const aBorrador = (s?: Servicio): Borrador => ({
  nombre: s?.nombre ?? "",
  descripcion: s?.descripcion ?? "",
  precio: s?.precio != null ? String(s.precio) : "",
  duracion: s?.duracion ?? 30,
});

const igual = (a: Borrador, b: Borrador) =>
  a.nombre === b.nombre && a.descripcion === b.descripcion && a.precio === b.precio && a.duracion === b.duracion;

const aEnvio = (b: Borrador) => ({
  nombre: b.nombre,
  descripcion: b.descripcion,
  precio: b.precio.trim() === "" ? null : Number(b.precio.replace(/\D/g, "")),
  duracion: b.duracion,
});

function Campos({ b, onCambio }: { b: Borrador; onCambio: (b: Borrador) => void }) {
  return (
    <div className="serv-campos">
      <input className="buscador" value={b.nombre} onChange={(e) => onCambio({ ...b, nombre: e.target.value })} placeholder="Nombre" aria-label="Nombre" maxLength={60} />
      <input
        className="buscador"
        value={b.descripcion}
        onChange={(e) => onCambio({ ...b, descripcion: e.target.value })}
        placeholder="Descripción corta (opcional)"
        aria-label="Descripción"
        maxLength={200}
      />
      <div className="serv-fila">
        <label className="serv-precio">
          <span>$</span>
          <input
            className="buscador"
            inputMode="numeric"
            value={b.precio}
            onChange={(e) => onCambio({ ...b, precio: e.target.value.replace(/\D/g, "") })}
            placeholder="Precio (vacío = no se muestra)"
            aria-label="Precio"
          />
        </label>
        <select className="buscador serv-duracion" value={b.duracion} onChange={(e) => onCambio({ ...b, duracion: Number(e.target.value) })} aria-label="Duración">
          {DURACIONES.map((d) => (
            <option key={d} value={d}>
              {formatearDuracion(d)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function Servicios({ onAviso }: { onAviso: (a: Aviso) => void }) {
  const [lista, setLista] = useState<Servicio[] | null>(null);
  const [borradores, setBorradores] = useState<Record<string, Borrador>>({});
  const [nuevo, setNuevo] = useState<Borrador | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [borrar, setBorrar] = useState<string | null>(null);

  const cargar = async () => {
    try {
      const res = await fetch("/api/servicios?todos", { cache: "no-store" });
      const data: Servicio[] = await res.json();
      setLista(data);
      setBorradores(Object.fromEntries(data.map((s) => [s._id, aBorrador(s)])));
    } catch {
      setLista([]);
    }
  };

  useEffect(() => {
    const t = window.setTimeout(cargar, 0);
    return () => window.clearTimeout(t);
  }, []);

  const pedir = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? "Probá de nuevo en un momento.");
    return data;
  };

  const ejecutar = async (id: string, fn: () => Promise<unknown>, ok?: string) => {
    setGuardando(id);
    try {
      await fn();
      await cargar();
      if (ok) onAviso({ ok: true, titulo: ok, texto: "Ya se ve así en la web." });
    } catch (e) {
      onAviso({ ok: false, titulo: "No se pudo guardar", texto: (e as Error).message });
    } finally {
      setGuardando(null);
    }
  };

  if (!lista) return <p className="vacio">Cargando…</p>;

  return (
    <div className="serv">
      <p className="est-nota">
        Lo que cargues acá es lo que ven los clientes al reservar y en la página de inicio. Los servicios de 1 hora ocupan dos
        medias horas de la agenda. Los turnos ya sacados conservan el precio con el que se reservaron.
      </p>

      {lista.map((s) => {
        const b = borradores[s._id] ?? aBorrador(s);
        const cambiado = !igual(b, aBorrador(s));
        return (
          <div key={s._id} className={`serv-item ${s.activo ? "" : "inactivo"}`}>
            <div className="serv-cabecera">
              <button
                type="button"
                className={`interruptor ${s.activo ? "on" : ""}`}
                onClick={() => ejecutar(s._id, () => pedir(`/api/servicios?id=${s._id}`, "PATCH", { activo: !s.activo }))}
                aria-pressed={s.activo}
                disabled={guardando === s._id}
              >
                <span />
                {s.activo ? "Visible" : "Oculto"}
              </button>
              <div className="serv-botones">
                {borrar === s._id ? (
                  <>
                    <button type="button" className="accion" onClick={() => setBorrar(null)}>
                      No
                    </button>
                    <button
                      type="button"
                      className="accion accion--borrar"
                      onClick={() => {
                        setBorrar(null);
                        ejecutar(s._id, () => pedir(`/api/servicios?id=${s._id}`, "DELETE"), "Servicio borrado");
                      }}
                    >
                      Sí, borrar
                    </button>
                  </>
                ) : (
                  <button type="button" className="accion accion--borrar" onClick={() => setBorrar(s._id)}>
                    ✕ <span>Borrar</span>
                  </button>
                )}
              </div>
            </div>
            <Campos b={b} onCambio={(nb) => setBorradores((x) => ({ ...x, [s._id]: nb }))} />
            {cambiado && (
              <div className="serv-guardar">
                <button type="button" className="btn btn-borde btn-chico" onClick={() => setBorradores((x) => ({ ...x, [s._id]: aBorrador(s) }))}>
                  Descartar
                </button>
                <button
                  type="button"
                  className="btn btn-blanco btn-chico"
                  disabled={guardando === s._id}
                  onClick={() => ejecutar(s._id, () => pedir(`/api/servicios?id=${s._id}`, "PATCH", aEnvio(b)), "Servicio guardado")}
                >
                  {guardando === s._id ? <span className="cargando-icono" /> : "Guardar cambios"}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {nuevo ? (
        <div className="serv-item serv-nuevo">
          <p className="etiqueta">Nuevo servicio</p>
          <Campos b={nuevo} onCambio={setNuevo} />
          <div className="serv-guardar">
            <button type="button" className="btn btn-borde btn-chico" onClick={() => setNuevo(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-blanco btn-chico"
              disabled={nuevo.nombre.trim().length < 2 || guardando === "nuevo"}
              onClick={() =>
                ejecutar(
                  "nuevo",
                  async () => {
                    await pedir("/api/servicios", "POST", { ...aEnvio(nuevo), activo: true });
                    setNuevo(null);
                  },
                  "Servicio agregado",
                )
              }
            >
              {guardando === "nuevo" ? <span className="cargando-icono" /> : "Agregar"}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-borde serv-agregar" onClick={() => setNuevo(aBorrador())}>
          + Agregar servicio
        </button>
      )}
    </div>
  );
}
