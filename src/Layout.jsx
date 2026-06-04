import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';
import Hero from './Hero';
import Philosophy from './Philosophy';
import Cases from './Cases';
import MembershipSection from './MembershipSection';
import Contact from './Contact';
import RigelBackground from './RigelBackground';
import ThreadLine from './components/effects/ThreadLine';
import EasterEgg from './components/effects/EasterEgg';

gsap.registerPlugin(ScrollTrigger);

export default function Layout() {
  const [isScrolled,   setIsScrolled]   = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);

  useEffect(() => {
    // ── Lenis smooth scroll ───────────────────────────────────────────────
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      smoothTouch: false,
    });

    // Sync Lenis → ScrollTrigger (spec-exact pattern)
    lenis.on('scroll', ({ scroll }) => {
      setIsScrolled(scroll > 50);
      ScrollTrigger.update();
    });

    // GSAP ticker drives Lenis (replaces manual requestAnimationFrame)
    const rafFn = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(rafFn);
    gsap.ticker.lagSmoothing(0);

    // ── Animación 1: Hero logo se expande y desenfoca al scrollear ────────
    gsap.to('.hero-logo', {
      y: -150,
      scale: 1.2,
      opacity: 0.4,
      filter: 'blur(2px)',
      ease: 'none',
      scrollTrigger: {
        trigger: '#inicio',
        start: 'top top',
        end: 'bottom top',
        scrub: 1.2,
      },
    });
    gsap.to('.hero-tagline', {
      y: -100,
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: '#inicio',
        start: 'top top',
        end: 'bottom top',
        scrub: 1.2,
      },
    });

    // ── Animación 2: Flash dorado sutil entre secciones ───────────────────
    ['#filosofia', '#casos', '#planes', '#contacto'].forEach(id => {
      ScrollTrigger.create({
        trigger: id,
        start: 'top 80%',
        onEnter: () => {
          gsap.to('.transition-flash', { opacity: 0.30, duration: 0.25, ease: 'power2.out' });
          gsap.to('.transition-flash', { opacity: 0,    duration: 0.40, ease: 'power2.in', delay: 0.25 });
        },
        onEnterBack: () => {
          gsap.to('.transition-flash', { opacity: 0.20, duration: 0.25, ease: 'power2.out' });
          gsap.to('.transition-flash', { opacity: 0,    duration: 0.40, ease: 'power2.in', delay: 0.25 });
        },
      });
    });

    // ── Animación 3: Cards Casos de Estudio con entrada 3D ────────────────
    gsap.utils.toArray('.case-card').forEach((card, i) => {
      gsap.fromTo(
        card,
        { opacity: 0, y: 100, rotationY: 15, rotationX: -10, scale: 0.9, transformPerspective: 800 },
        {
          opacity: 1, y: 0, rotationY: 0, rotationX: 0, scale: 1,
          duration: 1.2,
          ease: 'power3.out',
          delay: i * 0.15,
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

    // ── Animación 4: Night Mode en sección Zenith ─────────────────────────
    ScrollTrigger.create({
      trigger: '.section-zenith-experience',
      start: 'top center',
      end: 'bottom center',
      onEnter: () => {
        document.body.classList.add('night-mode');
        gsap.to('.night-overlay', { opacity: 0.88, duration: 1.5, ease: 'power2.inOut' });
      },
      onLeave: () => {
        document.body.classList.remove('night-mode');
        gsap.to('.night-overlay', { opacity: 0, duration: 1.5, ease: 'power2.inOut' });
      },
      onEnterBack: () => {
        document.body.classList.add('night-mode');
        gsap.to('.night-overlay', { opacity: 0.88, duration: 1.5, ease: 'power2.inOut' });
      },
      onLeaveBack: () => {
        document.body.classList.remove('night-mode');
        gsap.to('.night-overlay', { opacity: 0, duration: 1.5, ease: 'power2.inOut' });
      },
    });

    // ── Animación 5: CTA texto iluminado (gradient sweep) ─────────────────
    gsap.fromTo('.cta-text',
      { backgroundPosition: '0% 50%' },
      {
        backgroundPosition: '100% 50%',
        ease: 'none',
        scrollTrigger: {
          trigger: '.cta-text',
          start: 'top 80%',
          end: 'bottom 20%',
          scrub: true,
        },
      }
    );

    return () => {
      lenis.destroy();
      gsap.ticker.remove(rafFn);
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []); // runs once

  return (
    <>
      <RigelBackground />
      <ThreadLine />
      <EasterEgg />

      {/* Flash dorado entre secciones — z-50 */}
      <div
        className="transition-flash fixed inset-0 pointer-events-none"
        style={{
          zIndex: 50,
          opacity: 0,
          background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.45) 0%, transparent 70%)',
        }}
      />

      {/* Night mode overlay — cubre canvas cuando entra Zenith */}
      <div
        className="night-overlay fixed inset-0 pointer-events-none"
        style={{ zIndex: 5, opacity: 0, backgroundColor: '#212842' }}
      />

      <div className="w-full relative">

        {/* ── Nav fijo ─────────────────────────────────────────────────── */}
        <nav
          className="fixed top-0 left-0 w-full px-8 py-5 flex items-center justify-between pointer-events-none transition-all duration-500"
          style={{
            opacity: isScrolled ? 1 : 0,
            zIndex: 9999,
            background: 'rgba(240, 231, 213, 0.90)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(212, 175, 55, 0.20)',
          }}
        >
          <div className="flex items-baseline pointer-events-auto">
            <span className="font-playfair font-bold text-3xl" style={{ color: '#212842' }}>R</span>
            <span className="font-playfair font-bold text-2xl ml-1" style={{ color: '#D4AF37' }}>✦</span>
          </div>
          <div className="hidden md:flex items-center gap-8 pointer-events-auto">
            {[
              ['Inicio',          '#inicio'],
              ['Filosofía',       '#filosofia'],
              ['Casos de Estudio','#casos'],
            ].map(([label, href]) => (
              <a key={href} href={href}
                className="font-montserrat text-sm transition-colors"
                style={{ color: '#212842' }}
                onMouseEnter={e => e.target.style.color = '#D4AF37'}
                onMouseLeave={e => e.target.style.color = '#212842'}
              >
                {label}
              </a>
            ))}
            <a
              href="#contacto"
              className="font-montserrat text-sm px-6 py-2"
              style={{ color: '#D4AF37', border: '1px solid #D4AF37', transition: 'all 0.3s ease' }}
              onMouseEnter={e => { e.target.style.background = '#D4AF37'; e.target.style.color = '#212842'; }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#D4AF37'; }}
            >
              Iniciar Proyecto
            </a>
          </div>
        </nav>

        {/* ── Modal de casos de estudio ─────────────────────────────────── */}
        <AnimatePresence>
          {selectedCase && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="fixed inset-0 flex items-center justify-center p-4"
              style={{ zIndex: 60, background: 'rgba(0,26,51,0.60)', backdropFilter: 'blur(15px)' }}
              onClick={() => setSelectedCase(null)}
            >
              <motion.div
                initial={{ y: 50, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white/40 backdrop-blur-md w-full max-w-3xl p-12 md:p-16 shadow-xl relative"
                style={{ borderTop: '4px solid #D4AF37' }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedCase(null)}
                  className="absolute top-6 right-6 font-montserrat text-sm uppercase tracking-widest transition-colors"
                  style={{ color: 'rgba(33,40,66,0.5)' }}
                  onMouseEnter={e => e.target.style.color = '#D4AF37'}
                  onMouseLeave={e => e.target.style.color = 'rgba(33,40,66,0.5)'}
                >
                  Cerrar ✕
                </button>
                <span className="font-montserrat text-xs uppercase tracking-[0.3em] text-[#856612] mb-4 block">
                  {selectedCase.tag}
                </span>
                <h3 className="font-serif text-5xl md:text-6xl font-bold text-[#212842] mb-12">
                  {selectedCase.title}
                </h3>
                <div className="grid md:grid-cols-2 gap-12 font-serif text-[#4a4540]">
                  <div>
                    <h4 className="text-[#856612] text-xs tracking-[0.3em] font-bold uppercase mb-4 font-montserrat">EL DESAFÍO</h4>
                    <p className="text-xl md:text-2xl leading-[1.8]">{selectedCase.problem}</p>
                  </div>
                  <div>
                    <h4 className="text-[#856612] text-xs tracking-[0.3em] font-bold uppercase mb-4 font-montserrat">LA SOLUCIÓN</h4>
                    <p className="text-xl md:text-2xl leading-[1.8]">{selectedCase.solution}</p>
                    <div className="mt-8 border-t border-[#856612]/10 pt-8">
                      <h4 className="text-[#856612] text-xs tracking-[0.3em] font-bold uppercase mb-4 font-montserrat">RESULTADO TÁCTICO</h4>
                      <p className="text-lg leading-[1.8] italic opacity-90">
                        Implementación desplegada con éxito. Eficiencia operativa maximizada.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-16 text-center border-t border-[#856612]/10 pt-12">
                  <button
                    className="font-serif text-lg text-white uppercase px-12 py-5 tracking-widest font-bold transition-colors duration-500"
                    style={{ background: '#4a90e2' }}
                    onMouseEnter={e => e.target.style.background = '#D4AF37'}
                    onMouseLeave={e => e.target.style.background = '#4a90e2'}
                  >
                    Solicitar Demo Exclusiva
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Secciones ─────────────────────────────────────────────────── */}
        <section id="inicio" className="h-screen w-full flex items-center justify-center relative" style={{ zIndex: 10 }}>
          <Hero isScrolled={isScrolled} />
        </section>

        <section id="filosofia" className="min-h-screen w-full relative" style={{ zIndex: 10 }}>
          <Philosophy />
        </section>

        <section id="casos" className="min-h-screen w-full relative" style={{ zIndex: 10 }}>
          <Cases onSelectCase={setSelectedCase} />
        </section>

        {/* section-zenith-experience → triggers night mode */}
        <section id="planes" className="section-zenith-experience w-full relative" style={{ zIndex: 10 }}>
          <MembershipSection />
        </section>

        {/* CTA transitional — gradient sweep animation */}
        <section className="w-full pt-40 pb-20 flex items-center justify-center relative" style={{ zIndex: 10 }}>
          <p
            className="cta-text font-playfair italic text-xl text-center"
            style={{
              background: 'linear-gradient(90deg, #212842, #D4AF37, #212842)',
              backgroundSize: '200% 100%',
              backgroundPosition: '0% 50%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Iniciando convergencia.
          </p>
        </section>

        <section id="contacto" className="min-h-screen w-full relative" style={{ zIndex: 10 }}>
          <Contact />
        </section>
      </div>
    </>
  );
}
