import React, { useEffect, useRef } from 'react';

const COMPRESSION = 0.30;

const ORBITS = [
  { radius: 60,  inc:  30 * Math.PI / 180, speed: 0.005, count: 18 },
  { radius: 80,  inc: -20 * Math.PI / 180, speed: 0.003, count: 18 },
  { radius: 100, inc:  45 * Math.PI / 180, speed: 0.004, count: 18 },
];

export default function RigelBackground() {
  const canvasRef = useRef(null);
  const mouseRef  = useRef({ x: window.innerWidth / 2, y: window.innerHeight * 0.2 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const setSize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight * 3;
    };
    setSize();
    window.addEventListener('resize', setSize);

    const onMouse = e => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', onMouse, { passive: true });

    // ── 200 ambient background particles ─────────────────────────────────────
    const bgParticles = Array.from({ length: 200 }, (_, i) => {
      let color, size, isGlow = false;
      if (i < 120) {
        color = `rgba(240,231,213,${(0.3 + Math.random() * 0.5).toFixed(2)})`;
        size  = 0.5 + Math.random() * 1.5;
      } else if (i < 160) {
        color = `rgba(212,175,55,${(0.4 + Math.random() * 0.4).toFixed(2)})`;
        size  = 0.5 + Math.random() * 1.5;
      } else if (i < 188) {
        color = `rgba(74,144,226,${(0.3 + Math.random() * 0.3).toFixed(2)})`;
        size  = 0.5 + Math.random() * 1.5;
      } else {
        color  = i < 196 ? 'rgba(240,231,213,0.9)' : 'rgba(212,175,55,0.9)';
        size   = 1.5 + Math.random() * 1.5;
        isGlow = true;
      }
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size, isGlow, color,
        speedX:  (Math.random() - 0.5) * 0.15,
        speedY:  (Math.random() - 0.5) * 0.15,
        opacity: Math.random() * 0.5 + 0.3,
        type:    !isGlow && Math.random() > 0.75 ? 'cross' : 'dot',
        twinkle: Math.random() * Math.PI * 2,
      };
    });

    const angles = [0, 0, 0];
    let phase = 0;

    // Single star — viewport coords, follows mouse from origin at 20vh
    const originVX = window.innerWidth  / 2;
    const originVY = window.innerHeight * 0.2;
    let svx = originVX;
    let svy = originVY;

    // Trail state (bitmap coords)
    const trail    = [];
    const MAX_TRAIL = 25;
    let prevBx = null;
    let prevBy = null;

    // ── Draw helpers ──────────────────────────────────────────────────────────

    function drawAura(cx, cy, r, alpha) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0,   `rgba(212,175,55,${alpha})`);
      g.addColorStop(0.4, `rgba(212,175,55,${alpha * 0.3})`);
      g.addColorStop(1,   'rgba(212,175,55,0)');
      ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    function drawRays(cx, cy, vLen, hLen, opacity) {
      [[0, -1, vLen], [0, 1, vLen], [1, 0, hLen], [-1, 0, hLen]].forEach(([dx, dy, len]) => {
        const g = ctx.createLinearGradient(cx, cy, cx + dx * len, cy + dy * len);
        g.addColorStop(0,   `rgba(255,255,255,${0.9 * opacity})`);
        g.addColorStop(0.3, `rgba(255,255,255,${0.25 * opacity})`);
        g.addColorStop(1,   'rgba(255,255,255,0)');
        ctx.save(); ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.beginPath();
        ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * len, cy + dy * len); ctx.stroke(); ctx.restore();
      });
    }

    function draw4Star(cx, cy, vLen, alpha) {
      const hLen  = Math.round(vLen / 1.5);
      const waist = Math.max(1, vLen * 0.1);
      ctx.save(); ctx.translate(cx, cy);
      const sf = ctx.createRadialGradient(0, 0, 0, 0, 0, vLen);
      sf.addColorStop(0,    'rgba(255,255,255,0.98)');
      sf.addColorStop(0.15, '#F4C842');
      sf.addColorStop(0.5,  `rgba(212,175,55,${0.5 * alpha})`);
      sf.addColorStop(1,    'rgba(212,175,55,0)');
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(0, -vLen); ctx.lineTo(waist, -waist); ctx.lineTo(hLen, 0);
      ctx.lineTo(waist, waist); ctx.lineTo(0, vLen); ctx.lineTo(-waist, waist);
      ctx.lineTo(-hLen, 0); ctx.lineTo(-waist, -waist); ctx.closePath();
      ctx.fillStyle = sf; ctx.fill(); ctx.restore();
    }

    function drawCore(cx, cy, coreR, glowMult, alpha) {
      ctx.save(); ctx.globalAlpha = alpha;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 6 * glowMult);
      cg.addColorStop(0,   'rgba(255,255,255,1)');
      cg.addColorStop(0.2, 'rgba(255,255,255,0.9)');
      cg.addColorStop(0.5, 'rgba(244,200,66,0.3)');
      cg.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, coreR * 6 * glowMult, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawStar(cx, cy, proximity) {
      const pulse = Math.sin(phase) * 0.1 + 0.9;
      const glowIntensity = 0.25 + proximity * 0.4;
      const speedMult = 1 + proximity * 1.5;

      drawAura(cx, cy, (75 + proximity * 40) * pulse, glowIntensity * pulse);
      drawRays(cx, cy, 50 * pulse, 35 * pulse, (0.85 + proximity * 0.15));
      draw4Star(cx, cy, 25 * pulse, 0.95);
      drawCore(cx, cy, (2.5 + Math.sin(phase * 2) * 0.5) * pulse, 1 + proximity * 0.4, 1);

      // Single orbit ring
      const orbit = ORBITS[0];
      angles[0] += orbit.speed * speedMult;
      const step = (Math.PI * 2) / orbit.count;
      for (let i = 0; i < orbit.count; i++) {
        const a     = angles[0] + i * step;
        const xl    = orbit.radius * 0.38 * Math.cos(a);
        const yl    = orbit.radius * 0.38 * Math.sin(a) * COMPRESSION;
        const px    = cx + xl * Math.cos(orbit.inc) - yl * Math.sin(orbit.inc);
        const py    = cy + xl * Math.sin(orbit.inc) + yl * Math.cos(orbit.inc);
        const depth = (Math.sin(a) + 1) / 2;
        ctx.save();
        ctx.globalAlpha = (0.15 + depth * 0.45) * pulse;
        ctx.fillStyle = '#F4C842';
        ctx.beginPath(); ctx.arc(px, py, 1, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    // ── Animation loop ────────────────────────────────────────────────────────
    let raf;

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bg = ctx.createRadialGradient(canvas.width / 2, canvas.height / 4, 0, canvas.width / 2, canvas.height / 4, canvas.width);
      bg.addColorStop(0, '#1a1a2e'); bg.addColorStop(1, '#0A0E1A');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);

      bgParticles.forEach(p => {
        p.x += p.speedX; p.y += p.speedY;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.save();
        if (p.isGlow) {
          const tw = 0.5 + Math.sin(phase * 1.5 + p.twinkle) * 0.35;
          ctx.globalAlpha = tw;
          const gg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
          gg.addColorStop(0, p.color); gg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = tw * 0.9; ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2); ctx.fill();
        } else if (p.type === 'cross') {
          ctx.globalAlpha = p.opacity; ctx.strokeStyle = p.color; ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x - p.size, p.y); ctx.lineTo(p.x + p.size, p.y);
          ctx.moveTo(p.x, p.y - p.size); ctx.lineTo(p.x, p.y + p.size);
          ctx.stroke();
        } else {
          ctx.globalAlpha = p.opacity; ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      });

      // ── Single star follows cursor ─────────────────────────────────────────
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      const targetX = originVX + (mx - originVX) * 0.15;
      const targetY = originVY + (my - originVY) * 0.15;
      svx += (targetX - svx) * 0.08;
      svy += (targetY - svy) * 0.08;

      const dx = mx - svx;
      const dy = my - svy;
      const proximity = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 400);

      const scale = canvas.height / window.innerHeight;
      const bx = svx;
      const by = svy * scale;

      // ── Trail ─────────────────────────────────────────────────────────────
      trail.push({ bx, by });
      if (trail.length > MAX_TRAIL) trail.shift();

      trail.forEach((pt, index) => {
        const progress = index / trail.length;             // 0 = oldest (blue), 1 = newest (gold)
        const r = Math.round(74  + (212 - 74)  * progress);
        const g = Math.round(144 + (175 - 144) * progress);
        const b = Math.round(226 + (55  - 226) * progress);
        const size    = 8 * progress;
        const opacity = progress * 0.6;

        ctx.save();
        ctx.globalAlpha  = opacity;
        ctx.shadowColor  = progress > 0.5 ? '#D4AF37' : '#4A90E2';
        ctx.shadowBlur   = 15 * progress;
        ctx.fillStyle    = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.arc(pt.bx, pt.by, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // ── Motion halo ───────────────────────────────────────────────────────
      if (prevBx !== null) {
        const vx    = bx - prevBx;
        const vy    = by - prevBy;
        const speed = Math.sqrt(vx * vx + vy * vy);

        if (speed > 1) {
          const angle   = Math.atan2(vy, vx);
          const haloLen = Math.min(speed * 12, 90);
          const opacity = Math.min(speed / 18, 0.4);

          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.translate(bx, by);
          ctx.rotate(angle);

          const hg = ctx.createLinearGradient(-haloLen, 0, 0, 0);
          hg.addColorStop(0, 'rgba(74,144,226,0)');
          hg.addColorStop(1, 'rgba(212,175,55,0.7)');

          ctx.scale(1, 0.28);
          ctx.fillStyle = hg;
          ctx.beginPath();
          ctx.arc(-haloLen / 2, 0, haloLen / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      prevBx = bx;
      prevBy = by;

      drawStar(bx, by, proximity);

      phase += 0.02;
      raf = requestAnimationFrame(animate);
    }

    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', setSize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return (
    <div style={{
      width: '100vw', height: '100vh',
      overflow: 'hidden', position: 'fixed',
      top: 0, left: 0, zIndex: -1,
      backgroundColor: '#0A0E1A', pointerEvents: 'none',
    }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
    </div>
  );
}
