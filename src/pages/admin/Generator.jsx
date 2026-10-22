import React, { useEffect, useMemo, useRef, useState } from 'react';
import { adminRequest } from '../../lib/adminAuth';
import { FORMATS, MAX_PER_RUN, SLOT_LABELS, generatePieces } from '../../lib/adGenerator';
import { learn, summarize } from '../../lib/adLearning';
import '@fontsource/anton/latin-400.css';
import '@fontsource/allura/latin-400.css';
import '@fontsource/press-start-2p/latin-400.css';
import { downloadAd, ensureFonts, renderAd } from '../../lib/adRender';
import { CREAM, CREAM_85, DISPLAY, GOLD } from '../../components/ui/pageStyles';
import { Badge, Btn, Card, Field, Notice, TickButtons, inputStyle } from './adminUi';
import { LINE } from './AdminShell';

// Generador: elegís producto, tipo y cantidad de ideas y arma cada una en 3 variantes
// (relajada, estándar al medio y alocada) a partir del brief del producto, sin costo
// por uso y sin conexión a redes.
//  · Post / Historia → imagen PNG lista para descargar.
//  · Video → prompt para pegar en Claude Code y producir el motion graphics.
// Con ✓ / ✗ calificás el diseño; eso se guarda en el CRM y el generador aprende.

const KIND_HELP = {
  post: 'Imagen 1080×1350 para el feed.',
  historia: 'Imagen 1080×1920 con márgenes seguros para historias.',
  video: 'Prompt para Claude Code que arma un video vertical en motion graphics.',
};
const SLOT_COLOR = { relajada: '#7DD3A8', estandar: GOLD, alocada: '#F28B82' };

function useCopy() {
  const [copied, setCopied] = useState('');
  async function copy(key, text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 1800);
    } catch { /* sin portapapeles */ }
  }
  return [copied, copy];
}

function Preview({ piece, product, brief }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && piece.kind !== 'video') {
      let alive = true;
      ensureFonts().then(() => {
        if (alive && ref.current) renderAd(ref.current, { layout: piece.layout, name: product.name, accent: brief.accent, bg: brief.bg, format: piece.kind });
      });
      return () => { alive = false; };
    }
    return undefined;
  }, [piece, product.name, brief.accent, brief.bg]);
  const { w, h } = FORMATS[piece.kind];
  return <canvas ref={ref} width={w} height={h} role="img" aria-label={piece.title} style={{ width: '100%', height: 'auto', borderRadius: 10, border: `1px solid ${LINE}`, display: 'block' }} />;
}

function Variant({ piece, product, brief, state, busy, adapted, onTick, onSave }) {
  const [copied, copy] = useCopy();
  const slug = product.slug;
  const color = SLOT_COLOR[piece.slot];
  const learnedStyle = piece.slot === 'estandar' && adapted && piece.layout.tpl !== 'clasica';
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, borderColor: color }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Badge color={color}>{SLOT_LABELS[piece.slot]}</Badge>
        {learnedStyle && <Badge>con lo que aprendió</Badge>}
        {state && state.id && <Badge color="#7DD3A8">Guardada</Badge>}
      </div>
      {piece.kind === 'video' ? (
        <textarea readOnly aria-label="Prompt para Claude Code" value={piece.prompt} style={{ ...inputStyle, minHeight: 200, lineHeight: 1.45, fontSize: '0.85rem' }} onFocus={e => e.target.select()} />
      ) : (
        <Preview piece={piece} product={product} brief={brief} />
      )}
      {piece.kind !== 'video' && <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: CREAM_85, overflowWrap: 'anywhere', fontSize: '0.9rem', maxHeight: 120, overflow: 'hidden' }}>{piece.caption}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 'auto' }}>
        <TickButtons value={state ? state.tick : ''} disabled={busy} onTick={onTick} />
        {piece.kind === 'video'
          ? <Btn kind="primary" onClick={() => copy('p', piece.prompt)}>{copied === 'p' ? 'Copiado ✓' : 'Copiar prompt'}</Btn>
          : <Btn kind="primary" onClick={() => downloadAd({ layout: piece.layout, name: product.name, accent: brief.accent, bg: brief.bg, format: piece.kind }, `${slug}-${piece.kind}-${piece.angle}-${piece.slot}.png`)}>Descargar</Btn>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {piece.kind !== 'video' && <Btn onClick={() => copy('t', [piece.caption, piece.hashtags].filter(Boolean).join('\n\n'))}>{copied === 't' ? 'Copiado ✓' : 'Copiar texto'}</Btn>}
        <Btn disabled={busy || Boolean(state && state.id)} onClick={onSave}>{state && state.id ? 'En el CRM ✓' : 'Guardar en el CRM'}</Btn>
      </div>
    </Card>
  );
}

function LearnedPanel({ summary, onReset, busy }) {
  const chip = (r, color) => <Badge key={r.trait} color={color}>{r.label}</Badge>;
  return (
    <div style={{ margin: '18px 0 0', padding: '14px 16px', border: `1px solid ${LINE}`, borderRadius: 12 }}>
      <p style={{ margin: '0 0 8px', color: CREAM, fontFamily: DISPLAY }}>Lo que aprendió de este producto</p>
      {summary.rated === 0 ? (
        <p style={{ margin: 0, color: CREAM_85 }}>
          Todavía nada. Dale ✓ o ✗ a las piezas que te gusten o no, y cuando cargues el alcance de las publicadas eso también suma.
          Se empieza a notar con unas 10 o 15 piezas calificadas.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          <p style={{ margin: 0, color: CREAM_85 }}>{summary.rated} {summary.rated === 1 ? 'pieza calificada' : 'piezas calificadas'}.</p>
          {summary.likes.length > 0 && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}><span style={{ color: CREAM_85 }}>Usa más:</span>{summary.likes.map(r => chip(r, '#7DD3A8'))}</div>}
          {summary.dislikes.length > 0 && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}><span style={{ color: CREAM_85 }}>Evita:</span>{summary.dislikes.map(r => chip(r, '#F28B82'))}</div>}
          {summary.likes.length === 0 && summary.dislikes.length === 0 && <p style={{ margin: 0, color: CREAM_85 }}>Todavía no hay una preferencia clara.</p>}
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <Btn kind="danger" disabled={busy} onClick={onReset}>Reiniciar lo aprendido</Btn>
      </div>
    </div>
  );
}

export default function Generator({ client, crm, onReload, initialProduct = '' }) {
  const candidates = crm.products.filter(p => p.status !== 'archivado');
  const [slug, setSlug] = useState(initialProduct || (candidates[0] && candidates[0].slug) || '');
  const [kind, setKind] = useState('post');
  const [count, setCount] = useState(2);
  const [result, setResult] = useState(null);
  // Por pieza generada: { id, tick } una vez guardada en el CRM.
  const [saved, setSaved] = useState({});
  const [seed, setSeed] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const product = crm.products.find(p => p.slug === slug);
  const summary = useMemo(
    () => summarize(learn(crm.creatives, { slug, kind, since: product && product.learning_since })),
    [crm.creatives, slug, kind, product],
  );

  function run() {
    if (!product) return;
    const s = Math.floor(Math.random() * 1e6) + 1;
    setSeed(s);
    setError('');
    setSaved({});
    setResult({ product, ...generatePieces(product, { kind, count, seed: s, creatives: crm.creatives, since: product.learning_since }) });
  }

  const keyOf = (i, slot) => `${i}-${slot}`;

  function bodyFor(p, tick) {
    return {
      action: 'creative_save', product: result.product.slug, kind: p.kind, title: p.title, concept: p.concept,
      caption: p.caption, hashtags: p.hashtags, status: 'listo', layout: p.layout, prompt: p.prompt, tick: tick || undefined,
    };
  }

  // Guarda la pieza (si hace falta) y le pone el tick; sin tick solo guarda.
  async function setTick(i, p, tick) {
    setBusy(true);
    setError('');
    const key = keyOf(i, p.slot);
    try {
      const cur = saved[key];
      if (cur && cur.id) {
        await adminRequest(client, 'crm', { method: 'POST', body: { action: 'creative_tick', id: cur.id, tick } });
        setSaved(s => ({ ...s, [key]: { id: cur.id, tick } }));
      } else {
        const res = await adminRequest(client, 'crm', { method: 'POST', body: bodyFor(p, tick) });
        setSaved(s => ({ ...s, [key]: { id: res.id, tick } }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      await onReload();
    }
  }

  async function saveMany(entries) {
    setBusy(true);
    setError('');
    const next = { ...saved };
    try {
      for (const [i, p] of entries) {
        const res = await adminRequest(client, 'crm', { method: 'POST', body: bodyFor(p, '') });
        next[keyOf(i, p.slot)] = { id: res.id, tick: '' };
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaved(next);
      setBusy(false);
      await onReload();
    }
  }

  async function reset() {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`¿Reiniciar lo aprendido de ${product.name}? Las piezas y tus ticks quedan guardados, pero el generador deja de tenerlos en cuenta.`)) return;
    setBusy(true);
    setError('');
    try {
      await adminRequest(client, 'crm', { method: 'POST', body: { action: 'learning_reset', product: product.slug } });
      await onReload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const all = result ? result.ideas.flatMap((idea, ii) => idea.variants.map(v => [ii, v])) : [];
  const pending = all.filter(([i, v]) => !(saved[keyOf(i, v.slot)] && saved[keyOf(i, v.slot)].id));
  const savedCount = all.length - pending.length;

  return (
    <Card style={{ marginBottom: 28 }}>
      <h2 style={{ fontFamily: DISPLAY, fontSize: '1.4rem', margin: '0 0 6px', color: CREAM }}>Generar piezas</h2>
      <p style={{ margin: '0 0 18px', color: CREAM_85 }}>
        Cada idea sale en 3 variantes: relajada, estándar (la del medio) y alocada. Descargá las que te sirvan y calificá el diseño con ✓ o ✗ para que el generador aprenda lo que te gusta.
      </p>
      <Field label="Producto">
        <select style={inputStyle} value={slug} onChange={e => { setSlug(e.target.value); setResult(null); }}>
          {candidates.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
        </select>
      </Field>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <Field label="Qué querés generar" hint={KIND_HELP[kind]}>
            <select style={inputStyle} value={kind} onChange={e => { setKind(e.target.value); setResult(null); }}>
              {Object.entries(FORMATS).map(([v, f]) => <option key={v} value={v}>{f.label}s</option>)}
            </select>
          </Field>
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <Field label="Cuántas ideas" hint="Cada una trae 3 variantes.">
            <select style={inputStyle} value={count} onChange={e => setCount(Number(e.target.value))}>
              {[1, 2, 3, MAX_PER_RUN].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
        </div>
      </div>
      <Btn kind="primary" disabled={!product} onClick={run}>{result ? 'Generar otras' : 'Generar'}</Btn>

      <LearnedPanel summary={summary} busy={busy} onReset={reset} />

      {error && <Notice kind="error">{error}</Notice>}
      {result && result.issues.length > 0 && (
        <Notice kind="warn">
          A la ficha de {result.product.name} le falta: {result.issues.join(' y ')}. Completalo en Productos → {result.product.name} → “Brief para publicidad” y volvé a generar.
        </Notice>
      )}
      {result && result.ideas.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ margin: 0, color: CREAM_85 }}>{result.ideas.length} {result.ideas.length === 1 ? 'idea' : 'ideas'} · {all.length} piezas · {savedCount} guardadas</p>
            {pending.length > 0 && <Btn disabled={busy} onClick={() => saveMany(pending)}>{busy ? 'Guardando…' : 'Guardar todas en el CRM'}</Btn>}
          </div>
          {result.ideas.map((idea, ii) => (
            <div key={`${seed}-${ii}`} style={{ marginBottom: 26 }}>
              <h3 style={{ margin: '0 0 10px', fontFamily: DISPLAY, fontSize: '1.1rem', color: CREAM, overflowWrap: 'anywhere' }}>
                Idea {ii + 1} · {idea.label}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                {idea.variants.map(p => (
                  <Variant
                    key={p.slot}
                    piece={p}
                    product={result.product}
                    brief={result.brief}
                    adapted={result.adapted}
                    state={saved[keyOf(ii, p.slot)]}
                    busy={busy}
                    onTick={tick => setTick(ii, p, tick)}
                    onSave={() => saveMany([[ii, p]])}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
