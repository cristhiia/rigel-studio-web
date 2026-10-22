// Plantillas del estilo visual "náutico" (Keelwise): arco luminoso, brújula, ancla,
// velero visto desde arriba, plano técnico, letras condensadas apiladas, color
// dividido en dos y una pixelada tipo arcade. Los dibujos son formas originales
// hechas con código; los textos salen siempre del layout (es decir, del brief).
import {
  CONDENSED, FONT, PIXEL, SCRIPT, drawLines, drawSpaced, fitHeadline, good, measureSpaced, measureWith, onColor, pill, seeded, sparkle, wrapLines, wrapSpaced,
} from './adRenderKit';

const CREAM = '#F0E7D5';
const INK = '#0A0E1A';
const words = text => String(text).split(/\s+/).filter(Boolean);
// Color de brillo según el fondo de la pieza (acento sobre oscuro, blanco sobre acento).
const glowOf = c => (c.layout.theme === 'accent' ? '#FFFFFF' : c.bp.block);
const withAlpha = (ctx, alpha, fn) => { ctx.save(); ctx.globalAlpha = alpha; fn(); ctx.restore(); };

// ── Arco luminoso ──────────────────────────────────────────────────────────
// Un círculo gigante cuyo borde inferior brilla sobre fondo claro; titular en tres
// niveles: letras separadas arriba, la última palabra en letra manuscrita y la bajada.
function arco(c) {
  const { ctx, layout, pal, name, w, h, top, bottom, maxW } = c;
  const glow = glowOf(c);
  const paper = layout.theme === 'light' ? pal.pillBg : '#F4F7FC';
  const paperInk = layout.theme === 'light' ? onColor(pal.pillBg) : '#0A1430';
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);

  const R = w * 0.92;
  const bottomY = h * 0.72;
  const cy = bottomY - R;
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 80;
  ctx.shadowOffsetY = 26;
  ctx.fillStyle = pal.bg;
  ctx.beginPath();
  ctx.arc(w / 2, cy, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = pal.bg;
  ctx.beginPath();
  ctx.arc(w / 2, cy, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.strokeStyle = glow;
  ctx.lineWidth = 7;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 36;
  ctx.beginPath();
  ctx.arc(w / 2, cy, R, 0.04 * Math.PI, 0.96 * Math.PI);
  ctx.stroke();
  ctx.restore();
  withAlpha(ctx, 0.85, () => {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w / 2, cy, R - 2, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  });

  // Texto dentro del círculo.
  const ws = words(layout.headline);
  const key = ws.length > 1 ? ws[ws.length - 1] : ws[0];
  const before = ws.length > 1 ? ws.slice(0, -1).join(' ') : '';
  const cx = w / 2;
  const spacing = 9;
  ctx.fillStyle = pal.fg;
  ctx.font = `500 34px ${FONT}`;
  const upLines = before ? wrapSpaced(ctx, before.toUpperCase(), spacing, maxW - 80).slice(0, 4) : [];
  let size = 200;
  for (; size > 90; size -= 8) {
    ctx.font = `${size}px ${SCRIPT}`;
    if (ctx.measureText(key).width <= maxW - 60) break;
  }
  ctx.font = `500 26px ${FONT}`;
  const subLines = layout.sub ? wrapSpaced(ctx, layout.sub.toUpperCase(), 6, maxW - 160).slice(0, 2) : [];
  const upH = upLines.length * 52;
  const blockH = upH + size * 0.95 + (subLines.length ? 60 + subLines.length * 40 : 0);
  const area = bottomY - 150 - (top + 60);
  let y = top + 60 + Math.max(0, (area - blockH) / 2);

  ctx.font = `500 34px ${FONT}`;
  ctx.fillStyle = pal.fg;
  for (const l of upLines) { drawSpaced(ctx, l, cx, y + 36, spacing, 'center'); y += 52; }
  y += size * 0.72;
  ctx.save();
  ctx.font = `${size}px ${SCRIPT}`;
  ctx.fillStyle = good(glow, pal.bg, 3) ? glow : pal.fg;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 24;
  ctx.textAlign = 'center';
  ctx.fillText(key, cx, y);
  ctx.restore();
  if (subLines.length) {
    y += Math.round(size * 0.3) + 40;
    withAlpha(ctx, 0.7, () => { ctx.fillStyle = pal.fg; ctx.fillRect(cx - 38, y - 22, 76, 2); });
    ctx.fillStyle = pal.fg;
    ctx.font = `500 26px ${FONT}`;
    withAlpha(ctx, 0.85, () => { for (const l of subLines) { drawSpaced(ctx, l, cx, y + 26, 6, 'center'); y += 40; } });
  }
  void name;

  if (layout.cta) {
    ctx.fillStyle = paperInk;
    ctx.font = `700 30px ${FONT}`;
    const t = `${layout.cta.toUpperCase()}  →`;
    const ty = Math.min(bottom - 20, bottomY + (h - bottomY) * 0.45);
    drawSpaced(ctx, t, cx, ty, 5, 'center');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - measureSpaced(ctx, t, 5) / 2, ty + 18, measureSpaced(ctx, t, 5), 3);
  }
}

// ── Brújula ────────────────────────────────────────────────────────────────
function polar(cx, cy, r, deg) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
function compassRose(ctx, cx, cy, R, { ink, glow }) {
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.32, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.85;
  for (let deg = 0; deg < 360; deg += 5) {
    const len = deg % 90 === 0 ? R * 0.16 : deg % 45 === 0 ? R * 0.11 : deg % 15 === 0 ? R * 0.075 : R * 0.04;
    const [x1, y1] = polar(cx, cy, R, deg);
    const [x2, y2] = polar(cx, cy, R - len, deg);
    ctx.lineWidth = deg % 45 === 0 ? 3 : 1.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  ctx.restore();

  for (let k = 0; k < 8; k += 1) {
    const deg = k * 45;
    const tip = polar(cx, cy, k % 2 === 0 ? R * 0.78 : R * 0.5, deg);
    const left = polar(cx, cy, R * 0.13, deg - 45);
    const right = polar(cx, cy, R * 0.13, deg + 45);
    const tri = (a, b) => { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(...a); ctx.lineTo(...b); ctx.closePath(); };
    ctx.save();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = ink;
    ctx.fillStyle = k === 0 ? glow : ink;
    if (k === 0) { ctx.shadowColor = glow; ctx.shadowBlur = 26; }
    tri(tip, left); ctx.globalAlpha = k === 0 ? 1 : 0.9; ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    tri(tip, right); ctx.globalAlpha = 1;
    if (k === 0) { ctx.fillStyle = glow; ctx.globalAlpha = 0.45; ctx.fill(); ctx.globalAlpha = 1; }
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = ink;
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.035, 0, Math.PI * 2); ctx.fill();
  ctx.font = `700 ${Math.round(R * 0.15)}px ${FONT}`;
  ctx.textAlign = 'center';
  for (const [t, deg] of [['N', 0], ['E', 90], ['S', 180], ['O', 270]]) {
    const [x, y] = polar(cx, cy, R * 1.17, deg);
    ctx.fillText(t, x, y + R * 0.05);
  }
  ctx.textAlign = 'left';
}

// Pie de las plantillas con ilustración: titular centrado, bajada y llamado.
function captionBlock(c, fromY, { weight = 600 } = {}) {
  const { ctx, layout, pal, bottom, maxW, w } = c;
  const cx = w / 2;
  const ctaH = layout.cta ? 150 : 0;
  const room = bottom - ctaH - fromY - (layout.sub ? 120 : 20);
  const { size, ls } = fitHeadline(ctx, layout.headline, maxW - 60, 4, 76, 44, weight, 4, { maxHeight: room, lh: 1.15 });
  const lineH = Math.round(size * 1.15);
  ctx.fillStyle = pal.fg;
  ctx.font = `${weight} ${size}px ${FONT}`;
  let y = drawLines(ctx, ls, cx, fromY + size, lineH, 'center');
  if (layout.sub) {
    ctx.font = `400 36px ${FONT}`;
    withAlpha(ctx, 0.8, () => { for (const l of wrapLines(measureWith(ctx), layout.sub, maxW - 80).slice(0, 2)) { ctx.textAlign = 'center'; ctx.fillText(l, cx, y + 18); y += 48; } });
    ctx.textAlign = 'left';
  }
  if (layout.cta) {
    ctx.font = `700 30px ${FONT}`;
    const t = `${layout.cta.toUpperCase()}  →`;
    ctx.fillStyle = good(c.bp.block, pal.bg, 4.5) ? c.bp.block : pal.fg;
    const ty = bottom - 26;
    const tw = measureSpaced(ctx, t, 5);
    drawSpaced(ctx, t, cx, ty, 5, 'center');
    ctx.fillRect(cx - tw / 2, ty + 14, tw, 3);
  }
}

function brujula(c) {
  const { ctx, pal, w, top, bottom } = c;
  const R = Math.min(w * 0.2, (bottom - top) * 0.18);
  const cy = top + 40 + R * 1.2;
  compassRose(ctx, w / 2, cy, R, { ink: pal.fg, glow: glowOf(c) });
  captionBlock(c, cy + R * 1.3 + 46);
}

// ── Ancla ──────────────────────────────────────────────────────────────────
function anchor(ctx, cx, cy, S, { ink, glow }) {
  const p = (x, y) => [cx + x * S, cy + y * S];
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = glow;
  ctx.shadowBlur = 18;
  ctx.lineWidth = S * 0.028;
  // argolla
  ctx.beginPath(); ctx.arc(...p(0, -0.43), S * 0.065, 0, Math.PI * 2); ctx.stroke();
  // caña y cepo
  ctx.beginPath(); ctx.moveTo(...p(0, -0.365)); ctx.lineTo(...p(0, 0.37)); ctx.stroke();
  ctx.lineWidth = S * 0.034;
  ctx.beginPath(); ctx.moveTo(...p(-0.2, -0.29)); ctx.lineTo(...p(0.2, -0.29)); ctx.stroke();
  // brazos
  ctx.lineWidth = S * 0.032;
  ctx.beginPath();
  ctx.moveTo(...p(-0.33, 0.1));
  ctx.bezierCurveTo(...p(-0.31, 0.3), ...p(-0.14, 0.41), ...p(0, 0.41));
  ctx.bezierCurveTo(...p(0.14, 0.41), ...p(0.31, 0.3), ...p(0.33, 0.1));
  ctx.stroke();
  // uñas
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(...p(s * 0.33, 0.04));
    ctx.lineTo(...p(s * 0.42, 0.17));
    ctx.lineTo(...p(s * 0.27, 0.17));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // cuerda enrollada
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = S * 0.013;
  ctx.setLineDash([S * 0.02, S * 0.016]);
  ctx.beginPath();
  for (let t = 0; t <= 1; t += 0.01) {
    const y = -0.28 + t * 0.56;
    const x = 0.075 * Math.sin(t * Math.PI * 3.5);
    if (t === 0) ctx.moveTo(...p(x, y)); else ctx.lineTo(...p(x, y));
  }
  ctx.stroke();
  ctx.restore();
  void glow;
}

function ancla(c) {
  const { ctx, pal, w, top, bottom } = c;
  const S = Math.min(w * 0.5, (bottom - top) * 0.36);
  const cy = top + 60 + S * 0.5;
  anchor(ctx, w / 2, cy, S, { ink: pal.fg, glow: glowOf(c) });
  captionBlock(c, cy + S * 0.5 + 70);
}

// ── Velero visto desde arriba ──────────────────────────────────────────────
function velero(c) {
  const { ctx, layout, pal, name, w, h, top, bottom, maxW } = c;
  const glow = glowOf(c);
  const light = layout.theme === 'light';
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, light ? '#E4E8EC' : pal.bg);
  g.addColorStop(1, light ? pal.bg : '#050B18');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const rand = seeded(layout.headline + layout.theme);
  ctx.save();
  ctx.lineWidth = 2;
  for (let i = 0; i < 330; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    const len = 40 + rand() * 150;
    ctx.globalAlpha = 0.04 + rand() * 0.09;
    ctx.strokeStyle = light ? INK : '#9CC4FF';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + len / 2, y - 5 - rand() * 6, x + len, y);
    ctx.stroke();
  }
  ctx.restore();

  const L = (bottom - top) * 0.66;
  const bx = w * 0.46;
  const y0 = top + 20;
  const B = w * 0.062;
  const hull = () => {
    ctx.beginPath();
    ctx.moveTo(bx, y0);
    ctx.bezierCurveTo(bx + B * 0.55, y0 + L * 0.16, bx + B, y0 + L * 0.42, bx + B * 0.95, y0 + L * 0.7);
    ctx.bezierCurveTo(bx + B * 0.9, y0 + L * 0.9, bx + B * 0.55, y0 + L, bx, y0 + L);
    ctx.bezierCurveTo(bx - B * 0.55, y0 + L, bx - B * 0.9, y0 + L * 0.9, bx - B * 0.95, y0 + L * 0.7);
    ctx.bezierCurveTo(bx - B, y0 + L * 0.42, bx - B * 0.55, y0 + L * 0.16, bx, y0);
    ctx.closePath();
  };
  const hullColor = light ? 'rgba(11,21,48,0.92)' : 'rgba(2,8,20,0.92)';
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetX = 30;
  ctx.shadowOffsetY = 26;
  ctx.fillStyle = hullColor;
  hull(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = hullColor;
  hull(); ctx.fill();
  ctx.save();
  ctx.strokeStyle = glow;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 2.5;
  hull(); ctx.stroke();
  ctx.restore();

  // velas vistas desde arriba: dos medias lunas finas que se abren hacia un costado
  const crescent = (x, yTop, yBot, bulge, thick) => {
    const mid = (yTop + yBot) / 2;
    ctx.beginPath();
    ctx.moveTo(x, yTop);
    ctx.quadraticCurveTo(x + bulge, mid, x, yBot);
    ctx.quadraticCurveTo(x + bulge - thick, mid, x, yTop);
    ctx.closePath();
  };
  const sailFill = light ? 'rgba(11,21,48,0.9)' : 'rgba(228,238,255,0.94)';
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetX = 14;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = sailFill;
  crescent(bx, y0 + L * 0.34, y0 + L * 0.94, w * 0.2, w * 0.035); ctx.fill();
  crescent(bx, y0 + L * 0.04, y0 + L * 0.34, w * 0.1, w * 0.02); ctx.fill();
  ctx.restore();
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(bx, y0 + L * 0.34, 7, 0, Math.PI * 2); ctx.fill();

  // texto abajo
  const ty = y0 + L + 90;
  ctx.fillStyle = light ? INK : pal.fg;
  const room = Math.max(60, bottom - (layout.cta ? 120 : 30) - ty);
  let size = 52;
  let lines = [];
  for (; size >= 28; size -= 2) {
    ctx.font = `600 ${size}px ${FONT}`;
    lines = wrapSpaced(ctx, layout.headline.toUpperCase(), 6, maxW - 30);
    if (lines.length * size * 1.3 <= room && lines.length <= 3) break;
  }
  ctx.font = `600 ${size}px ${FONT}`;
  let y = ty;
  for (const l of lines.slice(0, 3)) { drawSpaced(ctx, l, w / 2, y, 6, 'center'); y += Math.round(size * 1.3); }
  if (layout.cta) {
    ctx.font = `700 28px ${FONT}`;
    const t = `${layout.cta.toUpperCase()}  →`;
    ctx.fillStyle = light ? INK : glow;
    drawSpaced(ctx, t, w / 2, bottom - 8, 5, 'center');
  }
  void name;
}

// ── Plano técnico ──────────────────────────────────────────────────────────
function plano(c) {
  const { ctx, layout, pal, w, h, pad, top, bottom, maxW } = c;
  const glow = glowOf(c);
  const light = layout.theme === 'light';
  const line = light ? '#0B1530' : glow;
  // grilla
  ctx.save();
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 54) { ctx.globalAlpha = x % 270 === 0 ? 0.22 : 0.08; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += 54) { ctx.globalAlpha = y % 270 === 0 ? 0.22 : 0.08; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.restore();

  // titular técnico arriba a la izquierda
  const { size, ls } = fitHeadline(ctx, layout.headline.toUpperCase(), maxW * 0.86, 3, 64, 36, 700, 2, { maxHeight: 230, lh: 1.15 });
  const lineH = Math.round(size * 1.15);
  ctx.fillStyle = pal.fg;
  ctx.font = `700 ${size}px ${FONT}`;
  let hy = top + 10 + size;
  for (const l of ls) { drawSpaced(ctx, l, pad, hy, 3); hy += lineH; }
  ctx.strokeStyle = line;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(pad, top - 14); ctx.lineTo(pad + 70, top - 14); ctx.stroke();

  // casco visto desde arriba
  const ctaH = layout.cta ? 130 : 0;
  const y0 = hy + 40;
  const L = bottom - ctaH - y0 - 30;
  const W = Math.min(L * 0.3, w * 0.34);
  const cx = w / 2;
  const hullPath = (k = 1) => {
    const cyH = y0 + L * 0.55;
    const X = (x) => cx + (x - cx) * k;
    const Y = (y) => cyH + (y - cyH) * k;
    ctx.beginPath();
    ctx.moveTo(X(cx), Y(y0));
    ctx.bezierCurveTo(X(cx + W * 0.25), Y(y0 + L * 0.18), X(cx + W * 0.5), Y(y0 + L * 0.45), X(cx + W * 0.5), Y(y0 + L * 0.72));
    ctx.lineTo(X(cx + W * 0.42), Y(y0 + L));
    ctx.lineTo(X(cx - W * 0.42), Y(y0 + L));
    ctx.lineTo(X(cx - W * 0.5), Y(y0 + L * 0.72));
    ctx.bezierCurveTo(X(cx - W * 0.5), Y(y0 + L * 0.45), X(cx - W * 0.25), Y(y0 + L * 0.18), X(cx), Y(y0));
    ctx.closePath();
  };
  ctx.save();
  ctx.fillStyle = line;
  ctx.globalAlpha = 0.07;
  hullPath(); ctx.fill();
  ctx.restore();
  // cuadernas dentro del casco
  ctx.save();
  hullPath(); ctx.clip();
  ctx.strokeStyle = line;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 14; i += 1) { const y = y0 + (L * i) / 14; ctx.beginPath(); ctx.moveTo(cx - W, y); ctx.lineTo(cx + W, y); ctx.stroke(); }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = line;
  ctx.shadowColor = line;
  ctx.shadowBlur = light ? 0 : 22;
  ctx.lineWidth = 3.5;
  hullPath(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.75;
  hullPath(0.86); ctx.stroke();
  ctx.globalAlpha = 0.5;
  hullPath(0.68); ctx.stroke();
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(cx - W * 0.2, y0 + L * 0.34, W * 0.4, L * 0.26, 14); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(cx - W * 0.28, y0 + L * 0.66, W * 0.56, L * 0.17, 14); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, y0 + L * 0.28, W * 0.06, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([14, 10]);
  ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(cx, y0 - 50); ctx.lineTo(cx, y0 + L + 50); ctx.stroke();
  ctx.setLineDash([]);
  // cotas
  ctx.globalAlpha = 0.7;
  const dx = cx - W * 0.5 - 80;
  ctx.beginPath(); ctx.moveTo(dx, y0); ctx.lineTo(dx, y0 + L); ctx.stroke();
  for (const y of [y0, y0 + L]) { ctx.beginPath(); ctx.moveTo(dx - 14, y); ctx.lineTo(dx + 14, y); ctx.stroke(); }
  const rx = cx + W * 0.5 + 80;
  ctx.beginPath(); ctx.moveTo(rx - W * 0.0, y0 + L * 0.72 - 0); ctx.lineTo(rx, y0 + L * 0.72); ctx.stroke();
  ctx.restore();

  if (layout.sub) {
    ctx.fillStyle = pal.fg;
    ctx.font = `500 24px ${FONT}`;
    withAlpha(ctx, 0.75, () => {
      let y = y0 + L * 0.3;
      const subLines = wrapSpaced(ctx, layout.sub.toUpperCase(), 3, w * 0.22);
      if (subLines.length <= 6) for (const l of subLines) { drawSpaced(ctx, l, w - pad - w * 0.2, y, 3); y += 34; }
    });
  }
  if (layout.cta) {
    ctx.font = `700 34px ${FONT}`;
    const t = layout.cta.toUpperCase();
    const tw = measureSpaced(ctx, t, 4) + 80;
    const bx = pad;
    const by = bottom - 100;
    ctx.strokeStyle = line;
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, Math.min(tw, maxW), 80);
    ctx.fillStyle = line;
    for (const [x, y] of [[bx, by], [bx + Math.min(tw, maxW), by], [bx, by + 80], [bx + Math.min(tw, maxW), by + 80]]) ctx.fillRect(x - 8, y - 8, 16, 16);
    ctx.fillStyle = pal.fg;
    drawSpaced(ctx, t, bx + 40, by + 52, 4);
  }
}

// ── Letras condensadas apiladas ────────────────────────────────────────────
function condensada(c) {
  const { ctx, layout, pal, name, w, h, pad, top, bottom, maxW } = c;
  ctx.fillStyle = pal.fg;
  ctx.globalAlpha = 0.7;
  ctx.font = `600 28px ${FONT}`;
  drawSpaced(ctx, name.toUpperCase(), pad, top + 24, 6);
  ctx.globalAlpha = 1;

  // una palabra por línea; si son muchas, se agrupan de a dos
  let lines = words(layout.headline.toUpperCase());
  if (lines.length > 7) {
    const grouped = [];
    for (let i = 0; i < lines.length; i += 2) grouped.push(lines.slice(i, i + 2).join(' '));
    lines = grouped;
  }
  const ctaH = layout.cta ? 110 : 20;
  const subH = layout.sub ? 150 : 0;
  const room = bottom - ctaH - subH - (top + (h > 1500 ? 280 : 120));
  let size = 190;
  for (; size > 44; size -= 4) {
    ctx.font = `${size}px ${CONDENSED}`;
    const widest = Math.max(...lines.map(l => ctx.measureText(l).width));
    if (widest <= maxW && lines.length * size * 1.04 <= room) break;
  }
  const lineH = Math.round(size * 1.04);
  const tint = layout.theme === 'dark' ? '#D6E6FF' : pal.fg;
  ctx.fillStyle = tint;
  ctx.font = `${size}px ${CONDENSED}`;
  let y = bottom - ctaH - subH - lines.length * lineH + size * 0.92;
  for (const l of lines) { ctx.fillText(l, pad, y); y += lineH; }
  if (layout.sub) {
    ctx.fillStyle = pal.fg;
    ctx.font = `500 36px ${FONT}`;
    withAlpha(ctx, 0.85, () => { let sy = y - lineH + size * 0.1 + 56; for (const l of wrapLines(measureWith(ctx), layout.sub, maxW).slice(0, 2)) { ctx.fillText(l, pad, sy); sy += 48; } });
  }
  if (layout.cta) {
    ctx.fillStyle = good(c.bp.block, pal.bg, 4.5) ? c.bp.block : pal.fg;
    ctx.font = `700 32px ${FONT}`;
    const t = `${layout.cta.toUpperCase()}  →`;
    const tw = drawSpaced(ctx, t, pad, bottom - 10, 5);
    ctx.fillRect(pad, bottom + 8, tw, 3);
  }
}

// ── Color dividido ─────────────────────────────────────────────────────────
function dividido(c) {
  const { ctx, layout, pal, name, w, h, pad, top, bottom } = c;
  const split = Math.round(w * 0.62);
  const rightBg = layout.theme === 'dark' ? CREAM : layout.theme === 'light' ? pal.pillBg : pal.fg;
  const rightInk = onColor(rightBg);
  ctx.fillStyle = rightBg;
  ctx.fillRect(split, 0, w - split, h);

  // izquierda: estrella y titular abajo
  const innerL = split - pad - 36;
  const ctaH = layout.cta ? 90 : 0;
  const { size, ls } = fitHeadline(ctx, layout.headline.toUpperCase(), innerL, 8, 84, 36, 800, 2, { maxHeight: (bottom - top) * 0.62, lh: 1.1 });
  const lineH = Math.round(size * 1.1);
  const blockH = ls.length * lineH;
  const textTop = bottom - ctaH - blockH - 20;
  ctx.fillStyle = pal.fg;
  sparkle(ctx, pad + 30, textTop - 70, 34);
  ctx.font = `800 ${size}px ${FONT}`;
  drawLines(ctx, ls, pad, textTop + size, lineH);
  if (layout.cta) {
    ctx.fillStyle = good(c.bp.block, pal.bg, 3) ? c.bp.block : pal.fg;
    ctx.font = `700 28px ${FONT}`;
    const t = layout.cta.toUpperCase();
    const lines = wrapSpaced(ctx, t, 3, innerL).slice(0, 2);
    let y = bottom - lines.length * 36 + 26;
    for (const l of lines) { drawSpaced(ctx, l, pad, y, 3); y += 36; }
  }

  // derecha: marca arriba y bajada alineada a la derecha
  const rx = w - pad + 40;
  ctx.fillStyle = rightInk;
  ctx.font = `600 26px ${FONT}`;
  drawSpaced(ctx, name.toUpperCase(), rx, top + 20, 3, 'right');
  if (layout.sub) {
    ctx.font = `500 34px ${FONT}`;
    const lines = wrapLines(measureWith(ctx), layout.sub, w - split - 70).slice(0, 5);
    let y = top + 110;
    for (const l of lines) { drawSpaced(ctx, l, rx, y, 0, 'right'); y += 46; }
  }
  ctx.fillStyle = layout.theme === 'dark' ? pal.bg : rightInk;
  sparkle(ctx, rx - 26, bottom - 40, 30);
}

// ── Pixelada (arcade) ──────────────────────────────────────────────────────
function pixel(c) {
  const { ctx, layout, pal, w, h, pad, top, bottom, maxW } = c;
  const glow = layout.theme === 'accent' ? '#FFFFFF' : c.bp.block;
  const light = layout.theme === 'light';
  const cx = w / 2;
  // luz que baja desde arriba
  const beam = ctx.createLinearGradient(0, 0, 0, h * 0.8);
  beam.addColorStop(0, light ? 'rgba(11,21,48,0.2)' : 'rgba(110,170,255,0.5)');
  beam.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.12, 0); ctx.lineTo(cx + w * 0.12, 0); ctx.lineTo(cx + w * 0.55, h * 0.8); ctx.lineTo(cx - w * 0.55, h * 0.8);
  ctx.closePath(); ctx.fill();
  const halo = ctx.createRadialGradient(cx, top + 260, 0, cx, top + 260, w * 0.7);
  halo.addColorStop(0, light ? 'rgba(11,21,48,0.18)' : 'rgba(80,150,255,0.55)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);
  const vignette = ctx.createLinearGradient(0, h * 0.55, 0, h);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, light ? 'rgba(11,21,48,0.15)' : 'rgba(0,4,16,0.65)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);

  const rand = seeded(layout.headline + 'px');
  for (let i = 0; i < 160; i += 1) {
    ctx.globalAlpha = 0.15 + rand() * 0.6;
    ctx.fillStyle = light ? INK : '#CFE6FF';
    const s = rand() < 0.9 ? 3 : 6;
    ctx.fillRect(Math.round(rand() * w), Math.round(rand() * h), s, s);
  }
  ctx.globalAlpha = 1;

  // titular pixelado con brillo
  const textColor = light ? INK : '#EAF6FF';
  const plain = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¿¡]/g, '').toUpperCase();
  const text = plain(layout.headline);
  const ctaH = layout.cta ? 150 : 40;
  let size = 60;
  let ls = [];
  for (; size >= 22; size -= 2) {
    ctx.font = `${size}px ${PIXEL}`;
    ls = wrapLines(measureWith(ctx), text, maxW - 20);
    if (ls.length * size * 1.55 <= (bottom - ctaH - top) * 0.5 && Math.max(...ls.map(l => ctx.measureText(l).width)) <= maxW - 20) break;
  }
  const lineH = Math.round(size * 1.55);
  let y = top + 120 + size;
  ctx.font = `${size}px ${PIXEL}`;
  for (let pass = 0; pass < 2; pass += 1) {
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = pass === 0 ? 40 : 14;
    ctx.fillStyle = textColor;
    let yy = y;
    for (const l of ls) { ctx.fillText(l, cx - ctx.measureText(l).width / 2, yy); yy += lineH; }
    ctx.restore();
  }
  y += ls.length * lineH + 20;
  if (layout.sub) {
    ctx.font = `${Math.max(16, Math.round(size * 0.42))}px ${PIXEL}`;
    withAlpha(ctx, 0.8, () => {
      ctx.fillStyle = textColor;
      let yy = y + 20;
      for (const l of wrapLines(measureWith(ctx), plain(layout.sub), maxW - 60).slice(0, 3)) { ctx.fillText(l, cx - ctx.measureText(l).width / 2, yy); yy += Math.round(size * 0.7); }
    });
  }
  if (layout.cta) {
    const t = `> ${plain(layout.cta)}`;
    let cs = 30;
    for (; cs > 16; cs -= 2) { ctx.font = `${cs}px ${PIXEL}`; if (ctx.measureText(t).width <= maxW - 60) break; }
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 18;
    ctx.fillStyle = textColor;
    ctx.fillText(t, pad + 10, bottom - 20);
    ctx.fillRect(pad + 10 + ctx.measureText(t).width + 12, bottom - 20 - cs, cs * 0.8, cs);
    ctx.restore();
  }
  void pal; void h;
}

export const NAUTICO_DRAW = { arco, brujula, ancla, velero, plano, condensada, dividido, pixel };
void pill;
