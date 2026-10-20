import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../../components/layout/PageShell';
import { KEELWISE_PRICE, formatArs } from '../../data/products';
import { usePageMeta } from '../../lib/seo';
import { startCheckout, useBillingProduct } from '../../lib/billing';
import {
  BODY, CREAM, CREAM_85, DISPLAY, GOLD,
  body, container, h1, h2, h3, input, label, narrow, primaryButton, section,
} from '../../components/ui/pageStyles';

const SLUG = 'keelwise';

// Precio vigente: billing_products (vía API); KEELWISE_PRICE es el valor del build.
const priceLine = ({ usd, ars }) => (ars ? `USD ${usd} por mes · se cobra en pesos: ${formatArs(ars)}` : `USD ${usd} por mes`);
const billingNote = ({ usd, ars, trialDays }) => {
  const trial = trialDays > 0 ? `Los primeros ${trialDays} días son gratis. Después, ` : '';
  const charge = ars
    ? `Mercado Pago cobra ${formatArs(ars)} por mes.`
    : `se cobra el equivalente a USD ${usd} por mes, en pesos, con Mercado Pago.`;
  return `${trial}${trial ? charge : charge.charAt(0).toUpperCase() + charge.slice(1)} Cancelás cuando quieras.`;
};

// Capturas en public/keelwise/. Al subir una imagen, poner ready: true;
// mientras tanto se muestra el marco vacío (sin pedir el archivo).
const SCREENSHOTS = [
  { file: 'captura-inicio.png', caption: 'Cuánto podés gastar hoy', ready: false },
  { file: 'captura-analisis.png', caption: 'Tus gastos por categoría', ready: false },
  { file: 'captura-coach.png', caption: 'Coach con IA', ready: false },
  { file: 'captura-vault.png', caption: 'Tus vaults de ahorro', ready: false },
];

// Funciones confirmadas en el código de la app (ver reporte del PR).
const FEATURES = [
  { title: 'Cuánto podés gastar hoy', text: 'Keelwise toma lo que te queda del mes y te dice cuánto podés gastar hoy sin pasarte.' },
  { title: 'Gastos por categoría', text: 'Cargás un gasto en segundos, escribiendo o hablando, y ves en qué se te va la plata.' },
  { title: 'Coach con IA', text: 'Preguntale lo que quieras sobre tu plata. Responde mirando tu ingreso y lo que te queda disponible.' },
  { title: 'Vaults y Puerto Seguro', text: 'Separá tu ahorro en reservas con nombre y mirá cuánto llevás protegido.' },
  { title: 'Interés compuesto', text: 'Mirá cuánto puede crecer lo que ahorrás si lo dejás trabajar con el tiempo.' },
  { title: '¿Es posta?', text: '¿Viste una oferta? Compartí el link a Keelwise y la IA te dice si el descuento parece real o inflado.' },
];

const steps = trialDays => [
  { title: 'Suscribite con tu email', text: `Elegís cómo pagar en Mercado Pago. Los primeros ${trialDays} días no se cobran.` },
  { title: 'Instalá la app', text: 'Te damos el link para bajar Keelwise en tu Android, con instrucciones paso a paso.' },
  { title: 'Entrá con el mismo email', text: 'Usá el email de tu suscripción para registrarte en la app y listo.' },
];

const faq = trialDays => [
  {
    q: '¿Cómo instalo la APK?',
    a: [
      'Keelwise todavía no está en Google Play, así que se instala con un archivo APK. Desde tu celular Android:',
      '1. Abrí el link de descarga que te damos después de suscribirte.',
      '2. Cuando termine la descarga, tocá el archivo.',
      '3. Si Android te pide permiso para instalar apps desde esa fuente, aceptalo solo para tu navegador.',
      '4. Tocá Instalar y abrí Keelwise.',
    ],
  },
  { q: '¿Funciona en iPhone?', a: ['Por ahora no. Keelwise es solo para Android.'] },
  {
    q: '¿Cómo cancelo?',
    a: [
      'Desde tu cuenta de Mercado Pago, en la sección de suscripciones, elegís Keelwise y la cancelás. No tenés que pedirnos nada.',
      `Si cancelás antes de que terminen los ${trialDays} días de prueba, no se te cobra.`,
    ],
  },
  {
    q: '¿Qué pasa con mis datos?',
    a: [
      'Tus datos financieros son tuyos. No los vendemos ni los usamos para publicidad.',
      'Para que algunas funciones anden (por ejemplo el coach con IA) se procesan con proveedores externos. El detalle completo está en la política de privacidad.',
    ],
    link: { to: '/privacidad', label: 'Ver política de privacidad' },
  },
  {
    q: '¿Por qué no está en Google Play?',
    a: ['Estamos en acceso anticipado. Mientras preparamos la publicación en la tienda, la app se instala por APK.'],
  },
  {
    q: '¿Me arrepentí de suscribirme, qué hago?',
    a: ['Podés usar el Botón de arrepentimiento y te respondemos por email.'],
    link: { to: '/arrepentimiento', label: 'Ir al Botón de arrepentimiento' },
  },
];

function SubscribeForm({ id, price }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ loading: false, error: '' });

  async function onSubmit(e) {
    e.preventDefault();
    setState({ loading: true, error: '' });
    try {
      window.location.assign(await startCheckout(SLUG, email));
    } catch (err) {
      setState({ loading: false, error: err.message });
    }
  }

  const inputId = `${id}-email`;
  return (
    <form onSubmit={onSubmit} noValidate={false} style={{ width: '100%', maxWidth: 520 }}>
      <label htmlFor={inputId} style={{ ...body, display: 'block', marginBottom: 10, color: CREAM }}>
        Tu email
      </label>
      <div className="kw-form-row" style={{ display: 'flex', gap: 12 }}>
        <input
          id={inputId}
          type="email"
          required
          autoComplete="email"
          placeholder="vos@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ ...input, flex: 1 }}
        />
        <button type="submit" className="kw-btn" disabled={state.loading} style={{ ...primaryButton, opacity: state.loading ? 0.85 : 1 }}>
          {state.loading ? 'Abriendo Mercado Pago…' : `Probar ${price.trialDays} días gratis`}
        </button>
      </div>
      <p style={{ ...body, marginTop: 12 }}>{billingNote(price)}</p>
      {state.error && (
        <p role="alert" style={{ ...body, color: CREAM, marginTop: 12, borderLeft: `2px solid ${GOLD}`, paddingLeft: 12 }}>
          {state.error}
        </p>
      )}
    </form>
  );
}

function Screenshot({ file, caption, ready }) {
  const [missing, setMissing] = useState(!ready);
  return (
    <figure style={{ margin: 0, textAlign: 'center' }}>
      <div
        style={{
          aspectRatio: '9 / 19.5',
          maxWidth: 220,
          margin: '0 auto',
          borderRadius: 28,
          border: '1px solid rgba(240,231,213,0.25)',
          background: 'rgba(240,231,213,0.04)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {missing ? (
          <span style={{ ...body, fontSize: '0.85rem', padding: 16 }}>Captura próximamente</span>
        ) : (
          <img
            src={`/keelwise/${file}`}
            alt={`Keelwise: ${caption}`}
            loading="lazy"
            onError={() => setMissing(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
      </div>
      <figcaption style={{ ...body, marginTop: 12 }}>{caption}</figcaption>
    </figure>
  );
}

export default function Keelwise() {
  usePageMeta('/keelwise');
  const price = useBillingProduct(SLUG, KEELWISE_PRICE);
  const { usd, ars, trialDays } = price;
  const PRICE_LINE = priceLine(price);

  return (
    <PageShell ctaLabel="Contacto" ctaHref="/#contacto">
      <style>{`
        .kw-btn:hover:not(:disabled) { background: #F4C842 !important; }
        .kw-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .kw-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
        details.kw-faq summary { cursor: pointer; list-style: none; }
        details.kw-faq summary::-webkit-details-marker { display: none; }
        details.kw-faq[open] .kw-faq-icon { transform: rotate(45deg); }
        @media (max-width: 860px) {
          .kw-grid-3 { grid-template-columns: 1fr; }
          .kw-grid-4 { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .kw-form-row { flex-direction: column; }
        }
      `}</style>

      {/* ── Hero ── */}
      <section style={{ ...container, padding: '48px 24px 72px' }}>
        <span style={label}>Keelwise · App para Android · Acceso anticipado</span>
        <h1 style={{ ...h1, maxWidth: 760 }}>Sabé cuánto podés gastar hoy, y llegá a fin de mes.</h1>
        <p style={{ ...body, fontSize: '1.125rem', maxWidth: 620, margin: '24px 0 12px' }}>
          Keelwise ordena tus gastos, te dice cuánto te queda por día y te ayuda a ahorrar con un coach con IA.
        </p>
        <p style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: '1.15rem', color: CREAM, margin: '0 0 28px' }}>
          {PRICE_LINE}
        </p>
        <SubscribeForm id="hero" price={price} />
      </section>

      {/* ── Capturas ── */}
      <section style={{ ...container, ...section }} aria-label="Capturas de la app">
        <div className="kw-grid-4">
          {SCREENSHOTS.map(s => <Screenshot key={s.file} {...s} />)}
        </div>
      </section>

      {/* ── Funciones ── */}
      <section style={{ ...container, ...section }}>
        <span style={label}>Qué hace</span>
        <h2 style={h2}>Todo lo que necesitás para ordenar tu plata</h2>
        <div className="kw-grid-3">
          {FEATURES.map(f => (
            <article key={f.title} className="glass-card" style={{ padding: 28, borderRadius: 20 }}>
              <span aria-hidden="true" style={{ color: GOLD, fontSize: '1.1rem' }}>✦</span>
              <h3 style={{ ...h3, marginTop: 12 }}>{f.title}</h3>
              <p style={body}>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section style={{ ...container, ...section }}>
        <span style={label}>Cómo funciona</span>
        <h2 style={h2}>Tres pasos y empezás</h2>
        <ol className="kw-grid-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {steps(trialDays).map((s, i) => (
            <li key={s.title} style={{ borderTop: `1px solid rgba(212,175,55,0.4)`, paddingTop: 20 }}>
              <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '2rem', color: GOLD }}>{i + 1}</span>
              <h3 style={{ ...h3, marginTop: 8 }}>{s.title}</h3>
              <p style={body}>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Precio ── */}
      <section style={{ ...narrow, ...section }} id="precio">
        <div className="glass-card glass-card--zenith" style={{ padding: '40px 32px', borderRadius: 24, textAlign: 'center' }}>
          <span style={label}>Precio</span>
          <p style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 'clamp(2.4rem, 8vw, 3.4rem)', color: CREAM, margin: 0, lineHeight: 1 }}>
            USD {usd}
            <span style={{ fontFamily: BODY, fontWeight: 400, fontSize: '1.1rem', color: CREAM_85 }}> / mes</span>
          </p>
          {ars && (
            <p style={{ ...body, marginTop: 12 }}>Se cobra en pesos: {formatArs(ars)} por mes.</p>
          )}
          <ul style={{ listStyle: 'none', padding: 0, margin: '28px auto', maxWidth: 380, textAlign: 'left' }}>
            {['Todas las funciones de la app', `${trialDays} días de prueba sin cargo`, 'Cobro mensual con Mercado Pago', 'Cancelás cuando quieras'].map(item => (
              <li key={item} style={{ ...body, display: 'flex', gap: 12, marginBottom: 10 }}>
                <span aria-hidden="true" style={{ color: GOLD }}>✦</span>{item}
              </li>
            ))}
          </ul>
          <a href="#suscribirme" className="kw-btn" style={primaryButton}>Probar {trialDays} días gratis</a>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ ...narrow, ...section }}>
        <span style={label}>Preguntas frecuentes</span>
        <h2 style={h2}>Lo que suelen preguntarnos</h2>
        {faq(trialDays).map(item => (
          <details key={item.q} className="kw-faq" style={{ borderBottom: '1px solid rgba(240,231,213,0.15)', padding: '20px 0' }}>
            <summary style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
              <span style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: '1.1rem', color: CREAM }}>{item.q}</span>
              <span aria-hidden="true" className="kw-faq-icon" style={{ color: GOLD, fontSize: '1.4rem', transition: 'transform 0.2s ease' }}>+</span>
            </summary>
            <div style={{ marginTop: 12 }}>
              {item.a.map(p => <p key={p} style={{ ...body, marginBottom: 8 }}>{p}</p>)}
              {item.link && (
                <Link to={item.link.to} style={{ ...body, color: GOLD, textDecoration: 'underline' }}>{item.link.label}</Link>
              )}
            </div>
          </details>
        ))}
      </section>

      {/* ── CTA final ── */}
      <section id="suscribirme" style={{ ...container, padding: '72px 24px 96px' }}>
        <h2 style={{ ...h2, maxWidth: 640 }}>Probalo {trialDays} días. Si no te sirve, lo cancelás.</h2>
        <p style={{ ...body, fontFamily: DISPLAY, fontWeight: 500, color: CREAM, marginBottom: 24 }}>{PRICE_LINE}</p>
        <SubscribeForm id="final" price={price} />
        <p style={{ ...body, marginTop: 32 }}>
          ¿Te suscribiste y te arrepentiste?{' '}
          <Link to="/arrepentimiento" style={{ color: GOLD, textDecoration: 'underline' }}>Botón de arrepentimiento</Link>
        </p>
      </section>
    </PageShell>
  );
}
