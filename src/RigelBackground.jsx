import React, { useEffect, useRef } from 'react';

export default function RigelBackground() {
  const canvasRef  = useRef(null);
  const scrollYRef = useRef(0);

  // Scroll tracked via ref — no state, no re-renders, no re-init
  useEffect(() => {
    const onScroll = () => { scrollYRef.current = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Animation loop — runs once
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

    // ── Background ambient particles ──────────────────────────────────────
    const particleCount = window.innerWidth <= 768 ? 80 : 150;
    const bgParticles = [];
    for (let i = 0; i < particleCount; i++) {
      const r = Math.random();
      let color = 'rgba(139, 134, 128, 0.6)';
      if      (r > 0.85) color = 'rgba(74, 144, 226, 0.8)';
      else if (r > 0.70) color = 'rgba(212, 175, 55, 0.8)';
      bgParticles.push({
        x:      Math.random() * canvas.width,
        y:      Math.random() * canvas.height,
        size:   Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.6 + 0.2,
        type:   Math.random() > 0.7 ? 'cross' : 'dot',
        color,
      });
    }

    // ── Rigel Star: 3 inclined orbits (spec-exact) ────────────────────────
    const orbits = [
      { radius: 60,  inc:  30 * Math.PI / 180, speed: 0.005, count: 18 },
      { radius: 80,  inc: -20 * Math.PI / 180, speed: 0.003, count: 18 },
      { radius: 100, inc:  45 * Math.PI / 180, speed: 0.004, count: 18 },
    ];
    const angles = [0, 0, 0]; // mutable orbit angles
    let phase = 0;             // for pulsation

    function drawStar(cx, cy) {
      // Pulsation: spec-exact formula
      const pulse = Math.sin(phase) * 0.15 + 0.85;

      // ── Layer 1: Aura dorada difusa ───────────────────────────────────
      const aura = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120 * pulse);
      aura.addColorStop(0,    'rgba(212, 175, 55, 0.15)');
      aura.addColorStop(0.5,  'rgba(212, 175, 55, 0.06)');
      aura.addColorStop(1,    'rgba(212, 175, 55, 0)');
      ctx.save();
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, cy, 120 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ── Layer 2: Rayos cruzados, vertical 150px, horizontal 100px ─────
      const vRay = 75 * pulse; // half of 150
      const hRay = 50 * pulse; // half of 100
      [
        { dx:  0, dy: -1, len: vRay },
        { dx:  0, dy:  1, len: vRay },
        { dx:  1, dy:  0, len: hRay },
        { dx: -1, dy:  0, len: hRay },
      ].forEach(({ dx, dy, len }) => {
        const g = ctx.createLinearGradient(cx, cy, cx + dx * len, cy + dy * len);
        g.addColorStop(0,    'rgba(255, 255, 255, 0.85)');
        g.addColorStop(0.35, 'rgba(255, 255, 255, 0.20)');
        g.addColorStop(1,    'rgba(255, 255, 255, 0)');
        ctx.save();
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + dx * len, cy + dy * len);
        ctx.stroke();
        ctx.restore();
      });

      // ── Layer 3: Estrella 4 puntas, vertical 1.5× horizontal ─────────
      const vLen  = 50 * pulse;
      const hLen  = Math.round(vLen / 1.5); // ≈ 33px
      const waist = 5;
      ctx.save();
      ctx.translate(cx, cy);
      const starFill = ctx.createRadialGradient(0, 0, 0, 0, 0, vLen);
      starFill.addColorStop(0,    'rgba(255, 255, 255, 0.95)');
      starFill.addColorStop(0.18, '#D4AF37');
      starFill.addColorStop(0.65, 'rgba(212, 175, 55, 0.40)');
      starFill.addColorStop(1,    'rgba(212, 175, 55, 0)');
      ctx.beginPath();
      ctx.moveTo( 0,      -vLen);
      ctx.lineTo( waist,  -waist);
      ctx.lineTo( hLen,    0);
      ctx.lineTo( waist,   waist);
      ctx.lineTo( 0,       vLen);
      ctx.lineTo(-waist,   waist);
      ctx.lineTo(-hLen,    0);
      ctx.lineTo(-waist,  -waist);
      ctx.closePath();
      ctx.fillStyle = starFill;
      ctx.fill();
      ctx.restore();

      // ── Layer 4: Núcleo blanco 4-6px con glow intenso ────────────────
      const coreR = (4 + Math.sin(phase * 2) * 1) * pulse; // pulsates 4→6px
      ctx.save();
      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 5);
      coreGlow.addColorStop(0,    'rgba(255, 255, 255, 1)');
      coreGlow.addColorStop(0.25, 'rgba(255, 255, 255, 0.85)');
      coreGlow.addColorStop(0.55, 'rgba(255, 245, 200, 0.30)');
      coreGlow.addColorStop(1,    'rgba(255, 255, 255, 0)');
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ── Layer 5: 3 órbitas inclinadas, 18 partículas cada una ────────
      const compression = 0.30; // y-compression for tilt illusion
      orbits.forEach((orbit, oi) => {
        const step = (Math.PI * 2) / orbit.count;
        for (let i = 0; i < orbit.count; i++) {
          const a  = angles[oi] + i * step;
          const xl = orbit.radius * Math.cos(a);
          const yl = orbit.radius * Math.sin(a) * compression;
          // Rotate by inclination
          const px = cx + xl * Math.cos(orbit.inc) - yl * Math.sin(orbit.inc);
          const py = cy + xl * Math.sin(orbit.inc) + yl * Math.cos(orbit.inc);
          // Depth cue: sin < 0 → behind star → dimmer
          const depth = (Math.sin(a) + 1) / 2;
          const alpha = (0.20 + depth * 0.65) * pulse;

          ctx.save();
          ctx.globalAlpha = alpha;
          const dg = ctx.createRadialGradient(px, py, 0, px, py, 5);
          dg.addColorStop(0, 'rgba(212, 175, 55, 0.7)');
          dg.addColorStop(1, 'rgba(212, 175, 55, 0)');
          ctx.fillStyle = dg;
          ctx.beginPath();
          ctx.arc(px, py, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = (0.40 + depth * 0.60) * pulse;
          ctx.fillStyle = '#D4AF37';
          ctx.beginPath();
          ctx.arc(px, py, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        angles[oi] += orbit.speed;
      });
    }

    let raf;

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Vanilla Cream radial gradient background
      const bg = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 3, 0,
        canvas.width / 2, canvas.height / 3, canvas.width / 1.5
      );
      bg.addColorStop(0, '#F0E7D5');
      bg.addColorStop(1, '#E5D8C0');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Background particles
      bgParticles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0)             p.x = canvas.width;
        if (p.x > canvas.width)  p.x = 0;
        if (p.y < 0)             p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        if (p.type === 'cross') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x - p.size, p.y);
          ctx.lineTo(p.x + p.size, p.y);
          ctx.moveTo(p.x, p.y - p.size);
          ctx.lineTo(p.x, p.y + p.size);
          ctx.stroke();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Rigel star — position width/2, height*0.2 per spec
      // Canvas is 3× viewport height, so height*0.2 renders at 20% of viewport
      drawStar(canvas.width / 2, canvas.height * 0.2);

      phase += 0.02;
      raf = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', setSize);
    };
  }, []); // empty deps — never re-initializes

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: -1,
      backgroundColor: '#F0E7D5',
      pointerEvents: 'none',
    }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
    </div>
  );
}
