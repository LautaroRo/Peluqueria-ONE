import Link from "next/link";
import { DIAS_CERRADO_TEXTO, HORARIOS_TEXTO } from "../../lib/horarios";
import { DIRECCION, LINK_MAPS } from "../../lib/local";
import "./estilos.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grilla">
        <div>
          <p className="footer-logo">ONE</p>
          <p className="footer-texto">Peluquería y barbería.</p>
        </div>

        <div>
          <p className="etiqueta">Dónde</p>
          <a href={LINK_MAPS} target="_blank" rel="noopener noreferrer" className="footer-link">
            {DIRECCION.calle}
            <br />
            {DIRECCION.zona}
          </a>
        </div>

        <div>
          <p className="etiqueta">Horarios</p>
          {HORARIOS_TEXTO.map((h) => (
            <p key={h.dias} className="footer-texto">
              {h.dias} · {h.horas}
            </p>
          ))}
          <p className="footer-texto footer-tenue">{DIAS_CERRADO_TEXTO}</p>
        </div>

        <div>
          <p className="etiqueta">Turnos</p>
          <Link href="/reservar" className="footer-link">
            Reservar
          </Link>
          <Link href="/consultar" className="footer-link">
            Ver mi turno
          </Link>
        </div>
      </div>

      <p className="footer-legal">© {new Date().getFullYear()} ONE Peluquería — Designed by Lauti</p>
    </footer>
  );
}
