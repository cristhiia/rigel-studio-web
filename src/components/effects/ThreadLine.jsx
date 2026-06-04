import React, { useEffect, useRef } from 'react';

export default function ThreadLine() {
  const threadRef = useRef(null);
  const mobileRef = useRef(null);

  useEffect(() => {
    const update = (scroll) => {
      const scrollable = document.body.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const pct = Math.min(1, scroll / scrollable);
      if (threadRef.current) threadRef.current.style.height = `${pct * 100}%`;
      if (mobileRef.current) mobileRef.current.style.width  = `${pct * 100}%`;
    };

    const onScroll  = ()  => update(window.scrollY);
    const onLenis   = (e) => update(e.detail.scroll);

    window.addEventListener('scroll',       onScroll, { passive: true });
    window.addEventListener('lenis-scroll', onLenis);

    return () => {
      window.removeEventListener('scroll',       onScroll);
      window.removeEventListener('lenis-scroll', onLenis);
    };
  }, []);

  return (
    <>
      {/* ── Mobile: horizontal bar at top ── */}
      <div
        className="mobile-thread-track"
        style={{
          position: 'fixed', top: 0, left: 0,
          width: '100%', height: 3,
          background: 'rgba(212,175,55,0.1)',
          zIndex: 9998,
        }}
      >
        <div
          ref={mobileRef}
          style={{
            height: '100%', width: 0,
            background: 'linear-gradient(to right, #F4C842, #D4AF37, #4A90E2)',
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      {/* ── Desktop: vertical gradient thread, no nodes ── */}
      <div
        className="rigel-thread desktop-thread-track"
        style={{
          position: 'fixed',
          top: 0, right: 40,
          width: 1.5,
          height: '100%',
          zIndex: 100,
          pointerEvents: 'none',
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        <div
          ref={threadRef}
          style={{
            width: '100%',
            height: 0,
            background: `linear-gradient(180deg,
              #F4C842 0%,
              #D4AF37 30%,
              #4A90E2 70%,
              rgba(74,144,226,0.3) 90%,
              transparent 100%
            )`,
            boxShadow: '0 0 8px rgba(212,175,55,0.4)',
            transition: 'height 0.1s linear',
          }}
        />
      </div>
    </>
  );
}
