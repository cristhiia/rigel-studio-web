// Generador de piezas de publicidad. Funciones puras: sin red, sin costo por uso.
//
// Regla de oro: solo usa los textos del brief del producto (público, dolores,
// beneficios, funciones, llamado a la acción). No inventa funciones, precios,
// números ni testimonios. Si el brief es pobre, avisa qué falta en vez de rellenar.

export const FORMATS = {
  post: { w: 1080, h: 1350, label: 'Post' },
  historia: { w: 1080, h: 1920, label: 'Historia' },
  video: { w: 1080, h: 1920, label: 'Video' },
};
export const THEMES = ['dark', 'accent', 'light'];
export const MAX_PER_RUN = 10;

const lines = text => String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
const clip = (text, max) => {
  const t = String(text || '').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, '')}…`;
};

export function briefOf(p) {
  return {
    slug: p.slug,
    name: p.name,
    tagline: (p.tagline || '').trim(),
    audience: (p.audience || '').trim(),
    pains: lines(p.pains),
    benefits: lines(p.benefits),
    features: lines(p.features),
    cta: (p.cta || '').trim(),
    tone: (p.tone || '').trim(),
    hashtags: (p.hashtags || '').trim(),
    accent: /^#[0-9a-f]{6}$/i.test(p.accent || '') ? p.accent : '#E8B04B',
    bg: /^#[0-9a-f]{6}$/i.test(p.bg || '') ? p.bg : '#0A0E1A',
  };
}

// Qué le falta al brief para poder generar algo que valga la pena.
export function briefIssues(brief) {
  const issues = [];
  if (brief.benefits.length < 2) issues.push('al menos 2 beneficios');
  if (!brief.cta) issues.push('el llamado a la acción (ej. “Probalo gratis”)');
  return issues;
}

// Generador pseudoaleatorio con semilla: la misma semilla da las mismas piezas.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled(list, rand) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Cada ángulo arma el contenido de una pieza a partir del brief. `n` rota qué
// dolor o beneficio se usa para que las piezas de una tanda no se repitan.
const ANGLES = [
  {
    id: 'dolor',
    label: 'Dolor → solución',
    ok: b => b.pains.length > 0,
    build: (b, n) => ({
      headline: b.pains[n % b.pains.length],
      sub: b.tagline || b.benefits[0],
      bullets: b.benefits.slice(0, 3),
    }),
  },
  {
    id: 'beneficio',
    label: 'Un beneficio',
    ok: b => b.benefits.length > 0,
    build: (b, n) => {
      const i = n % b.benefits.length;
      return {
        headline: b.benefits[i],
        sub: b.tagline,
        bullets: b.benefits.filter((_, k) => k !== i).slice(0, 3),
      };
    },
  },
  {
    id: 'como',
    label: 'Cómo funciona',
    ok: b => b.features.length >= 2,
    build: b => ({ headline: 'Así funciona', sub: b.tagline, bullets: b.features.slice(0, 4) }),
  },
  {
    id: 'para-quien',
    label: 'Para quién es',
    ok: b => Boolean(b.audience),
    build: (b, n) => ({
      headline: `Hecho para ${b.audience.charAt(0).toLowerCase()}${b.audience.slice(1)}`,
      sub: b.benefits[n % b.benefits.length],
      bullets: [],
    }),
  },
  {
    id: 'todo-en-uno',
    label: 'Todo en uno',
    ok: b => Boolean(b.tagline),
    build: b => ({ headline: b.tagline, sub: b.audience ? `Para ${b.audience.charAt(0).toLowerCase()}${b.audience.slice(1)}` : '', bullets: b.benefits.slice(0, 3) }),
  },
];

function layoutFor(brief, angle, n, theme) {
  const raw = angle.build(brief, n);
  return {
    headline: clip(raw.headline, 120),
    sub: clip(raw.sub, 200),
    bullets: (raw.bullets || []).slice(0, 4).map(x => clip(x, 90)),
    cta: clip(brief.cta, 80),
    theme,
  };
}

function captionFor(layout) {
  const parts = [layout.headline];
  if (layout.sub) parts.push(layout.sub);
  if (layout.bullets.length) parts.push(layout.bullets.map(b => `• ${b}`).join('\n'));
  if (layout.cta) parts.push(`→ ${layout.cta}`);
  return clip(parts.join('\n\n'), 2200);
}

const slugOf = s => String(s || 'pieza').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'pieza';

// Prompt listo para pegar en Claude Code y producir el video en motion graphics.
export function videoPrompt(brief, layout, index = 1) {
  const items = [layout.headline, ...layout.bullets];
  const sceneSecs = 3;
  let t = 0;
  const scenes = items.map((text, i) => {
    const from = t;
    t += i === 0 ? 3 : sceneSecs;
    return `${i + 1}. ${from}–${t} s · ${i === 0 ? 'Gancho' : 'Punto'}: “${text}”`;
  });
  const closeFrom = t;
  t += 3;
  scenes.push(`${items.length + 1}. ${closeFrom}–${t} s · Cierre: “${brief.name}”${layout.cta ? ` y debajo “${layout.cta}”` : ''}`);
  const dark = layout.theme !== 'light';
  const bg = layout.theme === 'accent' ? brief.accent : dark ? brief.bg : '#F6F1E7';
  const fg = layout.theme === 'accent' ? brief.bg : dark ? '#F6F1E7' : brief.bg;
  const accent = layout.theme === 'accent' ? brief.bg : brief.accent;
  return [
    `Hacé un video vertical de ${t} segundos para Reels / TikTok / Historias de “${brief.name}”.`,
    '',
    'Formato: 1080×1920 (9:16), 30 fps, MP4 H.264. Es motion graphics: texto y formas animadas. Sin voz, sin música con derechos, sin imágenes de stock ni caras.',
    `Identidad: fondo ${bg}, texto ${fg}, acento ${accent}. Tipografía sans-serif gruesa (Space Grotesk o Inter).${brief.tone ? ` Tono: ${brief.tone}.` : ''}`,
    brief.audience ? `Público: ${brief.audience}.` : '',
    '',
    'Escenas (el texto en pantalla es exacto, no lo cambies ni agregues otros):',
    ...scenes,
    '',
    'Reglas:',
    '- Texto grande y legible en un celular; nada de texto en los 250 px de arriba ni en los 340 px de abajo (zona tapada por la interfaz).',
    '- Transiciones de 0,3 s con ease-out; cada texto entra animado y sale antes de la siguiente escena.',
    '- No inventes funciones, precios, números ni testimonios: usá solo los textos de arriba.',
    '',
    `Entrega: guardá el resultado como ./salida/${slugOf(brief.name)}-video-${index}.mp4 y decime la ruta. Usá tu skill de motion graphics si la tenés instalada; si no, Remotion, o HTML + CSS renderizado con Playwright y ffmpeg.`,
  ].filter((l, i, a) => !(l === '' && (a[i - 1] === '' || a[i - 1] === undefined))).join('\n');
}

// Genera `count` piezas del tipo `kind` ('post' | 'historia' | 'video').
// `seed` permite regenerar una tanda distinta.
export function generatePieces(product, { kind, count = 5, seed = 1 }) {
  if (!FORMATS[kind]) throw new Error('Tipo de pieza inválido');
  const brief = briefOf(product);
  const issues = briefIssues(brief);
  if (issues.length) return { brief, issues, pieces: [] };

  const n = Math.max(1, Math.min(MAX_PER_RUN, Math.floor(count) || 1));
  const rand = rng(seed);
  const angles = ANGLES.filter(a => a.ok(brief));
  const order = shuffled(angles, rand);
  const themeStart = Math.floor(rand() * THEMES.length);
  const pieces = [];
  for (let i = 0; i < n; i += 1) {
    const angle = order[i % order.length];
    const round = Math.floor(i / order.length);
    const layout = layoutFor(brief, angle, i + round, THEMES[(themeStart + i) % THEMES.length]);
    const prompt = kind === 'video' ? videoPrompt(brief, layout, i + 1) : '';
    const size = FORMATS[kind];
    pieces.push({
      kind,
      angle: angle.id,
      title: clip(`${FORMATS[kind].label} · ${angle.label}: ${layout.headline}`, 120),
      concept: kind === 'video'
        ? `Video vertical de motion graphics. Ángulo: ${angle.label}. Gancho: “${layout.headline}”.`
        : `${size.label} ${size.w}×${size.h}, fondo ${layout.theme === 'dark' ? 'oscuro' : layout.theme === 'light' ? 'claro' : 'de color'}. Ángulo: ${angle.label}.`,
      caption: captionFor(layout),
      hashtags: brief.hashtags,
      layout,
      prompt,
    });
  }
  return { brief, issues: [], pieces };
}
