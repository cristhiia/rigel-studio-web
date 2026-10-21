import React, { useEffect, useRef, useState } from 'react';
import { adminRequest } from '../../lib/adminAuth';
import { FORMATS, MAX_PER_RUN, generatePieces } from '../../lib/adGenerator';
import { downloadAd, renderAd } from '../../lib/adRender';
import { CREAM, CREAM_85, DISPLAY } from '../../components/ui/pageStyles';
import { Btn, Card, Field, Notice, inputStyle } from './adminUi';
import { LINE } from './AdminShell';

// Generador: elegís producto, tipo y cantidad y arma las piezas al instante a
// partir del brief del producto (sin costo por uso, sin conexión a redes).
//  · Post / Historia → imagen PNG lista para descargar.
//  · Video → prompt para pegar en Claude Code y producir el motion graphics.

const KIND_HELP = {
  post: 'Imagen 1080×1350 para el feed.',
  historia: 'Imagen 1080×1920 con márgenes seguros para historias.',
  video: 'Prompt para Claude Code que arma un video vertical en motion graphics.',
};

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
      renderAd(ref.current, { layout: piece.layout, name: product.name, accent: brief.accent, bg: brief.bg, format: piece.kind });
    }
  }, [piece, product.name, brief.accent, brief.bg]);
  const { w, h } = FORMATS[piece.kind];
  return <canvas ref={ref} width={w} height={h} role="img" aria-label={piece.title} style={{ width: '100%', maxWidth: 260, height: 'auto', borderRadius: 10, border: `1px solid ${LINE}`, display: 'block' }} />;
}

function GeneratedPiece({ piece, product, brief, saved, busy, onSave }) {
  const [copied, copy] = useCopy();
  const slug = product.slug;
  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        {piece.kind !== 'video' && <Preview piece={piece} product={product} brief={brief} />}
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 8px', fontFamily: DISPLAY, fontSize: '1.1rem', overflowWrap: 'anywhere' }}>{piece.title}</h3>
          {piece.kind === 'video' ? (
            <textarea readOnly aria-label="Prompt para Claude Code" value={piece.prompt} style={{ ...inputStyle, minHeight: 230, lineHeight: 1.45, fontSize: '0.9rem' }} onFocus={e => e.target.select()} />
          ) : (
            <p style={{ margin: '0 0 10px', whiteSpace: 'pre-wrap', color: CREAM_85, overflowWrap: 'anywhere' }}>{piece.caption}</p>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {piece.kind === 'video'
              ? <Btn kind="primary" onClick={() => copy('p', piece.prompt)}>{copied === 'p' ? 'Copiado ✓' : 'Copiar prompt'}</Btn>
              : <Btn kind="primary" onClick={() => downloadAd({ layout: piece.layout, name: product.name, accent: brief.accent, bg: brief.bg, format: piece.kind }, `${slug}-${piece.kind}-${piece.angle}.png`)}>Descargar imagen</Btn>}
            {piece.kind !== 'video' && <Btn onClick={() => copy('t', [piece.caption, piece.hashtags].filter(Boolean).join('\n\n'))}>{copied === 't' ? 'Copiado ✓' : 'Copiar texto'}</Btn>}
            <Btn disabled={busy || saved} onClick={onSave}>{saved ? 'Guardada ✓' : 'Guardar en el CRM'}</Btn>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Generator({ client, crm, onReload, initialProduct = '' }) {
  const candidates = crm.products.filter(p => p.status !== 'archivado');
  const [slug, setSlug] = useState(initialProduct || (candidates[0] && candidates[0].slug) || '');
  const [kind, setKind] = useState('post');
  const [count, setCount] = useState(5);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6) + 1);
  const [result, setResult] = useState(null);
  const [savedIdx, setSavedIdx] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const product = crm.products.find(p => p.slug === slug);

  function generate(nextSeed) {
    if (!product) return;
    setError('');
    setSavedIdx(new Set());
    setResult({ product, ...generatePieces(product, { kind, count, seed: nextSeed }) });
  }

  function run() {
    const s = Math.floor(Math.random() * 1e6) + 1;
    setSeed(s);
    generate(s);
  }

  async function save(indexes) {
    if (!result) return;
    setBusy(true);
    setError('');
    const done = new Set(savedIdx);
    try {
      for (const i of indexes) {
        const p = result.pieces[i];
        await adminRequest(client, 'crm', {
          method: 'POST',
          body: {
            action: 'creative_save', product: result.product.slug, kind: p.kind, title: p.title, concept: p.concept,
            caption: p.caption, hashtags: p.hashtags, status: 'listo', layout: p.layout, prompt: p.prompt,
          },
        });
        done.add(i);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSavedIdx(done);
      setBusy(false);
      await onReload();
    }
  }

  const pending = result ? result.pieces.map((_, i) => i).filter(i => !savedIdx.has(i)) : [];

  return (
    <Card style={{ marginBottom: 28 }}>
      <h2 style={{ fontFamily: DISPLAY, fontSize: '1.4rem', margin: '0 0 6px', color: CREAM }}>Generar piezas</h2>
      <p style={{ margin: '0 0 18px', color: CREAM_85 }}>
        Elegí el producto y el tipo, y se arman al instante con el brief de la ficha. Cambian cada vez que apretás Generar.
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
          <Field label="Cuántas">
            <select style={inputStyle} value={count} onChange={e => setCount(Number(e.target.value))}>
              {[1, 3, 5, 8, MAX_PER_RUN].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
        </div>
      </div>
      <Btn kind="primary" disabled={!product} onClick={run}>{result ? 'Generar otras' : 'Generar'}</Btn>

      {error && <Notice kind="error">{error}</Notice>}
      {result && result.issues.length > 0 && (
        <Notice kind="warn">
          A la ficha de {result.product.name} le falta: {result.issues.join(' y ')}. Completalo en Productos → {result.product.name} → “Brief para publicidad” y volvé a generar.
        </Notice>
      )}
      {result && result.pieces.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ margin: 0, color: CREAM_85 }}>{result.pieces.length} piezas generadas · {savedIdx.size} guardadas</p>
            {pending.length > 0 && <Btn disabled={busy} onClick={() => save(pending)}>{busy ? 'Guardando…' : 'Guardar todas en el CRM'}</Btn>}
          </div>
          {result.pieces.map((p, i) => (
            <GeneratedPiece key={`${seed}-${i}`} piece={p} product={result.product} brief={result.brief} saved={savedIdx.has(i)} busy={busy} onSave={() => save([i])} />
          ))}
        </div>
      )}
    </Card>
  );
}
