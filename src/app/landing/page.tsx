'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useLanguage, LangToggle } from '@/lib/i18n'

const copy = {
  es: {
    nav: { features: 'Funciones', security: 'Seguridad', signIn: 'Iniciar sesión', start: 'Empezar gratis' },
    hero: {
      title1: 'Chatea con tu equipo.',
      title2: 'La IA se encarga del resto.',
      subtitle: 'DO Chat es la app de mensajería profesional con IA que actúa dentro de tus conversaciones — crea tareas, resume reuniones, analiza documentos y notifica a tu equipo.',
      cta1: 'Empieza gratis',
      cta2: 'Ver funciones',
      disclaimer: 'Sin tarjeta de crédito · Disponible en iOS, Android y web',
    },
    featureAI: {
      tag: 'do AI',
      h2a: 'Una IA que actúa,',
      h2b: 'no solo responde.',
      p: 'do AI no vive en una ventana aparte. Está dentro de cada chat. Le dices qué necesitas y lo hace: crea la tarea, redacta el mensaje, analiza el archivo, agenda la reunión.',
      items: [
        'Crea y asigna tareas directamente desde el chat',
        'Analiza PDFs, Excel y Word en segundos',
        'Redacta emails, propuestas y actas',
        'Resume conversaciones y extrae compromisos',
        'Busca información en internet sin salir del chat',
      ],
      cardTitle: 'Resumen listo',
      cardBody: 'Detecté 3 compromisos: propuesta de precio (Carlos, viernes), validar diseño (María, hoy), confirmar proveedor (pendiente).',
      cardFooter: 'Mensaje enviado a 5 contactos · 3 tareas creadas',
      stats: [
        { label: 'Tareas', n: '3' },
        { label: 'Notificados', n: '5' },
        { label: 'Docs', n: '1' },
      ],
    },
    featureTasks: {
      tag: 'Tareas',
      h2a: 'Asigna, sigue y',
      h2b: 'recibe evidencia.',
      p: 'Convierte cualquier mensaje en tarea. Asígnala a un compañero, establece una fecha límite y recibe notificación cuando esté lista — con foto o documento como evidencia.',
      items: [
        'Crea tareas desde el chat con un toque',
        'Asígnalas a cualquier contacto',
        'El receptor acepta, trabaja y sube evidencia',
        'Tú ves el estado en tiempo real',
        'Recordatorios automáticos si vence el plazo',
      ],
      cardTitle: 'Pendientes',
      tasks: [
        { text: 'Enviar propuesta Q3 a dirección', due: 'Vence hoy', status: 'urgent', done: false },
        { text: 'Revisar contrato con el cliente', due: 'Completada ✓', status: 'done', done: true },
        { text: 'Confirmar reunión con proveedor', due: 'Asignada por María', status: 'assigned', done: false },
      ],
    },
    featureSecurity: {
      tag: 'Seguridad',
      h2a: 'Lo que dices en el chat',
      h2b: 'se queda en el chat.',
      p: 'Cada mensaje se cifra antes de salir de tu dispositivo. Ni DO Chat puede leer tus conversaciones. Sin anuncios, sin venta de datos, sin acceso de terceros.',
      items: [
        'Cifrado AES-256-GCM en mensajes, archivos y llamadas',
        'Las claves nunca salen de tu dispositivo',
        'Sin contraseñas — autenticación por SMS',
        'Sin anuncios ni rastreo de actividad',
      ],
      cardTitle: 'Privacidad real',
      cardSub: 'Tus mensajes están protegidos en todo momento.',
      rows: [
        { label: 'Cifrado', value: 'AES-256-GCM' },
        { label: 'Datos vendidos', value: 'Ninguno' },
        { label: 'Acceso externo', value: 'Ninguno' },
        { label: 'Anuncios', value: 'Nunca' },
      ],
    },
    pricing: {
      label: 'Planes',
      title: 'Comienza gratis, más opciones próximamente',
      subtitle: 'Sin contratos. Sin sorpresas. Por ahora, todo gratis.',
      freePlan: { label: 'Gratis', period: 'Para siempre · Sin tarjeta', features: ['Mensajes y llamadas ilimitados', 'Cifrado E2E', 'do AI · límite diario de consultas', 'Almacenamiento de archivos'], cta: 'Crear cuenta gratis' },
      proPlan: { label: 'Pro', popular: 'Más popular', period: '/mes', sub: 'Para equipos que producen más', features: ['Todo en Gratis', 'do AI · más consultas/día', 'Mayor almacenamiento', 'Llamadas grupales de video', 'Soporte prioritario'], subscribe: 'Suscribirse', soon: 'Próximamente' },
      maxPlan: { label: 'MAX', period: '/mes', sub: 'Para empresas a escala', features: ['Todo en Pro', 'do AI · máximas consultas/día', 'Almacenamiento extendido', 'SLA garantizado', 'Soporte 24/7'], subscribe: 'Suscribirse', soon: 'Próximamente' },
      disclaimer: 'Todos los planes incluyen cifrado E2E y actualizaciones automáticas.',
    },
    mockup: {
      search: 'Buscar...',
      activeNow: 'Activo ahora',
      youLabel: 'Tú',
      inputPlaceholder: 'Escribe o pregúntale algo a do AI...',
      msg1: 'Resume los pendientes de este chat y avisa al equipo',
      msg2: 'Perfecto, también crea el evento de calendario para el viernes',
      msg3start: 'Evento creado.',
      msg3end: 'Viernes 10am — "Revisión propuesta Q3". Invitación enviada al equipo. 🗓️',
      chats: [
        { name: 'do AI ✦', msg: 'Tarea creada: propuesta Q3 → viernes', time: 'ahora', badge: 1, ai: true, color: 'bg-blue-50', dot: 'bg-blue-500' },
        { name: 'María González', msg: 'ok lo reviso ahora mismo', time: '2m', badge: 2, ai: false, color: 'bg-violet-50', dot: 'bg-violet-400' },
        { name: 'Equipo Ventas', msg: 'Carlos: confirmado para mañana', time: '1h', badge: 0, ai: false, color: 'bg-emerald-50', dot: 'bg-emerald-400' },
        { name: 'Carlos Rivera', msg: '¿Viste el contrato que mandé?', time: 'Ayer', badge: 0, ai: false, color: 'bg-amber-50', dot: 'bg-amber-400' },
        { name: 'Proyecto App', msg: 'Archivo subido: diseño_v3.pdf', time: 'Ayer', badge: 0, ai: false, color: 'bg-rose-50', dot: 'bg-rose-400' },
      ],
    },
    cta: {
      title1: 'Tu equipo ya lo estaba',
      title2: 'esperando.',
      subtitle: 'Empieza gratis hoy. Sin instalación, sin tarjeta, listo en menos de un minuto.',
      button: 'Crear cuenta gratis',
      disclaimer: 'Sin tarjeta · Sin instalación · Completamente gratis',
    },
    footer: {
      tagline: 'Mensajería profesional con IA. Para equipos que producen.',
      product: 'Producto', legal: 'Legal', contact: 'Contacto',
      features: 'Funciones', security: 'Seguridad', privacy: 'Privacidad', terms: 'Términos',
      signIn: 'Iniciar sesión', createAccount: 'Crear cuenta',
      copyright: '© 2025 DO Chat. Todos los derechos reservados.',
      systems: 'Todos los sistemas operativos',
    },
  },
  en: {
    nav: { features: 'Features', security: 'Security', signIn: 'Sign in', start: 'Get started free' },
    hero: {
      title1: 'Chat with your team.',
      title2: 'AI handles the rest.',
      subtitle: 'DO Chat is the professional messaging app with AI that acts inside your conversations — creates tasks, summarizes meetings, analyzes documents and notifies your team.',
      cta1: 'Get started free',
      cta2: 'See features',
      disclaimer: 'No credit card · Available on iOS, Android and web',
    },
    featureAI: {
      tag: 'do AI',
      h2a: 'AI that acts,',
      h2b: 'not just answers.',
      p: "do AI doesn't live in a separate window. It's inside every chat. Tell it what you need and it does it: creates the task, drafts the message, analyzes the file, schedules the meeting.",
      items: [
        'Create and assign tasks directly from chat',
        'Analyze PDFs, Excel and Word in seconds',
        'Draft emails, proposals and meeting notes',
        'Summarize conversations and extract commitments',
        'Search the internet without leaving the chat',
      ],
      cardTitle: 'Summary ready',
      cardBody: 'I detected 3 commitments: price proposal (Jake, Friday), design review (Sarah, today), confirm supplier (pending).',
      cardFooter: 'Message sent to 5 contacts · 3 tasks created',
      stats: [
        { label: 'Tasks', n: '3' },
        { label: 'Notified', n: '5' },
        { label: 'Docs', n: '1' },
      ],
    },
    featureTasks: {
      tag: 'Tasks',
      h2a: 'Assign, track and',
      h2b: 'receive proof.',
      p: "Turn any message into a task. Assign it to a teammate, set a deadline and get notified when it's done — with a photo or document as proof.",
      items: [
        'Create tasks from chat with a tap',
        'Assign them to any contact',
        'The recipient accepts, works and uploads proof',
        'You see the status in real time',
        'Automatic reminders when the deadline arrives',
      ],
      cardTitle: 'Pending',
      tasks: [
        { text: 'Send Q3 proposal to management', due: 'Due today', status: 'urgent', done: false },
        { text: 'Review contract with client', due: 'Completed ✓', status: 'done', done: true },
        { text: 'Confirm meeting with supplier', due: 'Assigned by Sarah', status: 'assigned', done: false },
      ],
    },
    featureSecurity: {
      tag: 'Security',
      h2a: 'What you say in chat',
      h2b: 'stays in chat.',
      p: 'Every message is encrypted before leaving your device. Not even DO Chat can read your conversations. No ads, no data sales, no third-party access.',
      items: [
        'AES-256-GCM encryption on messages, files and calls',
        'Keys never leave your device',
        'No passwords — SMS authentication',
        'No ads or activity tracking',
      ],
      cardTitle: 'Real privacy',
      cardSub: 'Your messages are protected at all times.',
      rows: [
        { label: 'Encryption', value: 'AES-256-GCM' },
        { label: 'Data sold', value: 'None' },
        { label: 'External access', value: 'None' },
        { label: 'Ads', value: 'Never' },
      ],
    },
    pricing: {
      label: 'Plans',
      title: 'Start free, more options coming soon',
      subtitle: 'No contracts. No surprises. For now, everything free.',
      freePlan: { label: 'Free', period: 'Forever · No card needed', features: ['Unlimited messages and calls', 'E2E Encryption', 'do AI · daily query limit', 'File storage'], cta: 'Create free account' },
      proPlan: { label: 'Pro', popular: 'Most popular', period: '/mo', sub: 'For teams that produce more', features: ['Everything in Free', 'do AI · more queries/day', 'More storage', 'Group video calls', 'Priority support'], subscribe: 'Subscribe', soon: 'Coming soon' },
      maxPlan: { label: 'MAX', period: '/mo', sub: 'For enterprises at scale', features: ['Everything in Pro', 'do AI · max queries/day', 'Extended storage', 'Guaranteed SLA', '24/7 support'], subscribe: 'Subscribe', soon: 'Coming soon' },
      disclaimer: 'All plans include E2E encryption and automatic updates.',
    },
    mockup: {
      search: 'Search...',
      activeNow: 'Active now',
      youLabel: 'You',
      inputPlaceholder: 'Type or ask do AI something...',
      msg1: 'Summarize the pending items in this chat and notify the team',
      msg2: 'Great, also create the calendar event for Friday',
      msg3start: 'Event created.',
      msg3end: 'Friday 10am — "Q3 Proposal Review". Invitation sent to the team. 🗓️',
      chats: [
        { name: 'do AI ✦', msg: 'Task created: Q3 proposal → Friday', time: 'now', badge: 1, ai: true, color: 'bg-blue-50', dot: 'bg-blue-500' },
        { name: 'Sarah Mitchell', msg: "ok I'll take a look right now", time: '2m', badge: 2, ai: false, color: 'bg-violet-50', dot: 'bg-violet-400' },
        { name: 'Sales Team', msg: 'Jake: confirmed for tomorrow', time: '1h', badge: 0, ai: false, color: 'bg-emerald-50', dot: 'bg-emerald-400' },
        { name: 'Mike Thompson', msg: 'Did you see the contract I sent?', time: 'Yesterday', badge: 0, ai: false, color: 'bg-amber-50', dot: 'bg-amber-400' },
        { name: 'App Project', msg: 'File uploaded: design_v3.pdf', time: 'Yesterday', badge: 0, ai: false, color: 'bg-rose-50', dot: 'bg-rose-400' },
      ],
    },
    cta: {
      title1: 'Your team was already',
      title2: 'waiting for this.',
      subtitle: 'Start free today. No installation, no card, ready in under a minute.',
      button: 'Create free account',
      disclaimer: 'No card · No installation · Completely free',
    },
    footer: {
      tagline: 'Professional messaging with AI. For teams that produce.',
      product: 'Product', legal: 'Legal', contact: 'Contact',
      features: 'Features', security: 'Security', privacy: 'Privacy', terms: 'Terms',
      signIn: 'Sign in', createAccount: 'Create account',
      copyright: '© 2025 DO Chat. All rights reserved.',
      systems: 'All systems operational',
    },
  },
}

export default function LandingV4() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { lang } = useLanguage()
  const c = copy[lang]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">

      {/* ── NAV ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${scrolled ? 'bg-white/96 backdrop-blur border-b border-slate-100 shadow-sm' : 'bg-white'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/dochatlogo.png" alt="DO Chat" width={32} height={32} className="rounded-xl" />
            <span className="text-base font-bold text-slate-900 tracking-tight">DO Chat</span>
          </Link>

          <div className="hidden sm:flex items-center gap-8">
            <a href="#funciones" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">{c.nav.features}</a>
            <a href="#seguridad" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">{c.nav.security}</a>
            <LangToggle className="text-slate-500 border-slate-200 hover:bg-slate-50" />
            <Link href="/login" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">{c.nav.signIn}</Link>
            <Link href="/login?start=phone"
              className="px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
              {c.nav.start}
            </Link>
          </div>

          <div className="sm:hidden flex items-center gap-2">
            <LangToggle className="text-slate-500 border-slate-200 hover:bg-slate-50" />
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg hover:bg-slate-100">
              <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="sm:hidden bg-white border-t border-slate-100 px-6 py-5 space-y-4">
            <a href="#funciones" onClick={() => setMenuOpen(false)} className="block text-sm text-slate-600 font-medium">{c.nav.features}</a>
            <a href="#seguridad" onClick={() => setMenuOpen(false)} className="block text-sm text-slate-600 font-medium">{c.nav.security}</a>
            <Link href="/login" onClick={() => setMenuOpen(false)} className="block text-sm text-slate-600 font-medium">{c.nav.signIn}</Link>
            <Link href="/login?start=phone" className="block w-full text-center py-3 rounded-full bg-blue-600 text-white text-sm font-semibold">
              {c.nav.start}
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="pt-28 pb-0 px-6 overflow-hidden bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center text-center mb-14">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.06] tracking-tight text-slate-900 mb-6 max-w-3xl">
              {c.hero.title1}<br />
              <span className="text-blue-600">{c.hero.title2}</span>
            </h1>

            <p className="text-xl text-slate-500 max-w-xl leading-relaxed mb-10">
              {c.hero.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Link href="/login?start=phone"
                className="px-8 py-4 rounded-full bg-blue-600 text-white font-bold text-base hover:bg-blue-700 transition-all hover:-translate-y-0.5 active:scale-[0.98] shadow-lg shadow-blue-100">
                {c.hero.cta1}
              </Link>
              <a href="#funciones"
                className="px-8 py-4 rounded-full border border-slate-200 text-slate-700 font-semibold text-base hover:bg-slate-50 transition-all">
                {c.hero.cta2}
              </a>
            </div>
            <p className="text-slate-400 text-sm">{c.hero.disclaimer}</p>
          </div>

          {/* Phone mockup */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-4xl">
              {/* Glow */}
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />

              {/* Browser chrome */}
              <div className="relative z-0 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden bg-[#f8fafc]">
                {/* Browser top bar */}
                <div className="bg-slate-100 px-4 py-2.5 flex items-center gap-3 border-b border-slate-200">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-slate-400 border border-slate-200 max-w-xs mx-auto text-center">
                    getdochat.com
                  </div>
                </div>

                {/* App UI inside */}
                <div className="flex h-[440px]">
                  {/* Sidebar */}
                  <div className="w-72 bg-white border-r border-slate-100 flex flex-col">
                    {/* Sidebar header */}
                    <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">d</span>
                        </div>
                        <span className="text-sm font-bold text-slate-900">DO Chat</span>
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </div>
                    </div>
                    {/* Search */}
                    <div className="px-3 py-2 border-b border-slate-100">
                      <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 5.25 5.25a7.5 7.5 0 0 0 10.4 10.4z" />
                        </svg>
                        <span className="text-xs text-slate-400">{c.mockup.search}</span>
                      </div>
                    </div>
                    {/* Chat list */}
                    <div className="flex-1 overflow-hidden p-2 space-y-0.5">
                      {c.mockup.chats.map((ch, i) => (
                        <div key={ch.name} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer ${i === 0 ? 'bg-blue-50/80 border border-blue-100' : 'hover:bg-slate-50'}`}>
                          <div className={`w-9 h-9 rounded-full ${ch.color} flex items-center justify-center shrink-0 text-sm font-bold relative`}>
                            {ch.ai ? '✦' : ch.name[0]}
                            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${ch.dot}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`text-xs font-semibold truncate ${ch.ai ? 'text-blue-600' : 'text-slate-900'}`}>{ch.name}</span>
                              <span className="text-[10px] text-slate-400 ml-2 shrink-0">{ch.time}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">{ch.msg}</p>
                          </div>
                          {ch.badge > 0 && (
                            <div className="w-4.5 h-4.5 min-w-[18px] h-[18px] rounded-full bg-blue-600 flex items-center justify-center">
                              <span className="text-[9px] text-white font-bold">{ch.badge}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chat area */}
                  <div className="flex-1 flex flex-col">
                    {/* Chat header */}
                    <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">✦</div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-blue-600">do AI</p>
                        <p className="text-[11px] text-emerald-500 font-medium">● {c.mockup.activeNow}</p>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 105.636 5.636a7.5 7.5 0 0010.728 10.728z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-4 space-y-3 overflow-hidden bg-[#f8fafc]">
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] shrink-0 mt-1">{c.mockup.youLabel}</div>
                        <div className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-slate-700 shadow-sm border border-slate-100 max-w-[70%]">
                          {c.mockup.msg1}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-content-center text-[10px] shrink-0 mt-1 flex items-center justify-center text-blue-600 font-bold">✦</div>
                        <div className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-slate-700 shadow-sm border border-blue-100 max-w-[75%]">
                          <p className="font-semibold text-blue-700 mb-1.5">✦ do AI — {c.featureAI.cardTitle}</p>
                          <p className="mb-2">{c.featureAI.cardBody}</p>
                          <p className="text-slate-400">{c.featureAI.cardFooter}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <div className="bg-blue-600 rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-xs text-white max-w-[60%]">
                          {c.mockup.msg2}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-600 font-bold shrink-0 mt-1">✦</div>
                        <div className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-slate-700 shadow-sm border border-blue-100 max-w-[70%]">
                          <span className="text-emerald-600 font-medium">{c.mockup.msg3start}</span> {c.mockup.msg3end}
                        </div>
                      </div>
                    </div>

                    {/* Input */}
                    <div className="bg-white border-t border-slate-100 px-3 py-2.5 flex items-center gap-2">
                      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-[11px] text-slate-400">
                        {c.mockup.inputPlaceholder}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="funciones" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">

          {/* Feature 1: IA */}
          <div className="flex flex-col lg:flex-row items-center gap-16 mb-28">
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-600 tracking-widest uppercase mb-4">{c.featureAI.tag}</p>
              <h2 className="text-4xl font-extrabold text-slate-900 leading-tight mb-5">
                {c.featureAI.h2a}<br />
                {c.featureAI.h2b}
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-6">{c.featureAI.p}</p>
              <div className="space-y-4">
                {c.featureAI.items.map(f => (
                  <div key={f} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <span className="text-slate-700 text-sm">{f}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Visual card */}
            <div className="flex-1 flex justify-center">
              <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 border-b border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200">✦</div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">do AI</p>
                      <p className="text-emerald-500 text-xs font-medium">● {c.mockup.activeNow}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100">
                    &ldquo;{c.mockup.msg1}&rdquo;
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3 bg-blue-50 rounded-xl px-4 py-3">
                    <span className="text-blue-500 text-base mt-0.5">✦</span>
                    <div>
                      <p className="text-sm text-slate-900 font-medium mb-1">{c.featureAI.cardTitle}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{c.featureAI.stats.map(s => `${s.n} ${s.label}`).join(' · ')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {[
                      { ...c.featureAI.stats[0], color: 'bg-violet-50 text-violet-700' },
                      { ...c.featureAI.stats[1], color: 'bg-emerald-50 text-emerald-700' },
                      { ...c.featureAI.stats[2], color: 'bg-amber-50 text-amber-700' },
                    ].map(s => (
                      <div key={s.label} className={`${s.color} rounded-xl px-3 py-2 text-center`}>
                        <p className="font-extrabold text-lg leading-none">{s.n}</p>
                        <p className="text-[10px] font-medium mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2: Tasks */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16 mb-28">
            <div className="flex-1">
              <p className="text-xs font-bold text-violet-600 tracking-widest uppercase mb-4">{c.featureTasks.tag}</p>
              <h2 className="text-4xl font-extrabold text-slate-900 leading-tight mb-5">
                {c.featureTasks.h2a}<br />
                {c.featureTasks.h2b}
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-6">{c.featureTasks.p}</p>
              <div className="space-y-4">
                {c.featureTasks.items.map(f => (
                  <div key={f} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <span className="text-slate-700 text-sm">{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <p className="font-bold text-slate-900 text-sm">{c.featureTasks.cardTitle}</p>
                </div>
                <div className="p-4 space-y-3">
                  {c.featureTasks.tasks.map(task => (
                    <div key={task.text} className={`flex gap-3 items-start p-3.5 rounded-2xl border ${task.done ? 'bg-slate-50 border-slate-100' : task.status === 'urgent' ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${task.done ? 'bg-emerald-500 border-emerald-500' : task.status === 'urgent' ? 'border-amber-400' : 'border-violet-300'}`}>
                        {task.done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${task.done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.text}</p>
                        <p className={`text-xs mt-1 ${task.done ? 'text-emerald-500' : task.status === 'urgent' ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>{task.due}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3: E2E */}
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1">
              <p className="text-xs font-bold text-emerald-600 tracking-widest uppercase mb-4">{c.featureSecurity.tag}</p>
              <h2 className="text-4xl font-extrabold text-slate-900 leading-tight mb-5">
                {c.featureSecurity.h2a}<br />
                {c.featureSecurity.h2b}
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-6">{c.featureSecurity.p}</p>
              <div className="space-y-4">
                {c.featureSecurity.items.map(f => (
                  <div key={f} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <span className="text-slate-700 text-sm">{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 flex justify-center" id="seguridad">
              <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-xl p-6">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-center font-extrabold text-slate-900 text-lg mb-2">{c.featureSecurity.cardTitle}</h3>
                <p className="text-center text-slate-500 text-sm mb-6">{c.featureSecurity.cardSub}</p>
                <div className="space-y-3">
                  {c.featureSecurity.rows.map(r => (
                    <div key={r.label} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                      <span className="text-sm text-slate-500">{r.label}</span>
                      <span className="text-sm font-semibold text-emerald-600">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="precios" className="py-24 px-6 bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-3">{c.pricing.label}</p>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
              {c.pricing.title}
            </h2>
            <p className="text-slate-500 text-lg max-w-md mx-auto">{c.pricing.subtitle}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 items-start">

            {/* ── Free ── */}
            <div className="rounded-3xl p-7 flex flex-col bg-white border border-slate-200">
              <p className="text-xs font-bold tracking-widest uppercase mb-5 text-slate-400">{c.pricing.freePlan.label}</p>
              <div className="mb-7">
                <p className="text-5xl font-extrabold text-slate-900">$0</p>
                <p className="text-sm mt-1.5 text-slate-400">{c.pricing.freePlan.period}</p>
              </div>
              <ul className="space-y-3 flex-1 mb-7">
                {c.pricing.freePlan.features.map(f => (
                  <li key={f} className="flex items-start gap-3">
                    <svg className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span className="text-sm text-slate-600">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/login?start=phone"
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-center bg-slate-900 text-white hover:bg-slate-800 transition-all active:scale-[0.98]">
                {c.pricing.freePlan.cta}
              </Link>
            </div>

            {/* ── Pro ── */}
            <div className="rounded-3xl overflow-hidden relative bg-blue-600 shadow-2xl shadow-blue-200 scale-[1.02]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                <span className="px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold shadow-lg">{c.pricing.proPlan.popular}</span>
              </div>
              {/* Content — blurred */}
              <div className="p-7 blur-sm pointer-events-none select-none">
                <p className="text-xs font-bold tracking-widest uppercase mb-5 text-blue-200">{c.pricing.proPlan.label}</p>
                <div className="mb-7">
                  <div className="flex items-baseline gap-1">
                    <p className="text-5xl font-extrabold text-white">$XX</p>
                    <p className="text-sm text-blue-200">{c.pricing.proPlan.period}</p>
                  </div>
                  <p className="text-sm mt-1.5 text-blue-200">{c.pricing.proPlan.sub}</p>
                </div>
                <ul className="space-y-3 mb-7">
                  {c.pricing.proPlan.features.map(f => (
                    <li key={f} className="flex items-start gap-3">
                      <svg className="w-4 h-4 mt-0.5 shrink-0 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span className="text-sm text-white">{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="w-full py-3.5 rounded-2xl font-bold text-sm bg-white text-blue-600 text-center">{c.pricing.proPlan.subscribe}</div>
              </div>
              {/* Overlay */}
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-blue-700/40 backdrop-blur-[2px]">
                <span className="px-5 py-2.5 rounded-full bg-white/15 border border-white/30 text-white text-sm font-semibold tracking-wide backdrop-blur-sm">
                  {c.pricing.proPlan.soon}
                </span>
              </div>
            </div>

            {/* ── MAX ── */}
            <div className="rounded-3xl overflow-hidden relative bg-white border border-slate-200">
              {/* Content — blurred */}
              <div className="p-7 blur-sm pointer-events-none select-none">
                <p className="text-xs font-bold tracking-widest uppercase mb-5 text-slate-400">{c.pricing.maxPlan.label}</p>
                <div className="mb-7">
                  <div className="flex items-baseline gap-1">
                    <p className="text-5xl font-extrabold text-slate-900">$XX</p>
                    <p className="text-sm text-slate-400">{c.pricing.maxPlan.period}</p>
                  </div>
                  <p className="text-sm mt-1.5 text-slate-400">{c.pricing.maxPlan.sub}</p>
                </div>
                <ul className="space-y-3 mb-7">
                  {c.pricing.maxPlan.features.map(f => (
                    <li key={f} className="flex items-start gap-3">
                      <svg className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span className="text-sm text-slate-600">{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="w-full py-3.5 rounded-2xl font-bold text-sm bg-slate-900 text-white text-center">{c.pricing.maxPlan.subscribe}</div>
              </div>
              {/* Overlay */}
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 backdrop-blur-[2px]">
                <span className="px-5 py-2.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-sm font-semibold tracking-wide">
                  {c.pricing.maxPlan.soon}
                </span>
              </div>
            </div>

          </div>
          <p className="text-center text-sm text-slate-400 mt-8">{c.pricing.disclaimer}</p>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl font-extrabold text-slate-900 mb-5 leading-tight">
            {c.cta.title1}<br />
            {c.cta.title2}
          </h2>
          <p className="text-slate-500 text-xl mb-10 max-w-lg mx-auto leading-relaxed">
            {c.cta.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login?start=phone"
              className="px-10 py-4 rounded-full bg-blue-600 text-white font-bold text-base hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 hover:-translate-y-0.5 active:scale-[0.98]">
              {c.cta.button}
            </Link>
          </div>
          <p className="text-slate-400 text-sm mt-6">{c.cta.disclaimer}</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-100 py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-10">
            <div className="col-span-2 sm:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Image src="/dochatlogo.png" alt="DO Chat" width={32} height={32} className="rounded-xl" />
                <span className="font-bold text-slate-900">DO Chat</span>
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed">
                {c.footer.tagline}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">{c.footer.product}</p>
              <div className="space-y-3">
                <a href="#funciones" className="block text-sm text-slate-500 hover:text-slate-900 transition-colors">{c.footer.features}</a>
                <a href="#seguridad" className="block text-sm text-slate-500 hover:text-slate-900 transition-colors">{c.footer.security}</a>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">{c.footer.legal}</p>
              <div className="space-y-3">
                <Link href="/privacy" className="block text-sm text-slate-500 hover:text-slate-900 transition-colors">{c.footer.privacy}</Link>
                <Link href="/terms" className="block text-sm text-slate-500 hover:text-slate-900 transition-colors">{c.footer.terms}</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">{c.footer.contact}</p>
              <div className="space-y-3">
                <Link href="/login" className="block text-sm text-slate-500 hover:text-slate-900 transition-colors">{c.footer.signIn}</Link>
                <Link href="/login?start=phone" className="block text-sm text-slate-500 hover:text-slate-900 transition-colors">{c.footer.createAccount}</Link>
                <a href="mailto:hola@getdochat.com" className="block text-sm text-slate-500 hover:text-slate-900 transition-colors">hola@getdochat.com</a>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-xs">{c.footer.copyright}</p>
            <div className="flex items-center gap-3">
              <LangToggle className="text-slate-400 border-slate-200 hover:bg-slate-50" />
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {c.footer.systems}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
