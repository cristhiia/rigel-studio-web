// Estilos compartidos de las páginas internas (Keelwise y legales).
// Paleta cerrada: dorado solo como texto sobre fondo oscuro.

export const DISPLAY = "'Space Grotesk', system-ui, sans-serif";
export const BODY = 'Inter, system-ui, sans-serif';
export const CREAM = '#F0E7D5';
export const CREAM_85 = 'rgba(240,231,213,0.85)';
export const GOLD = '#D4AF37';

export const container = { maxWidth: 960, margin: '0 auto', padding: '0 24px' };
export const narrow = { maxWidth: 720, margin: '0 auto', padding: '0 24px' };

export const label = {
  fontFamily: DISPLAY,
  fontWeight: 500,
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.3em',
  color: GOLD,
  display: 'block',
  marginBottom: 16,
};

export const h1 = {
  fontFamily: DISPLAY,
  fontWeight: 700,
  fontSize: 'clamp(2.2rem, 6vw, 3.6rem)',
  lineHeight: 1.08,
  letterSpacing: '-0.02em',
  color: CREAM,
  margin: 0,
};

export const h2 = {
  fontFamily: DISPLAY,
  fontWeight: 700,
  fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
  lineHeight: 1.15,
  letterSpacing: '-0.01em',
  color: CREAM,
  margin: '0 0 24px',
};

export const h3 = {
  fontFamily: DISPLAY,
  fontWeight: 700,
  fontSize: '1.2rem',
  lineHeight: 1.3,
  color: CREAM,
  margin: '0 0 8px',
};

export const body = {
  fontFamily: BODY,
  fontSize: '1rem',
  lineHeight: 1.6,
  color: CREAM_85,
  margin: 0,
};

export const section = { padding: '72px 0' };

// Botón principal: fondo dorado con texto azul noche (no es texto dorado).
export const primaryButton = {
  fontFamily: DISPLAY,
  fontWeight: 500,
  fontSize: '0.9rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#0A0E1A',
  background: GOLD,
  border: 'none',
  borderRadius: 100,
  padding: '16px 28px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  textDecoration: 'none',
  display: 'inline-block',
  transition: 'background 0.3s ease',
};

export const input = {
  fontFamily: BODY,
  fontSize: '1rem',
  color: CREAM,
  background: 'rgba(240,231,213,0.06)',
  border: '1px solid rgba(240,231,213,0.25)',
  borderRadius: 100,
  padding: '15px 22px',
  outline: 'none',
  minWidth: 0,
};

export const draftBanner = {
  fontFamily: DISPLAY,
  fontWeight: 500,
  fontSize: '0.85rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#0A0E1A',
  background: GOLD,
  padding: '12px 16px',
  textAlign: 'center',
};
