import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const RIGEL  = ['R', 'I', 'G', 'E', 'L'];
const STUDIO = ['S', 'T', 'U', 'D', 'I', 'O'];
const TOTAL_LETTERS = RIGEL.length + STUDIO.length;

// Particle data generated once (outside component — stable reference)
const PARTICLE_DATA = Array.from({ length: 50 }, (_, i) => ({
  angle: (i / 50) * Math.PI * 2 + (Math.random() * 0.4 - 0.2),
  dist:  70 + Math.random() * 140,
  size:  2 + Math.random() * 4,
}));

export default function Hero({ isScrolled }) {
  const overlayRef    = useRef(null);
  const starCenterRef = useRef(null); // dot + rays container — moves up at step 5
  const dotRef        = useRef(null);
  const raysRef       = useRef([]);   // [top, bottom, left, right]
  const ptclsRef      = useRef([]);   // 50 particles
  const letterRefs    = useRef([]);   // RIGEL + STUDIO letters
  const taglineRef    = useRef(null);
  const scrollIndRef  = useRef(null);

  useEffect(() => {
    const letters = letterRefs.current.slice(0, TOTAL_LETTERS).filter(Boolean);
    const rays    = raysRef.current.slice(0, 4).filter(Boolean);
    const ptcls   = ptclsRef.current.slice(0, 50).filter(Boolean);

    // ── Initial states ────────────────────────────────────────────────────
    gsap.set(overlayRef.current,    { opacity: 1 });
    gsap.set(starCenterRef.current, { opacity: 1 });
    gsap.set(dotRef.current,        { opacity: 0, scale: 0.25 }); // 0.25 = 2px equivalent
    if (rays[0]) gsap.set(rays[0],  { scaleY: 0, opacity: 0 });   // top
    if (rays[1]) gsap.set(rays[1],  { scaleY: 0, opacity: 0 });   // bottom
    if (rays[2]) gsap.set(rays[2],  { scaleX: 0, opacity: 0 });   // left
    if (rays[3]) gsap.set(rays[3],  { scaleX: 0, opacity: 0 });   // right
    gsap.set(ptcls,              { x: 0, y: 0, scale: 0, opacity: 0 });
    gsap.set(letters,            { opacity: 0, y: 20, rotateX: -15 });
    gsap.set(taglineRef.current, { opacity: 0, y: 20 });
    gsap.set(scrollIndRef.current, { opacity: 0, y: 10 });

    const tl = gsap.timeline();

    // ── Paso 2 (800ms): overlay fade, dot 2px aparece ────────────────────
    tl.to(overlayRef.current, { opacity: 0, duration: 1.2, ease: 'power2.inOut' }, 0.8)
      .to(dotRef.current, { opacity: 1, duration: 0.35, ease: 'power2.out' }, 0.8);

    // ── Paso 3 (1500ms): dot crece a 8px → estalla ───────────────────────
    tl.to(dotRef.current, { scale: 1, duration: 0.30, ease: 'power2.in' }, 1.5)
      // Flash explosion
      .to(dotRef.current, { opacity: 0, scale: 30, duration: 0.35, ease: 'expo.in' }, 1.80)
      // Rayos con elastic.out(1, 0.5) — spec-exact ease
      .to([rays[0], rays[1]], { scaleY: 1, opacity: 1, duration: 0.9, ease: 'elastic.out(1, 0.5)' }, 1.80)
      .to([rays[2], rays[3]], { scaleX: 1, opacity: 1, duration: 0.9, ease: 'elastic.out(1, 0.5)' }, 1.85)
      // 50 partículas en trayectorias orbitales
      .fromTo(ptcls,
        { opacity: 0.9, x: 0, y: 0, scale: 1 },
        {
          opacity: 0,
          scale: 0.25,
          x: (i) => Math.cos(PARTICLE_DATA[i]?.angle ?? 0) * (PARTICLE_DATA[i]?.dist ?? 80),
          y: (i) => Math.sin(PARTICLE_DATA[i]?.angle ?? 0) * (PARTICLE_DATA[i]?.dist ?? 80),
          duration: 1.4,
          ease: 'power3.out',
          stagger: { each: 0.015, from: 'random' },
        },
        1.80
      );

    // ── Paso 4 (2500ms): RIGEL STUDIO letra por letra ────────────────────
    // Stagger 80ms, fade + translateY 20→0 + rotateX -15→0
    tl.to(letters, {
      opacity: 1,
      y: 0,
      rotateX: 0,
      duration: 0.65,
      ease: 'power3.out',
      stagger: 0.08,
    }, 2.5);

    // ── Paso 5 (3500ms): estrella sube, tagline aparece ──────────────────
    tl.to(starCenterRef.current, {
      y: '-38vh',
      opacity: 0,
      duration: 1.0,
      ease: 'power3.inOut',
    }, 3.5)
    .to(rays, { opacity: 0, duration: 0.5 }, 3.5)
    .to(taglineRef.current, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 3.75);

    // ── Paso 6 (4200ms): scroll indicator con bounce ─────────────────────
    tl.to(scrollIndRef.current, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 4.2)
      .to(scrollIndRef.current, {
        y: 8,
        repeat: -1,
        yoyo: true,
        duration: 0.75,
        ease: 'power1.inOut',
      }, 4.85);

    return () => tl.kill();
  }, []); // runs once on mount

  return (
    <div
      className="relative z-10 flex flex-col items-center justify-center w-full min-h-screen bg-transparent"
      style={{ opacity: isScrolled ? 0 : 1, transition: 'opacity 0.5s ease' }}
    >
      {/* ── Overlay negro ── z-9999 */}
      <div
        ref={overlayRef}
        className="intro-overlay fixed inset-0 bg-black pointer-events-none"
        style={{ zIndex: 9999 }}
      />

      {/* ── Star center: dot + rays. Moves up at step 5 ── z-9998 */}
      <div
        ref={starCenterRef}
        className="fixed pointer-events-none"
        style={{ top: '50%', left: '50%', zIndex: 9998 }}
      >
        {/* Punto dorado — 8px, centered via negative margin, scale starts at 0.25 (= 2px) */}
        <div
          ref={dotRef}
          className="intro-dot rounded-full bg-[#D4AF37]"
          style={{
            width: 8,
            height: 8,
            marginTop: -4,
            marginLeft: -4,
            boxShadow: '0 0 14px 5px rgba(212,175,55,0.7)',
          }}
        />

        {/* Top ray — grows upward from center */}
        <div
          ref={el => raysRef.current[0] = el}
          style={{
            position: 'absolute',
            width: 1.5,
            height: 150,
            bottom: 0,
            left: '50%',
            marginLeft: -0.75,
            transformOrigin: 'bottom center',
            background: 'linear-gradient(to top, rgba(255,255,255,0.85), transparent)',
          }}
        />
        {/* Bottom ray */}
        <div
          ref={el => raysRef.current[1] = el}
          style={{
            position: 'absolute',
            width: 1.5,
            height: 150,
            top: 0,
            left: '50%',
            marginLeft: -0.75,
            transformOrigin: 'top center',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.85), transparent)',
          }}
        />
        {/* Left ray */}
        <div
          ref={el => raysRef.current[2] = el}
          style={{
            position: 'absolute',
            height: 1.5,
            width: 100,
            right: 0,
            top: '50%',
            marginTop: -0.75,
            transformOrigin: 'right center',
            background: 'linear-gradient(to left, rgba(255,255,255,0.85), transparent)',
          }}
        />
        {/* Right ray */}
        <div
          ref={el => raysRef.current[3] = el}
          style={{
            position: 'absolute',
            height: 1.5,
            width: 100,
            left: 0,
            top: '50%',
            marginTop: -0.75,
            transformOrigin: 'left center',
            background: 'linear-gradient(to right, rgba(255,255,255,0.85), transparent)',
          }}
        />

        {/* 50 partículas doradas */}
        <div className="intro-particles">
          {PARTICLE_DATA.map((pd, i) => (
            <div
              key={i}
              ref={el => ptclsRef.current[i] = el}
              className="absolute rounded-full bg-[#D4AF37]"
              style={{
                width:  pd.size,
                height: pd.size,
                marginTop:  -pd.size / 2,
                marginLeft: -pd.size / 2,
                boxShadow: '0 0 5px 1px rgba(212,175,55,0.55)',
              }}
            />
          ))}
        </div>
      </div>

      {/* ── hero-logo: RIGEL STUDIO ── */}
      <div className="hero-logo flex flex-col items-center text-center font-serif mt-2">
        <h1
          className="text-[15vw] md:text-[10rem] text-[#212842] tracking-tight font-bold leading-none flex"
          style={{ perspective: '800px' }}
        >
          {RIGEL.map((char, i) => (
            <span
              key={`r${i}`}
              ref={el => letterRefs.current[i] = el}
              className="letter inline-block"
            >
              {char}
            </span>
          ))}
        </h1>
        <h2
          className="text-[7.5vw] md:text-[5rem] text-[#212842] tracking-[0.2em] font-medium mt-[-10px] flex"
          style={{ perspective: '800px' }}
        >
          {STUDIO.map((char, i) => (
            <span
              key={`s${i}`}
              ref={el => letterRefs.current[RIGEL.length + i] = el}
              className="letter inline-block"
            >
              {char}
            </span>
          ))}
        </h2>
      </div>

      {/* ── hero-tagline ── */}
      <p
        ref={taglineRef}
        className="hero-tagline font-montserrat text-[3.5vw] md:text-base tracking-[0.3em] text-[#212842]/50 uppercase mt-8 text-center px-4"
      >
        Software que entiende tu negocio
      </p>

      {/* ── scroll-indicator ── */}
      <div
        ref={scrollIndRef}
        className="scroll-indicator absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
      >
        <span className="font-montserrat text-[10px] tracking-[0.4em] text-[#212842]/40 uppercase">
          Scroll
        </span>
        <div className="w-px h-8 bg-gradient-to-b from-[#D4AF37]/50 to-transparent" />
      </div>
    </div>
  );
}
