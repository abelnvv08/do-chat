import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Términos de Servicio — DO Chat',
  description: 'Términos de servicio de DO Chat. Lee las condiciones de uso de la plataforma.',
}

const sections = [
  {
    title: '1. Aceptación de los términos',
    body: 'Al crear una cuenta o usar DO Chat (el "Servicio"), aceptas estar sujeto a estos Términos de Servicio ("Términos"). Si no estás de acuerdo, no accedas ni uses el Servicio. Estos Términos constituyen un acuerdo legalmente vinculante entre tú y DO Chat ("nosotros", "nuestro" o "nos").',
  },
  {
    title: '2. El servicio',
    body: `DO Chat es una plataforma de mensajería profesional que ofrece:

• Mensajería directa y grupal cifrada de extremo a extremo
• Llamadas de voz y video con WebRTC
• Compartición de archivos y medios
• @do — un asistente de IA impulsado por Claude de Anthropic, integrado en tus chats
• Asignación y seguimiento de tareas entre miembros del equipo
• App web progresiva (PWA) accesible desde cualquier navegador moderno
• Apps nativas para iOS y Android`,
  },
  {
    title: '3. Elegibilidad y registro',
    body: `Para usar DO Chat debes:

• Tener al menos 13 años de edad
• Proporcionar información de registro precisa y completa (número de teléfono)
• Mantener confidenciales tus credenciales de acceso y no compartir tu cuenta
• Notificarnos de inmediato cualquier acceso no autorizado a tu cuenta escribiendo a security@getdochat.com

Eres el único responsable de toda la actividad que ocurra bajo tu cuenta. DO Chat se reserva el derecho de rechazar el servicio o cancelar cuentas a su sola discreción.`,
  },
  {
    title: '4. Planes y pagos',
    body: `DO Chat ofrece planes de suscripción que estarán disponibles próximamente. Por ahora, el acceso a las funciones básicas es gratuito.

Cuando los planes de pago estén disponibles:
• Los pagos se procesarán de forma segura por Stripe.
• Los precios estarán en USD y pueden estar sujetos a impuestos aplicables.
• Las suscripciones se renuevan automáticamente salvo que se cancelen antes de la fecha de renovación.
• Puedes cancelar en cualquier momento desde tu perfil.
• Los reembolsos se evaluarán caso por caso dentro de los 7 días posteriores a la compra.`,
  },
  {
    title: '5. Uso aceptable',
    body: `Aceptas no usar DO Chat para:

• Violar leyes o regulaciones aplicables en tu país
• Enviar spam, mensajes de phishing o comunicaciones masivas no solicitadas
• Distribuir malware, virus o cualquier código dañino o disruptivo
• Acosar, amenazar, intimidar o abusar de otros usuarios
• Infringir los derechos de propiedad intelectual de terceros
• Hacerse pasar por otra persona o entidad
• Intentar acceder sin autorización a cuentas de otros usuarios o a nuestros sistemas
• Usar bots automatizados, scrapers o herramientas para extraer datos del Servicio
• Realizar cualquier actividad que pueda dañar, sobrecargar o deteriorar el Servicio

Las infracciones pueden resultar en suspensión o cancelación inmediata de la cuenta.`,
  },
  {
    title: '6. @do — Inteligencia Artificial',
    body: `DO Chat incluye @do AI, impulsado por la API de Anthropic. Al usar @do:

• Entiendes que el contenido generado por IA puede ser inexacto, incompleto u obsoleto.
• No debes usar @do para generar contenido ilegal, dañino, ofensivo o engañoso.
• Los mensajes procesados por @do se transmiten a la API de Anthropic y están sujetos a sus políticas de uso.
• DO Chat no es responsable de las decisiones tomadas basadas en sugerencias o resultados generados por IA.
• El uso de la IA está sujeto a límites según tu plan.
• Los mensajes de @do no están cifrados de extremo a extremo — usa tu criterio al compartir información sensible.`,
  },
  {
    title: '7. Propiedad del contenido',
    body: `Conservas la propiedad total de todo el contenido que creas y compartes en DO Chat — incluidos mensajes, archivos y medios.

Al usar el Servicio, otorgas a DO Chat una licencia limitada, no exclusiva y libre de regalías para procesar, almacenar y transmitir tu contenido únicamente para operar y entregar el Servicio. Esta licencia termina cuando eliminas tu contenido o cuenta.

DO Chat es propietario de todos los derechos sobre la plataforma, su diseño, marca, código y funciones.`,
  },
  {
    title: '8. Privacidad',
    body: 'Tu uso de DO Chat está regido por nuestra Política de Privacidad, incorporada a estos Términos por referencia. Al aceptar estos Términos, también aceptas nuestra Política de Privacidad disponible en getdochat.com/privacy.',
  },
  {
    title: '9. Disponibilidad del servicio',
    body: `DO Chat se proporciona "tal cual" y "según disponibilidad" sin garantías de ningún tipo.

Nos esforzamos por mantener alta disponibilidad, pero no garantizamos un servicio ininterrumpido o libre de errores. Podemos realizar mantenimientos que interrumpan temporalmente el servicio y haremos esfuerzos razonables para notificar a los usuarios con anticipación.

DO Chat no es responsable de ninguna pérdida de datos, mensajes o archivos resultante de interrupciones del servicio o fallas técnicas.`,
  },
  {
    title: '10. Limitación de responsabilidad',
    body: `En la máxima medida permitida por la ley aplicable:

DO CHAT NO SERÁ RESPONSABLE DE DAÑOS INDIRECTOS, INCIDENTALES, ESPECIALES, CONSECUENTES O PUNITIVOS, INCLUIDA LA PÉRDIDA DE GANANCIAS, DATOS, REPUTACIÓN O INTERRUPCIÓN DEL NEGOCIO.

NUESTRA RESPONSABILIDAD TOTAL ACUMULADA ANTE TI POR TODOS LOS RECLAMOS RELACIONADOS CON ESTOS TÉRMINOS O EL SERVICIO NO SUPERARÁ EL MONTO TOTAL PAGADO POR TI A DO CHAT EN LOS 12 MESES ANTERIORES AL RECLAMO.`,
  },
  {
    title: '11. Terminación',
    body: `Cualquiera de las partes puede terminar este acuerdo en cualquier momento.

Puedes eliminar tu cuenta en cualquier momento desde la configuración de tu perfil. La eliminación es permanente e irreversible.

Podemos suspender o cancelar tu cuenta si violas estos Términos, con o sin previo aviso dependiendo de la gravedad de la infracción.

Al terminar, tu derecho a acceder al Servicio cesa de inmediato. Los artículos 7, 10, 12 y 13 sobreviven a la terminación.`,
  },
  {
    title: '12. Cambios a estos términos',
    body: 'Podemos actualizar estos Términos periódicamente. Te notificaremos de cambios significativos mediante una notificación en la app con al menos 15 días de anticipación. El uso continuado del Servicio después de que los cambios entren en vigor constituye tu aceptación de los Términos revisados.',
  },
  {
    title: '13. Contacto',
    body: `Para preguntas o inquietudes sobre estos Términos:

Legal: legal@getdochat.com
Soporte: support@getdochat.com
Privacidad: privacy@getdochat.com`,
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-[#0f172a] text-white">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <Link href="/landing" className="text-blue-400 text-sm hover:text-blue-300 transition-colors mb-6 inline-flex items-center gap-1.5">
            ← Volver a DO Chat
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-lg shrink-0">📋</div>
            <h1 className="text-3xl font-bold">Términos de Servicio</h1>
          </div>
          <p className="text-gray-400 text-sm">Última actualización: 21 de mayo de 2026 · Vigente de inmediato</p>
          <p className="text-gray-300 text-sm mt-3 max-w-xl leading-relaxed">
            Estos Términos rigen tu uso de DO Chat. Por favor léelos con atención antes de crear una cuenta o usar el Servicio.
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
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">{s.title}</h2>
            <p className="text-gray-600 text-sm leading-7 whitespace-pre-line">{s.body}</p>
          </section>
        ))}

        <div className="pt-8 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-gray-700 transition-colors">Política de Privacidad</Link>
            <Link href="/landing" className="hover:text-gray-700 transition-colors">Inicio</Link>
          </div>
          <span>© 2026 DO Chat. Todos los derechos reservados.</span>
        </div>
      </div>
    </div>
  )
}
