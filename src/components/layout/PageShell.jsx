import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import RigelBackground from '../canvas/RigelBackground';
import Footer from './Footer';

const DISPLAY = "'Space Grotesk', system-ui, sans-serif";

// Estructura común de las páginas internas (productos y legales):
// nav mínima como /servicios y /blog, fondo animado y footer.
export default function PageShell({ children, ctaLabel = 'Iniciar proyecto', ctaHref = '/#contacto' }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  // "Volver" vuelve a la página anterior del sitio (conserva el scroll de donde
  // venías). Si se entró directo a esta página (un anuncio, un link compartido)
  // no hay anterior: lleva al inicio.
  const location = useLocation();
  const navigate = useNavigate();
  const hasPrevious = location.key !== 'default';
  const goBack = (e) => {
    if (!hasPrevious || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(-1);
  };

  return (
    <>
      <RigelBackground />
      <div style={{ minHeight: '100vh', backgroundColor: 'transparent', color: '#F0E7D5', fontFamily: 'Inter, system-ui, sans-serif', position: 'relative', zIndex: 1 }}>
        <nav className="page-shell-nav" style={{ padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 0 }}>
            <Link to="/" aria-label="Rigel Studio — inicio" style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '1.5rem', color: '#F0E7D5' }}>R</span>
              <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '1.3rem', color: '#D4AF37' }}>✦</span>
            </Link>
            <Link to="/" onClick={goBack} className="page-shell-back" aria-label={hasPrevious ? 'Volver a la página anterior' : 'Ir al inicio'}>
              <span aria-hidden="true">←</span> {hasPrevious ? 'Volver' : 'Inicio'}
            </Link>
          </div>
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
          .page-shell-back { font-family: Inter, system-ui, sans-serif; font-size: 1rem; color: rgba(240,231,213,0.92); text-decoration: none; padding: 10px 4px; white-space: nowrap; min-height: 44px; display: inline-flex; align-items: center; gap: 6px; }
          .page-shell-back:hover { color: #D4AF37; }
          .page-shell-back:focus-visible { outline: 2px solid #D4AF37; outline-offset: 4px; border-radius: 4px; }
          @media (max-width: 768px) { .page-shell-nav { padding: 20px 20px !important; } }
        `}</style>
        <main>{children}</main>
        <Footer />
      </div>
    </>
  );
}
