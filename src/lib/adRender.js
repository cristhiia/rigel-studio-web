// Dibuja un post o una historia en un <canvas> a partir del layout de la pieza
// (titular, bajada, puntos, llamado a la acción) y los colores del producto.
import { FORMATS } from './adGenerator';

const FONT = '"Space Grotesk", "Inter", "Helvetica Neue", Arial, sans-serif';

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

// Texto oscuro sobre fondos medios y claros (contraste mínimo 4,5:1 con negro desde L = 0,18).
const onColor = hex => (luminance(hex) > 0.18 ? '#0A0E1A' : '#F6F1E7');

export function paletteFor(layout, accent, bg) {
  if (layout.theme === 'accent') {
    const fg = onColor(accent);
    return { bg: accent, fg, mark: fg, pillBg: fg, pillFg: accent };
  }
  if (layout.theme === 'light') return { bg: '#F6F1E7', fg: '#0A0E1A', mark: accent, pillBg: bg, pillFg: onColor(bg) };
  return { bg, fg: onColor(bg), mark: accent, pillBg: accent, pillFg: onColor(accent) };
}

// Ajusta el tamaño de letra del titular hasta que entre en `maxLines`.
function fitHeadline(ctx, text, maxWidth, maxLines, start, min) {
  for (let size = start; size >= min; size -= 4) {
    ctx.font = `700 ${size}px ${FONT}`;
    const ls = wrapLines(w => ctx.measureText(w).width, text, maxWidth);
    if (ls.length <= maxLines) return { size, ls };
  }
  ctx.font = `700 ${min}px ${FONT}`;
  return { size: min, ls: wrapLines(w => ctx.measureText(w).width, text, maxWidth).slice(0, maxLines) };
}

export function renderAd(canvas, { layout, name, accent, bg, format = 'post' }) {
  const { w, h } = FORMATS[format] || FORMATS.post;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const pal = paletteFor(layout, accent, bg);
  const pad = 96;
  // En historias, la interfaz tapa ~250 px arriba y ~340 px abajo.
  const top = format === 'historia' ? 260 : 110;
  const bottom = h - (format === 'historia' ? 360 : 110);
  const maxW = w - pad * 2;

  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = 'alphabetic';

  // Marca: puntito de acento + nombre.
  ctx.fillStyle = pal.mark;
  ctx.beginPath();
  ctx.arc(pad + 14, top + 14, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.fg;
  ctx.font = `600 38px ${FONT}`;
  ctx.fillText(name, pad + 46, top + 28);

  // CTA abajo (se dibuja primero para saber cuánto espacio queda).
  let ctaTop = bottom;
  if (layout.cta) {
    ctx.font = `700 40px ${FONT}`;
    const tw = ctx.measureText(layout.cta).width;
    const pw = Math.min(maxW, tw + 96);
    const ph = 100;
    ctaTop = bottom - ph;
    ctx.fillStyle = pal.pillBg;
    ctx.beginPath();
    ctx.roundRect(pad, ctaTop, pw, ph, 50);
    ctx.fill();
    ctx.fillStyle = pal.pillFg;
    ctx.fillText(layout.cta, pad + (pw - tw) / 2, ctaTop + 64);
  }

  // Titular, bajada y puntos en el espacio del medio.
  const hasBullets = layout.bullets.length > 0;
  const { size, ls } = fitHeadline(ctx, layout.headline, maxW, format === 'historia' ? 7 : 6, format === 'historia' ? 104 : 96, 52);
  const lineH = Math.round(size * 1.12);
  let y = top + 150 + size;
  ctx.fillStyle = pal.fg;
  ctx.font = `700 ${size}px ${FONT}`;
  for (const l of ls) { ctx.fillText(l, pad, y); y += lineH; }

  if (layout.sub) {
    y += 8;
    ctx.font = `400 42px ${FONT}`;
    ctx.globalAlpha = 0.9;
    for (const l of wrapLines(t => ctx.measureText(t).width, layout.sub, maxW).slice(0, 3)) { ctx.fillText(l, pad, y + 30); y += 56; }
    ctx.globalAlpha = 1;
  }

  if (hasBullets) {
    y += 48;
    ctx.font = `500 40px ${FONT}`;
    for (const b of layout.bullets) {
      const bl = wrapLines(t => ctx.measureText(t).width, b, maxW - 56).slice(0, 2);
      if (y + bl.length * 52 > ctaTop - 40) break;
      ctx.fillStyle = pal.mark;
      ctx.beginPath();
      ctx.arc(pad + 12, y + 14, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.fg;
      for (const l of bl) { ctx.fillText(l, pad + 48, y + 28); y += 52; }
      y += 22;
    }
  }
}

export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('No se pudo crear la imagen'))), 'image/png');
  });
}

export async function downloadAd(spec, filename) {
  const canvas = document.createElement('canvas');
  renderAd(canvas, spec);
  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
