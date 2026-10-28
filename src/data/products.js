// Productos propios de Rigel Studio. Agregar un producto = agregar un objeto.
//
// status: 'available' | 'soon'
// cta.href: ruta interna (empieza con "/") o URL externa.

const WHATSAPP = 'https://wa.me/5492645048401';

export const whatsappLink = text => `${WHATSAPP}?text=${encodeURIComponent(text)}`;

// Precio de Keelwise que se muestra antes de que responda la API. La fuente de
// verdad es billing_products.price_ars (la landing la pide a
// /api/billing/checkout); KEELWISE_PRICE_ARS queda solo como respaldo del build.
const priceArs = Number(import.meta.env.KEELWISE_PRICE_ARS);

export const KEELWISE_PRICE = {
  usd: 10,
  ars: Number.isFinite(priceArs) && priceArs > 0 ? priceArs : null,
  trialDays: 7,
};

// Mientras no estén cargadas las credenciales de Mercado Pago y el APK, Keelwise se
// muestra en lista de espera (WhatsApp) en vez de cobrar. Para abrir la venta:
// VITE_KEELWISE_SALES_OPEN=true en Vercel (Production) y volver a desplegar.
export const KEELWISE_SALES_OPEN = import.meta.env.VITE_KEELWISE_SALES_OPEN === 'true';
// Link a la versión web de Keelwise (la app en la compu). Vacío = todavía no publicada.
export const KEELWISE_WEB_URL = (import.meta.env.VITE_KEELWISE_WEB_URL || '').trim();
export const KEELWISE_WAITLIST_HREF = whatsappLink('Hola, quiero anotarme en el acceso anticipado de Keelwise');

export const formatArs = n =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const products = [
  {
    id: 'keelwise',
    name: 'Keelwise',
    category: 'Finanzas personales · Android',
    status: 'available',
    statusLabel: 'Acceso anticipado',
    description:
      'Te dice cuánto podés gastar hoy, ordena tus gastos por categoría y te muestra cómo gastás con reportes claros.',
    meta: KEELWISE_SALES_OPEN
      ? `USD ${KEELWISE_PRICE.usd} por mes · ${KEELWISE_PRICE.trialDays} días gratis`
      : `Lista de espera · USD ${KEELWISE_PRICE.usd} por mes cuando abra`,
    cta: { label: 'Conocer Keelwise', href: '/keelwise' },
  },
  {
    id: 'kioscopro',
    name: 'KioscoPro',
    category: 'Comercio · Kioscos y maxikioscos',
    status: 'soon',
    statusLabel: 'Próximamente',
    description:
      'Caja, stock y precios para kioscos y maxikioscos, en un solo lugar. Lo estamos terminando: dejanos tu WhatsApp y te avisamos cuando salga.',
    meta: null,
    cta: {
      label: 'Avisame cuando salga',
      href: whatsappLink('Hola, quiero que me avisen cuando salga KioscoPro'),
    },
  },
  {
    id: 'gestionpro',
    name: 'GestiónPro',
    category: 'Salud · Consultorios',
    status: 'soon',
    statusLabel: 'Próximamente',
    description:
      'Pacientes, turnos y cobros en un solo lugar, para psicólogos, médicos y nutricionistas. Lo estamos construyendo: dejanos tu WhatsApp y te avisamos cuando salga.',
    meta: null,
    cta: {
      label: 'Avisame cuando salga',
      href: whatsappLink('Hola, quiero que me avisen cuando salga GestiónPro'),
    },
  },
];
