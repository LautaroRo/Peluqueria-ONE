"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

import "./estilos.css"

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="one-navbar-landing">
      <h2 className="one-logo-landing">ONE</h2>
      <div className="one-nav-actions-landing">
        
        {/* Oculta "MI TURNO" si ya estás en /consultar */}
        {pathname !== "/consultar" && (
          <Link href="/consultar" className="one-btn-nav-secondary-landing">
            MI TURNO
          </Link>
        )}
        
        {/* Oculta "RESERVAR TURNO" si ya estás en /reservar */}
        {pathname !== "/reservar" && (
          <Link href="/reservar" className="one-btn-nav-landing">
            RESERVAR TURNO
          </Link>
        )}

        {/* Agregamos el botón de Inicio solo si no estás en la Landing principal (/) */}
        {pathname !== "/" && (
          <Link href="/" className="one-btn-nav-secondary-landing">
            INICIO
          </Link>
        )}
        
      </div>
    </nav>
  );
}