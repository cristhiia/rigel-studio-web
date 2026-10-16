import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageShell from '../../components/layout/PageShell';
import { whatsappLink } from '../../data/products';
import { usePageMeta } from '../../lib/seo';
import { CREAM, GOLD, body, h1, h3, label, narrow, primaryButton } from '../../components/ui/pageStyles';

const POLL_MS = 5000;
const MAX_WAIT_MS = 2 * 60 * 1000;

const INSTALL_STEPS = [
  'Abrí este link desde tu celular Android (o mandátelo por WhatsApp o email).',
  'Descargá el archivo y tocalo cuando termine.',
  'Si Android te pide permiso para instalar apps desde esa fuente, aceptalo solo para tu navegador.',
  'Tocá Instalar y abrí Keelwise.',
  'Registrate con el mismo email que usaste para suscribirte.',
];

// Estados: missing (sin id) · checking · active · timeout · error
export default function Gracias() {
  usePageMeta('/keelwise/gracias');
  const [params] = useSearchParams();
  const preapprovalId = params.get('preapproval_id') || '';
  const [status, setStatus] = useState(preapprovalId ? 'checking' : 'missing');
  const [apkUrl, setApkUrl] = useState('');

  useEffect(() => {
    if (!preapprovalId) return undefined;
    let cancelled = false;
    let timer;
    const started = Date.now();
    const q = `preapproval_id=${encodeURIComponent(preapprovalId)}`;

    async function check() {
      try {
        const res = await fetch(`/api/keelwise/status?${q}`);
        if (res.status === 400) { if (!cancelled) setStatus('error'); return; }
        const data = res.ok ? await res.json() : { active: false };
        if (cancelled) return;
        if (data.active) {
          const dl = await fetch(`/api/keelwise/download?${q}`);
          const dlData = await dl.json().catch(() => ({}));
          if (cancelled) return;
          if (dl.ok && dlData.url) setApkUrl(dlData.url);
          setStatus('active');
          return;
        }
      } catch {
        // Error de red: se reintenta igual hasta agotar el tiempo.
      }
      if (cancelled) return;
      if (Date.now() - started >= MAX_WAIT_MS) setStatus('timeout');
      else timer = setTimeout(check, POLL_MS);
    }

    check();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [preapprovalId]);

  const help = whatsappLink(`Hola, me suscribí a Keelwise y necesito ayuda. Código: ${preapprovalId || 'sin código'}`);

  return (
    <PageShell ctaLabel="Volver a Keelwise" ctaHref="/keelwise">
      <section style={{ ...narrow, padding: '48px 24px 96px' }} aria-live="polite">
        <span style={label}>Keelwise</span>

        {status === 'checking' && (
          <>
            <h1 style={h1}>Estamos confirmando tu pago</h1>
            <p style={{ ...body, marginTop: 20 }}>
              Mercado Pago nos avisa en unos segundos. No cierres esta página: se actualiza sola.
            </p>
            <div className="kw-spinner" aria-hidden="true" style={{ width: 28, height: 28, marginTop: 28, border: `2px solid rgba(240,231,213,0.25)`, borderTopColor: GOLD, borderRadius: '50%' }} />
            <style>{`
              .kw-spinner { animation: kwSpin 1s linear infinite; }
              @keyframes kwSpin { to { transform: rotate(360deg); } }
              @media (prefers-reduced-motion: reduce) { .kw-spinner { animation: none; } }
            `}</style>
          </>
        )}

        {status === 'active' && (
          <>
            <h1 style={h1}>Listo, ya tenés Keelwise</h1>
            <p style={{ ...body, marginTop: 20 }}>
              Tu suscripción está activa. Los primeros 7 días son de prueba sin cargo.
            </p>
            {apkUrl ? (
              <p style={{ margin: '28px 0' }}>
                <a href={apkUrl} className="kw-btn" style={primaryButton} rel="noopener noreferrer">Descargar Keelwise (APK)</a>
              </p>
            ) : (
              <p style={{ ...body, margin: '28px 0', color: CREAM }}>
                El link de descarga no está disponible en este momento.{' '}
                <a href={help} target="_blank" rel="noopener noreferrer" style={{ color: GOLD, textDecoration: 'underline' }}>Escribinos por WhatsApp</a>{' '}
                y te lo mandamos.
              </p>
            )}
            <h2 style={{ ...h3, marginTop: 32 }}>Cómo instalarla</h2>
            <ol style={{ ...body, paddingLeft: 20, listStyle: 'decimal' }}>
              {INSTALL_STEPS.map(s => <li key={s} style={{ marginBottom: 8 }}>{s}</li>)}
            </ol>
            <p style={{ ...body, marginTop: 20 }}>
              El link de descarga vence en unos minutos. Si se venció, recargá esta página.
            </p>
          </>
        )}

        {status === 'timeout' && (
          <>
            <h1 style={h1}>Tu pago todavía no se confirmó</h1>
            <p style={{ ...body, marginTop: 20 }}>
              A veces Mercado Pago tarda un poco más. Recargá esta página en unos minutos o{' '}
              <a href={help} target="_blank" rel="noopener noreferrer" style={{ color: GOLD, textDecoration: 'underline' }}>escribinos por WhatsApp</a>{' '}
              y lo revisamos.
            </p>
          </>
        )}

        {(status === 'missing' || status === 'error') && (
          <>
            <h1 style={h1}>No encontramos tu suscripción</h1>
            <p style={{ ...body, marginTop: 20 }}>
              Esta página se abre al volver de Mercado Pago. Si ya te suscribiste,{' '}
              <a href={help} target="_blank" rel="noopener noreferrer" style={{ color: GOLD, textDecoration: 'underline' }}>escribinos por WhatsApp</a>.
              Si todavía no, <Link to="/keelwise" style={{ color: GOLD, textDecoration: 'underline' }}>empezá acá</Link>.
            </p>
          </>
        )}
      </section>
    </PageShell>
  );
}
