import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

// ── Constants ─────────────────────────────────────────────────────────────────
const SIZE      = 80;
const CX        = 40;
const CY        = 40;
const MAX_TRAIL = 20;

const COLORS = {
  gold:     { r: 212, g: 175, b: 55  },
  blue:     { r: 61,  g: 90,  b: 128 },
  platinum: { r: 192, g: 192, b: 192 },
  red:      { r: 255, g: 68,  b: 68  },
};

function lerpColor(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

// Elegant 4-point needle star — no orbits, delicate glow
function drawStarFrame(ctx, phase, color) {
  ctx.clearRect(0, 0, SIZE, SIZE);
  const pulse = Math.sin(phase) * 0.08 + 0.92;
  const colA  = a => `rgba(${color.r},${color.g},${color.b},${a})`;

  // Subtle ambient glow (radius 20px, very low opacity)
  const aura = ctx.createRadialGradient(CX, CY, 0, CX, CY, 20 * pulse);
  aura.addColorStop(0, colA(0.35));
  aura.addColorStop(0.5, colA(0.1));
  aura.addColorStop(1, colA(0));
  ctx.save(); ctx.fillStyle = aura;
  ctx.beginPath(); ctx.arc(CX, CY, 20 * pulse, 0, Math.PI * 2); ctx.fill(); ctx.restore();

  // 4-point needle: 8-vertex path, waist = 1px
  const vLen = 35 * pulse;
  const hLen = 22 * pulse;
  const w    = 1; // waist half-width in px (keeps it needle-thin)

  const sf = ctx.createRadialGradient(CX, CY, 0, CX, CY, vLen);
  sf.addColorStop(0,    'rgba(255,255,255,1)');
  sf.addColorStop(0.08, 'rgba(255,255,255,0.95)');
  sf.addColorStop(0.35, colA(0.75));
  sf.addColorStop(1,    colA(0));

  ctx.save(); ctx.fillStyle = sf;
  ctx.beginPath();
  ctx.moveTo(CX,     CY - vLen);   // top tip
  ctx.lineTo(CX + w, CY - w);      // top-right waist
  ctx.lineTo(CX + hLen, CY);       // right tip
  ctx.lineTo(CX + w, CY + w);      // bottom-right waist
  ctx.lineTo(CX,     CY + vLen);   // bottom tip
  ctx.lineTo(CX - w, CY + w);      // bottom-left waist
  ctx.lineTo(CX - hLen, CY);       // left tip
  ctx.lineTo(CX - w, CY - w);      // top-left waist
  ctx.closePath(); ctx.fill(); ctx.restore();

  // Bright 3px core dot
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.beginPath(); ctx.arc(CX, CY, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

// ── CSS injection ─────────────────────────────────────────────────────────────
const JOURNEY_CSS = `
  .rj-spotlight {
    box-shadow: 0 0 40px rgba(212,175,55,0.5) !important;
    border-color: rgba(212,175,55,0.7) !important;
    filter: brightness(1.1);
    transition: box-shadow 0.4s ease, border-color 0.4s ease, filter 0.4s ease, opacity 0.4s ease !important;
  }
  .rj-dimmed {
    opacity: 0.5 !important;
    filter: brightness(0.65);
    transition: opacity 0.4s ease, filter 0.4s ease !important;
  }
  .rj-nexus-glow   { border-color: rgba(61,90,128,0.85) !important;  box-shadow: 0 0 30px rgba(61,90,128,0.6) !important; }
  .rj-vanguard-glow { border-color: rgba(192,192,192,0.85) !important; box-shadow: 0 0 30px rgba(192,192,192,0.5) !important; }
  .rj-zenith-glow  { box-shadow: 0 0 60px rgba(212,175,55,0.8), 0 0 120px rgba(212,175,55,0.3) !important; }
`;

// ── Component ─────────────────────────────────────────────────────────────────
export default function RigelJourney() {
  const containerRef   = useRef(null);
  const canvasRef      = useRef(null);
  const trailCanvasRef = useRef(null);
  const trailRef       = useRef([]);
  const didRunRef      = useRef(new Set());

  const s = useRef({
    phase:           0,
    currentColor:    { ...COLORS.gold },
    targetColor:     { ...COLORS.gold },
    stage:           'none',
    frightActive:    false,
    frightCooldown:  false,
    casesActive:     false,
    casesTimeout:    null,
    currentSection:  'inicio',
  }).current;

  const alreadyRan = typeof window !== 'undefined' && !!sessionStorage.getItem('rigelJourneyDone');
  const isMobile   = typeof window !== 'undefined' && window.innerWidth <= 768;

  useEffect(() => {
    if (alreadyRan) return;

    const canvas      = canvasRef.current;
    const trailCanvas = trailCanvasRef.current;
    const container   = containerRef.current;
    if (!canvas || !trailCanvas || !container) return;

    const ctx      = canvas.getContext('2d');
    const trailCtx = trailCanvas.getContext('2d');

    // Inject CSS once
    if (!document.getElementById('rj-styles')) {
      const style = document.createElement('style');
      style.id = 'rj-styles';
      style.textContent = JOURNEY_CSS;
      document.head.appendChild(style);
    }

    // Trail canvas always fills the viewport
    const resizeTrail = () => {
      trailCanvas.width  = window.innerWidth;
      trailCanvas.height = window.innerHeight;
    };
    resizeTrail();
    window.addEventListener('resize', resizeTrail);

    // Initial position: centered above viewport, scale from center
    gsap.set(container, {
      x: window.innerWidth / 2 - CX,
      y: -SIZE,
      transformOrigin: '50% 50%',
    });

    // Mark journey as started so F5 is needed to replay
    sessionStorage.setItem('rigelJourneyDone', 'true');

    // ── Animation loop ────────────────────────────────────────────────────────
    let raf;
    const tick = () => {
      s.phase       += 0.025;
      s.currentColor = lerpColor(s.currentColor, s.targetColor, 0.05);

      // Record star position for trail
      const gx = Number(gsap.getProperty(container, 'x'));
      const gy = Number(gsap.getProperty(container, 'y'));
      trailRef.current.push({ x: gx + CX, y: gy + CY });
      if (trailRef.current.length > MAX_TRAIL) trailRef.current.shift();

      // Draw trail on full-viewport canvas
      trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
      trailRef.current.forEach((pt, idx) => {
        const progress = idx / trailRef.current.length; // 0=oldest(blue), 1=newest(gold)
        const r  = Math.round(74  + (212 - 74)  * progress);
        const g  = Math.round(144 + (175 - 144) * progress);
        const b  = Math.round(226 + (55  - 226) * progress);
        const op = progress * 0.4;
        if (op < 0.02) return;
        trailCtx.save();
        trailCtx.globalAlpha = op;
        trailCtx.shadowColor = progress > 0.5 ? '#D4AF37' : '#4A90E2';
        trailCtx.shadowBlur  = 8 * progress;
        trailCtx.fillStyle   = `rgb(${r},${g},${b})`;
        trailCtx.beginPath(); trailCtx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2); trailCtx.fill();
        trailCtx.restore();
      });

      drawStarFrame(ctx, s.phase, s.currentColor);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // ── Motion helpers ────────────────────────────────────────────────────────
    const wait = ms => new Promise(r => setTimeout(r, ms));

    // Move star center to viewport (vx, vy)
    const moveStar = (vx, vy, ms, ease = 'power2.out') =>
      new Promise(resolve =>
        gsap.to(container, {
          x: vx - CX, y: vy - CY,
          duration: ms / 1000,
          ease, overwrite: 'auto',
          onComplete: resolve,
        })
      );

    // Arc jump: X linear, Y parabola
    const arcJump = (toX, toY, ms, peakDrop = 70) => {
      const gy   = Number(gsap.getProperty(container, 'y'));
      const fromY = gy + CY;
      return new Promise(resolve => {
        const dur = ms / 1000;
        const tl  = gsap.timeline({ onComplete: resolve });
        tl.to(container, { x: toX - CX, duration: dur, ease: 'none' }, 0);
        tl.to(container, { y: fromY - peakDrop - CY, duration: dur * 0.5, ease: 'power2.out' }, 0);
        tl.to(container, { y: toY - CY, duration: dur * 0.5, ease: 'power2.in' }, dur * 0.5);
      });
    };

    // Dramatic arrive bounce (700ms, elastic feel)
    const arriveAnim = () => {
      const curY = Number(gsap.getProperty(container, 'y'));
      return new Promise(resolve =>
        gsap.to(container, {
          keyframes: [
            { scale: 1.6, y: curY - 30, duration: 0.14, ease: 'power2.out' },
            { scale: 0.85, y: curY + 5,  duration: 0.12, ease: 'power2.in' },
            { scale: 1.3, y: curY - 15, duration: 0.14, ease: 'power2.out' },
            { scale: 0.95, y: curY + 2,  duration: 0.10, ease: 'power2.in' },
            { scale: 1.0, y: curY,      duration: 0.10, ease: 'power2.out', onComplete: resolve },
          ]
        })
      );
    };

    const shake = (amp = 15, times = 3) => {
      const curX = Number(gsap.getProperty(container, 'x'));
      const kf   = [];
      for (let i = 0; i < times; i++) {
        kf.push({ x: curX + amp, duration: 0.07, ease: 'none' });
        kf.push({ x: curX - amp, duration: 0.07, ease: 'none' });
      }
      kf.push({ x: curX, duration: 0.07, ease: 'none' });
      return new Promise(resolve => gsap.to(container, { keyframes: kf, onComplete: resolve }));
    };

    // ── Card effect helpers ───────────────────────────────────────────────────
    const spotlightCards = (active, all) => {
      all.forEach(c => {
        c.classList.remove('rj-spotlight', 'rj-dimmed');
        c.classList.add(c === active ? 'rj-spotlight' : 'rj-dimmed');
      });
    };
    const clearCards = all => { all.forEach(c => c.classList.remove('rj-spotlight', 'rj-dimmed')); };

    // ── Follow current section (scroll-up behavior) ───────────────────────────
    let followTimer = null;
    const followCurrentSection = () => {
      const map = {
        inicio:    '.hero-logo',
        filosofia: '#filosofia article p',
        casos:     '.case-card',
        planes:    '.card-nexus',
        contacto:  '#contacto',
      };
      const el = document.querySelector(map[s.currentSection] || `#${s.currentSection}`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      gsap.to(container, {
        x: window.innerWidth / 2 - CX,
        y: r.top - 30 - CY,
        duration: 1.0,
        ease: 'power2.out',
        overwrite: true,
      });
    };

    // ── Scroll fright (400px/s threshold, red flash) ──────────────────────────
    const triggerFright = async () => {
      if (s.frightActive || s.frightCooldown || s.stage === 'final') return;
      s.frightActive   = true;
      s.frightCooldown = true;

      const curY       = Number(gsap.getProperty(container, 'y'));
      const prevTarget = { ...s.targetColor };

      await new Promise(r => gsap.to(container, { y: curY - 120, duration: 0.10, ease: 'power3.out', onComplete: r }));
      await shake(20, 3);
      s.targetColor = { ...COLORS.red };
      await wait(300);
      s.targetColor = prevTarget;
      await new Promise(r => gsap.to(container, { y: curY, duration: 0.40, ease: 'power4.in', onComplete: r }));

      s.frightActive = false;
      setTimeout(() => { s.frightCooldown = false; }, 2000);
    };

    let lastScrollY    = window.scrollY;
    let lastScrollTime = performance.now();

    const onScroll = () => {
      const now      = performance.now();
      const elapsed  = Math.max(1, now - lastScrollTime);
      const velocity = Math.abs(window.scrollY - lastScrollY) / elapsed * 1000;
      const goingUp  = window.scrollY < lastScrollY;

      if (velocity > 400) triggerFright();

      if (goingUp && s.stage !== 'none') {
        if (followTimer) clearTimeout(followTimer);
        followTimer = setTimeout(followCurrentSection, 200);
      }

      lastScrollY    = window.scrollY;
      lastScrollTime = now;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // ── Stage functions ───────────────────────────────────────────────────────

    const runIntroSequence = async () => {
      s.stage = 'intro';
      const letters  = Array.from(document.querySelectorAll('.hero-logo .letter'));
      const flashed  = new Set();
      const targetVY = window.innerHeight * 0.45;

      await new Promise(resolve =>
        gsap.to(container, {
          y: targetVY - CY,
          duration: 1.5,
          ease: 'power2.in',
          onUpdate: () => {
            const starY = Number(gsap.getProperty(container, 'y')) + CY;
            letters.forEach((el, i) => {
              if (flashed.has(i)) return;
              const r = el.getBoundingClientRect();
              if (starY >= r.top - 10 && starY <= r.bottom + 10) {
                flashed.add(i);
                el.style.transition = 'color 0.08s ease';
                el.style.color = '#D4AF37';
                setTimeout(() => { el.style.color = '#F0E7D5'; }, 300);
              }
            });
          },
          onComplete: resolve,
        })
      );
      await shake(8, 3);
    };

    const runPhilosophySequence = async () => {
      s.stage = 'filosofia';
      const el = document.querySelector('#filosofia article p');
      if (!el) return;
      const r = el.getBoundingClientRect();
      await moveStar(window.innerWidth / 2, r.top - 25, 900, 'power2.out');
    };

    const stopCasesLoop = () => {
      s.casesActive = false;
      if (s.casesTimeout) { clearTimeout(s.casesTimeout); s.casesTimeout = null; }
      clearCards(Array.from(document.querySelectorAll('.case-card')));
    };

    const runCasesSequence = async () => {
      if (s.casesActive) return;
      s.stage      = 'casos';
      s.casesActive = true;
      s.targetColor = { ...COLORS.gold };

      const cards = Array.from(document.querySelectorAll('.case-card'));
      if (!cards.length) return;

      let idx      = 0;
      let prevCard = null;

      const visitNext = async () => {
        if (!s.casesActive) return;
        const card = cards[idx];
        spotlightCards(card, cards);

        const r  = card.getBoundingClientRect();
        const tx = r.left + r.width / 2;
        const ty = r.top - 25;           // 25px above card top edge

        if (!prevCard) await moveStar(tx, ty, 700, 'power2.out');
        else           await arcJump(tx, ty, 700, 70);

        await arriveAnim();
        prevCard = card;
        idx = (idx + 1) % cards.length;
        if (s.casesActive) s.casesTimeout = setTimeout(visitNext, 2500);
      };

      visitNext();
    };

    const runLevelsSequence = async () => {
      if (s.stage === 'planes' || s.stage === 'final') return;
      s.stage = 'planes';
      stopCasesLoop();
      gsap.killTweensOf(container);
      trailRef.current = [];

      // "Get serious": center + rapid pulse
      await moveStar(window.innerWidth / 2, window.innerHeight / 2, 600, 'power2.out');
      await new Promise(r => gsap.to(container, {
        keyframes: [
          { scale: 1.25, duration: 0.15, ease: 'power2.out' },
          { scale: 0.9,  duration: 0.12, ease: 'power2.in'  },
          { scale: 1.0,  duration: 0.13, ease: 'power2.out', onComplete: r },
        ]
      }));
      await wait(300);

      // Descend toward #planes
      const planesEl = document.querySelector('#planes');
      if (!planesEl) return;
      const pr = planesEl.getBoundingClientRect();
      await moveStar(window.innerWidth / 2, pr.top + 80, 900, 'power2.in');
      await wait(300);

      const memberCards = [
        document.querySelector('.card-nexus'),
        document.querySelector('.card-vanguard'),
        document.querySelector('.card-zenith'),
      ].filter(Boolean);

      // ── NEXUS (gold → blue) ───────────────────────────────────────────────
      const nexus = memberCards[0];
      if (nexus && s.stage === 'planes') {
        s.targetColor = { ...COLORS.blue };
        const r = nexus.getBoundingClientRect();
        await arcJump(r.left + r.width / 2, r.top - 25, 850, 65);
        spotlightCards(nexus, memberCards);
        nexus.classList.add('rj-nexus-glow');
        await arriveAnim();
        await wait(2000);
        nexus.classList.remove('rj-nexus-glow');
      }

      // ── VANGUARD (blue → platinum) ────────────────────────────────────────
      const vanguard = memberCards[1];
      if (vanguard && s.stage === 'planes') {
        s.targetColor = { ...COLORS.platinum };
        const r = vanguard.getBoundingClientRect();
        await arcJump(r.left + r.width / 2, r.top - 25, 850, 65);
        spotlightCards(vanguard, memberCards);
        vanguard.classList.add('rj-vanguard-glow');
        await arriveAnim();
        await wait(2000);
        vanguard.classList.remove('rj-vanguard-glow');
      }

      // ── ZENITH (platinum → gold, triple bounce) ───────────────────────────
      const zenith = memberCards[2];
      if (zenith && s.stage === 'planes') {
        s.targetColor = { ...COLORS.gold };
        const r = zenith.getBoundingClientRect();
        await arcJump(r.left + r.width / 2, r.top - 25, 950, 100);
        spotlightCards(zenith, memberCards);
        zenith.classList.add('rj-zenith-glow');

        await arriveAnim();
        await wait(250);
        await arriveAnim();
        await wait(200);
        await arriveAnim();
        await wait(2500);

        zenith.classList.remove('rj-zenith-glow');
        clearCards(memberCards);

        if (s.stage !== 'planes') return;

        // ── Slide down right edge of Zenith ────────────────────────────────
        const zr   = zenith.getBoundingClientRect();
        const curY = Number(gsap.getProperty(container, 'y'));

        // Step 1: slide to right edge (same y, move x to right border)
        await moveStar(zr.right - 20, curY + CY, 800, 'power2.inOut');
        // Step 2: slide down the right edge
        await moveStar(zr.right - 20, zr.bottom + 20, 600, 'power2.in');
        // Step 3: small bounce at bottom of Zenith
        const landY = Number(gsap.getProperty(container, 'y'));
        await new Promise(r => gsap.to(container, {
          keyframes: [
            { y: landY - 15, duration: 0.18, ease: 'power2.out' },
            { y: landY,      duration: 0.20, ease: 'power2.in', onComplete: r },
          ]
        }));

        // Step 4: glide to 50px above "Iniciando convergencia."
        const ctaEl = document.querySelector('.cta-text');
        if (ctaEl) {
          const cr = ctaEl.getBoundingClientRect();
          await moveStar(cr.left + cr.width / 2, cr.top - 50, 1000, 'power3.out');
        }

        s.stage = 'final';
      }
    };

    // ── Section observer dispatch ─────────────────────────────────────────────
    const handleSectionEnter = id => {
      s.currentSection = id;
      if (didRunRef.current.has(id)) return;
      didRunRef.current.add(id);
      switch (id) {
        case 'inicio':    runIntroSequence();      break;
        case 'filosofia': runPhilosophySequence(); break;
        case 'casos':     runCasesSequence();      break;
        case 'planes':    runLevelsSequence();     break;
      }
    };

    const sectionObs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) handleSectionEnter(e.target.id); }),
      { threshold: 0.3 }
    );
    const visibilityObs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) s.currentSection = e.target.id; }),
      { threshold: 0.5 }
    );
    const casesLeaveObs = new IntersectionObserver(
      entries => entries.forEach(e => { if (!e.isIntersecting) stopCasesLoop(); }),
      { threshold: 0.05 }
    );

    document.querySelectorAll('section[id]').forEach(sec => {
      sectionObs.observe(sec);
      visibilityObs.observe(sec);
      if (sec.id === 'casos') casesLeaveObs.observe(sec);
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resizeTrail);
      if (followTimer) clearTimeout(followTimer);
      stopCasesLoop();
      gsap.killTweensOf(container);
      sectionObs.disconnect();
      visibilityObs.disconnect();
      casesLeaveObs.disconnect();
    };
  }, [alreadyRan]);

  if (alreadyRan || isMobile) return null;

  return (
    <>
      {/* Full-viewport trail canvas */}
      <canvas
        ref={trailCanvasRef}
        style={{
          position: 'fixed', top: 0, left: 0,
          width: '100vw', height: '100vh',
          zIndex: 8999,
          pointerEvents: 'none',
        }}
      />
      {/* Star canvas — repositioned via GSAP transform */}
      <div
        ref={containerRef}
        style={{
          position: 'fixed', top: 0, left: 0,
          zIndex: 9000,
          pointerEvents: 'none',
        }}
      >
        <canvas ref={canvasRef} width={SIZE} height={SIZE} style={{ display: 'block' }} />
      </div>
    </>
  );
}
