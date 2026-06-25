import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import RigelBackground from '../components/canvas/RigelBackground';

const servicios = [
  {
    h2: 'Aplicaciones Móviles iOS y Android',
    body: 'Desarrollamos apps para Android e iOS con React Native y Expo. Un solo código, rendimiento nativo, publicación en Google Play y App Store. Desde apps de gestión hasta productos fintech.',
  },
  {
    h2: 'Sistemas de Gestión para Comercios y Pymes',
    body: 'Automatizamos los procesos que te roban tiempo: stock, turnos, cobros, facturación y reportes. Sistemas diseñados para el negocio real, no para el negocio ideal.',
  },
  {
    h2: 'Inteligencia Artificial Aplicada',
    body: 'Integramos IA real en tus sistemas: coaches financieros, asistentes virtuales, automatización de procesos y análisis de datos. Usando Anthropic API y OpenAI para resultados concretos.',
  },
  {
    h2: 'Diseño de Producto Digital',
    body: 'De la idea al producto listo para lanzar. UX, UI y desarrollo integrados en un solo estudio boutique. Sin intermediarios, sin equipos que no conocen tu negocio.',
  },
];

const schemaJson = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Desarrollo de Software a Medida',
  provider: {
    '@type': 'LocalBusiness',
    name: 'Rigel Studio',
    url: 'https://rigelstudio.com.ar',
  },
  areaServed: 'Argentina',
  description:
    'Desarrollo de software a medida, apps móviles y sistemas de gestión para pymes en San Juan y toda Argentina.',
});

export default function Servicios() {
  useEffect(() => {
    document.title = 'Servicios | Rigel Studio — Desarrollo de Software en San Juan';
    let meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Desarrollamos software a medida, apps móviles y sistemas de gestión para pymes en San Juan y toda Argentina. Conocé nuestros servicios.');
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = schemaJson;
    script.id = 'servicios-schema';
    document.head.appendChild(script);
    return () => {
      document.getElementById('servicios-schema')?.remove();
    };
  }, []);

  return (
    <>
      <RigelBackground />
      <div style={{ minHeight: '100vh', backgroundColor: '#0A0E1A', color: '#F0E7D5', fontFamily: 'Montserrat, sans-serif', position: 'relative', zIndex: 1 }}>

        {/* Nav mínima */}
        <nav style={{ padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1.5rem', color: '#F0E7D5' }}>R</span>
            <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1.3rem', color: '#D4AF37' }}>✦</span>
          </Link>
          <Link to="/#contacto" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.8rem', color: '#F0E7D5', textDecoration: 'none', letterSpacing: '0.15em', textTransform: 'uppercase', border: '1px solid rgba(212,175,55,0.5)', padding: '10px 20px', transition: 'all 0.3s ease' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.1)'; e.currentTarget.style.color = '#D4AF37'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#F0E7D5'; }}
          >
            Iniciar Proyecto
          </Link>
        </nav>

        {/* Hero */}
        <header style={{ maxWidth: 720, margin: '60px auto 0', padding: '0 24px' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 700, lineHeight: 1.15, color: '#F0E7D5', marginBottom: 24 }}>
            Desarrollo de Software a Medida en San Juan, Argentina
          </h1>
          <p style={{ fontSize: '1.05rem', lineHeight: 1.85, color: 'rgba(240,231,213,0.75)', marginBottom: 0 }}>
            En Rigel Studio diseñamos y desarrollamos software a medida para pymes y emprendedores en San Juan, Argentina. No usamos soluciones genéricas: cada sistema que construimos empieza con entender exactamente tu negocio.
          </p>
        </header>

        {/* Servicios */}
        <main style={{ maxWidth: 720, margin: '80px auto', padding: '0 24px' }}>
          {servicios.map((s) => (
            <div key={s.h2} style={{ marginBottom: 64 }}>
              <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '1.1rem', fontWeight: 600, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                {s.h2}
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.85, color: 'rgba(240,231,213,0.8)' }}>
                {s.body}
              </p>
            </div>
          ))}

          {/* Sección geográfica */}
          <div style={{ borderTop: '1px solid rgba(212,175,55,0.2)', paddingTop: 56, marginBottom: 64 }}>
            <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '1.1rem', fontWeight: 600, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
              Trabajamos en San Juan y toda Argentina
            </h2>
            <p style={{ fontSize: '1rem', lineHeight: 1.85, color: 'rgba(240,231,213,0.8)' }}>
              Nuestros clientes están en San Juan Capital y en todo el país. La mayoría de los proyectos se gestionan 100% remoto — reuniones por video, entregas por etapas y comunicación directa con el fundador.
            </p>
          </div>

          {/* CTA */}
          <div style={{ textAlign: 'center', paddingBottom: 80 }}>
            <a
              href="https://rigelstudio.com.ar/#contacto"
              style={{
                display: 'inline-block',
                background: '#D4AF37',
                color: '#0A0E1A',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 600,
                fontSize: '0.85rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                padding: '16px 48px',
                transition: 'background 0.3s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F4C842'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#D4AF37'; }}
            >
              Iniciá tu proyecto ✦
            </a>
          </div>
        </main>
      </div>
    </>
  );
}
