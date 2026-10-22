// Herramientas compartidas por las plantillas de dibujo: medición y ajuste de texto,
// paletas y fuentes.
export const FONT = '"Space Grotesk", "Inter", "Helvetica Neue", Arial, sans-serif';

// Parte `text` en líneas que entran en `maxWidth` según la función `measure`.
export function wrapLines(measure, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const out = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && measure(test) > maxWidth) { out.push(line); line = word; } else line = test;
  }
  if (line) out.push(line);
  return out;
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Texto oscuro sobre fondos medios y claros (contraste mínimo 4,5:1 con negro desde L = 0,18).
export const onColor = hex => (luminance(hex) > 0.18 ? '#0A0E1A' : '#F6F1E7');

export function paletteFor(layout, accent, bg) {
  if (layout.theme === 'accent') {
    const fg = onColor(accent);
    return { bg: accent, fg, mark: fg, pillBg: fg, pillFg: accent };
  }
  if (layout.theme === 'light') return { bg: '#F6F1E7', fg: '#0A0E1A', mark: accent, pillBg: bg, pillFg: onColor(bg) };
  return { bg, fg: onColor(bg), mark: accent, pillBg: accent, pillFg: onColor(accent) };
}

// Color de los bloques / marcadores de las plantillas atrevidas y su texto.
export function blockPalette(layout, accent, bg) {
  const pal = paletteFor(layout, accent, bg);
  const block = layout.theme === 'accent' ? pal.fg : accent;
  return { block, onBlock: onColor(block) };
}

export const measureWith = ctx => t => ctx.measureText(t).width;

// Ajusta el tamaño de letra del titular hasta que entre en `maxLines`, que ninguna
// palabra se pase del ancho y (si se da `maxHeight`) que el bloque entre en alto.
export function fitHeadline(ctx, text, maxWidth, maxLines, start, min, weight = 700, step = 4, { maxHeight = Infinity, lh = 1.12 } = {}) {
  const attempt = size => {
    ctx.font = `${weight} ${size}px ${FONT}`;
    const ls = wrapLines(measureWith(ctx), text, maxWidth);
    const widest = Math.max(0, ...ls.map(l => ctx.measureText(l).width));
    return { size, ls, ok: ls.length <= maxLines && widest <= maxWidth && ls.length * size * lh <= maxHeight };
  };
  for (let size = start; size >= min; size -= step) {
    const r = attempt(size);
    if (r.ok) return r;
  }
  // Último recurso: bajar de a poco por debajo del mínimo hasta que no se pase del ancho.
  for (let size = min - 2; size >= 32; size -= 2) {
    const r = attempt(size);
    if (r.ok) return r;
  }
  const r = attempt(min);
  return { size: min, ls: r.ls.slice(0, maxLines) };
}

// Puntos que entran completos en `maxLines` líneas (nunca se corta una frase a la mitad).
export function wholeBullets(ctx, bullets, maxWidth, maxLines = 2, limit = 4) {
  return bullets
    .map(b => wrapLines(measureWith(ctx), b, maxWidth))
    .filter(ls => ls.length <= maxLines)
    .slice(0, limit);
}

// Dibuja líneas de texto una debajo de otra; devuelve la próxima y.
export function drawLines(ctx, lines, x, y, lineH, align = 'left') {
  ctx.textAlign = align;
  for (const l of lines) { ctx.fillText(l, x, y); y += lineH; }
  ctx.textAlign = 'left';
  return y;
}

export function pill(ctx, text, x, y, { bg, fg, maxW, size = 40, h = 100, center = false }) {
  ctx.font = `700 ${size}px ${FONT}`;
  const tw = ctx.measureText(text).width;
  const pw = Math.min(maxW, tw + 96);
  const px = center ? x - pw / 2 : x;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(px, y, pw, h, h / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.fillText(text, px + (pw - tw) / 2, y + h * 0.64);
  return pw;
}


export const SERIF = 'Georgia, "Times New Roman", serif';
export const CONDENSED = 'Anton, Impact, "Arial Narrow", sans-serif';
export const SCRIPT = 'Allura, "Segoe Script", "Brush Script MT", cursive';
export const PIXEL = '"Press Start 2P", "Courier New", monospace';
export const good = (a, b, min = 3) => contrast(a, b) >= min;

// Las fuentes se cargan bajo demanda: hay que esperarlas antes de dibujar en el canvas.
export async function ensureFonts() {
  if (typeof document === 'undefined' || !document.fonts) return;
  const wanted = ['500 40px "Space Grotesk"', '700 40px "Space Grotesk"', '400 40px "Inter"', '40px Anton', '40px Allura', '16px "Press Start 2P"'];
  await Promise.all(wanted.map(f => document.fonts.load(f, 'AaÁáñ¿').catch(() => {})));
}

// Texto con separación entre letras (no depende de ctx.letterSpacing, que no está en todos los navegadores).
export function measureSpaced(ctx, text, spacing) {
  let total = 0;
  for (const ch of text) total += ctx.measureText(ch).width + spacing;
  return Math.max(0, total - spacing);
}
export function drawSpaced(ctx, text, x, y, spacing, align = 'left') {
  const total = measureSpaced(ctx, text, spacing);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = prev;
  return total;
}
// Parte en líneas considerando la separación entre letras.
export function wrapSpaced(ctx, text, spacing, maxWidth) {
  return wrapLines(t => measureSpaced(ctx, t, spacing), text, maxWidth);
}

// Generador pseudoaleatorio con semilla, para que la vista previa y la descarga dibujen igual.
export function seeded(text) {
  let a = 2166136261;
  for (let i = 0; i < String(text).length; i += 1) a = Math.imul(a ^ String(text).charCodeAt(i), 16777619);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Estrella de cuatro puntas (la de Rigel).
export function sparkle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.closePath();
  ctx.fill();
}
