"use client";

import { useEffect, useState } from "react";
import { estadoDelLocal } from "../../lib/horarios";

// "Abierto · cierra a las 20:00": se calcula en el navegador con la hora de Córdoba
// y se refresca cada minuto. En el servidor no se muestra (evita un desfase de hidratación).
export default function EstadoLocal({ className = "" }: { className?: string }) {
  const [estado, setEstado] = useState<ReturnType<typeof estadoDelLocal> | null>(null);

  useEffect(() => {
    const actualizar = () => setEstado(estadoDelLocal());
    const primero = window.setTimeout(actualizar, 0);
    const timer = window.setInterval(actualizar, 60_000);
    return () => {
      window.clearTimeout(primero);
      window.clearInterval(timer);
    };
  }, []);

  if (!estado) return <span className={`estado-local ${className}`} aria-hidden />;

  return (
    <span className={`estado-local ${estado.abierto ? "abierto" : ""} ${className}`}>
      <i aria-hidden />
      {estado.texto}
    </span>
  );
}
