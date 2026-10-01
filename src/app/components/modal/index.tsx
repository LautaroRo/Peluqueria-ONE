"use client";

import { ReactNode, useEffect } from "react";

export type TipoModal = "ok" | "error" | "aviso";

const Icono = ({ tipo }: { tipo: TipoModal }) => {
  if (tipo === "ok") {
    return (
      <div className="modal-icono">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path className="trazo" d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
    );
  }
  if (tipo === "error") {
    return (
      <div className="modal-icono">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path className="trazo" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </div>
    );
  }
  return <div className="modal-icono">!</div>;
};

// Modal compartido. Se cierra con Escape.
export default function Modal({
  tipo,
  titulo,
  children,
  acciones,
  onCerrar,
}: {
  tipo: TipoModal;
  titulo: string;
  children?: ReactNode;
  acciones: ReactNode;
  onCerrar?: () => void;
}) {
  useEffect(() => {
    if (!onCerrar) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="modal">
        <Icono tipo={tipo} />
        <h3>{titulo}</h3>
        {children}
        <div className="modal-acciones">{acciones}</div>
      </div>
    </div>
  );
}
