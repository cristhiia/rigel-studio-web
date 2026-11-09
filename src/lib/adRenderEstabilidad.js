// Plantilla "Estabilidad" (Keelwise): la identidad del video A llevada a posts e historias.
// Fondo papel, tipografía Fraunces en azul marino, marca con la quilla arriba, línea de
// agua calma abajo, un dibujo náutico (ancla, brújula, timón, faro o velero) y el
// llamado a la acción en una píldora. Todas las piezas comparten las mismas líneas;
// lo único que cambia es el dibujo. Los textos salen siempre del layout (del brief).
import { drawLines, measureWith, wrapLines } from './adRenderKit';

export const SERIF_BRAND = '"Fraunces", Georgia, "Times New Roman", serif';
const NAVY = '#0F2557';
const PAPER = '#FAFAF7';
const WATER = '#D9EBF6';

export const DRAWINGS = ['ancla', 'brujula', 'timon', 'faro', 'velero'];
export const DRAWING_LABEL = { ancla: 'ancla', brujula: 'brújula', timon: 'timón', faro: 'faro', velero: 'velero' };
const SLOT_ORDER = { relajada: 0, estandar: 1, alocada: 2 };

// Qué dibujo lleva una pieza: depende del titular y del estilo, así las 3 variantes de
// una idea llevan dibujos distintos y las ideas de una tanda no repiten siempre el mismo.
export function drawingOf(layout) {
  let h = 0;
  for (const ch of String((layout && layout.headline) || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return DRAWINGS[(h + (SLOT_ORDER[layout && layout.vibe] || 0)) % DRAWINGS.length];
}

function stroke(ctx, width = 9) {
  ctx.strokeStyle = NAVY;
  ctx.fillStyle = NAVY;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

// Cada dibujo usa el centro (cx, cy) y el radio r. Devuelve cuánto se apoya sobre el agua.
const SHAPES = {
  ancla(ctx, cx, cy, r) {
    stroke(ctx);
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.78, r * 0.2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.58); ctx.lineTo(cx, cy + r * 0.95); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r * 0.36, cy - r * 0.32); ctx.lineTo(cx + r * 0.36, cy - r * 0.32); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.86, cy + r * 0.18);
    ctx.quadraticCurveTo(cx - r * 0.72, cy + r * 0.97, cx, cy + r * 0.97);
    ctx.quadraticCurveTo(cx + r * 0.72, cy + r * 0.97, cx + r * 0.86, cy + r * 0.18);
    ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * r * 0.86, cy + r * 0.18);
      ctx.lineTo(cx + s * r * 0.64, cy + r * 0.3);
      ctx.moveTo(cx + s * r * 0.86, cy + r * 0.18);
      ctx.lineTo(cx + s * r * 1.04, cy + r * 0.32);
      ctx.stroke();
    }
    return { lift: r * 1.0 + 16 };
  },
  brujula(ctx, cx, cy, r) {
    stroke(ctx);
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.74, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 8;
    for (let k = 0; k < 4; k += 1) {
      const a = (k * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.sin(a) * r * 0.74, cy - Math.cos(a) * r * 0.74);
      ctx.lineTo(cx + Math.sin(a) * r * 0.6, cy - Math.cos(a) * r * 0.6);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.56); ctx.lineTo(cx + r * 0.15, cy); ctx.lineTo(cx, cy + r * 0.1); ctx.lineTo(cx - r * 0.15, cy); ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.56); ctx.lineTo(cx + r * 0.15, cy); ctx.lineTo(cx, cy + r * 0.1); ctx.lineTo(cx - r * 0.15, cy); ctx.closePath();
    ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.05, 0, Math.PI * 2); ctx.fillStyle = PAPER; ctx.fill();
    return { lift: r * 0.92 + 16 };
  },
  timon(ctx, cx, cy, r) {
    stroke(ctx);
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.17, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 8; k += 1) {
      const a = (k * Math.PI) / 4;
      const dx = Math.sin(a); const dy = -Math.cos(a);
      ctx.beginPath(); ctx.moveTo(cx + dx * r * 0.17, cy + dy * r * 0.17); ctx.lineTo(cx + dx * r * 0.98, cy + dy * r * 0.98); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + dx * r * 1.0, cy + dy * r * 1.0, r * 0.075, 0, Math.PI * 2); ctx.fill();
    }
    return { lift: r * 1.08 + 16 };
  },
  faro(ctx, cx, cy, r) {
    stroke(ctx);
    const top = cy - r * 0.3; const base = cy + r;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.34, base); ctx.lineTo(cx + r * 0.34, base); ctx.lineTo(cx + r * 0.19, top); ctx.lineTo(cx - r * 0.19, top); ctx.closePath();
    ctx.stroke();
    for (const [a, b] of [[0.18, 0.4], [0.62, 0.84]]) {
      const y1 = top + (base - top) * a; const y2 = top + (base - top) * b;
      const hw = (y) => r * (0.19 + 0.15 * ((y - top) / (base - top)));
      ctx.beginPath(); ctx.moveTo(cx - hw(y1), y1); ctx.lineTo(cx + hw(y1), y1); ctx.lineTo(cx + hw(y2), y2); ctx.lineTo(cx - hw(y2), y2); ctx.closePath(); ctx.fill();
    }
    ctx.beginPath(); ctx.rect(cx - r * 0.2, cy - r * 0.62, r * 0.4, r * 0.32); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r * 0.28, cy - r * 0.62); ctx.lineTo(cx, cy - r * 0.92); ctx.lineTo(cx + r * 0.28, cy - r * 0.62); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 6;
    for (const s of [-1, 1]) {
      for (const dy of [-0.08, 0.1]) {
        ctx.beginPath(); ctx.moveTo(cx + s * r * 0.32, cy - r * 0.46 + dy * r); ctx.lineTo(cx + s * r * 0.78, cy - r * 0.46 + dy * r * 3); ctx.stroke();
      }
    }
    return { lift: 0 };
  },
  velero(ctx, cx, cy, r) {
    stroke(ctx);
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.85, cy + r * 0.45); ctx.lineTo(cx + r * 0.85, cy + r * 0.45); ctx.lineTo(cx + r * 0.5, cy + r * 0.82); ctx.lineTo(cx - r * 0.5, cy + r * 0.82); ctx.closePath();
    ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.45); ctx.lineTo(cx, cy - r * 0.95); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + r * 0.08, cy - r * 0.9); ctx.lineTo(cx + r * 0.08, cy + r * 0.34); ctx.lineTo(cx + r * 0.8, cy + r * 0.34); ctx.closePath();
    ctx.fillStyle = WATER; ctx.fill(); ctx.stroke();
    ctx.fillStyle = NAVY;
    ctx.beginPath(); ctx.moveTo(cx - r * 0.08, cy - r * 0.6); ctx.lineTo(cx - r * 0.08, cy + r * 0.34); ctx.lineTo(cx - r * 0.62, cy + r * 0.34); ctx.closePath(); ctx.fill();
    return { lift: r * 0.82 - 10 };
  },
};

function keel(ctx, x, y, h) {
  ctx.fillStyle = NAVY;
  ctx.beginPath(); ctx.moveTo(x + h * 0.36, y); ctx.lineTo(x + h * 0.72, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
}

function fitSerif(ctx, text, maxW, maxLines, start, min, maxH) {
  for (let size = start; size >= min; size -= 4) {
    ctx.font = `500 ${size}px ${SERIF_BRAND}`;
    const ls = wrapLines(measureWith(ctx), text, maxW);
    const widest = Math.max(0, ...ls.map(l => ctx.measureText(l).width));
    if (ls.length <= maxLines && widest <= maxW && ls.length * size * 1.12 <= maxH) return { size, ls };
  }
  ctx.font = `500 ${min}px ${SERIF_BRAND}`;
  return { size: min, ls: wrapLines(measureWith(ctx), text, maxW).slice(0, maxLines) };
}

function estabilidad(c) {
  const { ctx, layout, name, w, h, pad, top, bottom, maxW } = c;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  const tall = h > 1500;

  // Marca arriba, con la quilla.
  keel(ctx, pad, top, 44);
  ctx.fillStyle = NAVY;
  ctx.font = `600 52px ${SERIF_BRAND}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(name, pad + 62, top + 40);

  // Línea de agua calma.
  const yW = bottom;
  const wave = x => yW + 9 * Math.sin(x / 120) + 4 * Math.sin(x / 47);
  ctx.beginPath();
  ctx.moveTo(0, wave(0));
  for (let x = 6; x <= w; x += 6) ctx.lineTo(x, wave(x));
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.fillStyle = WATER; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, wave(0));
  for (let x = 6; x <= w; x += 6) ctx.lineTo(x, wave(x));
  ctx.strokeStyle = NAVY; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke();

  // Dibujo apoyado sobre el agua, a la derecha.
  const R = tall ? 120 : 104;
  const shape = SHAPES[drawingOf(layout)] || SHAPES.ancla;
  const dcx = w - pad - R * 1.05;
  const probe = shape(ctx, -9999, -9999, R);
  const dcy = yW - probe.lift - R * (drawingOf(layout) === 'faro' ? 1 : 0);
  shape(ctx, dcx, dcy, R);

  // Llamado a la acción en píldora, a la izquierda sobre el agua.
  let ceiling = yW - R * 2 - 70;
  if (layout.cta) {
    ctx.font = `600 40px ${SERIF_BRAND}`;
    const pw = Math.min(dcx - R - pad - 24, ctx.measureText(layout.cta).width + 88);
    const ph = 96;
    const py = yW - ph - 56;
    ctx.fillStyle = NAVY;
    ctx.beginPath(); ctx.roundRect(pad, py, pw, ph, ph / 2); ctx.fill();
    ctx.fillStyle = PAPER;
    ctx.textAlign = 'center';
    ctx.fillText(layout.cta, pad + pw / 2, py + ph * 0.66);
    ctx.textAlign = 'left';
    ceiling = Math.min(ceiling, py - 48);
  }

  // Titular en Fraunces; la última palabra va en cursiva, como en el video.
  const area = ceiling - (top + 120);
  const { size, ls } = fitSerif(ctx, layout.headline, maxW, tall ? 7 : 6, tall ? 108 : 96, 48, area);
  const lineH = Math.round(size * 1.12);
  let y = top + 120 + size;
  ctx.fillStyle = NAVY;
  const last = ls.length - 1;
  ls.forEach((line, i) => {
    if (i !== last) { ctx.font = `500 ${size}px ${SERIF_BRAND}`; ctx.fillText(line, pad, y); y += lineH; return; }
    const parts = line.split(' ');
    const lastWord = parts.pop();
    ctx.font = `500 ${size}px ${SERIF_BRAND}`;
    const head = parts.length ? `${parts.join(' ')} ` : '';
    ctx.fillText(head, pad, y);
    const hw = ctx.measureText(head).width;
    ctx.font = `italic 400 ${size}px ${SERIF_BRAND}`;
    ctx.fillText(lastWord, pad + hw, y);
    y += lineH;
  });

  // Bajada y puntos, solo si entran sobre el llamado a la acción.
  if (layout.sub) {
    ctx.font = `400 ${tall ? 44 : 40}px ${SERIF_BRAND}`;
    ctx.globalAlpha = 0.85;
    y += 10;
    for (const l of wrapLines(measureWith(ctx), layout.sub, maxW).slice(0, 3)) {
      if (y + 56 > ceiling) break;
      ctx.fillText(l, pad, y + 30); y += 56;
    }
    ctx.globalAlpha = 1;
  }
  if (layout.bullets && layout.bullets.length) {
    ctx.font = `500 ${tall ? 42 : 38}px ${SERIF_BRAND}`;
    y += 24;
    for (const b of layout.bullets) {
      const bl = wrapLines(measureWith(ctx), b, maxW - 56).slice(0, 2);
      if (y + bl.length * 52 > ceiling) break;
      keel(ctx, pad, y + 2, 28);
      ctx.fillStyle = NAVY;
      y = drawLines(ctx, bl, pad + 48, y + 28, 52) + 14;
    }
  }
}

export const ESTABILIDAD_DRAW = { estabilidad };
