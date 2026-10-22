// Aprendizaje de estilos por puntos. Sin IA ni costo por uso: cada pieza guardada
// aporta un puntaje a sus rasgos de diseño (plantilla, fondo, ángulo del mensaje)
// y el generador usa más lo que tiene puntos y evita lo que tiene rojos.
//
// El puntaje de una pieza suma tres señales, cada una entre -1 y 1:
//  · tick: tu gusto visual (verde +1, rojo -1)
//  · verdict: si en la práctica funcionó o no
//  · alcance: alcance (o reproducciones) respecto de la mediana de piezas del mismo tipo

export const TICK_SCORE = { verde: 1, rojo: -1 };
export const VERDICT_SCORE = { funciono: 1, no_funciono: -1 };
const MIN_FOR_REACH = 3;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const reachOf = c => (Number.isFinite(c.reach) ? c.reach : Number.isFinite(c.views) ? c.views : null);

function median(nums) {
  const s = nums.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export const traitsOf = layout => {
  const out = [`tpl:${layout.tpl || 'clasica'}`, `theme:${layout.theme || 'dark'}`];
  if (layout.angle) out.push(`angle:${layout.angle}`);
  return out;
};
export const signatureOf = layout => `${layout.tpl || 'clasica'}|${layout.theme || 'dark'}|${layout.headline}`;

// Piezas de un producto y un tipo que cuentan para aprender.
function relevant(creatives, { slug, kind, since }) {
  const from = since ? new Date(since).getTime() : 0;
  return creatives.filter(c => c.product_slug === slug && c.kind === kind && c.layout
    && (!from || new Date(c.created_at).getTime() >= from));
}

export function scoreOf(c, reachMedian) {
  let score = 0;
  if (c.tick && TICK_SCORE[c.tick]) score += TICK_SCORE[c.tick];
  if (c.verdict && VERDICT_SCORE[c.verdict]) score += VERDICT_SCORE[c.verdict];
  const r = reachOf(c);
  if (reachMedian && r !== null) score += clamp(r / reachMedian - 1, -1, 1);
  return score;
}

// Resume qué se aprendió: puntaje por rasgo y por pieza exacta, y cuánto se usó cada plantilla.
export function learn(creatives, { slug, kind, since }) {
  const rows = relevant(creatives, { slug, kind, since });
  const reaches = rows.filter(c => c.status === 'publicado').map(reachOf).filter(n => n !== null && n > 0);
  const med = reaches.length >= MIN_FOR_REACH ? median(reaches) : 0;
  const traits = new Map();
  const signatures = new Map();
  const used = new Map();
  let rated = 0;
  for (const c of rows) {
    used.set(c.layout.tpl || 'clasica', (used.get(c.layout.tpl || 'clasica') || 0) + 1);
    const reach = c.status === 'publicado' ? c : { ...c, reach: null, views: null };
    const score = scoreOf(reach, med);
    if (score === 0) continue;
    rated += 1;
    for (const t of traitsOf(c.layout)) {
      const cur = traits.get(t) || { sum: 0, n: 0 };
      traits.set(t, { sum: cur.sum + score, n: cur.n + 1 });
    }
    const sig = signatureOf(c.layout);
    signatures.set(sig, (signatures.get(sig) || 0) + score);
  }
  return { traits, signatures, used, rated };
}

// Peso multiplicativo de un rasgo: 1 sin datos, sube con verdes y baja con rojos.
export function traitWeight(learned, trait) {
  const t = learned.traits.get(trait);
  return t ? Math.exp(t.sum / (t.n + 1)) : 1;
}

export function candidateWeight(learned, layout) {
  return traitsOf(layout).reduce((w, t) => w * traitWeight(learned, t), 1);
}

// Una pieza exacta con puntaje total <= -1 no se vuelve a proponer.
export const isBlocked = (learned, layout) => (learned.signatures.get(signatureOf(layout)) || 0) <= -1;

export const EMPTY = { traits: new Map(), signatures: new Map(), used: new Map(), rated: 0 };

const LABELS = {
  tpl: { clasica: 'plantilla clásica', aireada: 'plantilla aireada', minimal: 'plantilla minimal', cartel: 'plantilla cartel', bloques: 'plantilla de bloques', diagonal: 'plantilla diagonal' },
  theme: { dark: 'fondo oscuro', accent: 'fondo de color', light: 'fondo claro' },
  angle: { dolor: 'mensajes de dolor → solución', beneficio: 'mensajes de un beneficio', como: 'mensajes de cómo funciona', 'para-quien': 'mensajes de para quién es', 'todo-en-uno': 'mensajes todo en uno' },
};
export function labelOf(trait) {
  const [k, v] = trait.split(':');
  return (LABELS[k] && LABELS[k][v]) || trait;
}

// Para mostrar en el panel: qué le gusta y qué evita (con al menos una pieza calificada).
export function summarize(learned) {
  const rows = [...learned.traits.entries()].map(([trait, { sum, n }]) => ({ trait, label: labelOf(trait), avg: sum / n, n }));
  return {
    rated: learned.rated,
    likes: rows.filter(r => r.avg > 0.2).sort((a, b) => b.avg - a.avg).slice(0, 4),
    dislikes: rows.filter(r => r.avg < -0.2).sort((a, b) => a.avg - b.avg).slice(0, 4),
  };
}
