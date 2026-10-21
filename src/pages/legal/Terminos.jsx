import React from 'react';
import LegalPage from './LegalPage';

const SECTIONS = [
  {
    title: '1. Quiénes somos',
    paragraphs: [
      'Rigel Studio es un estudio de software de San Juan, Argentina, a cargo de Cristhian Gallego. CUIT: [completar]. Domicilio: [completar]. Contacto: contacto@rigelstudio.com.ar.',
    ],
  },
  {
    title: '2. Uso del sitio',
    paragraphs: [
      'El sitio rigelstudio.com.ar presenta los servicios y productos de Rigel Studio. Los formularios de contacto sirven para pedir información o presupuestos; enviar un formulario no genera ninguna contratación.',
    ],
  },
  {
    title: '3. Keelwise: suscripción',
    paragraphs: [
      'Keelwise es una app de finanzas personales para Android que se ofrece por suscripción mensual. El precio de referencia es USD 10 por mes y se cobra en pesos argentinos, por el monto que se informa en la página de Keelwise antes de suscribirse.',
      'La suscripción incluye 7 días de prueba sin cargo. Al terminar la prueba, Mercado Pago realiza el primer cobro y luego uno por mes, con el medio de pago que elijas en Mercado Pago. Rigel Studio no recibe ni guarda los datos de tu tarjeta.',
      'Podés cancelar en cualquier momento desde tu cuenta de Mercado Pago. Si cancelás durante la prueba, no se realiza el cobro. Al cancelar, el acceso a la app se mantiene hasta [definir: fin del período pago o en el momento].',
      'Cambios de precio: [definir con abogado/contador cómo y con cuánta anticipación se avisan].',
    ],
  },
  {
    title: '4. Acceso anticipado',
    paragraphs: [
      'Keelwise está en acceso anticipado: todavía no se publica en Google Play y se instala con un archivo APK que entregamos a las personas suscriptas. La app puede tener errores y sus funciones pueden cambiar durante esta etapa.',
    ],
  },
  {
    title: '5. Keelwise no es asesoramiento financiero',
    paragraphs: [
      'Las cifras, proyecciones y reportes de la app son orientativos y se basan en los datos que cargás. No constituyen asesoramiento financiero, impositivo ni de inversión. Las decisiones sobre tu dinero son tuyas.',
    ],
  },
  {
    title: '6. Botón de arrepentimiento',
    paragraphs: [
      'Podés pedir la revocación de tu contratación desde el Botón de arrepentimiento, disponible en el pie de este sitio y en la página de Keelwise. Plazos y alcance de la revocación: [verificar con abogado según la normativa de defensa del consumidor vigente].',
    ],
  },
  {
    title: '7. Responsabilidad, ley aplicable y jurisdicción',
    paragraphs: ['[Completar con abogado.]'],
  },
  {
    title: '8. Cambios en estos términos',
    paragraphs: [
      'Si cambiamos estos términos, publicaremos la versión nueva en esta página con su fecha de actualización. [Definir con abogado cómo se avisa a las personas suscriptas.]',
    ],
  },
];

export default function Terminos() {
  return (
    <LegalPage
      path="/terminos"
      kicker="Legales"
      title="Términos y condiciones"
      updated="[completar al publicar]"
      sections={SECTIONS}
    />
  );
}
