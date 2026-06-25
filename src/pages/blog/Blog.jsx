import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { posts } from './posts.js';
import RigelBackground from '../../components/canvas/RigelBackground';

export default function Blog() {
  useEffect(() => {
    document.title = 'Blog | Rigel Studio — Desarrollo de Software en San Juan';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Artículos sobre desarrollo de software, digitalización de negocios y sistemas a medida para pymes en San Juan, Argentina.');
  }, []);

  return (
    <>
      <RigelBackground />
      <div style={{ minHeight: '100vh', backgroundColor: '#0A0E1A', color: '#F0E7D5', fontFamily: 'Montserrat, sans-serif', position: 'relative', zIndex: 1 }}>

        {/* Nav */}
        <nav style={{ padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1.5rem', color: '#F0E7D5' }}>R</span>
            <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1.3rem', color: '#D4AF37' }}>✦</span>
          </Link>
          <Link to="/#contacto" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.8rem', color: '#F0E7D5', textDecoration: 'none', letterSpacing: '0.15em', textTransform: 'uppercase', border: '1px solid rgba(212,175,55,0.5)', padding: '10px 20px', transition: 'all 0.3s ease' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.1)'; e.currentTarget.style.color = '#D4AF37'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#F0E7D5'; }}
          >
            Iniciar Proyecto
          </Link>
        </nav>

        {/* Header */}
        <header style={{ maxWidth: 720, margin: '60px auto 0', padding: '0 24px' }}>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#D4AF37' }}>Blog</span>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, lineHeight: 1.15, color: '#F0E7D5', marginTop: 12, marginBottom: 16 }}>
            Recursos sobre software y digitalización
          </h1>
          <p style={{ fontSize: '1rem', lineHeight: 1.8, color: 'rgba(240,231,213,0.65)', marginBottom: 0 }}>
            Guías prácticas para pymes y emprendedores en San Juan y toda Argentina.
          </p>
        </header>

        {/* Lista de artículos */}
        <main style={{ maxWidth: 720, margin: '64px auto 80px', padding: '0 24px' }}>
          {posts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              style={{ textDecoration: 'none', display: 'block', marginBottom: 48 }}
            >
              <article
                style={{
                  borderTop: '1px solid rgba(212,175,55,0.2)',
                  paddingTop: 32,
                  transition: 'opacity 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.parentElement.style.opacity = '0.75'; }}
                onMouseLeave={e => { e.currentTarget.parentElement.style.opacity = '1'; }}
              >
                <time style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(240,231,213,0.4)' }}>
                  {post.date}
                </time>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', fontWeight: 700, color: '#F0E7D5', lineHeight: 1.3, marginTop: 8, marginBottom: 12 }}>
                  {post.title}
                </h2>
                <p style={{ fontSize: '0.95rem', lineHeight: 1.75, color: 'rgba(240,231,213,0.6)', margin: 0 }}>
                  {post.description}
                </p>
                <span style={{ display: 'inline-block', marginTop: 16, fontFamily: 'Montserrat, sans-serif', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#D4AF37' }}>
                  Leer artículo →
                </span>
              </article>
            </Link>
          ))}
        </main>
      </div>
    </>
  );
}
