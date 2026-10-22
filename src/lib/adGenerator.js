// Creador de posts. Funciones puras: sin red, sin costo por uso.
//
// Cada idea es un CONCEPTO distinto: a quién le habla (un cliente del mapa de dolor)
// × qué tipo de mensaje usa (agitar el dolor, la promesa, romper una objeción…).
// Es lo que pide Andromeda, el sistema de Meta que elige qué anuncio mostrar:
// piezas que se ven o se sienten parecidas cuentan como una sola, así que la
// variedad tiene que estar en el mensaje, no solo en el diseño.
// Cada concepto sale en 3 versiones de diseño (relajada, estándar, alocada) con el
// mismo texto, más el texto del posteo, 3 a 5 hashtags y un prompt para Claude.
// El estilo se ajusta con lo que aprendió de los ticks y resultados (adLearning).
//
// Regla de oro: solo usa los textos de la ficha del producto (brief y mapa de
// dolor). No inventa funciones, precios, números ni testimonios. Si falta algo,
// avisa qué falta en vez de rellenar.

import { EMPTY, candidateWeight, isBlocked, learn, summarize, traitWeight } from './adLearning';

export const FORMATS = {
  post: { w: 1080, h: 1350, label: 'Post' },
  historia: { w: 1080, h: 1920, label: 'Historia' },
  video: { w: 1080, h: 1920, label: 'Video' },
};
export const THEMES = ['dark', 'accent', 'light'];
// Cuántas ideas (cada una con 3 variantes) se generan como máximo por vez.
export const MAX_PER_RUN = 5;
// Estilos: la del medio es la estándar, a los costados una más tranquila y una más atrevida.
export const SLOTS = ['relajada', 'estandar', 'alocada'];
export const SLOT_LABELS = { relajada: 'Relajada', estandar: 'Estándar', alocada: 'Alocada' };
export const TEMPLATE_GROUPS = {
  relajada: ['aireada', 'minimal', 'marco', 'tipografico'],
  estandar: ['clasica', 'tarjeta', 'columna'],
  alocada: ['cartel', 'bloques', 'diagonal', 'circulo', 'franjas'],
};
// Plantillas extra del estilo visual "náutico" (Keelwise): solo se usan en productos con ese motivo.
export const NAUTICO_GROUPS = {
  relajada: ['arco', 'brujula', 'ancla', 'velero'],
  estandar: ['dividido'],
  alocada: ['plano', 'condensada', 'pixel'],
};
export const TEMPLATES = [...Object.values(TEMPLATE_GROUPS).flat(), ...Object.values(NAUTICO_GROUPS).flat()];
export const groupsFor = motif => (motif === 'nautico'
  ? Object.fromEntries(SLOTS.map(s => [s, [...TEMPLATE_GROUPS[s], ...NAUTICO_GROUPS[s]]]))
  : TEMPLATE_GROUPS);
export const groupOf = tpl => SLOTS.find(s => TEMPLATE_GROUPS[s].includes(tpl) || NAUTICO_GROUPS[s].includes(tpl)) || 'estandar';

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
    motif: p.motif === 'nautico' ? 'nautico' : '',
    map: painMapOf(p),
  };
}

const one = v => (typeof v === 'string' ? v.trim() : '');
// Mapa de dolor guardado en la ficha. `index` es la posición original del cliente:
// es la que queda guardada en cada pieza para medir por concepto.
export function painMapOf(p) {
  const raw = p && p.pain_map && typeof p.pain_map === 'object' && !Array.isArray(p.pain_map) ? p.pain_map : {};
  const list = Array.isArray(raw.personas) ? raw.personas.slice(0, 4) : [];
  const personas = list
    .map((x, index) => (x && typeof x === 'object' ? {
      index, name: one(x.name), pain: one(x.pain), promise: one(x.promise), proof: one(x.proof), objection: one(x.objection), answer: one(x.answer),
    } : null))
    .filter(x => x && x.name);
  return { personas, belief: one(raw.belief), story: one(raw.story), math: one(raw.math) };
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

const lc = s => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const forWhom = name => `Para ${lc(name)}`;
const firstSentence = text => (String(text).match(/^[^.!?\n]+[.!?]?/) || [''])[0].trim();
const without = (list, ...drop) => list.filter(x => !drop.includes(x));
const listText = items => items.map(x => `• ${x}`).join('\n');

// Tipos de mensaje. `persona: true` → uno por cada cliente del mapa que tenga el dato.
// `stage` ordena la línea: primero el problema, después la salida, al final la confianza.
// `body` arma el desarrollo del texto del posteo (los párrafos entre el gancho y el llamado).
export const CONCEPTS = [
  {
    id: 'dolor', label: 'Agitar el dolor', stage: 1, persona: true,
    about: 'Nombra el problema con las palabras del cliente y recién después muestra la salida.',
    needs: 'el dolor de al menos un cliente',
    ok: (b, p) => Boolean(p.pain),
    build: (b, p) => {
      const sub = p.promise || b.tagline;
      const rest = without(b.benefits, sub).slice(0, 3);
      return { headline: p.pain, sub, bullets: rest, body: [sub, listText(rest)] };
    },
  },
  {
    id: 'promesa', label: 'La promesa', stage: 2, persona: true,
    about: 'Arranca por el resultado que se lleva el cliente.',
    needs: 'la promesa para al menos un cliente',
    ok: (b, p) => Boolean(p.promise),
    build: (b, p) => {
      const rest = without(b.benefits, p.promise).slice(0, 3);
      return { headline: p.promise, sub: forWhom(p.name), bullets: rest, body: [`${forWhom(p.name)}.`, listText(rest)] };
    },
  },
  {
    id: 'objecion', label: 'Romper una objeción', stage: 3, persona: true,
    about: 'Dice en voz alta la duda que frena la compra y la responde.',
    needs: 'una objeción con su respuesta en algún cliente',
    ok: (b, p) => Boolean(p.objection && p.answer),
    build: (b, p) => ({ headline: p.objection, sub: p.answer, bullets: [], body: [p.answer, p.promise] }),
  },
  {
    id: 'prueba', label: 'Prueba real', stage: 3, persona: true,
    about: 'Muestra algo verificable: un caso, un número real, una captura. Nunca algo inventado.',
    needs: 'una prueba real (un caso, un dato verificable) en algún cliente',
    ok: (b, p) => Boolean(p.proof),
    build: (b, p) => ({ headline: p.proof, sub: p.promise || b.tagline, bullets: [], body: [p.promise || b.tagline] }),
  },
  {
    id: 'como', label: 'Cómo funciona', stage: 2, persona: false,
    about: 'Muestra el producto en acción: qué hace, paso a paso.',
    needs: 'al menos 2 funciones en la ficha',
    ok: b => b.features.length >= 2,
    build: b => ({ headline: 'Así funciona', sub: b.tagline, bullets: b.features.slice(0, 4), body: [b.tagline, listText(b.features.slice(0, 5))] }),
  },
  {
    id: 'contra', label: 'Contra la corriente', stage: 1, persona: false,
    about: 'Discute algo que todos dan por cierto en el rubro.',
    needs: '“lo que discutís” en el mapa de dolor',
    ok: b => Boolean(b.map.belief),
    build: b => {
      const rest = b.benefits.slice(0, 2);
      return { headline: b.map.belief, sub: b.tagline, bullets: rest, body: [b.tagline, listText(rest)] };
    },
  },
  {
    id: 'cuenta', label: 'La cuenta', stage: 2, persona: false,
    about: 'Hace la cuenta de plata o de tiempo, con números reales.',
    needs: '“la cuenta” en el mapa de dolor',
    ok: b => Boolean(b.map.math),
    build: b => {
      const rest = b.benefits.slice(0, 2);
      return { headline: b.map.math, sub: b.tagline, bullets: rest, body: [b.tagline, listText(rest)] };
    },
  },
  {
    id: 'fundador', label: 'Por qué lo hicimos', stage: 3, persona: false,
    about: 'Cuenta en primera persona por qué existe el producto.',
    needs: '“tu historia” en el mapa de dolor',
    ok: b => Boolean(b.map.story),
    build: b => ({ headline: `Por qué hicimos ${b.name}`, sub: firstSentence(b.map.story), bullets: [], body: [b.map.story] }),
  },
];

// Sin mapa de dolor: los ángulos de siempre, armados con el brief.
export const ANGLES = [
  {
    id: 'dolor', label: 'Dolor → solución', stage: 1,
    ok: b => b.pains.length > 0,
    build: (b, n) => {
      const sub = b.tagline || b.benefits[0];
      const rest = b.benefits.slice(0, 3);
      return { headline: b.pains[n % b.pains.length], sub, bullets: rest, body: [sub, listText(without(rest, sub))] };
    },
  },
  {
    id: 'beneficio', label: 'Un beneficio', stage: 2,
    ok: b => b.benefits.length > 0,
    build: (b, n) => {
      const i = n % b.benefits.length;
      const rest = b.benefits.filter((_, k) => k !== i).slice(0, 3);
      return { headline: b.benefits[i], sub: b.tagline, bullets: rest, body: [b.tagline, listText(rest)] };
    },
  },
  {
    id: 'como', label: 'Cómo funciona', stage: 2,
    ok: b => b.features.length >= 2,
    build: b => ({ headline: 'Así funciona', sub: b.tagline, bullets: b.features.slice(0, 4), body: [b.tagline, listText(b.features.slice(0, 5))] }),
  },
  {
    id: 'para-quien', label: 'Para quién es', stage: 1,
    ok: b => Boolean(b.audience),
    build: (b, n) => {
      const sub = b.benefits[n % b.benefits.length];
      return { headline: `Hecho para ${lc(b.audience)}`, sub, bullets: [], body: [sub] };
    },
  },
  {
    id: 'todo-en-uno', label: 'Todo en uno', stage: 3,
    ok: b => Boolean(b.tagline),
    build: b => {
      const sub = b.audience ? forWhom(b.audience) : '';
      return { headline: b.tagline, sub, bullets: b.benefits.slice(0, 3), body: [sub && `${sub}.`, listText(b.benefits.slice(0, 3))] };
    },
  },
];
const CONCEPT_BY_ID = Object.fromEntries([...ANGLES, ...CONCEPTS].map(c => [c.id, c]));
export const conceptLabel = id => (CONCEPT_BY_ID[id] && CONCEPT_BY_ID[id].label) || id;
// Código corto para medir por concepto: tipo de mensaje + cliente (si le habla a uno).
export const conceptCode = layout => (layout && layout.angle
  ? `${layout.angle}${Number.isInteger(layout.persona) ? `-c${layout.persona + 1}` : ''}`
  : '');

// Todos los conceptos que se pueden armar con lo que hay en la ficha, y los que no
// (con lo que falta para destrabarlos).
export function conceptsFor(brief) {
  const usesMap = brief.map.personas.length > 0;
  const types = usesMap ? CONCEPTS : [...ANGLES, ...CONCEPTS.filter(c => !c.persona && c.id !== 'como')];
  const available = [];
  const locked = [];
  for (const c of types) {
    const options = c.persona
      ? brief.map.personas.filter(p => c.ok(brief, p)).map(p => ({ concept: c, persona: p }))
      : (c.ok(brief) ? [{ concept: c, persona: null }] : []);
    if (options.length) available.push(...options);
    else if (c.needs) locked.push({ id: c.id, label: c.label, needs: c.needs });
  }
  return { usesMap, available, locked };
}

// Contenido de una idea (el mismo texto para sus 3 variantes de diseño).
function contentFor(brief, option, n) {
  const raw = option.concept.build(brief, option.persona || n, n);
  const headline = clip(raw.headline, 120);
  return {
    headline,
    sub: clip(raw.sub, 200),
    bullets: (raw.bullets || []).filter(Boolean).slice(0, 4).map(x => clip(x, 90)),
    cta: clip(brief.cta, 80),
    angle: option.concept.id,
    persona: option.persona ? option.persona.index : null,
    body: (raw.body || []).filter(x => x && x !== headline),
  };
}

function layoutOf(content, slot, tpl, theme) {
  const { body, ...rest } = content;
  void body;
  const bullets = slot === 'estandar' ? rest.bullets : rest.bullets.slice(0, 2);
  return { ...rest, bullets, tpl, theme, vibe: slot };
}

// Texto del posteo armado con reglas: gancho (lo que dice la imagen) → desarrollo → llamado.
export function captionFor(content) {
  const parts = [content.headline, ...content.body];
  if (content.cta) parts.push(`→ ${content.cta}`);
  return clip([...new Set(parts.filter(Boolean))].join('\n\n'), 2200);
}

// Hashtags: Instagram acepta hasta 5 por post y no suben el alcance; sirven para que se
// entienda de qué trata. Del listado de la ficha queda siempre el de la marca y el
// resto rota entre ideas para no publicar siempre los mismos.
export const MAX_HASHTAGS = 5;
export function hashtagPool(text) {
  const tags = String(text || '').split(/[\s,;]+/).map(t => t.replace(/^#+/, '')).filter(t => /^[\p{L}\p{N}_]{2,40}$/u.test(t));
  const seen = new Set();
  return tags.filter(t => (seen.has(t.toLowerCase()) ? false : seen.add(t.toLowerCase()))).map(t => `#${t}`);
}
export function hashtagsFor(brief, i = 0) {
  const pool = hashtagPool(brief.hashtags);
  if (pool.length <= MAX_HASHTAGS) return pool.join(' ');
  const key = slugOf(brief.name).replace(/-/g, '');
  const plain = t => t.slice(1).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const brand = pool.filter(t => key && plain(t).includes(key)).slice(0, 1);
  const rest = pool.filter(t => !brand.includes(t));
  const room = MAX_HASHTAGS - brand.length;
  const start = (i * room) % rest.length;
  const picked = [...rest.slice(start), ...rest.slice(0, start)].slice(0, room);
  return [...brand, ...picked].join(' ');
}

const slugOf = s => String(s || 'pieza').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'pieza';

const VIDEO_STYLE = {
  relajada: {
    look: 'Estilo tranquilo y limpio: mucho aire, tipografía liviana, un solo movimiento por escena.',
    motion: 'Transiciones lentas de 0,6 s con fundido suave (ease-in-out); cada texto entra con un leve desplazamiento y sale antes de la siguiente escena.',
  },
  estandar: {
    look: 'Estilo claro y directo.',
    motion: 'Transiciones de 0,3 s con ease-out; cada texto entra animado y sale antes de la siguiente escena.',
  },
  alocada: {
    look: 'Estilo atrevido y cinético: texto gigante, formas geométricas, rotaciones y marcadores de color; energía alta pero siempre legible.',
    motion: 'Cortes rápidos de 0,2 s con rebote (overshoot), zooms y giros de texto, formas que barren la pantalla y glitch leve; el texto se mantiene al menos 1,5 s en pantalla.',
  },
};

// Prompt listo para pegar en Claude Code y producir el video en motion graphics.
export function videoPrompt(brief, layout, index = 1) {
  const style = VIDEO_STYLE[groupOf(layout.tpl)] || VIDEO_STYLE.estandar;
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
    style.look,
    brief.audience ? `Público: ${brief.audience}.` : '',
    '',
    'Escenas (el texto en pantalla es exacto, no lo cambies ni agregues otros):',
    ...scenes,
    '',
    'Reglas:',
    '- Texto grande y legible en un celular; nada de texto en los 250 px de arriba ni en los 340 px de abajo (zona tapada por la interfaz).',
    `- ${style.motion}`,
    '- No inventes funciones, precios, números ni testimonios: usá solo los textos de arriba.',
    '',
    `Entrega: guardá el resultado como ./salida/${slugOf(brief.name)}-video-${index}-${layout.vibe || 'estandar'}.mp4 y decime la ruta. Usá tu skill de motion graphics si la tenés instalada; si no, Remotion, o HTML + CSS renderizado con Playwright y ffmpeg.`,
  ].filter((l, i, a) => !(l === '' && (a[i - 1] === '' || a[i - 1] === undefined))).join('\n');
}

// Prompt para pegar en Claude (el chat) y que escriba el texto del posteo con más
// trabajo que las reglas. Lleva solo el material de la ficha y prohíbe inventar.
export function copyPrompt(brief, idea) {
  const c = CONCEPT_BY_ID[idea.angle] || {};
  const p = Number.isInteger(idea.persona) ? brief.map.personas.find(x => x.index === idea.persona) : null;
  const pool = hashtagPool(brief.hashtags);
  const material = [
    p && p.pain && `- Dolor del cliente: ${p.pain}`,
    p && p.promise && `- Lo que le prometemos: ${p.promise}`,
    p && p.proof && `- Prueba real: ${p.proof}`,
    p && p.objection && `- Objeción que pone: ${p.objection}`,
    p && p.answer && `- Cómo la respondemos: ${p.answer}`,
    !p && brief.pains.length > 0 && `- Dolores: ${brief.pains.join(' / ')}`,
    brief.benefits.length > 0 && `- Beneficios: ${brief.benefits.join(' / ')}`,
    (idea.angle === 'como' || brief.features.length > 0) && brief.features.length > 0 && `- Funciones: ${brief.features.join(' / ')}`,
    idea.angle === 'contra' && brief.map.belief && `- Lo que discutimos: ${brief.map.belief}`,
    idea.angle === 'cuenta' && brief.map.math && `- La cuenta: ${brief.map.math}`,
    idea.angle === 'fundador' && brief.map.story && `- Nuestra historia: ${brief.map.story}`,
    brief.cta && `- Llamado a la acción: ${brief.cta}`,
  ].filter(Boolean);
  const who = p ? lc(p.name) : brief.audience;
  return [
    `Escribí el texto (caption) de un post de Instagram para “${brief.name}”${brief.tagline ? `: ${brief.tagline}` : ''}.`,
    '',
    `Tipo de mensaje: ${c.label || idea.angle}. ${c.about || ''}`.trim(),
    who ? `Le hablás a: ${who}.` : '',
    `Tono: ${brief.tone || 'directo y cercano'}. Español rioplatense, con voseo.`,
    '',
    'Material (es todo lo que sabés del producto):',
    ...material,
    '',
    `La imagen del post ya dice: “${idea.layout.headline}”${idea.layout.sub ? ` / “${idea.layout.sub}”` : ''}. El texto tiene que sumar, no repetir la imagen palabra por palabra.`,
    '',
    'Estructura:',
    '1. Gancho: una línea que se entienda sin ver la imagen.',
    '2. Desarrollo: 2 a 4 líneas cortas.',
    '3. Cierre con el llamado a la acción.',
    '',
    'Reglas:',
    '- No inventes funciones, números, precios, plazos, testimonios ni resultados: usá solo el material de arriba.',
    '- Máximo 600 caracteres sin contar los hashtags. Como mucho un emoji.',
    pool.length ? `- Al final, como mucho ${MAX_HASHTAGS} hashtags elegidos de esta lista: ${pool.join(' ')}` : '- Sin hashtags.',
    '',
    'Dame 3 versiones bien distintas entre sí (que no arranquen igual).',
  ].filter((l, i, a) => !(l === '' && (a[i - 1] === '' || a[i - 1] === undefined))).join('\n');
}

// La línea: los conceptos de una tanda ordenados de problema → salida → confianza,
// repartidos en lunes, miércoles y viernes.
export const PLAN_DAYS = ['lunes', 'miércoles', 'viernes'];
export const planSlot = i => `Semana ${Math.floor(i / PLAN_DAYS.length) + 1} · ${PLAN_DAYS[i % PLAN_DAYS.length]}`;

// Elige `n` conceptos sin repetir la combinación tipo × cliente mientras queden: pasa
// por los tipos de mensaje (los que mejor anduvieron, más arriba), salta los que ya no
// tienen combinaciones nuevas y, dentro de cada tipo, toma el cliente menos usado.
// Solo repite cuando no queda ninguna combinación sin usar.
function pickConcepts(available, n, learned, rand) {
  const types = weightedOrder([...new Set(available.map(o => o.concept))], c => traitWeight(learned, `angle:${c.id}`), rand);
  const used = new Set();
  const personaUse = new Map();
  const keyOf = o => `${o.concept.id}|${o.persona ? o.persona.index : ''}`;
  const useOf = o => (o.persona ? personaUse.get(o.persona.index) || 0 : 0);
  const picked = [];
  let cursor = 0;
  while (picked.length < n) {
    const anyFresh = available.some(o => !used.has(keyOf(o)));
    let type = null;
    for (let k = 0; k < types.length; k += 1) {
      const t = types[(cursor + k) % types.length];
      if (!anyFresh || available.some(o => o.concept === t && !used.has(keyOf(o)))) {
        type = t;
        cursor = (cursor + k + 1) % types.length;
        break;
      }
    }
    const options = available.filter(o => o.concept === type);
    const fresh = options.filter(o => !used.has(keyOf(o)));
    const pool = fresh.length ? fresh : options;
    const least = Math.min(...pool.map(useOf));
    const choices = pool.filter(o => useOf(o) === least);
    const choice = choices[Math.floor(rand() * choices.length)];
    const repeat = used.has(keyOf(choice));
    used.add(keyOf(choice));
    if (choice.persona) personaUse.set(choice.persona.index, useOf(choice) + 1);
    picked.push({ ...choice, round: repeat ? picked.filter(x => keyOf(x) === keyOf(choice)).length : 0 });
  }
  // La línea: alterna problema → salida → confianza (cada etapa en el orden elegido).
  const stages = [1, 2, 3].map(st => picked.filter(o => o.concept.stage === st));
  const line = [];
  while (line.length < picked.length) for (const st of stages) if (st.length) line.push(st.shift());
  return line;
}

// Elige un elemento según su peso (mayor peso, más probable).
function weightedPick(items, weightOf, rand) {
  const ws = items.map(weightOf);
  let r = rand() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i += 1) {
    r -= ws[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// Ordena con probabilidad proporcional al peso (muestreo sin reposición).
function weightedOrder(items, weightOf, rand) {
  return items
    .map(item => ({ item, key: rand() ** (1 / weightOf(item)) }))
    .sort((a, b) => b.key - a.key)
    .map(x => x.item);
}

// Decide plantilla y fondo de las 3 variantes de una idea. `batch` recuerda lo ya usado
// en esta tanda para que las ideas no repitan plantilla (mientras queden sin usar) y
// varíen el fondo.
function pickStyles(content, learned, rand, batch, groups) {
  const usedTimes = tpl => learned.used.get(tpl) || 0;
  const options = (tpls, themes, slot) => {
    const all = tpls.flatMap(tpl => themes.map(theme => ({ tpl, theme, layout: layoutOf(content, slot, tpl, theme) })));
    const free = all.filter(o => !isBlocked(learned, o.layout));
    return free.length ? free : all;
  };
  const fresh = tpls => {
    const left = tpls.filter(t => !batch.tpls.has(t));
    return left.length ? left : tpls;
  };
  const themeRepeat = o => 0.5 ** (batch.themes.get(o.theme) || 0);

  // Estándar: una de las plantillas base, salvo que ya haya un estilo claramente preferido.
  const everything = options(Object.values(groups).flat(), THEMES, 'estandar');
  const best = everything.reduce((m, o) => (candidateWeight(learned, o.layout) > candidateWeight(learned, m.layout) ? o : m), everything[0]);
  const adapted = candidateWeight(learned, best.layout) > 1.15;
  const standard = adapted
    ? best
    : weightedPick(options(fresh(groups.estandar), THEMES, 'estandar'), o => candidateWeight(learned, o.layout) * themeRepeat(o), rand);

  const novelty = o => 1 / (1 + usedTimes(o.tpl) * 0.5);
  const calm = weightedPick(
    options(fresh(groups.relajada).filter(t => t !== standard.tpl), ['dark', 'light'], 'relajada'),
    o => candidateWeight(learned, o.layout) * novelty(o) * themeRepeat(o) * (o.theme === standard.theme ? 1 : 1.4),
    rand,
  );
  const wild = weightedPick(
    options(fresh(groups.alocada).filter(t => t !== standard.tpl), THEMES, 'alocada'),
    o => candidateWeight(learned, o.layout) * novelty(o) ** 2 * themeRepeat(o) * (o.theme === standard.theme ? 1 : 1.6),
    rand,
  );
  for (const o of [standard, calm, wild]) {
    batch.tpls.add(o.tpl);
    batch.themes.set(o.theme, (batch.themes.get(o.theme) || 0) + 1);
  }
  return { adapted, styles: { relajada: calm, estandar: standard, alocada: wild } };
}

// Genera `count` conceptos, cada uno con 3 variantes de diseño (relajada, estándar,
// alocada), del tipo `kind` ('post' | 'historia' | 'video'). `seed` permite regenerar
// una tanda distinta. `creatives` y `since` son las piezas guardadas y la fecha desde
// la que se aprende.
export function generatePieces(product, { kind, count = 2, seed = 1, creatives = [], since = null }) {
  if (!FORMATS[kind]) throw new Error('Tipo de pieza inválido');
  const brief = briefOf(product);
  const issues = briefIssues(brief);
  const { usesMap, available, locked } = conceptsFor(brief);
  const empty = { brief, issues, ideas: [], pieces: [], learned: summarize(EMPTY), adapted: false, usesMap, locked };
  if (issues.length || available.length === 0) return { ...empty, issues: issues.length ? issues : ['al menos un dolor o un beneficio'] };

  const learned = learn(creatives, { slug: product.slug, kind, since });
  const n = Math.max(1, Math.min(MAX_PER_RUN, Math.floor(count) || 1));
  const rand = rng(seed);
  const chosen = pickConcepts(available, n, learned, rand);
  // Qué dolor o beneficio de la ficha usa cada ángulo: cambia con la semilla.
  const offset = (seed >>> 0) % 9973;
  const ideas = [];
  const groups = groupsFor(brief.motif);
  const batch = { tpls: new Set(), themes: new Map() };
  let adaptedAny = false;
  chosen.forEach((option, i) => {
    const content = contentFor(brief, option, offset + i + option.round);
    const { adapted, styles } = pickStyles(content, learned, rand, batch, groups);
    adaptedAny = adaptedAny || adapted;
    const label = option.concept.label;
    const personaName = option.persona ? option.persona.name : '';
    const plan = planSlot(i);
    const caption = captionFor(content);
    const hashtags = hashtagsFor(brief, i);
    const variants = SLOTS.map(slot => {
      const layout = styles[slot].layout;
      const size = FORMATS[kind];
      const who = personaName ? ` Le habla a: ${lc(personaName)}.` : '';
      return {
        slot,
        kind,
        angle: option.concept.id,
        title: clip(`${FORMATS[kind].label} · ${SLOT_LABELS[slot]} · ${label}: ${layout.headline}`, 120),
        concept: kind === 'video'
          ? `Concepto: ${label}.${who} Video vertical de motion graphics, estilo ${SLOT_LABELS[slot].toLowerCase()}. Gancho: “${layout.headline}”. Día sugerido: ${plan}.`
          : `Concepto: ${label}.${who} ${size.label} ${size.w}×${size.h}, estilo ${SLOT_LABELS[slot].toLowerCase()} (${layout.tpl}), fondo ${layout.theme === 'dark' ? 'oscuro' : layout.theme === 'light' ? 'claro' : 'de color'}. Día sugerido: ${plan}.`,
        caption,
        hashtags,
        layout,
        prompt: kind === 'video' ? videoPrompt(brief, layout, i + 1) : '',
      };
    });
    const idea = { angle: option.concept.id, label, persona: content.persona, personaName, plan, code: conceptCode(content), about: option.concept.about || '', caption, hashtags, variants };
    idea.copyPrompt = kind === 'historia' ? '' : copyPrompt(brief, { ...idea, layout: variants[1].layout });
    ideas.push(idea);
  });
  return { brief, issues: [], ideas, pieces: ideas.flatMap(i => i.variants), learned: summarize(learned), adapted: adaptedAny, usesMap, locked };
}
