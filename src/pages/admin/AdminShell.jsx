import React from 'react';
import { Link } from 'react-router-dom';
import { BODY, CREAM, DISPLAY, GOLD } from '../../components/ui/pageStyles';

export const NIGHT = '#0A0E1A';
export const NAVY = '#1A1A2E';
export const LINE = 'rgba(240,231,213,0.15)';

// Marco sobrio del panel: sin fondo animado ni footer del sitio.
export default function AdminShell({ children, right = null }) {
  return (
    <div style={{ minHeight: '100vh', background: NIGHT, color: CREAM, fontFamily: BODY, fontSize: '1rem' }}>
      <header
        className="adm-header"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '20px 32px', borderBottom: `1px solid ${LINE}` }}
      >
        <Link to="/" aria-label="Rigel Studio — inicio" style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '1.5rem', color: CREAM }}>R</span>
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '1.3rem', color: GOLD }}>✦</span>
        </Link>
        {right}
      </header>
      <style>{`
        @media (max-width: 640px) { .adm-header { padding: 16px !important; } }
      `}</style>
      <main>{children}</main>
    </div>
  );
}
