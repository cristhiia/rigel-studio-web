import React, { useCallback, useEffect, useRef, useState } from 'react';
import { adminRequest } from '../../lib/adminAuth';
import { formatArs } from '../../data/products';
import { CREAM_85, DISPLAY } from '../../components/ui/pageStyles';
import { Badge, Btn, Card, Field, Notice, STATUS, formatDay, inputStyle } from './adminUi';
import { LINE } from './AdminShell';

const FILTERS = [
  ['', 'Todos'],
  ['active', 'Activos'],
  ['trial', 'En prueba'],
  ['expiring', 'Por vencer'],
  ['past_due', 'Morosos'],
  ['cancelled', 'Sin acceso'],
];
const PRESET_DAYS = [7, 30, 90, 365];
const PAGE = 25;

function GrantForm({ products, defaultProduct, initialEmail = '', onDone, onCancel, client }) {
  const [email, setEmail] = useState(initialEmail);
  const [product, setProduct] = useState(defaultProduct);
  const [days, setDays] = useState('30');
  const [forever, setForever] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = { action: 'grant', product, email: email.trim(), note: note.trim() };
      if (forever) Object.assign(body, { forever: true, confirmForever: true });
      else body.days = Number(days);
      await adminRequest(client, 'manage', { method: 'POST', body });
      onDone(`Acceso dado a ${email.trim().toLowerCase()}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Card style={{ margin: '16px 0' }}>
      <form onSubmit={submit}>
        <h3 style={{ fontFamily: DISPLAY, margin: '0 0 14px', fontSize: '1.2rem' }}>Dar acceso a mano</h3>
        <Field label="Email de la persona" hint="Tiene que iniciar sesión en la app con este mismo email.">
          <input style={inputStyle} type="email" inputMode="email" autoComplete="off" required value={email} onChange={e => setEmail(e.target.value)} />
        </Field>
        {products.length > 1 && (
          <Field label="Producto">
            <select style={inputStyle} value={product} onChange={e => setProduct(e.target.value)}>
              {products.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Cuántos días">
          <input style={inputStyle} type="number" inputMode="numeric" min="1" max="3650" step="1" disabled={forever} value={days} onChange={e => setDays(e.target.value)} />
          <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {PRESET_DAYS.map(d => (
              <Btn key={d} kind={!forever && String(d) === days ? 'primary' : 'ghost'} onClick={() => { setForever(false); setDays(String(d)); }}>{d}</Btn>
            ))}
          </span>
        </Field>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '0 0 14px', minHeight: 44 }}>
          <input type="checkbox" checked={forever} onChange={e => setForever(e.target.checked)} style={{ width: 20, height: 20 }} />
          <span>Sin vencimiento (para siempre)</span>
        </label>
        <Field label="Nota (opcional)" hint="Por qué se lo das: tester, regalo, soporte…">
          <input style={inputStyle} type="text" maxLength={200} value={note} onChange={e => setNote(e.target.value)} />
        </Field>
        {error && <Notice kind="error">{error}</Notice>}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Btn type="submit" kind="primary" disabled={busy}>{busy ? 'Guardando…' : 'Dar acceso'}</Btn>
          <Btn onClick={onCancel} disabled={busy}>Cancelar</Btn>
        </div>
      </form>
    </Card>
  );
}

function Row({ row, productName, client, onChanged }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelMp, setCancelMp] = useState(true);
  const [extending, setExtending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const st = STATUS[row.status] || STATUS.cancelled;
  const hasAccess = row.status !== 'cancelled';

  async function run(body, message) {
    setBusy(true);
    setError('');
    try {
      const res = await adminRequest(client, 'manage', { method: 'POST', body });
      onChanged(res.warning ? `${message}. Ojo: ${res.warning}` : message, Boolean(res.warning));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const base = { product: row.product_slug, email: row.email };

  return (
    <li style={{ listStyle: 'none', borderBottom: `1px solid ${LINE}`, padding: '14px 0' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{ all: 'unset', boxSizing: 'border-box', display: 'block', width: '100%', cursor: 'pointer', minHeight: 44 }}
      >
        <span style={{ display: 'block', fontFamily: DISPLAY, fontWeight: 500, overflowWrap: 'anywhere' }}>{row.email}</span>
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 6, color: CREAM_85 }}>
          <Badge color={st.color}>{st.label}</Badge>
          {row.source === 'manual' && <Badge>A mano</Badge>}
          <span>{productName}</span>
          <span>· {row.valid_until ? `hasta ${formatDay(row.valid_until)}` : 'sin vencimiento'}</span>
        </span>
      </button>

      {open && (
        <div style={{ marginTop: 12, color: CREAM_85 }}>
          <p style={{ margin: '0 0 6px' }}>Alta: {formatDay(row.created_at)}{row.amount_ars ? ` · paga ${formatArs(row.amount_ars)} por mes` : ''}{row.has_mp ? ' · vía Mercado Pago' : ''}</p>
          {row.note && <p style={{ margin: '0 0 6px' }}>Nota: {row.note}</p>}

          {extending ? (
            <div style={{ marginTop: 10 }}>
              <p style={{ margin: '0 0 8px' }}>Darle acceso desde hoy por:</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PRESET_DAYS.map(d => (
                  <Btn key={d} disabled={busy} onClick={() => run({ action: 'grant', ...base, days: d, note: row.note || '' }, `Acceso por ${d} días`)}>{d} días</Btn>
                ))}
                <Btn onClick={() => setExtending(false)} disabled={busy}>Cancelar</Btn>
              </div>
            </div>
          ) : confirming ? (
            <div style={{ marginTop: 10 }}>
              {row.has_mp && row.source !== 'manual' && (
                <label style={{ display: 'flex', gap: 10, alignItems: 'center', minHeight: 44 }}>
                  <input type="checkbox" checked={cancelMp} onChange={e => setCancelMp(e.target.checked)} style={{ width: 20, height: 20 }} />
                  <span>Cancelar también la suscripción en Mercado Pago (si no, le sigue cobrando)</span>
                </label>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                <Btn kind="danger" disabled={busy} onClick={() => run({ action: 'revoke', ...base, cancelMp: row.has_mp && row.source !== 'manual' && cancelMp }, `Se quitó el acceso a ${row.email}`)}>
                  {busy ? 'Quitando…' : 'Sí, quitar acceso'}
                </Btn>
                <Btn onClick={() => setConfirming(false)} disabled={busy}>No</Btn>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <Btn onClick={() => setExtending(true)}>{hasAccess ? 'Extender acceso' : 'Volver a darle acceso'}</Btn>
              {hasAccess && <Btn kind="danger" onClick={() => setConfirming(true)}>Quitar acceso</Btn>}
            </div>
          )}
          {error && <Notice kind="error">{error}</Notice>}
        </div>
      )}
    </li>
  );
}

export default function Subscribers({ client, products }) {
  const subs = products.filter(p => p.billing_type === 'subscription' || p.billing_type === 'one_time');
  const [status, setStatus] = useState('');
  const [product, setProduct] = useState('');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(null);
  const [granting, setGranting] = useState(false);
  const seq = useRef(0);
  const names = Object.fromEntries(products.map(p => [p.slug, p.name]));

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim().toLowerCase()), 350);
    return () => clearTimeout(id);
  }, [q]);

  const load = useCallback(async (offset = 0) => {
    const mine = ++seq.current;
    setLoading(true);
    setError('');
    try {
      const query = { limit: String(PAGE), offset: String(offset) };
      if (status) query.status = status;
      if (product) query.product = product;
      if (debouncedQ) query.q = debouncedQ;
      const res = await adminRequest(client, 'subscribers', { query });
      if (mine !== seq.current) return;
      setRows(prev => (offset === 0 ? res.rows : [...prev, ...res.rows]));
      setTotal(res.total);
    } catch (err) {
      if (mine === seq.current) setError(err.message);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [client, status, product, debouncedQ]);

  useEffect(() => { load(0); }, [load]);

  function changed(message, warn = false) {
    setFlash({ message, warn });
    setGranting(false);
    load(0);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, color: CREAM_85 }}>{loading && rows.length === 0 ? 'Cargando…' : `${total} ${total === 1 ? 'persona' : 'personas'}`}</p>
        {!granting && <Btn kind="primary" onClick={() => { setGranting(true); setFlash(null); }}>+ Dar acceso</Btn>}
      </div>

      {flash && <Notice kind={flash.warn ? 'warn' : 'info'}>{flash.message}</Notice>}

      {granting && subs.length > 0 && (
        <GrantForm
          client={client}
          products={subs}
          defaultProduct={(subs.find(p => p.slug === product) || subs[0]).slug}
          onDone={changed}
          onCancel={() => setGranting(false)}
        />
      )}

      <div role="group" aria-label="Filtrar por estado" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
        {FILTERS.map(([value, label]) => (
          <Btn key={value || 'all'} kind={status === value ? 'primary' : 'ghost'} onClick={() => setStatus(value)} style={{ padding: '8px 14px' }}>{label}</Btn>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input
          style={{ ...inputStyle, flex: '1 1 220px', width: 'auto' }}
          type="search" inputMode="email" autoComplete="off" placeholder="Buscar por email" aria-label="Buscar por email"
          value={q} onChange={e => setQ(e.target.value)} maxLength={100}
        />
        {products.length > 1 && (
          <select style={{ ...inputStyle, flex: '0 1 200px', width: 'auto' }} value={product} onChange={e => setProduct(e.target.value)} aria-label="Producto">
            <option value="">Todos los productos</option>
            {products.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
        )}
      </div>

      {error && <Notice kind="error">{error}</Notice>}

      <ul style={{ margin: '12px 0 0', padding: 0 }}>
        {rows.map(r => (
          <Row
            key={`${r.email}|${r.product_slug}|${r.valid_until}|${r.status}`}
            row={r}
            productName={names[r.product_slug] || r.product_slug}
            client={client}
            onChanged={changed}
          />
        ))}
      </ul>

      {!loading && !error && rows.length === 0 && (
        <p style={{ color: CREAM_85, padding: '20px 0' }}>
          {status || debouncedQ || product ? 'No hay nadie con ese filtro.' : 'Todavía no hay suscriptores. Cuando alguien pague, aparece acá.'}
        </p>
      )}

      {rows.length < total && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Btn disabled={loading} onClick={() => load(rows.length)}>{loading ? 'Cargando…' : 'Ver más'}</Btn>
        </div>
      )}
    </div>
  );
}
