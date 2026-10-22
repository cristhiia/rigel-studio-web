// Dibuja un post o una historia en un <canvas> a partir del layout de la pieza
// (titular, bajada, puntos, llamado a la acción, plantilla y tema) y los colores
// del producto. Cada plantilla es una función que recibe el contexto ya preparado.
import { FORMATS } from './adGenerator';
import {
  FONT, SERIF, blockPalette, contrast, drawLines, ensureFonts, fitHeadline, good, measureWith, paletteFor, pill, wholeBullets, wrapLines,
} from './adRenderKit';
import { NAUTICO_DRAW } from './adRenderNautico';

export { blockPalette, ensureFonts, paletteFor, wrapLines };

// ── Plantillas ─────────────────────────────────────────────────────────────
// c = { ctx, layout, pal, bp, name, w, h, pad, top, bottom, maxW }

// Estándar: marca arriba, titular a la izquierda, bajada, puntos y botón abajo.
function clasica(c) {
  const { ctx, layout, pal, name, w, h, pad, top, bottom, maxW } = c;
  ctx.fillStyle = pal.mark;
  ctx.beginPath();
  ctx.arc(pad + 14, top + 14, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.fg;
  ctx.font = `600 38px ${FONT}`;
  ctx.fillText(name, pad + 46, top + 28);

  let ctaTop = bottom;
  if (layout.cta) {
    ctaTop = bottom - 100;
    pill(ctx, layout.cta, pad, ctaTop, { bg: pal.pillBg, fg: pal.pillFg, maxW });
  }

  const tall = h > 1500;
  const { size, ls } = fitHeadline(ctx, layout.headline, maxW, tall ? 7 : 6, tall ? 104 : 96, 52);
  const lineH = Math.round(size * 1.12);
  let y = top + 150 + size;
  ctx.fillStyle = pal.fg;
  ctx.font = `700 ${size}px ${FONT}`;
  y = drawLines(ctx, ls, pad, y, lineH);

  if (layout.sub) {
    y += 8;
    ctx.font = `400 42px ${FONT}`;
    ctx.globalAlpha = 0.9;
    for (const l of wrapLines(measureWith(ctx), layout.sub, maxW).slice(0, 3)) { ctx.fillText(l, pad, y + 30); y += 56; }
    ctx.globalAlpha = 1;
  }

  if (layout.bullets.length) {
    y += 48;
    ctx.font = `500 40px ${FONT}`;
    for (const b of layout.bullets) {
      const bl = wrapLines(measureWith(ctx), b, maxW - 56).slice(0, 2);
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

// Relajada: todo centrado, mucho aire, letra liviana y el llamado como texto.
function aireada(c) {
  const { ctx, layout, pal, name, w, top, bottom, maxW } = c;
  const cx = w / 2;
  ctx.fillStyle = pal.fg;
  ctx.globalAlpha = 0.75;
  ctx.font = `500 30px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(name.toUpperCase().split('').join(' '), cx, top + 30);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';

  // Se arma de abajo hacia arriba para centrar el bloque en el espacio libre.
  const innerW = maxW - 80;
  const { size, ls } = fitHeadline(ctx, layout.headline, innerW, 5, 84, 48, 500);
  const lineH = Math.round(size * 1.25);
  const subLines = layout.sub ? (ctx.font = `400 40px ${FONT}`, wrapLines(measureWith(ctx), layout.sub, innerW).slice(0, 3)) : [];
  ctx.font = `500 36px ${FONT}`;
  const bullets = wholeBullets(ctx, layout.bullets, innerW, 2, 2);
  const bulletLines = bullets.reduce((n, ls) => n + ls.length, 0);
  const blockH = 24 + size + (ls.length - 1) * lineH + (subLines.length ? 56 + subLines.length * 54 : 0) + (bullets.length ? 36 + bulletLines * 48 + (bullets.length - 1) * 16 : 0);
  const ctaH = layout.cta ? 130 : 0;
  const free = bottom - (top + 90) - ctaH;
  let y = top + 90 + Math.max(0, (free - blockH) / 2);

  ctx.fillStyle = pal.mark;
  ctx.fillRect(cx - 40, y, 80, 5);
  y += 24 + size;
  ctx.fillStyle = pal.fg;
  ctx.font = `500 ${size}px ${FONT}`;
  y = drawLines(ctx, ls, cx, y, lineH, 'center') - lineH;
  if (subLines.length) {
    ctx.font = `400 40px ${FONT}`;
    ctx.globalAlpha = 0.8;
    y = drawLines(ctx, subLines, cx, y + 80, 54, 'center') - 54;
    ctx.globalAlpha = 1;
  }
  if (bullets.length) {
    ctx.font = `500 36px ${FONT}`;
    ctx.globalAlpha = 0.9;
    y += 24;
    for (const bl of bullets) {
      y = drawLines(ctx, bl, cx, y + 48, 48, 'center') - 48 + 16;
    }
    ctx.globalAlpha = 1;
  }
  if (layout.cta) {
    ctx.font = `600 40px ${FONT}`;
    const t = `${layout.cta} →`;
    const tw = Math.min(ctx.measureText(t).width, maxW);
    ctx.fillStyle = contrast(pal.mark, pal.bg) >= 4.5 ? pal.mark : pal.fg;
    ctx.textAlign = 'center';
    ctx.fillText(t, cx, bottom - 40, maxW);
    ctx.fillStyle = pal.mark;
    ctx.fillRect(cx - tw / 2, bottom - 22, tw, 4);
    ctx.textAlign = 'left';
  }
}

// Relajada: poco texto, titular abajo a la izquierda y un círculo suave de fondo.
function minimal(c) {
  const { ctx, layout, pal, name, w, h, pad, top, bottom, maxW } = c;
  ctx.fillStyle = pal.mark;
  ctx.globalAlpha = 0.16;
  ctx.beginPath();
  ctx.arc(w - 120, top + (bottom - top) * 0.32, w * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = pal.fg;
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText(name, pad, top + 30);
  ctx.fillStyle = pal.mark;
  ctx.fillRect(pad, top + 52, 56, 5);

  let ctaTop = bottom;
  if (layout.cta) {
    ctx.font = `600 38px ${FONT}`;
    const tw = ctx.measureText(layout.cta).width;
    const pw = Math.min(maxW, tw + 80);
    ctaTop = bottom - 84;
    ctx.strokeStyle = pal.fg;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(pad, ctaTop, pw, 84, 42);
    ctx.stroke();
    ctx.fillStyle = pal.fg;
    ctx.fillText(layout.cta, pad + (pw - tw) / 2, ctaTop + 54);
  }

  const sub = layout.sub ? (ctx.font = `400 40px ${FONT}`, wrapLines(measureWith(ctx), layout.sub, maxW).slice(0, 2)) : [];
  const { size, ls } = fitHeadline(ctx, layout.headline, maxW, 5, h > 1500 ? 100 : 92, 52, 600);
  const lineH = Math.round(size * 1.15);
  const blockH = ls.length * lineH + (sub.length ? 24 + sub.length * 54 : 0);
  let y = ctaTop - 100 - blockH + size;
  ctx.fillStyle = pal.fg;
  ctx.font = `600 ${size}px ${FONT}`;
  y = drawLines(ctx, ls, pad, y, lineH);
  if (sub.length) {
    ctx.font = `400 40px ${FONT}`;
    ctx.globalAlpha = 0.8;
    drawLines(ctx, sub, pad, y + 14, 54);
    ctx.globalAlpha = 1;
  }
}

// Alocada: titular en mayúsculas que ocupa todo el ancho, franja y sticker inclinado.
function cartel(c) {
  const { ctx, layout, pal, name, w, pad, top, bottom, maxW } = c;
  ctx.fillStyle = pal.mark;
  ctx.fillRect(0, 0, w, 36);

  ctx.fillStyle = pal.fg;
  ctx.font = `800 36px ${FONT}`;
  ctx.fillText(name.toUpperCase(), pad, top + 20);

  const text = layout.headline.toUpperCase();
  const room = bottom - (layout.cta ? 120 : 0) - (top + 70) - (layout.sub ? 150 : 40);
  const { size, ls } = fitHeadline(ctx, text, maxW, 6, 168, 64, 800, 6, { maxHeight: room, lh: 0.96 });
  const lineH = Math.round(size * 0.96);
  let y = top + 70 + size;
  ctx.font = `800 ${size}px ${FONT}`;
  ls.forEach((l, i) => {
    ctx.fillStyle = i === ls.length - 1 && ls.length > 1 && contrast(pal.mark, pal.bg) >= 3 ? pal.mark : pal.fg;
    ctx.fillText(l, pad, y);
    y += lineH;
  });

  ctx.fillStyle = pal.fg;
  let ctaTop = bottom;
  if (layout.cta) ctaTop = bottom - 120;
  if (layout.sub) {
    ctx.font = `600 44px ${FONT}`;
    for (const l of wrapLines(measureWith(ctx), layout.sub, maxW).slice(0, 2)) {
      if (y + 20 > ctaTop - 150) break;
      ctx.fillText(l, pad, y + 24);
      y += 58;
    }
  }
  ctx.font = `600 38px ${FONT}`;
  for (const bl of wholeBullets(ctx, layout.bullets, maxW - 60, 2, 2)) {
    if (y + 40 + bl.length * 46 > ctaTop - 30) break;
    y += 16;
    ctx.fillStyle = contrast(pal.mark, pal.bg) >= 3 ? pal.mark : pal.fg;
    ctx.fillText('→', pad, y + 40);
    ctx.fillStyle = pal.fg;
    y = drawLines(ctx, bl, pad + 60, y + 40, 46) - 46 + 12;
  }

  if (layout.cta) {
    ctx.save();
    ctx.translate(pad + 10, ctaTop + 60);
    ctx.rotate(-0.06);
    ctx.fillStyle = pal.pillBg;
    ctx.font = `800 44px ${FONT}`;
    const t = layout.cta.toUpperCase();
    const tw = Math.min(ctx.measureText(t).width, maxW - 80);
    ctx.beginPath();
    ctx.roundRect(0, -64, tw + 80, 120, 14);
    ctx.fill();
    ctx.fillStyle = pal.pillFg;
    ctx.fillText(t, 40, 10, tw);
    ctx.restore();
  }
}

// Alocada: arriba un bloque de color con el titular y un corte en diagonal.
function bloques(c) {
  const { ctx, layout, pal, bp, name, w, h, pad, top, bottom, maxW } = c;
  const blockH = Math.round((bottom - top) * 0.55) + top;
  ctx.fillStyle = bp.block;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, blockH - 90);
  ctx.lineTo(0, blockH + 90);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = bp.onBlock;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(name, pad, top + 24);
  const { size, ls } = fitHeadline(ctx, layout.headline, maxW, 5, h > 1500 ? 108 : 100, 54, 800);
  const lineH = Math.round(size * 1.06);
  ctx.font = `800 ${size}px ${FONT}`;
  drawLines(ctx, ls, pad, top + 96 + size, lineH);

  let y = blockH + 150;
  ctx.fillStyle = pal.fg;
  if (layout.sub) {
    ctx.font = `500 42px ${FONT}`;
    for (const l of wrapLines(measureWith(ctx), layout.sub, maxW).slice(0, 2)) { ctx.fillText(l, pad, y); y += 56; }
  }
  const ctaTop = layout.cta ? bottom - 100 : bottom;
  ctx.font = `500 38px ${FONT}`;
  for (const bl of wholeBullets(ctx, layout.bullets, maxW - 50, 2, 2)) {
    if (y + bl.length * 46 > ctaTop - 30) break;
    y += 14;
    ctx.fillStyle = contrast(pal.mark, pal.bg) >= 3 ? pal.mark : pal.fg;
    ctx.fillRect(pad, y - 22, 22, 22);
    ctx.fillStyle = pal.fg;
    y = drawLines(ctx, bl, pad + 50, y, 46) - 46 + 44;
  }
  if (layout.cta) pill(ctx, layout.cta, pad, ctaTop, { bg: pal.pillBg, fg: pal.pillFg, maxW });
}

// Alocada: titular inclinado, cada línea sobre un marcador de color.
function diagonal(c) {
  const { ctx, layout, pal, bp, name, w, h, pad, top, bottom, maxW } = c;
  ctx.fillStyle = pal.fg;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(name, pad, top + 24);
  ctx.fillStyle = pal.mark;
  ctx.beginPath();
  ctx.arc(w - pad - 30, top + 12, 30, 0, Math.PI * 2);
  ctx.fill();

  const inner = maxW - 40;
  const text = layout.headline.toUpperCase();
  const { size, ls } = fitHeadline(ctx, text, inner, 5, h > 1500 ? 120 : 108, 56, 800, 6);
  const lineH = Math.round(size * 1.28);
  const ctaH = layout.cta ? 130 : 0;
  const space = bottom - ctaH - (top + 90);
  const blockH = ls.length * lineH;
  const startY = top + 110 + Math.max(0, (space - blockH - 140) / 2);

  ctx.save();
  ctx.translate(pad, startY);
  ctx.rotate(-0.07);
  ctx.font = `800 ${size}px ${FONT}`;
  ls.forEach((l, i) => {
    const tw = ctx.measureText(l).width;
    ctx.fillStyle = bp.block;
    ctx.fillRect(-14, i * lineH, tw + 40, lineH - 8);
    ctx.fillStyle = bp.onBlock;
    ctx.fillText(l, 6, i * lineH + size * 0.98);
  });
  ctx.restore();

  let y = startY + blockH + 90;
  ctx.fillStyle = pal.fg;
  if (layout.sub) {
    ctx.font = `500 42px ${FONT}`;
    for (const l of wrapLines(measureWith(ctx), layout.sub, maxW).slice(0, 2)) {
      if (y > bottom - ctaH - 40) break;
      ctx.fillText(l, pad, y);
      y += 56;
    }
  }
  if (layout.cta) pill(ctx, layout.cta, pad, bottom - 100, { bg: pal.pillBg, fg: pal.pillFg, maxW });
}

// Estándar: el titular va dentro de una tarjeta con sombra y el botón queda abajo.
function tarjeta(c) {
  const { ctx, layout, pal, name, w, pad, top, bottom, maxW } = c;
  ctx.fillStyle = pal.fg;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(name, pad, top + 24);

  const ctaH = layout.cta ? 130 : 0;
  const cardTop = top + 70;
  const cardH = bottom - ctaH - cardTop;
  const cardX = pad - 24;
  const cardW = maxW + 48;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = 44;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = layout.theme === 'light' ? '#FFFFFF' : '#F6F1E7';
  ctx.beginPath();
  ctx.roundRect(cardX, cardTop, cardW, cardH, 36);
  ctx.fill();
  ctx.restore();

  const ink = '#0A0E1A';
  const inner = cardW - 112;
  const x = cardX + 56;
  const { size, ls } = fitHeadline(ctx, layout.headline, inner, 6, 88, 50, 700, 4, { maxHeight: cardH * 0.5, lh: 1.12 });
  const lineH = Math.round(size * 1.12);
  let y = cardTop + 84 + size;
  ctx.fillStyle = good(pal.mark, '#F6F1E7') ? pal.mark : ink;
  ctx.fillRect(x, cardTop + 56, 72, 8);
  ctx.fillStyle = ink;
  ctx.font = `700 ${size}px ${FONT}`;
  y = drawLines(ctx, ls, x, y, lineH);
  if (layout.sub) {
    ctx.font = `400 38px ${FONT}`;
    ctx.globalAlpha = 0.8;
    for (const l of wrapLines(measureWith(ctx), layout.sub, inner).slice(0, 2)) { ctx.fillText(l, x, y + 22); y += 50; }
    ctx.globalAlpha = 1;
  }
  y += 24;
  ctx.font = `500 36px ${FONT}`;
  for (const bl of wholeBullets(ctx, layout.bullets, inner - 44, 2, 3)) {
    if (y + bl.length * 44 > cardTop + cardH - 40) break;
    ctx.fillStyle = good(pal.mark, '#F6F1E7') ? pal.mark : ink;
    ctx.beginPath();
    ctx.arc(x + 10, y + 20, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ink;
    y = drawLines(ctx, bl, x + 40, y + 30, 44) - 44 + 44;
  }
  if (layout.cta) pill(ctx, layout.cta, pad, bottom - 100, { bg: pal.pillBg, fg: pal.pillFg, maxW });
  void w;
}

// Estándar: barra vertical de color a la izquierda y los puntos numerados.
function columna(c) {
  const { ctx, layout, pal, name, pad, top, bottom, maxW } = c;
  ctx.fillStyle = pal.fg;
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText(name, pad, top + 24);

  const ctaH = layout.cta ? 130 : 0;
  const barTop = top + 80;
  const barH = bottom - ctaH - barTop;
  ctx.fillStyle = pal.mark;
  ctx.fillRect(pad, barTop, 16, barH);
  const x = pad + 56;
  const inner = maxW - 56;
  const { size, ls } = fitHeadline(ctx, layout.headline, inner, 6, 96, 50, 700, 4, { maxHeight: barH * 0.5, lh: 1.1 });
  const lineH = Math.round(size * 1.1);
  ctx.fillStyle = pal.fg;
  ctx.font = `700 ${size}px ${FONT}`;
  let y = drawLines(ctx, ls, x, barTop + size - 6, lineH);
  if (layout.sub) {
    ctx.font = `400 40px ${FONT}`;
    ctx.globalAlpha = 0.85;
    for (const l of wrapLines(measureWith(ctx), layout.sub, inner).slice(0, 2)) { ctx.fillText(l, x, y + 24); y += 54; }
    ctx.globalAlpha = 1;
  }
  y += 36;
  const list = wholeBullets(ctx, layout.bullets, inner - 90, 2, 4);
  list.forEach((bl, i) => {
    if (y + bl.length * 46 > barTop + barH) return;
    ctx.font = `800 40px ${FONT}`;
    ctx.fillStyle = good(pal.mark, pal.bg) ? pal.mark : pal.fg;
    ctx.fillText(String(i + 1).padStart(2, '0'), x, y + 34);
    ctx.font = `500 38px ${FONT}`;
    ctx.fillStyle = pal.fg;
    y = drawLines(ctx, bl, x + 90, y + 34, 46) - 46 + 40;
  });
  if (layout.cta) pill(ctx, layout.cta, pad, bottom - 100, { bg: pal.pillBg, fg: pal.pillFg, maxW });
}

// Relajada: marco fino, letra con serifa y todo centrado, estilo editorial.
function marco(c) {
  const { ctx, layout, pal, name, w, h, top, bottom, maxW } = c;
  const cx = w / 2;
  ctx.strokeStyle = pal.fg;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 3;
  ctx.strokeRect(52, top - 40, w - 104, bottom - top + 80);
  ctx.globalAlpha = 1;

  ctx.fillStyle = pal.fg;
  ctx.globalAlpha = 0.8;
  ctx.font = `600 28px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(name.toUpperCase().split('').join(' '), cx, top + 36);
  ctx.globalAlpha = 1;

  const inner = maxW - 120;
  const { size, ls } = fitHeadline(ctx, layout.headline, inner, 6, 88, 48, 400, 4, { maxHeight: (bottom - top) * 0.5, lh: 1.2 });
  ctx.font = `400 ${size}px ${SERIF}`;
  const sizeS = size;
  const lineH = Math.round(sizeS * 1.2);
  ctx.font = `400 40px ${FONT}`;
  const sub = layout.sub ? wrapLines(measureWith(ctx), layout.sub, inner).slice(0, 2) : [];
  const blockH = ls.length * lineH + (sub.length ? 40 + sub.length * 52 : 0);
  const free = bottom - top - 220;
  let y = top + 110 + Math.max(0, (free - blockH) / 2) + sizeS;
  ctx.fillStyle = pal.fg;
  ctx.font = `400 ${sizeS}px ${SERIF}`;
  y = drawLines(ctx, ls, cx, y, lineH, 'center');
  if (sub.length) {
    ctx.font = `400 40px ${FONT}`;
    ctx.globalAlpha = 0.8;
    drawLines(ctx, sub, cx, y + 10, 52, 'center');
    ctx.globalAlpha = 1;
  }
  if (layout.cta) {
    ctx.font = `600 36px ${FONT}`;
    const tw = Math.min(ctx.measureText(layout.cta).width + 80, maxW - 120);
    const bx = cx - tw / 2;
    ctx.strokeStyle = pal.fg;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(bx, bottom - 130, tw, 80, 40);
    ctx.stroke();
    ctx.fillStyle = pal.fg;
    ctx.textAlign = 'center';
    ctx.fillText(layout.cta, cx, bottom - 78, tw - 40);
  }
  ctx.textAlign = 'left';
  void h;
}

// Relajada: comillas grandes de adorno y el titular como una frase.
function tipografico(c) {
  const { ctx, layout, pal, name, w, pad, top, bottom, maxW } = c;
  ctx.fillStyle = pal.mark;
  ctx.globalAlpha = 0.35;
  ctx.font = `700 460px ${SERIF}`;
  ctx.fillText('“', pad - 10, top + 330);
  ctx.globalAlpha = 1;

  const { size, ls } = fitHeadline(ctx, layout.headline, maxW, 6, 84, 48, 500, 4, { maxHeight: (bottom - top) * 0.45, lh: 1.2 });
  const lineH = Math.round(size * 1.2);
  ctx.fillStyle = pal.fg;
  ctx.font = `500 ${size}px ${FONT}`;
  let y = drawLines(ctx, ls, pad, top + 360, lineH);
  if (layout.sub) {
    ctx.font = `400 38px ${FONT}`;
    ctx.globalAlpha = 0.8;
    for (const l of wrapLines(measureWith(ctx), layout.sub, maxW).slice(0, 2)) { ctx.fillText(l, pad, y + 20); y += 50; }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = pal.mark;
  ctx.fillRect(pad, bottom - 70, 60, 5);
  ctx.fillStyle = pal.fg;
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText(name, pad + 84, bottom - 56);
  if (layout.cta) {
    ctx.font = `600 34px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.globalAlpha = 0.9;
    ctx.fillText(`${layout.cta} →`, w - pad, bottom - 56, maxW * 0.62);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}

// Alocada: círculo gigante de color con el titular adentro y sticker inclinado.
function circulo(c) {
  const { ctx, layout, pal, bp, name, w, pad, top, bottom, maxW } = c;
  ctx.fillStyle = pal.fg;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(name, pad, top + 24);

  const ctaH = layout.cta ? 150 : 0;
  const r = Math.min(w * 0.46, (bottom - ctaH - top - 170) / 2);
  const cx = w / 2;
  const cy = top + 90 + r;
  ctx.fillStyle = bp.block;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  const inner = r * 1.45;
  const { size, ls } = fitHeadline(ctx, layout.headline.toUpperCase(), inner, 6, 110, 44, 800, 4, { maxHeight: r * 1.25, lh: 1.02 });
  const lineH = Math.round(size * 1.02);
  ctx.fillStyle = bp.onBlock;
  ctx.font = `800 ${size}px ${FONT}`;
  drawLines(ctx, ls, cx, cy - ((ls.length - 1) * lineH) / 2 + size * 0.34, lineH, 'center');

  let y = cy + r + 70;
  if (layout.sub) {
    ctx.fillStyle = pal.fg;
    ctx.font = `600 40px ${FONT}`;
    for (const l of wrapLines(measureWith(ctx), layout.sub, maxW).slice(0, 2)) {
      if (y > bottom - ctaH - 20) break;
      ctx.fillText(l, pad, y);
      y += 52;
    }
  }
  if (layout.cta) {
    ctx.save();
    ctx.translate(w - pad - 10, bottom - 56);
    ctx.rotate(-0.07);
    ctx.font = `800 42px ${FONT}`;
    const t = layout.cta.toUpperCase();
    const tw = Math.min(ctx.measureText(t).width, maxW - 90);
    ctx.fillStyle = pal.pillBg;
    ctx.beginPath();
    ctx.roundRect(-(tw + 80), -62, tw + 80, 116, 14);
    ctx.fill();
    ctx.fillStyle = pal.pillFg;
    ctx.fillText(t, -(tw + 40), 8, tw);
    ctx.restore();
  }
}

// Alocada: fondo rayado y una cinta de color atravesada con el titular.
function franjas(c) {
  const { ctx, layout, pal, bp, name, w, h, pad, top, bottom, maxW } = c;
  ctx.save();
  ctx.strokeStyle = pal.mark;
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = 18;
  for (let x = -h; x < w + h; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + h, h);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = pal.fg;
  ctx.font = `800 34px ${FONT}`;
  ctx.fillText(name.toUpperCase(), pad, top + 24);

  const inner = maxW - 40;
  const { size, ls } = fitHeadline(ctx, layout.headline.toUpperCase(), inner, 5, 112, 50, 800, 4, { maxHeight: (bottom - top) * 0.45, lh: 1.08 });
  const lineH = Math.round(size * 1.08);
  const bandH = ls.length * lineH + 80;
  const bandTop = top + 120 + Math.max(0, ((bottom - top - 330) - bandH) / 2);
  ctx.save();
  ctx.translate(w / 2, bandTop + bandH / 2);
  ctx.rotate(-0.05);
  ctx.fillStyle = bp.block;
  ctx.fillRect(-w, -bandH / 2, w * 2, bandH);
  ctx.fillStyle = pal.fg;
  ctx.fillRect(-w, -bandH / 2 - 14, w * 2, 8);
  ctx.fillRect(-w, bandH / 2 + 6, w * 2, 8);
  ctx.fillStyle = bp.onBlock;
  ctx.font = `800 ${size}px ${FONT}`;
  drawLines(ctx, ls, -inner / 2, -bandH / 2 + 40 + size * 0.9, lineH);
  ctx.restore();

  if (layout.sub) {
    ctx.fillStyle = pal.fg;
    ctx.font = `700 40px ${FONT}`;
    let y = bandTop + bandH + 90;
    for (const l of wrapLines(measureWith(ctx), layout.sub, maxW).slice(0, 2)) {
      if (y > bottom - 150) break;
      ctx.fillText(l, pad, y);
      y += 52;
    }
  }
  if (layout.cta) pill(ctx, layout.cta, pad, bottom - 100, { bg: pal.pillBg, fg: pal.pillFg, maxW });
}

export const TEMPLATE_DRAW = { clasica, tarjeta, columna, aireada, minimal, marco, tipografico, cartel, bloques, diagonal, circulo, franjas, ...NAUTICO_DRAW };

export function renderAd(canvas, { layout, name, accent, bg, format = 'post' }) {
  const { w, h } = FORMATS[format] || FORMATS.post;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const pal = paletteFor(layout, accent, bg);
  const bp = blockPalette(layout, accent, bg);
  const pad = 96;
  // En historias, la interfaz tapa ~250 px arriba y ~340 px abajo.
  const top = format === 'historia' ? 260 : 110;
  const bottom = h - (format === 'historia' ? 360 : 110);

  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const draw = TEMPLATE_DRAW[layout.tpl] || clasica;
  draw({ ctx, layout, pal, bp, name, w, h, pad, top, bottom, maxW: w - pad * 2 });
}

export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('No se pudo crear la imagen'))), 'image/png');
  });
}

export async function downloadAd(spec, filename) {
  await ensureFonts();
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
