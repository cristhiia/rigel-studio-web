import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';
import Hero from '../sections/Hero';
import Philosophy from '../sections/Philosophy';
import Cases from '../sections/Cases';
import TechStack from '../sections/TechStack';
import MembershipSection from '../sections/MembershipSection';
import FAQ from '../sections/FAQ';
import Contact from '../sections/Contact';
import RigelBackground from '../canvas/RigelBackground';
import ThreadLine from '../effects/ThreadLine';
import EasterEgg from '../effects/EasterEgg';
import RigelJourney from '../effects/RigelJourney';

gsap.registerPlugin(ScrollTrigger);

const NAV_LINKS = [
  ['Inicio',           '#inicio'],
  ['Filosofía',        '#filosofia'],
  ['Casos de Estudio', '#casos'],
  ['Iniciar Proyecto', '#contacto'],
];

export default function Layout() {
  const [isScrolled,     setIsScrolled]     = useState(false);
  const [selectedCase,   setSelectedCase]   = useState(null);
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [easterEggOpen,  setEasterEggOpen]  = useState(false);

  // Lock body scroll when mobile menu OR modal open
  useEffect(() => {
    document.body.style.overflow = (menuOpen || selectedCase) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen, selectedCase]);

  // Escape key closes modal
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setSelectedCase(null); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    // ── Lenis smooth scroll ───────────────────────────────────────────────
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
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
      opacity: 0.3,
      ease: 'none',
      scrollTrigger: {
        trigger: '#inicio',
        start: 'top top',
        end: 'bottom top',
        scrub: 1.2,
        onToggle: self => gsap.set('.hero-logo', { willChange: self.isActive ? 'transform, opacity' : 'auto' }),
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
        onToggle: self => gsap.set('.hero-tagline', { willChange: self.isActive ? 'transform, opacity' : 'auto' }),
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
    ['#filosofia', '#casos', '#tecnologias', '#planes', '#faq', '#contacto'].forEach(id => {
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

  const handleMobileNav = (href) => {
    setMenuOpen(false);
    setTimeout(() => {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 400);
  };

  return (
    <>
      <RigelBackground />
      <RigelJourney />
      <ThreadLine />
      <EasterEgg open={easterEggOpen} onClose={() => setEasterEggOpen(false)} />

      {/* ── Hamburger — mobile only, always visible ── */}
      <div
        className="hamburger-btn"
        onClick={() => setMenuOpen(prev => !prev)}
        role="button"
        aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
      >
        <span />
        <span style={{ opacity: menuOpen ? 0 : 1, transform: menuOpen ? 'scaleX(0)' : 'scaleX(1)' }} />
        <span />
      </div>

      {/* ── Mobile fullscreen menu ── */}
      <div className={`mobile-menu-overlay ${menuOpen ? 'open' : ''}`}>
        <div
          role="button"
          onClick={() => setMenuOpen(false)}
          className="glass-circle-btn"
          style={{ position: 'absolute', top: 24, right: 24, fontSize: '1.2rem' }}
        >
          ✕
        </div>
        <div className="glass-card mobile-menu-links">
          {NAV_LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              onClick={(e) => { e.preventDefault(); handleMobileNav(href); }}
            >
              {label}
            </a>
          ))}
        </div>
      </div>

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

        {/* ── Nav flotante tipo píldora ────────────────────────────────── */}
        <nav className={`nav-pill ${isScrolled ? 'scrolled' : ''}`}>
          <div className="flex items-baseline">
            <span className="font-playfair font-bold text-2xl" style={{ color: '#F0E7D5' }}>R</span>
            <span
              onClick={() => setEasterEggOpen(true)}
              className="font-playfair font-bold text-xl ml-1"
              style={{ color: '#D4AF37', cursor: 'pointer' }}
            >
              ✦
            </span>
          </div>
          <div className="desktop-nav-links hidden md:flex items-center gap-8">
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
          </div>
          <a href="#contacto" className="nav-cta-btn hidden md:inline-block">
            Iniciar Proyecto
          </a>
        </nav>

        {/* ── Modal de casos de estudio ─────────────────────────────────── */}
        <AnimatePresence>
          {selectedCase && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                position: 'fixed', inset: 0,
                overflowY: 'auto', overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch',
                zIndex: 9999,
                background: 'rgba(0,5,20,0.90)',
                backdropFilter: 'blur(15px)',
              }}
              onClick={() => setSelectedCase(null)}
            >
              {/* Centrado desktop / fullscreen mobile */}
              <div
                className="min-h-full flex items-start md:items-center justify-center"
                style={{ padding: '20px 20px 40px' }}
              >
                <motion.div
                  initial={{ y: 40, opacity: 0, scale: 0.96 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 20, opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-card w-full"
                  style={{ maxWidth: '680px', padding: '28px 28px' }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Botón X — dentro del card, alineado a la derecha */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <button
                      onClick={() => setSelectedCase(null)}
                      style={{
                        width: 40, height: 40,
                        background: 'rgba(212,175,55,0.15)',
                        border: '1px solid rgba(212,175,55,0.4)',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#D4AF37', fontSize: '1rem',
                        transition: 'all 0.2s ease',
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.3)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.15)'; }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Tag */}
                  <span className="font-montserrat text-xs uppercase tracking-[0.3em] mb-3 block" style={{ color: '#D4AF37' }}>
                    {selectedCase.tag}
                  </span>

                  {/* Título */}
                  <h3 className="font-serif font-bold mb-6" style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', color: '#F0E7D5', lineHeight: 1.15 }}>
                    {selectedCase.title}
                  </h3>

                  {/* SECCIÓN 1 — Métricas */}
                  {selectedCase.metrics && (
                    <div className="metrics-grid" style={{ marginBottom: 28 }}>
                      {selectedCase.metrics.map((m, i) => (
                        <div
                          key={i}
                          className="metric-card"
                          style={{
                            background: 'rgba(212,175,55,0.07)',
                            border: '1px solid rgba(212,175,55,0.25)',
                            borderRadius: 6,
                            padding: '14px 10px',
                            textAlign: 'center',
                          }}
                        >
                          <div className="font-playfair font-bold" style={{ color: '#D4AF37', fontSize: 'clamp(0.85rem, 2.5vw, 1.05rem)', lineHeight: 1.2 }}>{m.value}</div>
                          <div className="font-montserrat" style={{ color: 'rgba(240,231,213,0.45)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 5 }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* SECCIÓN 2 — Problema / Solución */}
                  <div style={{ borderTop: '1px solid rgba(212,175,55,0.15)', paddingTop: 24, marginBottom: 24 }}>
                    <div className="grid md:grid-cols-2 gap-6" style={{ color: 'rgba(240,231,213,0.75)' }}>
                      <div>
                        <h4 className="font-montserrat font-bold uppercase mb-3" style={{ color: '#D4AF37', fontSize: '0.65rem', letterSpacing: '0.25em' }}>El Desafío</h4>
                        <p style={{ fontSize: '0.95rem', lineHeight: 1.75 }}>{selectedCase.problem}</p>
                      </div>
                      <div>
                        <h4 className="font-montserrat font-bold uppercase mb-3" style={{ color: '#D4AF37', fontSize: '0.65rem', letterSpacing: '0.25em' }}>La Solución</h4>
                        <p style={{ fontSize: '0.95rem', lineHeight: 1.75 }}>{selectedCase.solution}</p>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN 3 — Stack tecnológico */}
                  {selectedCase.stack && (
                    <div style={{ borderTop: '1px solid rgba(212,175,55,0.15)', paddingTop: 20, marginBottom: 28 }}>
                      <h4 className="font-montserrat font-bold uppercase mb-3" style={{ color: '#D4AF37', fontSize: '0.65rem', letterSpacing: '0.25em' }}>Stack Tecnológico</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {selectedCase.stack.map((tech, i) => (
                          <span
                            key={i}
                            className="font-montserrat"
                            style={{
                              border: '1px solid rgba(212,175,55,0.5)',
                              color: '#D4AF37',
                              padding: '4px 12px',
                              fontSize: '0.72rem',
                              borderRadius: 4,
                              letterSpacing: '0.05em',
                            }}
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SECCIÓN 4 — CTA */}
                  <div style={{ textAlign: 'center', paddingTop: 8 }}>
                    <button
                      className="font-montserrat uppercase tracking-widest font-semibold"
                      style={{
                        background: '#D4AF37', color: '#0A0E1A',
                        border: 'none', padding: '14px 40px',
                        fontSize: '0.8rem', letterSpacing: '0.2em',
                        cursor: 'pointer', transition: 'background 0.3s ease',
                        width: '100%', maxWidth: 320,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F4C842'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#D4AF37'; }}
                      onClick={() => {
                        setSelectedCase(null);
                        setTimeout(() => {
                          document.querySelector('#contacto')?.scrollIntoView({ behavior: 'smooth' });
                        }, 300);
                      }}
                    >
                      ¿Querés algo así?
                    </button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Secciones ─────────────────────────────────────────────────── */}
        <section id="inicio" className="fade-section h-screen w-full flex items-center justify-center relative">
          <Hero isScrolled={isScrolled} />
        </section>

        <section id="tecnologias" className="fade-section w-full relative" style={{ zIndex: 10 }}>
          <TechStack />
        </section>

        <section id="faq" className="fade-section w-full relative" style={{ zIndex: 10 }}>
          <FAQ />
        </section>

        <section id="contacto" className="fade-section w-full relative" style={{ zIndex: 10 }}>
          <Contact />
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
      </div>
    </>
  );
}
