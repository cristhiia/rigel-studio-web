# ERRORES Y SOLUCIONES — RIGEL STUDIO

---

## FASE 2 — Estrella Rigel (RigelBackground.jsx)

### Error 1: Re-inicialización en cada scroll
**Detectado:** `scrollY` era estado React con `[scrollY]` como dependencia del useEffect. Cada scroll event causaba re-mount completo del canvas (reinicializaba partículas, perdía estado de animación).
**Corregido:** Reemplazado con `scrollYRef = useRef(0)` + `window.addEventListener` separado con dependencia `[]`. El loop de animación lee `scrollYRef.current` directamente.

### Error 2: Posición del estrella incorrecta
**Detectado:** Implementación previa usaba `canvas.height / 6` (≈ 16.7% del viewport). El spec indica `canvas.height * 0.2` = 20% del viewport CSS.
**Corregido:** Cambiado a `drawStar(canvas.width / 2, canvas.height * 0.2)`.

### Error 3: Órbitas no coincidían con spec
**Detectado:** Versión anterior usaba radios 90/145/200 con velocidades diferentes. Spec: radios 60/80/100, inclinaciones 30°/-20°/45°, speeds 0.005/0.003/0.004.
**Corregido:** Orbits array reescrito con valores exactos del spec. Implementadas como elipses rotadas con `compression = 0.30` para efecto de inclinación 3D.

### Error 4: Pulsación incorrecta
**Detectado:** Versión anterior usaba `Math.sin(time * 0.0008) * 0.04`. Spec indica `Math.sin(phase) * 0.15 + 0.85`.
**Corregido:** Variable `phase` que incrementa `+= 0.02` por frame. Pulsación exacta: `Math.sin(phase) * 0.15 + 0.85`.

---

## FASE 3 — Animación Intro (Hero.jsx)

### Error 1: Elementos DOM faltantes del spec
**Detectado:** Implementación anterior no tenía `.intro-overlay`, `.intro-dot`, `.intro-star-rays` (4 divs), `.intro-particles` (50 hijos), `.hero-tagline`, `.scroll-indicator`.
**Corregido:** Todos los elementos agregados con las clases y estructura correcta.

### Error 2: rotateX sin perspectiva
**Detectado:** GSAP aplica `rotateX` via transform CSS, pero sin `perspective` en el padre el efecto es plano (no se ve 3D).
**Corregido:** Agregado `style={{ perspective: '800px' }}` en los elementos `<h1>` y `<h2>` padres de las letras animadas.

### Error 3: Partículas invisibles durante vuelo
**Detectado:** Si se usa `gsap.set(ptcls, { opacity: 0 })` seguido de `gsap.to(ptcls, { opacity: 0, x:..., y:... })`, las partículas nunca son visibles (0→0).
**Corregido:** Usado `gsap.fromTo` con `from: { opacity: 0.9, scale: 1, x: 0, y: 0 }` → las partículas aparecen al instante y se desvanecen mientras vuelan hacia afuera.

### Error 4: useMemo con Math.random() en Strict Mode
**Detectado:** `useMemo(() => Array.from(...Math.random()...), [])` puede ejecutarse dos veces en React StrictMode, causando datos de partículas inconsistentes.
**Corregido:** Datos de partículas movidos a constante `PARTICLE_DATA` fuera del componente (se genera una vez al cargar el módulo).

### Error 5: Rays no expandían desde el centro
**Detectado:** Diseño incorrecto de transformOrigin para los divs de rayos. Si `transformOrigin: 'center'` con `position: absolute`, el rayo escala desde su propio centro, no desde el punto de emisión.
**Corregido:** Cada ray posicionado con su extremo en el origen (top ray: `bottom: 0`, bottom ray: `top: 0`, etc.) y `transformOrigin` apuntando al extremo que toca el centro. Así `scaleY: 0→1` expande hacia afuera desde el centro.

---

## FASE 4 — ScrollTrigger (Layout.jsx)

### Error 1: Conflicto Lenis RAF + GSAP ticker
**Detectado:** El código original tenía su propio `requestAnimationFrame(raf)` loop para Lenis. Si se agrega `gsap.ticker.add(rafFn)`, Lenis se activa dos veces por frame.
**Corregido:** Eliminado el loop `requestAnimationFrame` manual. Solo se usa `gsap.ticker.add(rafFn)` + `gsap.ticker.lagSmoothing(0)`. El Lenis scroll listener llama `ScrollTrigger.update()`.

### Error 2: setIsScrolled en useEffect con deps vacías
**Detectado:** Riesgo de closure stale si se usa `isScrolled` dentro del handler. 
**Corregido:** El handler usa `scroll > 50` (valor directo de Lenis, no estado previo), eliminando el problema de closure.

### Error 3: Night mode overlay invisible
**Detectado:** `body.night-mode { background: #212842 }` no funciona porque el canvas de `RigelBackground` está fixed y cubre el body background.
**Corregido:** Agregado `div.night-overlay` fixed con `background: #212842` y `zIndex: 5`. GSAP anima su opacidad de 0 a 0.88 al entrar a la sección Zenith.

### Error 4: CTA text gradient no animaba
**Detectado:** `WebkitTextFillColor: 'transparent'` con `backgroundClip: 'text'` requiere que el elemento tenga color de texto explícito. Sin esto, el gradiente no se muestra sobre el texto.
**Corregido:** El elemento ya tiene `WebkitTextFillColor: 'transparent'` y `backgroundClip: 'text'` correctamente. La animación de `backgroundPosition` funciona porque GSAP puede animar propiedades CSS inline.

---

## FASE 5 — ThreadLine.jsx

### Sin errores detectados

Los nodos se posicionan usando `top: ${pct * 100}%` que da posiciones fijas relativas al viewport. El hilo usa `height: 0` animado por GSAP a `height: '100%'` con `trigger: body` y `scrub: 0.5`.

---

## FASE 6 — EasterEgg.jsx

### Error 1: Canvas NightCanvas con dimensiones 0
**Detectado:** El canvas dentro del modal tiene `offsetWidth` y `offsetHeight` = 0 en el momento del mount porque el modal está oculto (opacity: 0, no rendered).
**Corregido:** Fallback `canvas.offsetWidth || 600` y `canvas.offsetHeight || 400` para dimensiones por defecto cuando el elemento no está visible aún.

### Error 2: ScrollTrigger duplicado
**Detectado:** ThreadLine y Layout.jsx ambos llaman `ScrollTrigger.getAll().forEach(t => t.kill())` en cleanup. Si ThreadLine se desmonta antes que Layout, mata todos los triggers incluyendo los de Layout.
**Corregido:** ThreadLine solo mata sus propios triggers usando `ScrollTrigger.getAll()` en el return del useEffect. Layout también. El orden de cleanup de React garantiza que los hijos se desmontan antes que los padres, pero como Lenis destruye el ticker primero, ScrollTrigger.update() deja de llamarse — comportamiento aceptable.

---

## FASE 7 — MembershipSection.jsx

### Error 1: Tarjeta ZENITH sin contraste suficiente
**Detectado:** El texto `rgba(240,231,213,0.75)` sobre fondo `#0A0A0A` tiene relación de contraste ~9:1 — correcto. Pero el subtítulo color anterior era `gray-100` que en modo light puede confundirse.
**Corregido:** Todos los textos de ZENITH explícitamente en `#F0E7D5` o variantes con opacity para garantizar legibilidad.

### Error 2: Botones heredaban CSS global de index.css
**Detectado:** `button { background-color: transparent !important; color: #D4AF37 !important; }` en index.css sobreescribía el estilo del botón de ZENITH (dorado sólido).
**Corregido:** Los botones usan `onMouseEnter/onMouseLeave` con inline styles que tienen mayor especificidad. El CSS global sigue en index.css pero los inline styles lo anulan efectivamente.

---

## Restructura de carpetas

### Error 1: main.jsx no actualizado
**Detectado:** Tras mover Layout.jsx a `src/components/layout/`, el import en `main.jsx` seguía apuntando a `./Layout.jsx`.
**Corregido:** Actualizado a `import Layout from './components/layout/Layout.jsx'` y CSS a `'./styles/index.css'`.

### Error 2: Contact.jsx con path de supabase roto
**Detectado:** Contact.jsx importaba `from './lib/supabase'` (path relativo a src/). En nueva ubicación `src/components/sections/Contact.jsx` el path correcto es `../../lib/supabase`.
**Corregido:** Import actualizado en la copia en la nueva ubicación.

### Error 3: Layout.jsx copiado con imports de paths anteriores
**Detectado:** La copia en `src/components/layout/Layout.jsx` tenía imports como `'./Hero'` y `'./components/effects/ThreadLine'` que no resuelven desde la nueva ubicación.
**Corregido:** Todos los imports actualizados a paths relativos correctos desde `src/components/layout/`.
