import React from 'react';

const RIGEL  = ['R', 'I', 'G', 'E', 'L'];
const STUDIO = ['S', 'T', 'U', 'D', 'I', 'O'];

export default function Hero({ isScrolled }) {
  return (
    <div
      className="relative flex flex-col items-center justify-center w-full min-h-screen bg-transparent"
      style={{ opacity: isScrolled ? 0 : 1, transition: 'opacity 0.5s ease' }}
    >
      {/* ── Overlay azul noche — anima a opacity:0 via CSS ── */}
      <div className="intro-overlay" />

      {/* ── hero-logo: RIGEL STUDIO ── */}
      <div className="hero-logo flex flex-col items-center text-center font-serif mt-2">
        <h1
          className="tracking-tight font-bold leading-none flex"
          style={{ fontSize: 'clamp(4rem, 12vw, 10rem)', perspective: '800px', color: '#F0E7D5' }}
        >
          {RIGEL.map((char, i) => (
            <span key={`r${i}`} className="letter inline-block">{char}</span>
          ))}
        </h1>
        <h2
          className="tracking-[0.2em] font-medium mt-[-0.1em] flex"
          style={{ fontSize: 'clamp(2rem, 6vw, 5rem)', perspective: '800px', color: '#F0E7D5' }}
        >
          {STUDIO.map((char, i) => (
            <span key={`s${i}`} className="letter inline-block">{char}</span>
          ))}
        </h2>
      </div>

      {/* ── hero-tagline ── */}
      <p
        className="hero-tagline font-montserrat text-sm md:text-base tracking-[0.3em] uppercase mt-8"
        style={{ color: 'rgba(240,231,213,0.7)' }}
      >
        Software que entiende tu negocio
      </p>

      {/* ── hero CTA ── */}
      <button
        className="hero-cta font-montserrat"
        onClick={() => document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })}
        style={{
          background: '#D4AF37',
          color: '#0A0E1A',
          fontWeight: 600,
          padding: '14px 32px',
          borderRadius: 100,
          border: 'none',
          fontSize: '0.85rem',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          marginTop: 32,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#F4C842';
          e.currentTarget.style.transform = 'scale(1.03)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = '#D4AF37';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        Iniciá tu proyecto ✦
      </button>

      {/* ── scroll-indicator ── */}
      <div className="scroll-indicator absolute bottom-12 left-1/2 flex flex-col items-center gap-2 pointer-events-none"
        style={{ transform: 'translateX(-50%)' }}
      >
        <span className="font-montserrat text-[10px] tracking-[0.4em] uppercase" style={{ color: 'rgba(240,231,213,0.4)' }}>
          Scroll
        </span>
        <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, rgba(212,175,55,0.6), transparent)' }} />
      </div>
    </div>
  );
}
