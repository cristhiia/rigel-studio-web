import React from 'react';
import { BODY, CREAM, CREAM_85, DISPLAY, GOLD } from '../../components/ui/pageStyles';
import { LINE, NAVY } from './AdminShell';

// Piezas visuales compartidas del panel. Botones de al menos 44 px de alto
// para tocarlos bien desde el celular.

export const dateOnly = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'America/Argentina/San_Juan',
});
export const formatDay = iso => (iso ? dateOnly.format(new Date(iso)) : '—');

export const STATUS = {
  active: { label: 'Activo', color: '#7DD3A8' },
  trial: { label: 'En prueba', color: GOLD },
  past_due: { label: 'Moroso', color: '#F2A65A' },
  cancelled: { label: 'Sin acceso', color: '#9AA0B4' },
};

export function Badge({ color = CREAM_85, children }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 100, border: `1px solid ${color}`, color, fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

export function Btn({ children, onClick, kind = 'ghost', disabled = false, type = 'button', style }) {
  const base = {
    fontFamily: DISPLAY, fontWeight: 500, fontSize: '1rem', minHeight: 44, padding: '10px 18px',
    borderRadius: 100, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, whiteSpace: 'nowrap',
  };
  const kinds = {
    ghost: { background: 'transparent', color: CREAM, border: `1px solid ${LINE}` },
    primary: { background: GOLD, color: '#0A0E1A', border: `1px solid ${GOLD}`, fontWeight: 700 },
    danger: { background: 'transparent', color: '#F28B82', border: '1px solid #F28B82' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...kinds[kind], ...style }}>
      {children}
    </button>
  );
}

export const inputStyle = {
  width: '100%', boxSizing: 'border-box', minHeight: 44, padding: '10px 14px', borderRadius: 12,
  border: `1px solid ${LINE}`, background: '#0A0E1A', color: CREAM, fontFamily: BODY, fontSize: '1rem',
};

export function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block', margin: '0 0 14px' }}>
      <span style={{ display: 'block', color: CREAM_85, marginBottom: 6 }}>{label}</span>
      {children}
      {hint && <span style={{ display: 'block', color: CREAM_85, fontSize: '0.9rem', marginTop: 6 }}>{hint}</span>}
    </label>
  );
}

export function Card({ children, style }) {
  return (
    <div style={{ background: NAVY, border: `1px solid ${LINE}`, borderRadius: 16, padding: '18px 20px', ...style }}>
      {children}
    </div>
  );
}

export function Notice({ kind = 'info', children }) {
  const color = kind === 'error' ? '#F28B82' : kind === 'warn' ? '#F2A65A' : '#7DD3A8';
  return (
    <p role={kind === 'error' ? 'alert' : 'status'} style={{ margin: '12px 0', padding: '10px 14px', borderRadius: 12, border: `1px solid ${color}`, color }}>
      {children}
    </p>
  );
}
