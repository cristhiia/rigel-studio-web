import React, { useState } from 'react';
import { adminRequest } from '../../lib/adminAuth';
import { formatArs } from '../../data/products';
import { CREAM, CREAM_85, DISPLAY, GOLD } from '../../components/ui/pageStyles';
import { Badge, Btn, Card, Field, Notice, formatDay, inputStyle } from './adminUi';
import { LINE } from './AdminShell';

// Publicidad: las piezas (posts, videos) que se generan para cada producto, su
// estado y los resultados que se cargan a mano después de publicarlas por
// afuera. Acá no se conecta ninguna red social.

const KINDS = { post: 'Post', video: 'Video', historia: 'Historia', otro: 'Otro' };
const STATUSES = {
  idea: { label: 'Idea', color: '#9AA0B4' },
  listo: { label: 'Listo para publicar', color: GOLD },
  publicado: { label: 'Publicado', color: '#7DD3A8' },
  descartado: { label: 'Descartado', color: '#9AA0B4' },
};
const PLATFORMS = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', otro: 'Otra' };
const VERDICTS = { funciono: { label: 'Funcionó', color: '#7DD3A8' }, no_funciono: { label: 'No funcionó', color: '#F28B82' } };
const METRICS = [
  ['reach', 'Alcance'], ['views', 'Reproducciones'], ['likes', 'Me gusta'], ['comments', 'Comentarios'],
  ['saves', 'Guardados'], ['shares', 'Compartidos'], ['clicks', 'Clics'], ['conversions', 'Resultados (instalaciones, consultas, ventas)'],
];
const textarea = { ...inputStyle, minHeight: 90, resize: 'vertical', lineHeight: 1.5 };
const nf = new Intl.NumberFormat('es-AR');

const BLANK = {
  id: null, product: '', kind: 'post', title: '', concept: '', caption: '', hashtags: '', media_url: '', status: 'idea',
  platform: 'instagram', published_on: '', spend_ars: '', verdict: '', learnings: '',
  reach: '', views: '', likes: '', comments: '', saves: '', shares: '', clicks: '', conversions: '',
};
const fromRow = c => ({
  ...BLANK,
  ...Object.fromEntries(Object.keys(BLANK).filter(k => k !== 'id' && k !== 'product').map(k => [k, c[k] === null || c[k] === undefined ? '' : String(c[k])])),
  id: c.id,
  product: c.product_slug,
});

function costPerResult(c) {
  return c.spend_ars && c.conversions ? formatArs(Math.round(c.spend_ars / c.conversions)) : null;
}

function Editor({ initial, products, client, onClose, onSaved }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const field = k => ({ value: f[k], onChange: e => set(k, e.target.value) });

  async function save() {
    setBusy(true);
    setError('');
    try {
      const body = { action: 'creative_save', ...f, id: f.id === null ? undefined : f.id };
      await adminRequest(client, 'crm', { method: 'POST', body });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Card style={{ marginBottom: 24 }}>
      <h3 style={{ fontFamily: DISPLAY, margin: '0 0 16px', fontSize: '1.3rem' }}>{f.id === null ? 'Nueva pieza' : 'Editar pieza'}</h3>
      <Field label="Producto">
        <select style={inputStyle} {...field('product')}>
          <option value="">Elegí un producto…</option>
          {products.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Título"><input style={inputStyle} maxLength={120} {...field('title')} /></Field>
      <Field label="Tipo">
        <select style={inputStyle} {...field('kind')}>{Object.entries(KINDS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </Field>
      <Field label="Idea / guion" hint="Qué muestra y cuál es el gancho."><textarea style={textarea} maxLength={1500} {...field('concept')} /></Field>
      <Field label="Texto para publicar"><textarea style={textarea} maxLength={2200} {...field('caption')} /></Field>
      <Field label="Hashtags"><input style={inputStyle} maxLength={500} {...field('hashtags')} /></Field>
      <Field label="Enlace al archivo (Drive, etc.)" hint="La imagen o el video se guardan por afuera; acá queda el enlace."><input style={inputStyle} type="url" maxLength={500} placeholder="https://" {...field('media_url')} /></Field>
      <Field label="Estado">
        <select style={inputStyle} {...field('status')}>{Object.entries(STATUSES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}</select>
      </Field>
      {f.status === 'publicado' && (
        <>
          <Field label="Red donde la publicaste">
            <select style={inputStyle} {...field('platform')}>{Object.entries(PLATFORMS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </Field>
          <Field label="Fecha de publicación"><input style={inputStyle} type="date" {...field('published_on')} /></Field>
          <Field label="Gasto en pesos (si la pautaste)"><input style={inputStyle} inputMode="numeric" {...field('spend_ars')} /></Field>
          {METRICS.map(([k, label]) => (
            <Field key={k} label={label}><input style={inputStyle} inputMode="numeric" {...field(k)} /></Field>
          ))}
          <Field label="¿Funcionó?">
            <select style={inputStyle} {...field('verdict')}>
              <option value="">Todavía no sé</option>
              <option value="funciono">Funcionó</option>
              <option value="no_funciono">No funcionó</option>
            </select>
          </Field>
          <Field label="Qué aprendimos"><textarea style={textarea} maxLength={1000} {...field('learnings')} /></Field>
        </>
      )}
      {error && <Notice kind="error">{error}</Notice>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Btn kind="primary" disabled={busy || !f.product || !f.title.trim()} onClick={save}>{busy ? 'Guardando…' : 'Guardar'}</Btn>
        <Btn disabled={busy} onClick={onClose}>Cancelar</Btn>
      </div>
    </Card>
  );
}

function Piece({ c, productName, onEdit, onDelete, busy }) {
  const st = STATUSES[c.status] || STATUSES.idea;
  const v = c.verdict && VERDICTS[c.verdict];
  const cpr = costPerResult(c);
  const stats = [
    c.reach !== null && `${nf.format(c.reach)} alcance`,
    c.views !== null && `${nf.format(c.views)} reproducciones`,
    c.likes !== null && `${nf.format(c.likes)} me gusta`,
    c.comments !== null && `${nf.format(c.comments)} comentarios`,
    c.saves !== null && `${nf.format(c.saves)} guardados`,
    c.clicks !== null && `${nf.format(c.clicks)} clics`,
    c.conversions !== null && `${nf.format(c.conversions)} resultados`,
    c.spend_ars !== null && `gastaste ${formatArs(c.spend_ars)}`,
    cpr && `${cpr} por resultado`,
  ].filter(Boolean);
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText([c.caption, c.hashtags].filter(Boolean).join('\n\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* sin portapapeles */ }
  }
  const mediaOk = /^https?:\/\//i.test(c.media_url || '');
  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <Badge color={st.color}>{st.label}</Badge>
        <Badge>{KINDS[c.kind] || c.kind}</Badge>
        {c.status === 'publicado' && <Badge>{PLATFORMS[c.platform] || c.platform}</Badge>}
        {v && <Badge color={v.color}>{v.label}</Badge>}
      </div>
      <h3 style={{ margin: 0, fontFamily: DISPLAY, fontSize: '1.2rem', overflowWrap: 'anywhere' }}>{c.title}</h3>
      <p style={{ margin: '4px 0 10px', color: CREAM_85, fontSize: '0.9rem' }}>
        {productName}{c.published_on ? ` · publicado el ${formatDay(c.published_on)}` : ` · creado el ${formatDay(c.created_at)}`}
      </p>
      {c.concept && <p style={{ margin: '0 0 10px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{c.concept}</p>}
      {stats.length > 0 && <p style={{ margin: '0 0 10px', color: CREAM_85 }}>{stats.join(' · ')}</p>}
      {c.learnings && <p style={{ margin: '0 0 10px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}><strong>Aprendimos:</strong> {c.learnings}</p>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Btn onClick={onEdit} disabled={busy}>Editar</Btn>
        {(c.caption || c.hashtags) && <Btn onClick={copy}>{copied ? 'Copiado ✓' : 'Copiar texto'}</Btn>}
        {mediaOk && <a href={c.media_url} target="_blank" rel="noopener noreferrer" style={{ color: GOLD }}>Abrir archivo</a>}
        <Btn kind="danger" disabled={busy} onClick={onDelete} style={{ marginLeft: 'auto' }}>Borrar</Btn>
      </div>
    </Card>
  );
}

export default function Ads({ client, crm, onReload, initialProduct = '' }) {
  const [product, setProduct] = useState(initialProduct);
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const names = Object.fromEntries(crm.products.map(p => [p.slug, p.name]));
  const inProduct = crm.creatives.filter(c => !product || c.product_slug === product);
  const shown = inProduct.filter(c => !status || c.status === status);
  const worked = inProduct.filter(c => c.verdict === 'funciono').length;
  const failed = inProduct.filter(c => c.verdict === 'no_funciono').length;

  async function remove(c) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`¿Borrar “${c.title}”? No se puede deshacer.`)) return;
    setBusy(true);
    setError('');
    try {
      await adminRequest(client, 'crm', { method: 'POST', body: { action: 'creative_delete', id: c.id } });
      await onReload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 12px', fontFamily: DISPLAY, fontSize: 'clamp(2rem, 5vw, 2.8rem)', color: CREAM }}>Publicidad</h1>
      <p style={{ color: CREAM_85, margin: '0 0 24px' }}>
        Las piezas que generamos para cada producto y cómo les fue. Las publicás vos por afuera y acá cargás los resultados.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <select aria-label="Producto" style={{ ...inputStyle, flex: '1 1 200px', width: 'auto' }} value={product} onChange={e => setProduct(e.target.value)}>
          <option value="">Todos los productos</option>
          {crm.products.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
        </select>
        <select aria-label="Estado" style={{ ...inputStyle, flex: '1 1 200px', width: 'auto' }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUSES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
        </select>
        <Btn kind="primary" onClick={() => setEditing({ ...BLANK, product })}>+ Nueva pieza</Btn>
      </div>

      <p style={{ color: CREAM_85, margin: '0 0 20px' }}>
        {inProduct.length} {inProduct.length === 1 ? 'pieza' : 'piezas'} · {worked} funcionaron · {failed} no funcionaron
      </p>

      {error && <Notice kind="error">{error}</Notice>}
      {editing && (
        <Editor key={editing.id === null ? `new-${editing.product}` : editing.id} initial={editing} products={crm.products} client={client} onClose={() => setEditing(null)} onSaved={onReload} />
      )}
      {crm.products.length === 0 && <Notice kind="warn">Primero creá un producto en la pestaña Productos.</Notice>}
      {shown.length === 0 && crm.products.length > 0 && (
        <p style={{ color: CREAM_85, borderTop: `1px solid ${LINE}`, padding: '20px 0', margin: 0 }}>No hay piezas con este filtro.</p>
      )}
      {shown.map(c => (
        <Piece key={c.id} c={c} productName={names[c.product_slug] || c.product_slug} busy={busy} onEdit={() => setEditing(fromRow(c))} onDelete={() => remove(c)} />
      ))}
    </div>
  );
}
