// Metadatos por ruta. Los usa la página (usePageMeta) y también vite.config.js,
// que genera en el build un HTML por ruta con estos tags: los crawlers de
// WhatsApp, Facebook o LinkedIn no ejecutan JavaScript.

export const SITE = 'https://rigelstudio.com.ar';

export const ROUTE_META = {
  '/keelwise': {
    title: 'Keelwise | App de finanzas personales para Android — Rigel Studio',
    description:
      'Keelwise te dice cuánto podés gastar hoy, ordena tus gastos y te ayuda a ahorrar con un coach con IA. USD 10 por mes, 7 días gratis. Acceso anticipado para Android.',
  },
  '/keelwise/gracias': {
    title: 'Gracias por suscribirte | Keelwise',
    description: 'Confirmación de tu suscripción a Keelwise.',
    noindex: true,
  },
  '/terminos': {
    title: 'Términos y condiciones | Rigel Studio',
    description: 'Términos y condiciones de uso del sitio y de los productos de Rigel Studio.',
  },
  '/privacidad': {
    title: 'Política de privacidad | Rigel Studio',
    description: 'Qué datos guardan Rigel Studio y Keelwise, dónde y para qué.',
  },
  '/arrepentimiento': {
    title: 'Botón de arrepentimiento | Rigel Studio',
    description: 'Solicitá la revocación de tu compra o suscripción a un producto de Rigel Studio.',
  },
};
