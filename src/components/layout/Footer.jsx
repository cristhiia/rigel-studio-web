import React from 'react';
import { Link } from 'react-router-dom';

const NAV_LINKS = [
  ['Inicio',           '/'],
  ['Nosotros',         '/#filosofia'],
  ['Casos de Estudio', '/#casos'],
  ['Niveles',          '/#planes'],
  ['Tecnologías',      '/#tecnologias'],
  ['Blog',             '/blog'],
  ['Servicios',        '/servicios'],
];

const CONTACT_ITEMS = [
  { label: 'contacto@rigelstudio.com.ar', href: 'mailto:contacto@rigelstudio.com.ar' },
  { label: '+54 264 504-8401',             href: 'https://wa.me/5492645048401' },
  { label: '@rigelstudio.ar',              href: 'https://www.instagram.com/rigelstudio.ar' },
  { label: 'linkedin.com/company/rigel-studio', href: 'https://www.linkedin.com/company/rigel-studio' },
];

const colTitle = {
  fontFamily: 'Montserrat, sans-serif',
  fontSize: '0.7rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.25em',
  color: '#D4AF37',
  marginBottom: 20,
  display: 'block',
};

const linkBase = {
  display: 'block',
  fontFamily: 'Montserrat, sans-serif',
  fontSize: '0.9rem',
  color: 'rgba(240,231,213,0.6)',
  textDecoration: 'none',
  marginBottom: 12,
  transition: 'color 0.2s ease',
};

export default function Footer() {
  const handleLinkHover = (e, enter) => {
    e.currentTarget.style.color = enter ? '#D4AF37' : 'rgba(240,231,213,0.6)';
  };

  return (
    <footer style={{
      backgroundColor: '#0A0A0A',
      borderTop: '1px solid rgba(212,175,55,0.15)',
      padding: '60px 40px 32px',
    }}>
      <style>{`
        @media (max-width: 768px) {
          .footer-grid { flex-direction: column !important; gap: 40px !important; }
          .footer-brand { text-align: center; align-items: center !important; }
          .footer-bottom { flex-direction: column !important; gap: 8px !important; text-align: center; }
          footer { padding: 48px 24px 24px !important; }
        }
      `}</style>

      {/* Grid 3 columnas */}
      <div className="footer-grid" style={{ display: 'flex', gap: 80, flexWrap: 'wrap' }}>

        {/* COLUMNA 1 — MARCA */}
        <div className="footer-brand" style={{ display: 'flex', flexDirection: 'column', minWidth: 200, flex: '1 1 200px' }}>
          <img
            src="/brand/logo-transparente.png"
            alt="Rigel Studio"
            style={{ height: 48, width: 'auto', objectFit: 'contain', marginBottom: 20 }}
            onError={e => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextSibling.style.display = 'block';
            }}
          />
          <span style={{ display: 'none', fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1.4rem', color: '#F0E7D5', marginBottom: 20 }}>
            R <span style={{ color: '#D4AF37' }}>✦</span>
          </span>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.9rem', color: 'rgba(240,231,213,0.5)', margin: '0 0 8px', lineHeight: 1.6 }}>
            Software que entiende tu negocio.
          </p>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.8rem', color: 'rgba(240,231,213,0.3)' }}>
            San Juan, Argentina
          </span>
        </div>

        {/* COLUMNA 2 — NAVEGACIÓN */}
        <div style={{ minWidth: 160, flex: '1 1 160px' }}>
          <span style={colTitle}>Navegación</span>
          <nav>
            {NAV_LINKS.map(([label, href]) => {
              const isExternal = href.startsWith('/#');
              return isExternal ? (
                <a
                  key={href}
                  href={href}
                  style={linkBase}
                  onMouseEnter={e => handleLinkHover(e, true)}
                  onMouseLeave={e => handleLinkHover(e, false)}
                >
                  {label}
                </a>
              ) : (
                <Link
                  key={href}
                  to={href}
                  style={linkBase}
                  onMouseEnter={e => handleLinkHover(e, true)}
                  onMouseLeave={e => handleLinkHover(e, false)}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* COLUMNA 3 — CONTACTO */}
        <div style={{ minWidth: 200, flex: '1 1 200px' }}>
          <span style={colTitle}>Contacto</span>
          {CONTACT_ITEMS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              target={href.startsWith('mailto') ? undefined : '_blank'}
              rel="noopener noreferrer"
              style={linkBase}
              onMouseEnter={e => handleLinkHover(e, true)}
              onMouseLeave={e => handleLinkHover(e, false)}
            >
              <span style={{ color: '#D4AF37', marginRight: 8 }}>✦</span>
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Separador */}
      <div style={{ borderTop: '1px solid rgba(240,231,213,0.06)', marginTop: 40, paddingTop: 24 }}>
        <div className="footer-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.8rem', color: 'rgba(240,231,213,0.3)' }}>
            © 2026 Rigel Studio. Todos los derechos reservados.
          </span>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.8rem', color: 'rgba(240,231,213,0.3)' }}>
            Hecho con ✦ en San Juan, Argentina
          </span>
        </div>
      </div>
    </footer>
  );
}
