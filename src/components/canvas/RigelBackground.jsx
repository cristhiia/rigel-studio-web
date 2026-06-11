import React, { useEffect, useRef } from 'react';

const FRAME_MS = 1000 / 60;
const GOLD  = '212,175,55';
const CREAM = '240,231,213';
const BLUE  = '74,144,226';

// Two breathing nebula blobs, drawn once to offscreen canvases — only
// their globalAlpha is animated per frame (no gradient redraw).
const NEBULA_DEFS = [
  { cx: 0.16, cy: 0.18, rFactor: 0.6,  color: BLUE, base: 0.055, amp: 0.025, phase: 0,       speed: 0.00045 },
  { cx: 0.88, cy: 0.85, rFactor: 0.65, color: GOLD, base: 0.06,  amp: 0.02,  phase: Math.PI, speed: 0.00035 },
];

export default function RigelBackground() {
  const bgRef    = useRef(null);
  const starsRef = useRef(null);

  useEffect(() => {
    const bgCanvas    = bgRef.current;
    const starsCanvas = starsRef.current;
    if (!bgCanvas || !starsCanvas) return;
    const ctx  = bgCanvas.getContext('2d');
    const sctx = starsCanvas.getContext('2d');

    let mobile = window.innerWidth <= 768;
    let cx, cy;
    let bgGradientCanvas, nebulaLayers, rings, stars;

    function buildBgGradient() {
      const off  = document.createElement('canvas');
      off.width  = bgCanvas.width;
      off.height = bgCanvas.height;
      const octx = off.getContext('2d');
      const g = octx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(off.width, off.height));
      g.addColorStop(0, '#1a1a2e');
      g.addColorStop(1, '#0A0E1A');
      octx.fillStyle = g;
      octx.fillRect(0, 0, off.width, off.height);
      bgGradientCanvas = off;
    }

    function buildNebulae() {
      nebulaLayers = mobile ? [] : NEBULA_DEFS.map(def => {
        const off  = document.createElement('canvas');
        off.width  = bgCanvas.width;
        off.height = bgCanvas.height;
        const octx = off.getContext('2d');
        const ncx  = off.width  * def.cx;
        const ncy  = off.height * def.cy;
        const r    = Math.max(off.width, off.height) * def.rFactor;
        const g = octx.createRadialGradient(ncx, ncy, 0, ncx, ncy, r);
        g.addColorStop(0, `rgba(${def.color},1)`);
        g.addColorStop(1, `rgba(${def.color},0)`);
        octx.fillStyle = g;
        octx.fillRect(0, 0, off.width, off.height);
        return { canvas: off, base: def.base, amp: def.amp, phase: def.phase, speed: def.speed };
      });
    }

    // ── Orbital ring system — the protagonist ──────────────────────────────
    function buildRings() {
      const count = mobile ? 5 : 13;
      rings = Array.from({ length: count }, (_, i) => {
        const t      = i / (count - 1);
        const radius = 80 + t * 300; // 80px .. 380px
        const isMain = !mobile && (i === 2 || i === 6 || i === 10);
        const dashed = !mobile && i % 4 === 1;
        const dir    = i % 2 === 0 ? 1 : -1;
        const satCount = (!mobile && (i === 3 || i === 6 || i === 9)) ? 2 + (i % 2) : 0;
        return {
          radius,
          tilt: -0.25 + (i % 5) * 0.04,
          spin: mobile ? 0 : dir * (0.0001 + (i % 5) * 0.00008), // 0.0001 - 0.0005 rad/frame
          spinAngle: 0,
          opacity: isMain ? 0.3 + Math.random() * 0.05 : 0.08 + Math.random() * 0.15,
          lineWidth: isMain ? 1 : 0.6,
          glow: isMain,
          dashed,
          satellites: Array.from({ length: satCount }, (_, k) => ({
            angle: (k / satCount) * Math.PI * 2,
            speed: 0.004 + Math.random() * 0.003,
          })),
        };
      });
    }

    // ── Starfield: cream/gold/blue mix, 12 twinkling diffraction stars ─────
    function buildStars() {
      const count = mobile ? 60 : 150;
      stars = Array.from({ length: count }, (_, i) => {
        const roll  = Math.random();
        const color = roll < 0.55 ? CREAM : roll < 0.80 ? GOLD : BLUE;
        return {
          x: Math.random() * starsCanvas.width,
          y: Math.random() * starsCanvas.height,
          size: i < 12 ? 1.6 + Math.random() : 0.5 + Math.random() * 1.2,
          color,
          twinkle: i < 12,
          phase: Math.random() * Math.PI * 2,
          dx: (Math.random() - 0.5) * 0.04,
          dy: (Math.random() - 0.5) * 0.04,
          baseAlpha: 0.3 + Math.random() * 0.5,
        };
      });
    }

    function setSize() {
      mobile = window.innerWidth <= 768;
      const w = window.innerWidth;
      const h = window.innerHeight;
      bgCanvas.width    = w; bgCanvas.height    = h;
      starsCanvas.width = w; starsCanvas.height = h;
      cx = w * 0.5;
      cy = h * 0.45;
      buildBgGradient();
      buildNebulae();
      buildRings();
      buildStars();
    }
    setSize();
    window.addEventListener('resize', setSize);

    // ── Scroll parallax for stars layer — transform only, GPU-accelerated ──
    let wcTimeout;
    const onLenisScroll = (e) => {
      starsCanvas.style.willChange = 'transform';
      starsCanvas.style.transform  = `translate3d(0, ${e.detail.scroll * 0.03}px, 0)`;
      clearTimeout(wcTimeout);
      wcTimeout = setTimeout(() => { starsCanvas.style.willChange = 'auto'; }, 200);
    };
    window.addEventListener('lenis-scroll', onLenisScroll);

    // ── Rigel star — gold 4-point star, core of the orbital system ─────────
    function drawAura(px, py, r, alpha) {
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0,   `rgba(${GOLD},${alpha})`);
      g.addColorStop(0.4, `rgba(${GOLD},${alpha * 0.3})`);
      g.addColorStop(1,   `rgba(${GOLD},0)`);
      ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    function drawRays(px, py, vLen, hLen, opacity) {
      [[0, -1, vLen], [0, 1, vLen], [1, 0, hLen], [-1, 0, hLen]].forEach(([dx, dy, len]) => {
        const g = ctx.createLinearGradient(px, py, px + dx * len, py + dy * len);
        g.addColorStop(0,   `rgba(255,255,255,${0.9 * opacity})`);
        g.addColorStop(0.3, `rgba(255,255,255,${0.25 * opacity})`);
        g.addColorStop(1,   'rgba(255,255,255,0)');
        ctx.save(); ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.beginPath();
        ctx.moveTo(px, py); ctx.lineTo(px + dx * len, py + dy * len); ctx.stroke(); ctx.restore();
      });
    }
    function draw4Star(px, py, vLen, alpha) {
      const hLen = Math.round(vLen / 1.5);
      const w    = Math.max(1, vLen * 0.1);
      ctx.save(); ctx.translate(px, py);
      const sf = ctx.createRadialGradient(0, 0, 0, 0, 0, vLen);
      sf.addColorStop(0,    'rgba(255,255,255,0.98)');
      sf.addColorStop(0.15, '#F4C842');
      sf.addColorStop(0.5,  `rgba(${GOLD},${0.5 * alpha})`);
      sf.addColorStop(1,    `rgba(${GOLD},0)`);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(0, -vLen); ctx.lineTo(w, -w); ctx.lineTo(hLen, 0);
      ctx.lineTo(w, w); ctx.lineTo(0, vLen); ctx.lineTo(-w, w);
      ctx.lineTo(-hLen, 0); ctx.lineTo(-w, -w); ctx.closePath();
      ctx.fillStyle = sf; ctx.fill(); ctx.restore();
    }
    function drawCore(px, py, coreR, alpha) {
      ctx.save(); ctx.globalAlpha = alpha;
      const cg = ctx.createRadialGradient(px, py, 0, px, py, coreR * 6);
      cg.addColorStop(0,   'rgba(255,255,255,1)');
      cg.addColorStop(0.2, 'rgba(255,255,255,0.9)');
      cg.addColorStop(0.5, 'rgba(244,200,66,0.3)');
      cg.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(px, py, coreR * 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(px, py, coreR, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    function drawRigelStar(phase) {
      const pulse = Math.sin(phase) * 0.08 + 0.92;
      drawAura(cx, cy, 70 * pulse, 0.35 * pulse);
      drawRays(cx, cy, 45 * pulse, 32 * pulse, 0.9);
      draw4Star(cx, cy, 24 * pulse, 0.95);
      drawCore(cx, cy, (2.5 + Math.sin(phase * 2) * 0.5) * pulse, 1);
    }

    function drawRing(ring, dt) {
      ring.spinAngle += ring.spin * (dt / FRAME_MS);
      const rot = ring.tilt + ring.spinAngle;

      ctx.save();
      ctx.setLineDash(ring.dashed ? [6, 10] : []);
      ctx.strokeStyle = `rgba(${GOLD},${ring.opacity})`;
      ctx.lineWidth = ring.lineWidth;
      if (ring.glow) {
        ctx.shadowColor = `rgba(${GOLD},0.55)`;
        ctx.shadowBlur  = 8;
      }
      ctx.beginPath();
      ctx.ellipse(cx, cy, ring.radius, ring.radius * 0.34, rot, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ring.satellites.forEach(sat => {
        sat.angle += sat.speed * (dt / FRAME_MS);
        const ex = ring.radius * 0.34 * Math.sin(sat.angle);
        const ey0 = ring.radius * Math.cos(sat.angle);
        const sx = cx + ey0 * Math.cos(rot) - ex * Math.sin(rot);
        const sy = cy + ey0 * Math.sin(rot) + ex * Math.cos(rot);
        ctx.save();
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 5);
        g.addColorStop(0, 'rgba(244,200,66,0.85)');
        g.addColorStop(1, 'rgba(244,200,66,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#F4C842';
        ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    }

    function drawNebulae(t) {
      nebulaLayers.forEach(n => {
        const alpha = n.base + Math.sin(t * n.speed + n.phase) * n.amp;
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.drawImage(n.canvas, 0, 0);
        ctx.restore();
      });
    }

    function drawStars(t) {
      sctx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
      stars.forEach(s => {
        s.x += s.dx; s.y += s.dy;
        if (s.x < 0) s.x += starsCanvas.width;  if (s.x > starsCanvas.width)  s.x -= starsCanvas.width;
        if (s.y < 0) s.y += starsCanvas.height; if (s.y > starsCanvas.height) s.y -= starsCanvas.height;

        if (s.twinkle) {
          const tw  = 0.4 + Math.sin(t * 0.0015 + s.phase) * 0.35;
          const len = s.size * 6;
          sctx.save();
          sctx.globalAlpha  = Math.max(0, tw);
          sctx.strokeStyle  = `rgba(${s.color},0.7)`;
          sctx.lineWidth    = 0.6;
          sctx.beginPath();
          sctx.moveTo(s.x - len, s.y); sctx.lineTo(s.x + len, s.y);
          sctx.moveTo(s.x, s.y - len); sctx.lineTo(s.x, s.y + len);
          sctx.stroke();
          sctx.fillStyle = `rgba(${s.color},${Math.max(0, tw + 0.2)})`;
          sctx.beginPath(); sctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); sctx.fill();
          sctx.restore();
        } else {
          sctx.save();
          sctx.globalAlpha = s.baseAlpha;
          sctx.fillStyle   = `rgba(${s.color},1)`;
          sctx.beginPath(); sctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); sctx.fill();
          sctx.restore();
        }
      });
    }

    // ── Animation loop, capped at 60fps via deltaTime ───────────────────────
    let raf;
    let lastTime = 0;
    let elapsed  = 0;
    function loop(now) {
      raf = requestAnimationFrame(loop);
      const delta = now - lastTime;
      if (delta < FRAME_MS) return;
      lastTime = now - (delta % FRAME_MS);
      elapsed += delta;

      ctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
      ctx.drawImage(bgGradientCanvas, 0, 0);
      drawNebulae(elapsed);
      rings.forEach(r => drawRing(r, delta));
      drawRigelStar(elapsed * 0.0012);

      drawStars(elapsed);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(wcTimeout);
      window.removeEventListener('resize', setSize);
      window.removeEventListener('lenis-scroll', onLenisScroll);
    };
  }, []);

  return (
    <div style={{
      width: '100vw', height: '100vh',
      overflow: 'hidden', position: 'fixed',
      top: 0, left: 0, zIndex: -1,
      backgroundColor: '#0A0E1A', pointerEvents: 'none',
    }}>
      <canvas ref={bgRef}    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <canvas ref={starsRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </div>
  );
}
