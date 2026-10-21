import React, { useCallback, useEffect, useState } from 'react';
import { adminRequest } from '../../lib/adminAuth';
import { formatArs } from '../../data/products';
import { CREAM_85, DISPLAY } from '../../components/ui/pageStyles';
import { Btn, Card, Field, Notice, formatDay, inputStyle } from './adminUi';
import { LINE } from './AdminShell';

const ROUNDS = [[1, 'al peso'], [10, 'a $10'], [50, 'a $50'], [100, 'a $100']];
const dateTime = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/San_Juan',
});

function PriceCard({ product, client, onApplied }) {
  const [rate, setRate] = useState('');
  const [round, setRound] = useState(50);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send(apply) {
    setBusy(true);
    setError('');
    try {
      const res = await adminRequest(client, 'manage', {
        method: 'POST',
        body: { action: 'price', product: product.slug, usd_rate: rate.replace(',', '.'), round, apply },
      });
      if (apply) { setPlan(null); setRate(''); onApplied(`Precio de ${product.name} actualizado a ${formatArs(res.plan.next)}`); }
      else setPlan(res.plan);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ marginBottom: 16 }}>
      <h3 style={{ fontFamily: DISPLAY, margin: '0 0 6px', fontSize: '1.2rem' }}>{product.name}</h3>
      <p style={{ margin: '0 0 14px', color: CREAM_85 }}>
        Precio en dólares: USD {product.price_usd} · Precio hoy: <strong style={{ color: 'inherit' }}>{product.price_ars ? formatArs(product.price_ars) : 'sin definir'}</strong> por mes
      </p>
      <Field label="Cotización del dólar (pesos por USD)">
        <input style={inputStyle} type="text" inputMode="decimal" placeholder="Ej. 1550" value={rate} onChange={e => { setRate(e.target.value); setPlan(null); }} />
      </Field>
      <Field label="Redondear">
        <select style={inputStyle} value={round} onChange={e => { setRound(Number(e.target.value)); setPlan(null); }}>
          {ROUNDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      {error && <Notice kind="error">{error}</Notice>}
      {plan && (
        <Notice kind={plan.changed ? 'info' : 'warn'}>
          {plan.changed
            ? `Pasa de ${plan.current ? formatArs(plan.current) : 'sin precio'} a ${formatArs(plan.next)} (USD ${plan.price_usd} × ${plan.usd_rate}).`
            : `Ya está en ${formatArs(plan.next)}; no hay nada que cambiar.`}
        </Notice>
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Btn disabled={busy || !rate.trim()} onClick={() => send(false)}>Calcular</Btn>
        {plan && plan.changed && <Btn kind="primary" disabled={busy} onClick={() => send(true)}>{busy ? 'Guardando…' : 'Aplicar precio'}</Btn>}
      </div>
      <p style={{ margin: '14px 0 0', color: CREAM_85, fontSize: '0.9rem' }}>
        El nuevo precio vale para los que se suscriban desde ahora. Quienes ya están suscriptos siguen pagando lo que aceptaron.
      </p>
    </Card>
  );
}

const ACTION = { grant: 'Dio acceso', revoke: 'Quitó acceso', price: 'Cambió precio' };

function describe(l) {
  if (l.action === 'price') return `${l.product_slug}: ${l.detail.from ? formatArs(l.detail.from) : '—'} → ${formatArs(l.detail.to)} (dólar ${l.detail.usd_rate})`;
  const until = l.action === 'grant' ? (l.detail.valid_until ? ` hasta ${formatDay(l.detail.valid_until)}` : ' sin vencimiento') : l.detail.mp_cancelled ? ' (y canceló en Mercado Pago)' : '';
  return `${l.target_email}${until}${l.detail.note ? ` · ${l.detail.note}` : ''}`;
}

export default function Settings({ client }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await adminRequest(client, 'manage'));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [client]);

  useEffect(() => { load(); }, [load]);

  if (error) return <Notice kind="error">{error}</Notice>;
  if (!data) return <p style={{ color: CREAM_85 }}>Cargando…</p>;

  const priced = data.products.filter(p => p.billing_type === 'subscription' && p.price_usd);

  return (
    <div>
      <h2 style={{ fontFamily: DISPLAY, fontSize: '1.4rem', margin: '0 0 12px' }}>Precio según el dólar</h2>
      {flash && <Notice>{flash}</Notice>}
      {priced.length === 0 && <p style={{ color: CREAM_85 }}>No hay productos con precio en dólares.</p>}
      {priced.map(p => (
        <PriceCard key={p.slug} product={p} client={client} onApplied={m => { setFlash(m); load(); }} />
      ))}

      <h2 style={{ fontFamily: DISPLAY, fontSize: '1.4rem', margin: '40px 0 12px' }}>Historial</h2>
      {data.log.length === 0 ? (
        <p style={{ color: CREAM_85 }}>Todavía no hiciste cambios desde el panel.</p>
      ) : (
        <ul style={{ margin: 0, padding: 0 }}>
          {data.log.map((l, i) => (
            <li key={`${l.at}-${i}`} style={{ listStyle: 'none', padding: '12px 0', borderBottom: `1px solid ${LINE}` }}>
              <span style={{ color: CREAM_85 }}>{dateTime.format(new Date(l.at))} · {l.admin_email}</span>
              <span style={{ display: 'block', overflowWrap: 'anywhere' }}><strong style={{ fontFamily: DISPLAY, fontWeight: 500 }}>{ACTION[l.action] || l.action}</strong> — {describe(l)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
