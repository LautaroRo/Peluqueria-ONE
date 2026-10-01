import Image from "next/image";
import Link from "next/link";
import Navbar from "./components/navbar";
import Footer from "./components/footer";
import Revelar from "./components/revelar";
import EstadoLocal from "./components/estado-local";
import { DIAS_CERRADO_TEXTO, HORARIOS_TEXTO } from "./lib/horarios";
import { DIRECCION, FOTO_HECTOR, FOTO_LOCAL, LINK_COMO_LLEGAR, MAPA_EMBED } from "./lib/local";
import "./inicio.css";

const PALABRAS = ["Corte", "Barbería", "Estilo", "Precisión", "Experiencia"];

const OPINIONES = [
  { texto: "Héctor es un crack. Hace años que me corto con él y la atención es impecable.", autor: "Marcos R." },
  { texto: "El mejor sistema de turnos de la zona. Llegás y te atiende al toque. Muy profesional.", autor: "Franco Batistella" },
  { texto: "Excelente barbería en zona norte. Ambiente tranquilo y un corte perfecto.", autor: "Gastón Juárez" },
];

const PASOS = [
  { n: "01", titulo: "Elegí el día", texto: "Mirá el calendario y tocá el día que te quede cómodo." },
  { n: "02", titulo: "Elegí el horario", texto: "Ves al instante qué horarios quedan libres." },
  { n: "03", titulo: "Confirmá", texto: "Dejá tu nombre y teléfono. Listo, te esperamos." },
];

export default function Inicio() {
  return (
    <div className="inicio">
      <Navbar />

      {/* --- Hero --- */}
      <header className="hero">
        <div className="hero-fondo" aria-hidden>
          {FOTO_LOCAL ? (
            <Image src={FOTO_LOCAL} alt="" fill priority sizes="100vw" className="hero-foto" />
          ) : (
            <div className="hero-rayas" />
          )}
          <div className="hero-luz" />
        </div>

        <div className="hero-contenido">
          <EstadoLocal className="hero-estado" />
          <p className="etiqueta hero-tag">Estilo · Precisión · Experiencia</p>

          <h1 className="hero-titulo" aria-label="ONE">
            {"ONE".split("").map((l, i) => (
              <span key={i} style={{ animationDelay: `${0.25 + i * 0.12}s` }} aria-hidden>
                {l}
              </span>
            ))}
          </h1>

          <p className="hero-texto">Corte y barbería en el corazón de zona norte.</p>

          <div className="hero-acciones">
            <Link href="/reservar" className="btn btn-blanco">
              Sacar turno
            </Link>
            <Link href="/consultar" className="btn btn-borde">
              Ver mi turno
            </Link>
          </div>
        </div>

        <a href="#profesional" className="hero-bajar" aria-label="Ver más">
          <span />
        </a>
      </header>

      {/* --- Cinta --- */}
      <div className="cinta" aria-hidden>
        <div className="cinta-pista">
          {[0, 1].map((k) => (
            <div key={k} className="cinta-grupo">
              {PALABRAS.map((p) => (
                <span key={p}>
                  {p}
                  <i>✦</i>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* --- El profesional --- */}
      <section id="profesional" className="seccion">
        <div className="contenedor perfil">
          <Revelar className="perfil-foto">
            {FOTO_HECTOR ? (
              <Image src={FOTO_HECTOR} alt="Héctor Rodríguez" fill sizes="(max-width: 860px) 90vw, 440px" />
            ) : (
              <div className="perfil-monograma" aria-hidden>
                <span>HR</span>
              </div>
            )}
            <div className="perfil-marco" aria-hidden />
          </Revelar>

          <div>
            <Revelar>
              <p className="etiqueta">El profesional</p>
            </Revelar>
            <Revelar retraso={80}>
              <h2 className="titulo perfil-nombre">
                Héctor <br />
                <span>Rodríguez</span>
              </h2>
            </Revelar>
            <Revelar retraso={160}>
              <p className="perfil-destacado">Referente indiscutido de la Recta Martinolli.</p>
              <p className="perfil-texto">
                Con décadas de experiencia en el rubro, Héctor convirtió a ONE en una experiencia única. Especialista en
                cortes clásicos y modernos, su enfoque está en el detalle y en la satisfacción de cada cliente que se
                sienta en su sillón.
              </p>
            </Revelar>
            <Revelar retraso={240}>
              <Link href="/reservar" className="btn btn-borde">
                Reservar con Héctor
              </Link>
            </Revelar>
          </div>
        </div>
      </section>

      {/* --- Cómo reservar --- */}
      <section className="seccion seccion--gris">
        <div className="contenedor">
          <Revelar>
            <p className="etiqueta centrado">Así de simple</p>
          </Revelar>
          <Revelar retraso={80}>
            <h2 className="titulo seccion-titulo">
              Tu turno en <span>3 pasos</span>
            </h2>
          </Revelar>

          <div className="pasos">
            {PASOS.map((p, i) => (
              <Revelar key={p.n} retraso={i * 120} className="paso">
                <span className="paso-numero">{p.n}</span>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </Revelar>
            ))}
          </div>
        </div>
      </section>

      {/* --- Ubicación y horarios --- */}
      <section className="seccion">
        <div className="contenedor ubicacion">
          <Revelar className="ubicacion-mapa">
            <iframe
              src={MAPA_EMBED}
              title={`Mapa: ${DIRECCION.calle}, ${DIRECCION.zona}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </Revelar>

          <div className="ubicacion-info">
            <Revelar>
              <p className="etiqueta">Dónde estamos</p>
              <h2 className="titulo ubicacion-calle">{DIRECCION.calle}</h2>
              <p className="ubicacion-zona">{DIRECCION.zona}</p>
              <a href={LINK_COMO_LLEGAR} target="_blank" rel="noopener noreferrer" className="btn btn-borde btn-chico">
                Cómo llegar ↗
              </a>
            </Revelar>

            <Revelar retraso={120} className="horarios-tabla">
              <div className="horarios-tabla-cabecera">
                <p className="etiqueta">Horarios</p>
                <EstadoLocal />
              </div>
              {HORARIOS_TEXTO.map((h) => (
                <div key={h.dias} className="horarios-fila">
                  <span>{h.dias}</span>
                  <strong>{h.horas}</strong>
                </div>
              ))}
              <p className="horarios-cerrado">{DIAS_CERRADO_TEXTO}</p>
            </Revelar>
          </div>
        </div>
      </section>

      {/* --- Opiniones --- */}
      <section className="seccion seccion--gris">
        <div className="contenedor">
          <Revelar>
            <p className="etiqueta centrado">Lo que dicen nuestros clientes</p>
          </Revelar>
          <Revelar retraso={80}>
            <h2 className="titulo seccion-titulo">Opiniones</h2>
          </Revelar>

          <div className="opiniones">
            {OPINIONES.map((o, i) => (
              <Revelar key={o.autor} retraso={i * 120} as="figure" className="opinion">
                <div className="opinion-estrellas" aria-label="5 estrellas">
                  ★★★★★
                </div>
                <blockquote>“{o.texto}”</blockquote>
                <figcaption>— {o.autor}</figcaption>
              </Revelar>
            ))}
          </div>
        </div>
      </section>

      {/* --- Llamado final --- */}
      <section className="final">
        <Revelar>
          <h2 className="titulo final-titulo">
            ¿Te toca <span>cortarte?</span>
          </h2>
        </Revelar>
        <Revelar retraso={120}>
          <Link href="/reservar" className="btn btn-blanco final-btn">
            Reservar mi turno
          </Link>
        </Revelar>
      </section>

      <Footer />
    </div>
  );
}
