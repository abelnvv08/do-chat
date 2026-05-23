import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidad — DO Chat',
  description: 'Política de privacidad de DO Chat. Conoce cómo recopilamos, usamos y protegemos tu información personal.',
}

const sections = [
  {
    title: '1. Quiénes somos',
    body: 'DO Chat ("nosotros", "nuestro" o "nos") es una plataforma de mensajería profesional disponible en getdochat.com y en nuestras aplicaciones móviles. Para consultas sobre privacidad, escríbenos a privacy@getdochat.com.',
  },
  {
    title: '2. Información que recopilamos',
    body: `Recopilamos únicamente lo necesario para brindarte el servicio:

• Número de teléfono — para crear tu cuenta y verificar tu identidad por SMS.
• Nombre y foto de perfil — opcional, para personalizar tu experiencia.
• Mensajes y archivos — cifrados de extremo a extremo con AES-256-GCM. No podemos leer el contenido de tus conversaciones.
• Tokens de notificaciones push — para enviarte alertas de mensajes, llamadas y tareas en tiempo real.
• Datos de uso — estadísticas agregadas para mejorar el producto (p. ej., uso de funciones, reportes de errores vía Sentry).
• Información del dispositivo — para diagnóstico de compatibilidad y errores.`,
  },
  {
    title: '3. Cómo usamos tu información',
    body: `Usamos tus datos únicamente para operar y mejorar el servicio:

• Crear y gestionar tu cuenta
• Habilitar mensajería, archivos, llamadas de voz y video, y funciones de IA
• Enviar notificaciones del servicio (mensajes nuevos, llamadas perdidas, asignaciones de tareas)
• Detectar y prevenir fraude, abuso o acceso no autorizado
• Mejorar el rendimiento de la plataforma y corregir errores

No vendemos, alquilamos ni compartimos tus datos personales con terceros para publicidad o marketing — nunca.`,
  },
  {
    title: '4. Cifrado de extremo a extremo',
    body: `DO Chat está construido con privacidad por diseño:

• Todos los mensajes directos y grupales están cifrados en reposo con AES-256-GCM.
• Las llamadas de voz y video usan WebRTC con cifrado DTLS-SRTP.
• El personal de DO Chat no puede leer tus conversaciones privadas.
• Los mensajes enviados a @do AI son procesados por la API de Anthropic y no están cifrados de extremo a extremo — usa tu criterio al compartir información sensible con funciones de IA.`,
  },
  {
    title: '5. Proveedores de servicios',
    body: `Compartimos datos solo con los siguientes proveedores, cada uno sujeto a acuerdos de procesamiento de datos:

• Supabase — base de datos, autenticación y almacenamiento de archivos (EE. UU.)
• Vercel — hospedaje de la aplicación y CDN global (EE. UU.)
• Anthropic — procesamiento de mensajes de IA para @do (EE. UU.)
• Twilio — verificación por SMS para inicio de sesión (EE. UU.)
• Sentry — monitoreo de errores y reportes de fallos (EE. UU.)`,
  },
  {
    title: '6. Retención de datos',
    body: `Conservamos tus datos mientras tu cuenta esté activa:

• Mensajes: almacenados hasta que los elimines o cierres tu cuenta.
• Registros de llamadas: 90 días.
• Datos de uso agregados: hasta 2 años.
• Al eliminar tu cuenta, borramos tus datos personales en un plazo de 30 días, salvo que la ley exija conservarlos.`,
  },
  {
    title: '7. Tus derechos',
    body: `Dependiendo de tu ubicación, puedes tener los siguientes derechos:

• Acceso: solicitar una copia de tus datos personales.
• Rectificación: corregir datos inexactos.
• Eliminación: solicitar que borremos tu información.
• Portabilidad: recibir tus datos en un formato legible por máquina.
• Oposición: objetar ciertos tipos de procesamiento.

Para ejercer cualquiera de estos derechos, escríbenos a privacy@getdochat.com. Respondemos en un plazo de 30 días hábiles.`,
  },
  {
    title: '8. Seguridad',
    body: 'Implementamos medidas técnicas y organizativas para proteger tu información: cifrado en tránsito (TLS 1.3) y en reposo (AES-256-GCM), acceso restringido a datos de producción, monitoreo de seguridad y revisiones periódicas. Ningún sistema es 100% seguro; si detectas una vulnerabilidad, repórtala a security@getdochat.com.',
  },
  {
    title: '9. Menores de edad',
    body: 'DO Chat no está dirigido a menores de 13 años. No recopilamos conscientemente información de niños menores de 13 años. Si crees que un menor nos ha proporcionado datos, contáctanos para eliminarlos de inmediato.',
  },
  {
    title: '10. Cambios a esta política',
    body: 'Podemos actualizar esta política periódicamente. Te notificaremos de cambios significativos mediante un aviso en la app o por correo electrónico con al menos 15 días de anticipación. El uso continuado del servicio tras la notificación implica tu aceptación de los cambios.',
  },
  {
    title: '11. Contacto',
    body: `Para preguntas, solicitudes de datos o inquietudes sobre privacidad:

Correo: privacy@getdochat.com
Tiempo de respuesta: hasta 30 días hábiles.

Nos comprometemos a resolver cualquier inquietud de privacidad de forma rápida y transparente.`,
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-[#0f172a] text-white">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <Link href="/landing" className="text-blue-400 text-sm hover:text-blue-300 transition-colors mb-6 inline-flex items-center gap-1.5">
            ← Volver a DO Chat
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-lg shrink-0">🔒</div>
            <h1 className="text-3xl font-bold">Política de Privacidad</h1>
          </div>
          <p className="text-gray-400 text-sm">Última actualización: 21 de mayo de 2026 · Vigente de inmediato</p>
          <p className="text-gray-300 text-sm mt-3 max-w-xl leading-relaxed">
            Tu privacidad es importante. DO Chat está construido con cifrado de extremo a extremo por defecto — no podemos leer tus mensajes. Esta política explica exactamente qué datos recopilamos, por qué y cuáles son tus derechos.
          </p>
        </div>
      </div>

      {/* Table of contents */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contenido</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {sections.map(s => (
              <a key={s.title} href={`#${s.title.replace(/\s+/g, '-').toLowerCase()}`}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                {s.title}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        {sections.map(s => (
          <section key={s.title} id={s.title.replace(/\s+/g, '-').toLowerCase()}>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{s.title}</h2>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="border-t border-gray-100 py-8 px-6 text-center">
        <p className="text-gray-400 text-xs">© 2026 DO Chat · <Link href="/terms" className="hover:text-gray-600 transition-colors">Términos de Servicio</Link></p>
      </div>
    </div>
  )
}
