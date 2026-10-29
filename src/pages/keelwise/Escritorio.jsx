import React from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../../components/layout/PageShell';
import { KEELWISE_SALES_OPEN, KEELWISE_WEB_URL, whatsappLink } from '../../data/products';
import { usePageMeta } from '../../lib/seo';
import { CREAM, GOLD, body, container, h1, h2, h3, label, narrow, primaryButton, section } from '../../components/ui/pageStyles';

// Mini landing: Keelwise en la compu (la misma app, abierta en el navegador).
// Mientras no esté publicada la versión web (VITE_KEELWISE_WEB_URL vacío), el botón
// anota por WhatsApp en vez de abrir la app, y la página no se indexa.

const WAIT_HREF = whatsappLink('Hola, quiero probar Keelwise en la compu');

const STEPS = [
  { title: 'Abrila en el navegador', text: 'Chrome o Edge, en Windows, Mac o Linux. No hay nada que descargar.' },
  { title: 'Entrá con tu email', text: 'Te mandamos un código de 6 dígitos. Con la misma suscripción usás el celular y la compu.' },
  { title: 'Dejala como app', text: 'Desde el menú del navegador la instalás como app de escritorio: se abre en su propia ventana, con su ícono.' },
];

const FACTS = [
  {
    title: 'Cada dispositivo guarda sus datos',
    text: 'Lo que anotás en la compu queda en esa compu, y lo del celular en el celular: no se mezclan. Es el precio de que tus gastos no pasen por ningún servidor.',
  },
  {
    title: 'Ojo con borrar el historial',
    text: 'Si borrás los datos del navegador, se borran también los gastos guardados en esa compu.',
  },
  {
    title: 'Sin IA y sin publicidad',
    text: 'Keelwise no usa inteligencia artificial ni vende tus datos. Los reportes se arman en tu equipo.',
  },
];

export default function Escritorio() {
  usePageMeta('/keelwise/escritorio');
  const live = Boolean(KEELWISE_WEB_URL);
  // Mientras no se venda, el botón principal anota en la lista de espera; quien ya tiene
  // acceso (testers, accesos manuales) entra por el link de abajo.
  const open = live && KEELWISE_SALES_OPEN;
  const cta = open
    ? { href: KEELWISE_WEB_URL, label: 'Abrir Keelwise en la compu' }
    : { href: WAIT_HREF, label: 'Quiero probarla en la compu' };

  return (
    <PageShell ctaLabel="Keelwise" ctaHref="/keelwise">
      <style>{`
        .kd-btn:hover { background: #F4C842 !important; }
        .kd-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        @media (max-width: 860px) { .kd-grid-3 { grid-template-columns: 1fr; } }
      `}</style>

      <section style={{ ...container, padding: '48px 24px 40px' }}>
        <span style={label}>Keelwise · En la compu</span>
        <h1 style={{ ...h1, maxWidth: 760 }}>Anotá tus gastos desde la compu, en dos segundos.</h1>
        <p style={{ ...body, fontSize: '1.125rem', maxWidth: 640, margin: '24px 0 28px' }}>
          La misma Keelwise del celular, abierta en el navegador de tu computadora. Si pasás el día frente a la pantalla, cargás el gasto sin sacar el teléfono y ves cuánto podés gastar hoy.
        </p>
        <a href={cta.href} target="_blank" rel="noopener noreferrer" className="kd-btn" style={primaryButton}>{cta.label}</a>
        {!open && (
          <p style={{ ...body, marginTop: 12, maxWidth: 560 }}>
            {live ? 'Estamos en acceso anticipado. Anotate por WhatsApp y te avisamos cuando abramos lugares.' : 'Estamos terminando la versión para la compu. Anotate por WhatsApp y te avisamos cuando esté.'}
            {live && (
              <>
                {' '}¿Ya tenés acceso?{' '}
                <a href={KEELWISE_WEB_URL} target="_blank" rel="noopener noreferrer" style={{ color: GOLD, textDecoration: 'underline' }}>Abrí Keelwise en la compu</a>.
              </>
            )}
          </p>
        )}
      </section>

      <section style={{ ...container, paddingBottom: 24 }} aria-label="Keelwise abierta en la computadora">
        <figure style={{ margin: 0 }}>
          <div style={{ borderRadius: 14, border: '1px solid rgba(240,231,213,0.25)', overflow: 'hidden', background: '#11131c' }}>
            <div aria-hidden="true" style={{ display: 'flex', gap: 6, padding: '10px 14px', borderBottom: '1px solid rgba(240,231,213,0.12)' }}>
              {['#F28B82', '#F4C842', '#7DD3A8'].map(c => <span key={c} style={{ width: 10, height: 10, borderRadius: 5, background: c, opacity: 0.8 }} />)}
            </div>
            <img src="/keelwise/escritorio.jpg" alt="Keelwise en la compu: disponible del mes y cuánto podés gastar hoy" loading="lazy" width="1920" height="1200" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
          <figcaption style={{ ...body, marginTop: 12, fontSize: '0.9rem' }}>Datos de ejemplo.</figcaption>
        </figure>
      </section>

      <section style={{ ...container, ...section }}>
        <span style={label}>Cómo funciona</span>
        <h2 style={h2}>Tres pasos</h2>
        <ol className="kd-grid-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {STEPS.map((s, i) => (
            <li key={s.title} style={{ borderTop: '1px solid rgba(212,175,55,0.4)', paddingTop: 20 }}>
              <span style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 700, fontSize: '2rem', color: GOLD }}>{i + 1}</span>
              <h3 style={{ ...h3, marginTop: 8 }}>{s.title}</h3>
              <p style={body}>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section style={{ ...narrow, ...section }}>
        <span style={label}>Lo que tenés que saber</span>
        {FACTS.map(f => (
          <div key={f.title} style={{ borderBottom: '1px solid rgba(240,231,213,0.15)', padding: '18px 0' }}>
            <h3 style={{ ...h3, color: CREAM }}>{f.title}</h3>
            <p style={body}>{f.text}</p>
          </div>
        ))}
        <p style={{ ...body, marginTop: 28 }}>
          ¿Todavía no conocés Keelwise?{' '}
          <Link to="/keelwise" style={{ color: GOLD, textDecoration: 'underline' }}>Mirá todo lo que hace</Link>
        </p>
      </section>
    </PageShell>
  );
}
