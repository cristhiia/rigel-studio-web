import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';
import Hero from '../sections/Hero';
import Philosophy from '../sections/Philosophy';
import Cases from '../sections/Cases';
import MembershipSection from '../sections/MembershipSection';
import Contact from '../sections/Contact';
import RigelBackground from '../canvas/RigelBackground';
import ThreadLine from '../effects/ThreadLine';
import EasterEgg from '../effects/EasterEgg';
import RigelJourney from '../effects/RigelJourney';

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
      // Broadcast real scroll position to components that can't read it via Lenis
      window.dispatchEvent(new CustomEvent('lenis-scroll', { detail: { scroll } }));
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

    // ── Animación 2: Flash dorado vía IntersectionObserver ───────────────
    const flashEl = document.querySelector('.transition-flash');
    const fireFlash = () => {
      if (!flashEl) return;
      flashEl.style.transition = 'opacity 0.25s ease';
      flashEl.style.opacity = '0.30';
      setTimeout(() => {
        flashEl.style.transition = 'opacity 0.40s ease';
        flashEl.style.opacity = '0';
      }, 250);
    };
    const flashObs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) fireFlash(); });
    }, { threshold: 0.15 });
    ['#filosofia', '#casos', '#planes', '#contacto'].forEach(id => {
      const el = document.querySelector(id);
      if (el) flashObs.observe(el);
    });

    // ── Animación 3: Cards Casos de Estudio vía IntersectionObserver ──────
    const cardObs = new IntersectionObserver((entries) => {
      entries.forEach((e, idx) => {
        if (e.isIntersecting) {
          const delay = parseInt(e.target.dataset.delay || '0');
          setTimeout(() => e.target.classList.add('visible'), delay);
          cardObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.case-card').forEach((card, i) => {
      card.dataset.delay = String(i * 150);
      cardObs.observe(card);
    });

    // ── Animación 5.5: Section entrance via IntersectionObserver ─────────
    const sectionObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          sectionObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.fade-section').forEach(el => sectionObs.observe(el));

    // ── Animación 6: CTA texto iluminado (gradient sweep) ─────────────────
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
      flashObs.disconnect();
      cardObs.disconnect();
      sectionObs.disconnect();
    };
  }, []); // runs once

  return (
    <>
      <RigelBackground />
      <RigelJourney />
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

      <div className="w-full relative">

        {/* ── Nav fijo ─────────────────────────────────────────────────── */}
        <nav
          className="fixed top-0 left-0 w-full px-8 py-5 flex items-center justify-between pointer-events-none transition-all duration-500"
          style={{
            opacity: isScrolled ? 1 : 0,
            zIndex: 9999,
            background: 'rgba(10,14,26,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(212,175,55,0.15)',
          }}
        >
          <div className="flex items-baseline pointer-events-auto">
            <span className="font-playfair font-bold text-3xl" style={{ color: '#F0E7D5' }}>R</span>
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
                style={{ color: '#F0E7D5' }}
                onMouseEnter={e => e.target.style.color = '#D4AF37'}
                onMouseLeave={e => e.target.style.color = '#F0E7D5'}
              >
                {label}
              </a>
            ))}
            <a
              href="#contacto"
              className="font-montserrat text-sm px-6 py-2"
              style={{ color: '#D4AF37', border: '1px solid rgba(212,175,55,0.5)', transition: 'all 0.3s ease' }}
              onMouseEnter={e => { e.target.style.background = '#D4AF37'; e.target.style.color = '#0A0E1A'; }}
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
              style={{ zIndex: 60, background: 'rgba(0,5,20,0.85)', backdropFilter: 'blur(15px)' }}
              onClick={() => setSelectedCase(null)}
            >
              <motion.div
                initial={{ y: 50, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full shadow-2xl relative"
                style={{
                  maxWidth: '600px',
                  padding: '40px',
                  background: 'rgba(10,14,26,0.97)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(212,175,55,0.3)',
                  borderTop: '3px solid #D4AF37',
                }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedCase(null)}
                  className="absolute font-montserrat text-xs uppercase tracking-widest"
                  style={{
                    top: 20, right: 20,
                    width: 40, height: 40,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(240,231,213,0.4)',
                    background: 'rgba(240,231,213,0.04)',
                    border: '1px solid rgba(240,231,213,0.15)',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '1rem',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#D4AF37'; e.currentTarget.style.borderColor = '#D4AF37'; e.currentTarget.style.background = 'rgba(212,175,55,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(240,231,213,0.4)'; e.currentTarget.style.borderColor = 'rgba(240,231,213,0.15)'; e.currentTarget.style.background = 'rgba(240,231,213,0.04)'; }}
                >
                  ✕
                </button>
                <span className="font-montserrat text-xs uppercase tracking-[0.3em] mb-3 block" style={{ color: '#D4AF37' }}>
                  {selectedCase.tag}
                </span>
                <h3 className="font-serif font-bold mb-8" style={{ fontSize: '2.5rem', color: '#F0E7D5', lineHeight: 1.15 }}>
                  {selectedCase.title}
                </h3>
                <div className="grid md:grid-cols-2 gap-8" style={{ color: 'rgba(240,231,213,0.75)' }}>
                  <div>
                    <h4 className="font-montserrat font-bold uppercase mb-3" style={{ color: '#D4AF37', fontSize: '0.7rem', letterSpacing: '0.25em' }}>El Desafío</h4>
                    <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>{selectedCase.problem}</p>
                  </div>
                  <div>
                    <h4 className="font-montserrat font-bold uppercase mb-3" style={{ color: '#D4AF37', fontSize: '0.7rem', letterSpacing: '0.25em' }}>La Solución</h4>
                    <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>{selectedCase.solution}</p>
                    <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(212,175,55,0.15)' }}>
                      <h4 className="font-montserrat font-bold uppercase mb-3" style={{ color: '#D4AF37', fontSize: '0.7rem', letterSpacing: '0.25em' }}>Resultado Táctico</h4>
                      <p style={{ fontSize: '0.9rem', lineHeight: 1.75, fontStyle: 'italic', opacity: 0.7 }}>
                        Implementación desplegada con éxito. Eficiencia operativa maximizada.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-10 text-center pt-8" style={{ borderTop: '1px solid rgba(212,175,55,0.15)' }}>
                  <button
                    className="font-montserrat uppercase tracking-widest font-semibold"
                    style={{ background: '#D4AF37', color: '#0A0E1A', border: 'none', padding: '14px 40px', fontSize: '0.8rem', letterSpacing: '0.2em', cursor: 'pointer', transition: 'background 0.3s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F4C842'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#D4AF37'; }}
                  >
                    Solicitar Demo Exclusiva
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Secciones ─────────────────────────────────────────────────── */}
        <section id="inicio" className="fade-section h-screen w-full flex items-center justify-center relative">
          <Hero isScrolled={isScrolled} />
        </section>

        <section id="filosofia" className="fade-section min-h-screen w-full relative" style={{ zIndex: 10 }}>
          <Philosophy />
        </section>

        <section id="casos" className="fade-section min-h-screen w-full relative" style={{ zIndex: 10 }}>
          <Cases onSelectCase={setSelectedCase} />
        </section>

        <section id="planes" className="fade-section w-full relative" style={{ zIndex: 10 }}>
          <MembershipSection />
        </section>

        {/* CTA transitional — gradient sweep animation */}
        <section className="fade-section w-full pt-40 pb-20 flex items-center justify-center relative" style={{ zIndex: 10 }}>
          <p
            className="cta-text font-playfair italic text-xl text-center"
            style={{
              background: 'linear-gradient(90deg, rgba(240,231,213,0.5), #D4AF37, rgba(240,231,213,0.5))',
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

        <section id="contacto" className="fade-section min-h-screen w-full relative" style={{ zIndex: 10 }}>
          <Contact />
        </section>
      </div>
    </>
  );
}
