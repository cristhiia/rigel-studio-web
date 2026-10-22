import React, { useState } from 'react';
import { adminRequest } from '../../lib/adminAuth';
import { formatArs } from '../../data/products';
import { BODY, CREAM, CREAM_85, DISPLAY, GOLD } from '../../components/ui/pageStyles';
import { Badge, Btn, Card, Field, Notice, formatDay, inputStyle } from './adminUi';
import { LINE } from './AdminShell';

// Productos: portada del CRM (una tarjeta por producto) y ficha de cada uno
// (cómo funciona, funciones, números, bitácora de avances y brief para publicidad).
// Los usuarios y el ingreso salen del cobro real si el producto está conectado a
// billing_products; si no, son los que se cargan a mano en la ficha.

export const PRODUCT_STATUS = {
  idea: { label: 'Idea', color: '#9AA0B4' },
  desarrollo: { label: 'En desarrollo', color: '#F2A65A' },
  beta: { label: 'Beta', color: GOLD },
  vendiendo: { label: 'Vendiendo', color: '#7DD3A8' },
  pausado: { label: 'Pausado', color: '#9AA0B4' },
  archivado: { label: 'Archivado', color: '#9AA0B4' },
};
const LOG_KINDS = { avance: 'Avance', decision: 'Decisión', nota: 'Nota' };
const textarea = { ...inputStyle, minHeight: 110, resize: 'vertical', lineHeight: 1.5 };

// Enlaces de la ficha: "Etiqueta | https://…". Solo se muestran los http(s).
export function parseLinks(text) {
  return String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const i = line.lastIndexOf('|');
    const url = (i === -1 ? line : line.slice(i + 1)).trim();
    const label = i === -1 ? url : line.slice(0, i).trim() || url;
    return /^https?:\/\//i.test(url) ? { label, url } : null;
  }).filter(Boolean);
}

export function numbersFor(product, billing) {
  const live = product.billing_slug && billing.find(b => b.slug === product.billing_slug);
  if (live) {
    return { live: true, users: live.active, trial: live.trial, mrr: live.billing_type === 'subscription' ? live.mrr_ars : live.one_time_month_ars };
  }
  return { live: false, users: product.manual_users, trial: 0, mrr: product.manual_mrr_ars };
}

function Stat({ label, value, hint }) {
  return (
    <div>
      <p style={{ margin: 0, color: CREAM_85, fontSize: '0.95rem' }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontFamily: DISPLAY, fontWeight: 700, fontSize: '1.6rem', color: CREAM, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      {hint && <p style={{ margin: '2px 0 0', color: CREAM_85, fontSize: '0.85rem' }}>{hint}</p>}
    </div>
  );
}

function ProductCard({ product, numbers, creatives, onOpen }) {
  const st = PRODUCT_STATUS[product.status] || PRODUCT_STATUS.idea;
  const published = creatives.filter(c => c.status === 'publicado').length;
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{ textAlign: 'left', background: '#1A1A2E', border: `1px solid ${LINE}`, borderRadius: 16, padding: '20px 22px', color: CREAM, cursor: 'pointer', fontFamily: BODY, fontSize: '1rem', display: 'block', width: '100%' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontFamily: DISPLAY, fontSize: '1.4rem' }}>{product.name}</h3>
        <Badge color={st.color}>{st.label}</Badge>
      </div>
      <p style={{ margin: '8px 0 16px', color: CREAM_85, minHeight: '1.5em' }}>{product.tagline || product.phase || 'Sin descripción todavía'}</p>
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        <Stat label="Usuarios" value={numbers.users} hint={numbers.live ? (numbers.trial ? `${numbers.trial} en prueba` : 'cobro real') : 'cargado a mano'} />
        <Stat label="Ingreso mensual" value={formatArs(numbers.mrr)} />
      </div>
      <p style={{ margin: '16px 0 0', color: CREAM_85, fontSize: '0.9rem' }}>
        {product.phase ? `${product.phase} · ` : ''}{published} {published === 1 ? 'pieza publicada' : 'piezas publicadas'}
      </p>
    </button>
  );
}

const BLANK = {
  slug: '', name: '', tagline: '', status: 'idea', phase: '', pricing: '', how_it_works: '', features: '', next_steps: '',
  competition: '', brand_brief: '', links: '', audience: '', pains: '', benefits: '', cta: '', tone: '', hashtags: '', accent: '', bg: '', motif: '', billing_slug: '', manual_users: '0', manual_mrr_ars: '0', sort_order: '100',
};
const toForm = p => Object.fromEntries(Object.keys(BLANK).map(k => [k, p[k] === null || p[k] === undefined ? '' : String(p[k])]));
const slugify = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

function contextText(product, numbers, log, creatives) {
  const lines = [
    `# ${product.name} (${(PRODUCT_STATUS[product.status] || {}).label || product.status})`,
    product.tagline && `Resumen: ${product.tagline}`,
    product.phase && `Fase: ${product.phase}`,
    product.pricing && `Modelo de cobro: ${product.pricing}`,
    `Usuarios: ${numbers.users} · Ingreso mensual: ${formatArs(numbers.mrr)}`,
    product.how_it_works && `\n## Cómo funciona\n${product.how_it_works}`,
    product.features && `\n## Funciones\n${product.features}`,
    product.next_steps && `\n## Próximos pasos\n${product.next_steps}`,
    product.competition && `\n## Competencia\n${product.competition}`,
    product.brand_brief && `\n## Brief para publicidad\n${product.brand_brief}`,
  ].filter(Boolean);
  if (log.length) lines.push('\n## Últimos avances', ...log.slice(0, 10).map(l => `- ${formatDay(l.at)} [${LOG_KINDS[l.kind] || l.kind}] ${l.text}`));
  const learned = creatives.filter(c => c.verdict);
  if (learned.length) {
    lines.push('\n## Publicidad: qué funcionó y qué no', ...learned.map(c => `- ${c.verdict === 'funciono' ? 'Funcionó' : 'No funcionó'}: ${c.title}${c.learnings ? ` — ${c.learnings}` : ''}`));
  }
  return lines.join('\n');
}

function Ficha({ product, numbers, log, creatives, billing, client, onBack, onChanged, onOpenAds }) {
  const isNew = !product;
  const [form, setForm] = useState(isNew ? BLANK : toForm(product));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [entry, setEntry] = useState({ kind: 'avance', text: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const field = (k, props = {}) => ({ value: form[k], onChange: e => set(k, e.target.value), ...props });

  async function run(fn, okText) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      await onChanged();
      if (okText) setMsg({ kind: 'info', text: okText });
      return true;
    } catch (err) {
      setMsg({ kind: 'error', text: err.message });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const save = () => run(() => adminRequest(client, 'crm', { method: 'POST', body: { action: 'product_save', ...form, billing_slug: form.billing_slug || null } }), 'Guardado');
  const addLog = async () => {
    if (await run(() => adminRequest(client, 'crm', { method: 'POST', body: { action: 'log_add', product: product.slug, ...entry } }), 'Anotado')) setEntry(e => ({ ...e, text: '' }));
  };
  const delLog = id => run(() => adminRequest(client, 'crm', { method: 'POST', body: { action: 'log_delete', id } }));
  async function copyContext() {
    try {
      await navigator.clipboard.writeText(contextText(product, numbers, log, creatives));
      setMsg({ kind: 'info', text: 'Copiado: pegalo en Claude o Claude Code para que tenga todo el contexto.' });
    } catch {
      setMsg({ kind: 'error', text: 'No se pudo copiar desde este navegador.' });
    }
  }

  const links = parseLinks(product && product.links);
  const st = PRODUCT_STATUS[(product && product.status) || 'idea'];

  return (
    <div>
      <Btn onClick={onBack} style={{ marginBottom: 20 }}>← Productos</Btn>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', color: CREAM }}>{isNew ? 'Nuevo producto' : product.name}</h1>
        {!isNew && <Badge color={st.color}>{st.label}</Badge>}
      </div>

      {!isNew && (
        <Card style={{ margin: '20px 0', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <Stat label="Usuarios" value={numbers.users} hint={numbers.live ? 'cobro real' : 'cargado a mano'} />
          <Stat label="En prueba" value={numbers.trial} />
          <Stat label="Ingreso mensual" value={formatArs(numbers.mrr)} />
          <Stat label="Piezas publicadas" value={creatives.filter(c => c.status === 'publicado').length} />
        </Card>
      )}

      {!isNew && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
          <Btn onClick={copyContext}>Copiar contexto para Claude</Btn>
          <Btn onClick={() => onOpenAds(product.slug)}>Ver publicidad ({creatives.length})</Btn>
        </div>
      )}
      {links.length > 0 && (
        <p style={{ margin: '12px 0', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {links.map(l => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: GOLD }}>{l.label}</a>
          ))}
        </p>
      )}
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <h2 style={{ fontFamily: DISPLAY, fontSize: '1.4rem', margin: '36px 0 16px', color: CREAM }}>Ficha</h2>
      <Card>
        <Field label="Nombre"><input style={inputStyle} maxLength={60} {...field('name', { onChange: e => { set('name', e.target.value); if (isNew) set('slug', slugify(e.target.value)); } })} /></Field>
        {isNew && <Field label="Identificador (sin espacios)" hint="Se usa internamente y no se puede cambiar después."><input style={inputStyle} maxLength={40} {...field('slug')} /></Field>}
        <Field label="Descripción corta"><input style={inputStyle} maxLength={140} {...field('tagline')} /></Field>
        <Field label="Estado">
          <select style={inputStyle} {...field('status')}>
            {Object.entries(PRODUCT_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Fase actual" hint="Ej. “Pulido antes de salir”, “Probando con 3 kioscos”."><input style={inputStyle} maxLength={80} {...field('phase')} /></Field>
        <Field label="Modelo de cobro"><input style={inputStyle} maxLength={200} placeholder="Ej. Suscripción mensual USD 10" {...field('pricing')} /></Field>
        <Field label="Cómo funciona"><textarea style={textarea} maxLength={4000} {...field('how_it_works')} /></Field>
        <Field label="Funciones (una por línea)"><textarea style={textarea} maxLength={4000} {...field('features')} /></Field>
        <Field label="Próximos pasos (uno por línea)"><textarea style={textarea} maxLength={4000} {...field('next_steps')} /></Field>
        <Field label="Competencia"><textarea style={textarea} maxLength={4000} {...field('competition')} /></Field>
        <h3 style={{ fontFamily: DISPLAY, fontSize: '1.15rem', margin: '28px 0 6px', color: CREAM }}>Brief para publicidad</h3>
        <p style={{ margin: '0 0 16px', color: CREAM_85 }}>El generador arma las piezas solo con estos textos: no inventa funciones, precios ni testimonios. Escribí cada dolor y cada beneficio como una frase completa.</p>
        <Field label="Público"><input style={inputStyle} maxLength={300} placeholder="Ej. dueños de kioscos y maxikioscos" {...field('audience')} /></Field>
        <Field label="Dolores (uno por línea)" hint="Frases que el cliente se dice a sí mismo."><textarea style={textarea} maxLength={1500} {...field('pains')} /></Field>
        <Field label="Beneficios (uno por línea, mínimo 2)"><textarea style={textarea} maxLength={1500} {...field('benefits')} /></Field>
        <Field label="Llamado a la acción" hint="Ej. “Sumate al acceso anticipado”."><input style={inputStyle} maxLength={100} {...field('cta')} /></Field>
        <Field label="Tono (para los videos)"><input style={inputStyle} maxLength={200} {...field('tone')} /></Field>
        <Field label="Hashtags base"><input style={inputStyle} maxLength={300} placeholder="#kiosco #emprendedores" {...field('hashtags')} /></Field>
        <Field label="Estilo visual" hint="Con “Náutico” el generador suma plantillas con brújula, ancla, velero, plano y arco luminoso.">
          <select style={inputStyle} {...field('motif')}>
            <option value="">Ninguno (plantillas generales)</option>
            <option value="nautico">Náutico</option>
          </select>
        </Field>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 160px' }}><Field label="Color de fondo (#RRGGBB)"><input style={inputStyle} maxLength={7} placeholder="#0b1530" {...field('bg')} /></Field></div>
          <div style={{ flex: '1 1 160px' }}><Field label="Color de acento (#RRGGBB)"><input style={inputStyle} maxLength={7} placeholder="#6aa7ff" {...field('accent')} /></Field></div>
        </div>
        <Field label="Notas de marca (libre)" hint="Lo que no hay que decir, referentes, etc."><textarea style={textarea} maxLength={4000} {...field('brand_brief')} /></Field>
        <Field label="Enlaces (uno por línea: Nombre | https://…)"><textarea style={{ ...textarea, minHeight: 80 }} maxLength={2000} {...field('links')} /></Field>
        <Field label="Producto de cobro conectado" hint="Si cobra por Mercado Pago, elegilo y los números salen solos.">
          <select style={inputStyle} {...field('billing_slug')}>
            <option value="">Ninguno (cargo los números a mano)</option>
            {billing.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
          </select>
        </Field>
        {!form.billing_slug && (
          <>
            <Field label="Usuarios que pagan (a mano)"><input style={inputStyle} inputMode="numeric" {...field('manual_users')} /></Field>
            <Field label="Ingreso mensual en pesos (a mano)"><input style={inputStyle} inputMode="numeric" {...field('manual_mrr_ars')} /></Field>
          </>
        )}
        <Btn kind="primary" disabled={busy || !form.name.trim() || (isNew && !form.slug)} onClick={save}>{busy ? 'Guardando…' : 'Guardar ficha'}</Btn>
      </Card>

      {!isNew && (
        <>
          <h2 style={{ fontFamily: DISPLAY, fontSize: '1.4rem', margin: '48px 0 16px', color: CREAM }}>Bitácora</h2>
          <Card style={{ marginBottom: 16 }}>
            <Field label="Nueva entrada">
              <textarea style={{ ...textarea, minHeight: 70 }} maxLength={600} placeholder="Ej. Terminamos el cierre de caja y probamos con el kiosco 24 hs" value={entry.text} onChange={e => setEntry(v => ({ ...v, text: e.target.value }))} />
            </Field>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select aria-label="Tipo de entrada" style={{ ...inputStyle, width: 'auto' }} value={entry.kind} onChange={e => setEntry(v => ({ ...v, kind: e.target.value }))}>
                {Object.entries(LOG_KINDS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <Btn kind="primary" disabled={busy || !entry.text.trim()} onClick={addLog}>Anotar</Btn>
            </div>
          </Card>
          {log.length === 0 && <p style={{ color: CREAM_85 }}>Todavía no hay avances anotados.</p>}
          {log.map(l => (
            <div key={l.id} style={{ borderTop: `1px solid ${LINE}`, padding: '14px 0', display: 'flex', gap: 14, justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, color: CREAM_85, fontSize: '0.9rem' }}>{formatDay(l.at)} · {LOG_KINDS[l.kind] || l.kind}</p>
                <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{l.text}</p>
              </div>
              <Btn kind="danger" disabled={busy} onClick={() => delLog(l.id)} style={{ padding: '6px 14px', minHeight: 36, fontSize: '0.9rem' }}>Borrar</Btn>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default function Crm({ client, crm, billing, onReload, onOpenAds }) {
  const [openSlug, setOpenSlug] = useState(null);
  const products = crm.products;
  const current = openSlug && openSlug !== '__new' ? products.find(p => p.slug === openSlug) : null;

  if (openSlug) {
    const slug = current && current.slug;
    return (
      <Ficha
        key={openSlug}
        product={current}
        numbers={current ? numbersFor(current, billing) : null}
        log={crm.log.filter(l => l.product_slug === slug)}
        creatives={crm.creatives.filter(c => c.product_slug === slug)}
        billing={billing}
        client={client}
        onBack={() => setOpenSlug(null)}
        onChanged={onReload}
        onOpenAds={onOpenAds}
      />
    );
  }

  const all = products.map(p => ({ p, n: numbersFor(p, billing) }));
  const totals = all.reduce((acc, { p, n }) => (p.status === 'archivado' ? acc : { users: acc.users + n.users, mrr: acc.mrr + n.mrr }), { users: 0, mrr: 0 });
  return (
    <div>
      <h1 style={{ margin: '0 0 12px', fontFamily: DISPLAY, fontSize: 'clamp(2rem, 5vw, 2.8rem)', color: CREAM }}>Rigel Studio</h1>
      <p style={{ color: CREAM_85, margin: '0 0 28px' }}>Tus productos, cómo van y qué hicimos en cada uno.</p>
      <Card style={{ display: 'flex', gap: 36, flexWrap: 'wrap', marginBottom: 24 }}>
        <Stat label="Usuarios que pagan" value={totals.users} />
        <Stat label="Ingreso mensual total" value={formatArs(totals.mrr)} />
        <Stat label="Productos" value={products.filter(p => p.status !== 'archivado').length} />
      </Card>
      <style>{'.crm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }'}</style>
      <div className="crm-grid">
        {all.map(({ p, n }) => (
          <ProductCard key={p.slug} product={p} numbers={n} creatives={crm.creatives.filter(c => c.product_slug === p.slug)} onOpen={() => setOpenSlug(p.slug)} />
        ))}
      </div>
      {products.length === 0 && <Notice kind="warn">Todavía no hay productos en el CRM. Creá el primero.</Notice>}
      <Btn onClick={() => setOpenSlug('__new')} style={{ marginTop: 20 }}>+ Nuevo producto</Btn>
    </div>
  );
}
