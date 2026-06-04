# Rigel Studio

**Software que entiende tu negocio**

Sitio web oficial de Rigel Studio, agencia digital boutique especializada en desarrollo de software a medida para pymes y emprendedores.

---

## Stack

- **React + Vite** — UI y bundling
- **Tailwind CSS** — utilidades de estilo
- **GSAP + ScrollTrigger** — animaciones de intro y scroll
- **Lenis** — smooth scroll
- **Framer Motion** — transiciones de modales
- **Canvas API** — estrella Rigel animada (RigelBackground, NightCanvas)
- **Supabase** — backend para formulario de contacto

---

## Estructura

```
src/
├── components/
│   ├── layout/       Layout.jsx
│   ├── sections/     Hero, Philosophy, Cases, MembershipSection, Contact
│   ├── canvas/       RigelBackground
│   └── effects/      EasterEgg, ThreadLine
├── styles/           index.css
├── lib/              supabase.js
└── main.jsx
```

---

## Desarrollo local

```bash
npm install
npm run dev
```

Corre en `http://localhost:5000`

---

## Deploy

Conectado a Vercel via GitHub. Auto-deploy en cada push a `main`.

Configuración: `vercel.json` en la raíz.
