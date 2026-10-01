import Image from "next/image";
import Link from "next/link";
import Navbar from "./components/navbar";
import Footer from "./components/footer";
import Revelar from "./components/revelar";
import EstadoLocal from "./components/estado-local";
import { DIAS_CERRADO_TEXTO, HORARIOS, HORARIOS_TEXTO, HORAS_ANTICIPACION } from "./lib/horarios";
import { DIRECCION, FOTO_HECTOR, FOTO_LOCAL, LINK_COMO_LLEGAR, MAPA_EMBED, SITIO_URL } from "./lib/local";
import { SERVICIOS_BASE, Servicio, formatearDuracion, formatearPrecio } from "./lib/servicios";
import { listarServicios } from "./lib/catalogo";
import "./inicio.css";

// Los servicios salen de la base: la página se regenera sola cada 5 minutos
// (y al instante cuando se editan desde el panel)
export const revalidate = 300;

async function cargarServicios(): Promise<Servicio[]> {
  try {
    return await listarServicios();
  } catch {
    // Sin base (por ejemplo en el build), la lista de fábrica
    return SERVICIOS_BASE.filter((s) => s.activo).map((s) => ({ ...s, _id: s.clave }));
  }
}

const PALABRAS = ["Corte", "Barbería", "Estilo", "Precisión", "Experiencia"];

const OPINIONES = [
  { texto: "Héctor es un crack. Hace años que me corto con él y la atención es impecable.", autor: "Marcos R." },
  { texto: "El mejor sistema de turnos de la zona. Llegás y te atiende al toque. Muy profesional.", autor: "Franco Batistella" },
  { texto: "Excelente barbería en zona norte. Ambiente tranquilo y un corte perfecto.", autor: "Gastón Juárez" },
];

const PASOS = [
  { n: "01", titulo: "Elegí el servicio", texto: "Corte, barba o los dos: ves cuánto dura y cuánto sale." },
  { n: "02", titulo: "Día y horario", texto: "Mirá el calendario y elegí entre los horarios que quedan libres." },
  { n: "03", titulo: "Confirmá", texto: "Dejá tu nombre y teléfono. Listo, te esperamos." },
];

const PREGUNTAS = [
  {
    p: "¿Cómo saco un turno?",
    r: "Desde Reservar: elegís el servicio, el día y el horario, y dejás tu nombre y teléfono. No hace falta crear una cuenta.",
  },
  {
    p: "¿Puedo cambiar o cancelar mi turno?",
    r: `Sí. En Mi turno ponés tu teléfono y lo cambiás o lo cancelás vos mismo, hasta ${HORAS_ANTICIPACION} horas antes.`,
  },
  {
    p: `¿Y si faltan menos de ${HORAS_ANTICIPACION} horas?`,
    r: "Desde la web ya no se puede tocar. Avisale directamente a Héctor así el horario le queda a otro cliente.",
  },
  {
    p: "¿Cuánto dura cada servicio?",
    r: "Cada servicio muestra su duración al reservar, y el calendario solo te ofrece los horarios donde entra completo.",
  },
  {
    p: "¿Qué días atienden?",
    r: `${HORARIOS_TEXTO.map((h) => `${h.dias} de ${h.horas.replace(" - ", " a ")}`).join(" y ")}. ${DIAS_CERRADO_TEXTO}.`,
  },
];

const NOMBRES_DIA = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Ficha del negocio para Google (dirección, horarios, servicios)
function datosEstructurados(servicios: Servicio[]) {
  return {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: "ONE Peluquería y Barbería",
    url: SITIO_URL,
    address: {
      "@type": "PostalAddress",
      streetAddress: DIRECCION.calle,
      addressLocality: "Córdoba",
      addressRegion: "Córdoba",
      addressCountry: "AR",
    },
    openingHoursSpecification: Object.entries(HORARIOS).map(([dia, [abre, cierra]]) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: NOMBRES_DIA[Number(dia)],
      opens: abre,
      closes: cierra,
    })),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Servicios",
      itemListElement: servicios.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.nombre, description: s.descripcion },
        ...(s.precio !== null && { price: s.precio, priceCurrency: "ARS" }),
      })),
    },
  };
}

export default async function Inicio() {
  const servicios = await cargarServicios();

  return (
    <div className="inicio">
      <script
        type="application/ld+json"
        // Los textos de los servicios los escribe Héctor: se escapa "<" para que nada cierre el <script>
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados(servicios)).replace(/</g, "\\u003c") }}
      />
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

      {/* --- Servicios --- */}
      <section id="servicios" className="seccion seccion--gris">
        <div className="contenedor">
          <Revelar>
            <p className="etiqueta centrado">Lo que hacemos</p>
          </Revelar>
          <Revelar retraso={80}>
            <h2 className="titulo seccion-titulo">
              {servicios.some((s) => s.precio !== null) ? (
                <>
                  Servicios <span>y precios</span>
                </>
              ) : (
                <>
                  Nuestros <span>servicios</span>
                </>
              )}
            </h2>
          </Revelar>

          <div className="servicios">
            {servicios.map((s, i) => (
              <Revelar key={s._id} retraso={(i % 3) * 100} className="servicio-wrap">
                <Link href={`/reservar?servicio=${s.clave}`} className="servicio">
                  <div className="servicio-cabecera">
                    <h3>{s.nombre}</h3>
                    {s.precio !== null && <span className="servicio-precio">{formatearPrecio(s.precio)}</span>}
                  </div>
                  {s.descripcion && <p>{s.descripcion}</p>}
                  <div className="servicio-pie">
                    <span>{formatearDuracion(s.duracion)}</span>
                    <span className="servicio-reservar">Reservar →</span>
                  </div>
                </Link>
              </Revelar>
            ))}
          </div>
        </div>
      </section>

      {/* --- Cómo reservar --- */}
      <section className="seccion">
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
      <section className="seccion seccion--gris">
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
      <section className="seccion">
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

      {/* --- Preguntas frecuentes --- */}
      <section className="seccion seccion--gris">
        <div className="contenedor faq">
          <Revelar>
            <p className="etiqueta centrado">Antes de venir</p>
          </Revelar>
          <Revelar retraso={80}>
            <h2 className="titulo seccion-titulo">
              Preguntas <span>frecuentes</span>
            </h2>
          </Revelar>
          <div className="faq-lista">
            {PREGUNTAS.map((q, i) => (
              <Revelar key={q.p} retraso={i * 60}>
                <details className="faq-item">
                  <summary>
                    {q.p}
                    <i aria-hidden />
                  </summary>
                  <p>{q.r}</p>
                </details>
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
