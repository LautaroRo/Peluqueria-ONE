"use client";
import Link from "next/link";
import "./estilos.css";
import Footer from "../../components/footer";
import Navbar from "../../components/navbar";

export default function Inicio() {
  return (
    <div className="one-landing-main-wrapper">
      {/* 1. NAVBAR */}
      <Navbar />

      {/* 2. INICIO (HERO) */}
      <header className="one-landing-hero">
        <img src="/foto.jpg" alt="Peluquería One" className="one-landing-hero-img" />
        <div className="one-landing-hero-overlay"></div>
        <div className="one-landing-hero-content">
          <span className="one-landing-hero-tag">ESTILO • PRECISIÓN • EXPERIENCIA</span>
          <h1 className="one-landing-hero-title">ONE</h1>
          <p className="one-landing-hero-text">
            CORTE Y BARBERÍA EN EL CORAZÓN DE ZONA NORTE.
          </p>
          <Link href="/reservar" className="one-landing-btn-main">
            SACAR TURNO
          </Link>
        </div>
      </header>

      {/* 3. EL PELUQUERO */}
      <section className="one-section-dark">
        <div className="one-landing-section-container one-landing-profile-flex">
          <div className="one-landing-profile-image-wrapper">
            <img
              src="/hector.jpg"
              alt="Héctor Rodríguez"
              className="one-landing-profile-img-main"
            />
          </div>

          <div className="one-landing-profile-content">
            <div className="one-landing-vertical-line"></div>
            <span className="one-landing-label">EL PROFESIONAL</span>
            <h2 className="one-landing-profile-name">
              HECTOR <br /> <span>RODRIGUEZ</span>
            </h2>
            <div className="one-landing-profile-description">
              <p style={{ color: '#fff', marginBottom: '15px', fontWeight: 'bold' }}>
                Referente indiscutido de la Recta Martinolli.
              </p>
              <p>
                Con décadas de experiencia en el rubro, Héctor ha convertido a
                ONE en una experiencia única. Especialista en cortes clásicos y
                modernos, su enfoque está en el detalle y la satisfacción de
                cada cliente que se sienta en su sillón.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. UBICACIÓN Y MAPA */}
      <section className="one-section-black">
        <div className="one-landing-section-container">
          <div className="one-landing-location-grid">
            <div className="one-landing-location-info">
              <h3 className="one-landing-italic-title">UBICACIÓN</h3>
              <p style={{ fontSize: '20px', fontWeight: 'bold' }}>Heriberto Martínez 6814</p>
              <p style={{ color: '#555', marginBottom: '20px' }}>Arguello, Córdoba Capital</p>

              <div className="one-map-container">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3407.123456789012!2d-64.253456!3d-31.345678!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzHCsDIwJzQ0LjQiUyA2NMKwMTUnMTIuNCJX!5e0!3m2!1ses-419!2sar!4v1710000000000!5m2!1ses-419!2sar"
                  width="100%"
                  height="300"
                  style={{ border: 0, filter: 'grayscale(1) invert(0.9)' }}
                  allowFullScreen={true}
                  loading="lazy"
                ></iframe>
              </div>
            </div>

            <div className="one-landing-hours-info">
              <h3 className="one-landing-italic-title">HORARIOS</h3>
              <div className="one-landing-hour-row">
                <span>Martes a Viernes</span> <span>10:00 - 20:00</span>
              </div>
              <div className="one-landing-hour-row">
                <span>Sábados</span> <span>09:00 - 19:00</span>
              </div>
              <p style={{ color: '#333', fontSize: '12px', marginTop: '15px', textAlign: 'right' }}>
                Domingos y Lunes cerrado
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. OPINIONES */}
      <section className="one-section-dark">
        <div className="one-landing-section-container">
          <span className="one-landing-label" style={{ display: 'block', textAlign: 'center' }}>
            LO QUE DICEN NUESTROS CLIENTES
          </span>
          <h2 className="one-landing-profile-name" style={{ textAlign: 'center', marginBottom: '40px' }}>OPINIONES</h2>
          <div className="one-landing-reviews-grid">
            <div className="one-landing-review-card">
              <div style={{ color: '#fff', marginBottom: '15px' }}>★★★★★</div>
              <p style={{ color: '#888', lineHeight: '1.6' }}>
                "Héctor es un crack. Hace años que me corto con él y la atención es impecable."
              </p>
              <h4 style={{ marginTop: '15px' }}>- Marcos R.</h4>
            </div>
            <div className="one-landing-review-card">
              <div style={{ color: '#fff', marginBottom: '15px' }}>★★★★★</div>
              <p style={{ color: '#888', lineHeight: '1.6' }}>
                "El mejor sistema de turnos de la zona. Llegas y te atiende al toque. Muy profesional."
              </p>
              <h4 style={{ marginTop: '15px' }}>- Franco Batistella</h4>
            </div>
            <div className="one-landing-review-card">
              <div style={{ color: '#fff', marginBottom: '15px' }}>★★★★★</div>
              <p style={{ color: '#888', lineHeight: '1.6' }}>
                "Excelente barbería en zona norte. Ambiente tranquilo y un corte perfecto."
              </p>
              <h4 style={{ marginTop: '15px' }}>- Gastón Juárez</h4>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <Footer />
    </div>
  );
}