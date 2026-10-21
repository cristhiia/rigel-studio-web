import React from 'react';
import LegalPage from './LegalPage';

// Proveedores verificados en el código del sitio y de la app (octubre 2026).
const SECTIONS = [
  {
    title: '1. Responsable',
    paragraphs: [
      'Rigel Studio (Cristhian Gallego), San Juan, Argentina. CUIT: [completar]. Contacto para temas de privacidad: contacto@rigelstudio.com.ar.',
    ],
  },
  {
    title: '2. Qué datos guarda este sitio',
    paragraphs: [],
    list: [
      'Formularios de contacto: nombre, email, WhatsApp y lo que escribas. Se envían por email a nuestra casilla de trabajo para poder responderte.',
      'Suscripción a Keelwise: tu email, el identificador de la suscripción en Mercado Pago, su estado y la fecha del próximo cobro. Se guardan en nuestra base de datos (Supabase) para saber si tu suscripción está activa.',
      'Pagos: los procesa Mercado Pago. Rigel Studio no ve ni guarda los datos de tu tarjeta.',
    ],
  },
  {
    title: '3. Qué datos guarda la app Keelwise',
    paragraphs: [
      'Keelwise maneja información financiera personal. Esto es lo que se guarda y dónde:',
    ],
    list: [
      'Tu cuenta (email): la usamos para que inicies sesión con un código y para verificar que tu suscripción esté activa. Se guarda en la base de datos de Keelwise (Supabase).',
      'La información que cargás en la app (ingresos, gastos, categorías, metas, ahorros y tu perfil) se guarda solo en tu teléfono. No se envía a nuestros servidores.',
      'Estado de tu suscripción (activa, en prueba o vencida) y fechas de vigencia, en la base de datos de Keelwise (Supabase).',
      'Región de los servidores de Supabase: Este de Estados Unidos (us-east-1).',
    ],
  },
  {
    title: '4. Proveedores que procesan datos para que la app funcione',
    paragraphs: [
      'Algunas funciones necesitan enviar datos a servicios externos. Se envía solo lo necesario para cada función:',
    ],
    list: [
      'Inicio de sesión y estado de la suscripción: Supabase (se envía tu email para generar el código y consultar si tu suscripción está activa).',
      'Envío de los códigos de acceso por email: [completar con el proveedor de email que se configure].',
      'Diagnóstico de errores: la app usa Sentry para detectar fallas. Se envía información técnica del error y del dispositivo; no se graba la pantalla y está configurado para no enviar datos personales.',
      'Pagos de la suscripción: Mercado Pago.',
      'Keelwise no usa inteligencia artificial ni envía lo que cargás en la app a servicios de terceros.',
    ],
  },
  {
    title: '5. Qué no hacemos',
    paragraphs: [
      'No vendemos tus datos. No los usamos para publicidad ni los compartimos con terceros para fines comerciales. Solo los procesan los proveedores de la sección anterior, para prestar el servicio.',
      'Varios de esos proveedores procesan datos fuera de Argentina. [Verificar con abogado los requisitos de transferencia internacional de datos.]',
    ],
  },
  {
    title: '6. Cuánto tiempo los guardamos',
    paragraphs: ['[Definir plazo de conservación después de cancelar la suscripción o borrar la cuenta.]'],
  },
  {
    title: '7. Tus derechos',
    paragraphs: [
      'Podés pedir acceso, corrección o eliminación de tus datos escribiendo a contacto@rigelstudio.com.ar. [Verificar con abogado los derechos y plazos de la Ley 25.326 de Protección de Datos Personales y la mención obligatoria a la autoridad de control.]',
    ],
  },
];

export default function Privacidad() {
  return (
    <LegalPage
      path="/privacidad"
      kicker="Legales"
      title="Política de privacidad"
      updated="[completar al publicar]"
      intro="Esta política explica qué datos guardamos en rigelstudio.com.ar y en la app Keelwise, dónde y para qué."
      sections={SECTIONS}
    />
  );
}
