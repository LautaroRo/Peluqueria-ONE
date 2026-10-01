"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import "./estilos.css";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/consultar", label: "Mi turno" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolleado, setScrolleado] = useState(false);
  const [abierto, setAbierto] = useState(false);

  // Se compacta y toma fondo al bajar
  useEffect(() => {
    const onScroll = () => setScrolleado(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // El menú del celular no deja scrollear la página de atrás
  useEffect(() => {
    document.body.style.overflow = abierto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [abierto]);

  return (
    <nav className={`nav ${scrolleado ? "nav--compacta" : ""} ${abierto ? "nav--abierta" : ""}`}>
      <Link href="/" className="nav-logo" aria-label="ONE, inicio" onClick={() => setAbierto(false)}>
        ONE
      </Link>

      <div className="nav-links">
        {LINKS.filter((l) => l.href !== pathname).map((l) => (
          <Link key={l.href} href={l.href} className="nav-link" onClick={() => setAbierto(false)}>
            {l.label}
          </Link>
        ))}
        {pathname !== "/reservar" && (
          <Link href="/reservar" className="btn btn-blanco btn-chico nav-cta" onClick={() => setAbierto(false)}>
            Reservar turno
          </Link>
        )}
      </div>

      <button
        type="button"
        className="nav-hamburguesa"
        onClick={() => setAbierto((a) => !a)}
        aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={abierto}
      >
        <span />
        <span />
      </button>
    </nav>
  );
}
