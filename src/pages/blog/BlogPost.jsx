import React, { useEffect } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { getPostBySlug } from './posts.js';
import RigelBackground from '../../components/canvas/RigelBackground';

export default function BlogPost() {
  const { slug } = useParams();
  const post = getPostBySlug(slug);

  useEffect(() => {
    if (!post) return;
    document.title = `${post.title} | Rigel Studio`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', post.description);
  }, [post]);

  if (!post) return <Navigate to="/blog" replace />;

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
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link to="/blog" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.8rem', color: 'rgba(240,231,213,0.6)', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              ← Blog
            </Link>
            <Link to="/#contacto" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.8rem', color: '#F0E7D5', textDecoration: 'none', letterSpacing: '0.15em', textTransform: 'uppercase', border: '1px solid rgba(212,175,55,0.5)', padding: '10px 20px', transition: 'all 0.3s ease' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.1)'; e.currentTarget.style.color = '#D4AF37'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#F0E7D5'; }}
            >
              Iniciar Proyecto
            </Link>
          </div>
        </nav>

        {/* Artículo */}
        <article style={{ maxWidth: 720, margin: '60px auto 80px', padding: '0 24px' }}>

          {/* Header del artículo */}
          <header style={{ marginBottom: 56 }}>
            <time style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.25em', color: 'rgba(240,231,213,0.4)' }}>
              {post.date}
            </time>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 700, lineHeight: 1.15, color: '#F0E7D5', marginTop: 12, marginBottom: 0 }}>
              {post.title}
            </h1>
          </header>

          {/* Secciones */}
          {post.sections.map((section, i) => (
            <div key={i} style={{ marginBottom: 40 }}>
              {section.h2 && (
                <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '1rem', fontWeight: 600, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
                  {section.h2}
                </h2>
              )}
              {section.body && (
                <p style={{ fontSize: '1rem', lineHeight: 1.9, color: 'rgba(240,231,213,0.8)', margin: 0 }}>
                  {section.body}
                </p>
              )}
              {section.list && (
                <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
                  {section.list.map((item, j) => (
                    <li key={j} style={{ fontSize: '1rem', lineHeight: 1.9, color: 'rgba(240,231,213,0.8)', paddingLeft: 20, position: 'relative', marginBottom: 8 }}>
                      <span style={{ position: 'absolute', left: 0, color: '#D4AF37' }}>✦</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {/* CTA */}
          <div style={{ borderTop: '1px solid rgba(212,175,55,0.2)', paddingTop: 48, textAlign: 'center', marginTop: 32 }}>
            <a
              href={post.cta.href}
              style={{
                display: 'inline-block',
                background: '#D4AF37',
                color: '#0A0E1A',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 600,
                fontSize: '0.85rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                padding: '16px 40px',
                transition: 'background 0.3s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F4C842'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#D4AF37'; }}
            >
              {post.cta.text}
            </a>
          </div>
        </article>
      </div>
    </>
  );
}
