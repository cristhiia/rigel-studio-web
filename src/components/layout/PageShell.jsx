import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import RigelBackground from '../canvas/RigelBackground';
import Footer from './Footer';

const DISPLAY = "'Space Grotesk', system-ui, sans-serif";

// Estructura común de las páginas internas (productos y legales):
// nav mínima como /servicios y /blog, fondo animado y footer.
export default function PageShell({ children, ctaLabel = 'Iniciar proyecto', ctaHref = '/#contacto' }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <>
      <RigelBackground />
      <div style={{ minHeight: '100vh', backgroundColor: 'transparent', color: '#F0E7D5', fontFamily: 'Inter, system-ui, sans-serif', position: 'relative', zIndex: 1 }}>
        <nav className="page-shell-nav" style={{ padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <Link to="/" aria-label="Rigel Studio — inicio" style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '1.5rem', color: '#F0E7D5' }}>R</span>
            <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '1.3rem', color: '#D4AF37' }}>✦</span>
          </Link>
          <a
            href={ctaHref}
            className="page-shell-cta"
            style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: '0.8rem', color: '#F0E7D5', textDecoration: 'none', letterSpacing: '0.15em', textTransform: 'uppercase', border: '1px solid rgba(212,175,55,0.5)', padding: '10px 20px', transition: 'background 0.3s ease, color 0.3s ease' }}
          >
            {ctaLabel}
          </a>
        </nav>
        <style>{`
          .page-shell-cta:hover { background: rgba(212,175,55,0.1); color: #D4AF37 !important; }
          @media (max-width: 768px) { .page-shell-nav { padding: 20px 20px !important; } }
        `}</style>
        <main>{children}</main>
        <Footer />
      </div>
    </>
  );
}
