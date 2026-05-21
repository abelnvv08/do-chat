'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingV4() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [annual, setAnnual] = useState(true)
  const [pricingLoading, setPricingLoading] = useState<string | null>(null)
  const [pricingError, setPricingError] = useState<string | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  async function handlePlan(plan: string) {
    if (plan === 'free') { router.push('/login'); return }
    setPricingLoading(plan)
    setPricingError(null)
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (res.status === 401) { router.push('/login?next=/pricing'); return }
      if (data.url) { window.location.href = data.url; return }
      setPricingError(data.error ?? 'Algo salió mal. Intenta de nuevo.')
    } catch {
      setPricingError('Error de conexión. Intenta de nuevo.')
    } finally {
      setPricingLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">

      {/* ── NAV ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${scrolled ? 'bg-white/96 backdrop-blur border-b border-slate-100 shadow-sm' : 'bg-white'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
              <Image src="/dochatlogo.png" alt="DO Chat" width={20} height={20} className="rounded-lg" />
            </div>
            <span className="text-base font-bold text-slate-900 tracking-tight">DO Chat</span>
          </Link>

          <div className="hidden sm:flex items-center gap-8">
            <a href="#funciones" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Funciones</a>
            <a href="#seguridad" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Seguridad</a>
            <a href="#precios" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Precios</a>
            <Link href="/login" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Iniciar sesión</Link>
            <Link href="/login?start=phone"
              className="px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
              Empezar gratis
            </Link>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden p-2 rounded-lg hover:bg-slate-100">
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="sm:hidden bg-white border-t border-slate-100 px-6 py-5 space-y-4">
            <a href="#funciones" onClick={() => setMenuOpen(false)} className="block text-sm text-slate-600 font-medium">Funciones</a>
            <a href="#seguridad" onClick={() => setMenuOpen(false)} className="block text-sm text-slate-600 font-medium">Seguridad</a>
            <a href="#precios" onClick={() => setMenuOpen(false)} className="block text-sm text-slate-600 font-medium">Precios</a>
            <Link href="/login" onClick={() => setMenuOpen(false)} className="block text-sm text-slate-600 font-medium">Iniciar sesión</Link>
            <Link href="/login?start=phone" className="block w-full text-center py-3 rounded-full bg-blue-600 text-white text-sm font-semibold">
              Empezar gratis
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="pt-28 pb-0 px-6 overflow-hidden bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center text-center mb-14">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.06] tracking-tight text-slate-900 mb-6 max-w-3xl">
              Chatea con tu equipo.<br />
              <span className="text-blue-600">La IA se encarga del resto.</span>
            </h1>

            <p className="text-xl text-slate-500 max-w-xl leading-relaxed mb-10">
              DO Chat es la app de mensajería profesional con IA que actúa dentro de tus conversaciones — crea tareas, resume reuniones, analiza documentos y notifica a tu equipo.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Link href="/login?start=phone"
                className="px-8 py-4 rounded-full bg-blue-600 text-white font-bold text-base hover:bg-blue-700 transition-all hover:-translate-y-0.5 active:scale-[0.98] shadow-lg shadow-blue-100">
                Empieza gratis
              </Link>
              <a href="#funciones"
                className="px-8 py-4 rounded-full border border-slate-200 text-slate-700 font-semibold text-base hover:bg-slate-50 transition-all">
                Ver funciones
              </a>
            </div>
            <p className="text-slate-400 text-sm">Sin tarjeta de crédito · Disponible en iOS, Android y web</p>
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
                        <span className="text-xs text-slate-400">Buscar...</span>
                      </div>
                    </div>
                    {/* Chat list */}
                    <div className="flex-1 overflow-hidden p-2 space-y-0.5">
                      {[
                        { name: 'do AI ✦', msg: 'Tarea creada: propuesta Q3 → viernes', time: 'ahora', badge: 1, ai: true, color: 'bg-blue-50', dot: 'bg-blue-500' },
                        { name: 'María González', msg: 'ok lo reviso ahora mismo', time: '2m', badge: 2, ai: false, color: 'bg-violet-50', dot: 'bg-violet-400' },
                        { name: 'Equipo Ventas', msg: 'Carlos: confirmado para mañana', time: '1h', badge: 0, ai: false, color: 'bg-emerald-50', dot: 'bg-emerald-400' },
                        { name: 'Carlos Rivera', msg: '¿Viste el contrato que mandé?', time: 'Ayer', badge: 0, ai: false, color: 'bg-amber-50', dot: 'bg-amber-400' },
                        { name: 'Proyecto App', msg: 'Archivo subido: diseño_v3.pdf', time: 'Ayer', badge: 0, ai: false, color: 'bg-rose-50', dot: 'bg-rose-400' },
                      ].map((c, i) => (
                        <div key={c.name} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer ${i === 0 ? 'bg-blue-50/80 border border-blue-100' : 'hover:bg-slate-50'}`}>
                          <div className={`w-9 h-9 rounded-full ${c.color} flex items-center justify-center shrink-0 text-sm font-bold relative`}>
                            {c.ai ? '✦' : c.name[0]}
                            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${c.dot}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`text-xs font-semibold truncate ${c.ai ? 'text-blue-600' : 'text-slate-900'}`}>{c.name}</span>
                              <span className="text-[10px] text-slate-400 ml-2 shrink-0">{c.time}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">{c.msg}</p>
                          </div>
                          {c.badge > 0 && (
                            <div className="w-4.5 h-4.5 min-w-[18px] h-[18px] rounded-full bg-blue-600 flex items-center justify-center">
                              <span className="text-[9px] text-white font-bold">{c.badge}</span>
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
                        <p className="text-[11px] text-emerald-500 font-medium">● Activo ahora</p>
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
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] shrink-0 mt-1">Tú</div>
                        <div className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-slate-700 shadow-sm border border-slate-100 max-w-[70%]">
                          Resume los pendientes de este chat y avisa al equipo
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-content-center text-[10px] shrink-0 mt-1 flex items-center justify-center text-blue-600 font-bold">✦</div>
                        <div className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-slate-700 shadow-sm border border-blue-100 max-w-[75%]">
                          <p className="font-semibold text-blue-700 mb-1.5">✦ do AI — Resumen listo</p>
                          <p className="mb-2">Detecté <span className="font-semibold text-slate-900">3 compromisos</span>: propuesta de precio (Carlos, viernes), validar diseño (María, hoy), confirmar proveedor (pendiente).</p>
                          <p className="text-slate-400">Mensaje enviado a <span className="text-blue-600 font-medium">5 contactos</span> · <span className="text-emerald-600 font-medium">3 tareas creadas</span></p>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <div className="bg-blue-600 rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-xs text-white max-w-[60%]">
                          Perfecto, también crea el evento de calendario para el viernes
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-600 font-bold shrink-0 mt-1">✦</div>
                        <div className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-slate-700 shadow-sm border border-blue-100 max-w-[70%]">
                          <span className="text-emerald-600 font-medium">Evento creado.</span> Viernes 10am — "Revisión propuesta Q3". Invitación enviada al equipo. 🗓️
                        </div>
                      </div>
                    </div>

                    {/* Input */}
                    <div className="bg-white border-t border-slate-100 px-3 py-2.5 flex items-center gap-2">
                      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-[11px] text-slate-400">
                        Escribe o pregúntale algo a do AI...
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
              <p className="text-xs font-bold text-blue-600 tracking-widest uppercase mb-4">do AI</p>
              <h2 className="text-4xl font-extrabold text-slate-900 leading-tight mb-5">
                Una IA que actúa,<br />no solo responde.
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-6">
                do AI no vive en una ventana aparte. Está dentro de cada chat. Le dices qué necesitas y lo hace: crea la tarea, redacta el mensaje, analiza el archivo, agenda la reunión.
              </p>
              <div className="space-y-4">
                {[
                  'Crea y asigna tareas directamente desde el chat',
                  'Analiza PDFs, Excel y Word en segundos',
                  'Redacta emails, propuestas y actas',
                  'Resume conversaciones y extrae compromisos',
                  'Busca información en internet sin salir del chat',
                ].map(f => (
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
                      <p className="text-emerald-500 text-xs font-medium">● En línea</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100">
                    &ldquo;Resume este chat y crea las tareas para el equipo&rdquo;
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3 bg-blue-50 rounded-xl px-4 py-3">
                    <span className="text-blue-500 text-base mt-0.5">✦</span>
                    <div>
                      <p className="text-sm text-slate-900 font-medium mb-1">Resumen listo</p>
                      <p className="text-xs text-slate-500 leading-relaxed">3 compromisos detectados · 3 tareas creadas · Equipo notificado</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {[
                      { label: 'Tareas', n: '3', color: 'bg-violet-50 text-violet-700' },
                      { label: 'Notificados', n: '5', color: 'bg-emerald-50 text-emerald-700' },
                      { label: 'Docs', n: '1', color: 'bg-amber-50 text-amber-700' },
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
              <p className="text-xs font-bold text-violet-600 tracking-widest uppercase mb-4">Tareas</p>
              <h2 className="text-4xl font-extrabold text-slate-900 leading-tight mb-5">
                Asigna, sigue y<br />recibe evidencia.
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-6">
                Convierte cualquier mensaje en tarea. Asígnala a un compañero, establece una fecha límite y recibe notificación cuando esté lista — con foto o documento como evidencia.
              </p>
              <div className="space-y-4">
                {[
                  'Crea tareas desde el chat con un toque',
                  'Asígnalas a cualquier contacto',
                  'El receptor acepta, trabaja y sube evidencia',
                  'Tú ves el estado en tiempo real',
                  'Recordatorios automáticos si vence el plazo',
                ].map(f => (
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
                  <p className="font-bold text-slate-900 text-sm">Pendientes</p>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { text: 'Enviar propuesta Q3 a dirección', due: 'Vence hoy', status: 'urgent', done: false },
                    { text: 'Revisar contrato con el cliente', due: 'Completada ✓', status: 'done', done: true },
                    { text: 'Confirmar reunión con proveedor', due: 'Asignada por María', status: 'assigned', done: false },
                  ].map(task => (
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
              <p className="text-xs font-bold text-emerald-600 tracking-widest uppercase mb-4">Seguridad</p>
              <h2 className="text-4xl font-extrabold text-slate-900 leading-tight mb-5">
                Lo que dices en el chat<br />se queda en el chat.
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-6">
                Cada mensaje se cifra antes de salir de tu dispositivo. Ni DO Chat puede leer tus conversaciones. Sin anuncios, sin venta de datos, sin acceso de terceros.
              </p>
              <div className="space-y-4">
                {[
                  'Cifrado AES-256-GCM en mensajes, archivos y llamadas',
                  'Las claves nunca salen de tu dispositivo',
                  'Sin contraseñas — autenticación por SMS',
                  'Sin anuncios ni rastreo de actividad',
                ].map(f => (
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
                <h3 className="text-center font-extrabold text-slate-900 text-lg mb-2">Privacidad real</h3>
                <p className="text-center text-slate-500 text-sm mb-6">Tus mensajes están protegidos en todo momento.</p>
                <div className="space-y-3">
                  {[
                    { label: 'Cifrado', value: 'AES-256-GCM' },
                    { label: 'Datos vendidos', value: 'Ninguno' },
                    { label: 'Acceso externo', value: 'Ninguno' },
                    { label: 'Anuncios', value: 'Nunca' },
                  ].map(r => (
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
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
              Comienza gratis,<br />crece cuando lo necesites
            </h2>
            <p className="text-slate-500 text-lg max-w-md mx-auto">Sin contratos. Sin sorpresas. Cancela cuando quieras.</p>
            <div className="flex items-center justify-center gap-3 mt-8">
              <span className={`text-sm font-medium ${!annual ? 'text-slate-900' : 'text-slate-400'}`}>Mensual</span>
              <button onClick={() => setAnnual(!annual)}
                className={`w-12 h-6 rounded-full transition-all relative ${annual ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${annual ? 'left-7' : 'left-1'}`} />
              </button>
              <span className={`text-sm font-medium ${annual ? 'text-slate-900' : 'text-slate-400'}`}>
                Anual
                <span className="ml-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">−20%</span>
              </span>
            </div>
          </div>

          {pricingError && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-8">
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.344 4.876c.866 1.5-.217 3.374-1.948 3.374H2.604c-1.73 0-2.813-1.874-1.948-3.374l7.396-12.748c.866-1.5 3.032-1.5 3.898 0l7.394 12.748zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-red-700 text-sm flex-1">{pricingError}</p>
              <button onClick={() => setPricingError(null)} className="text-red-400 hover:text-red-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-5">
            {([
              {
                key: 'free',
                name: 'Free',
                monthlyPrice: 0,
                annualPrice: 0,
                tagline: 'Para empezar sin compromisos',
                features: ['Mensajes y llamadas ilimitados', 'Cifrado E2E', 'do AI — 5 consultas/día', '2 GB de almacenamiento'],
                cta: 'Crear cuenta gratis',
                highlight: false,
              },
              {
                key: 'pro',
                name: 'Pro',
                monthlyPrice: 12.99,
                annualPrice: 10,
                tagline: 'Para equipos que producen más',
                features: ['Todo en Free', 'do AI — 50 consultas/día', '100 GB de almacenamiento', 'Llamadas grupales de video', 'Soporte prioritario'],
                cta: 'Probar gratis 14 días',
                highlight: true,
              },
              {
                key: 'business',
                name: 'MAX',
                monthlyPrice: 99,
                annualPrice: 79,
                tagline: 'Para empresas a escala',
                features: ['Todo en Pro', 'do AI — 250 consultas/día', '500 GB de almacenamiento', 'SLA garantizado', 'Soporte 24/7 + factura'],
                cta: 'Hablar con ventas',
                highlight: false,
              },
            ] as const).map(plan => {
              const price = annual ? plan.annualPrice : plan.monthlyPrice
              const totalAnual = plan.annualPrice * 12
              const savingsAnual = (plan.monthlyPrice - plan.annualPrice) * 12
              return (
                <div key={plan.name}
                  className={`rounded-3xl p-7 flex flex-col relative ${plan.highlight ? 'bg-blue-600 shadow-2xl shadow-blue-200 scale-[1.02]' : 'bg-white border border-slate-200'}`}>
                  {plan.highlight && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold shadow">Más popular</span>
                    </div>
                  )}
                  <div className="mb-7">
                    <p className={`text-xs font-bold tracking-widest uppercase mb-5 ${plan.highlight ? 'text-blue-200' : 'text-slate-400'}`}>{plan.name}</p>
                    {price === 0 ? (
                      <>
                        <p className={`text-5xl font-extrabold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>Gratis</p>
                        <p className={`text-sm mt-1.5 ${plan.highlight ? 'text-blue-200' : 'text-slate-400'}`}>Para siempre · Sin tarjeta</p>
                      </>
                    ) : annual ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <p className={`text-5xl font-extrabold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>${totalAnual}</p>
                          <p className={`text-sm ${plan.highlight ? 'text-blue-200' : 'text-slate-400'}`}>/año</p>
                        </div>
                        <p className={`text-sm mt-1.5 ${plan.highlight ? 'text-blue-200' : 'text-slate-400'}`}>
                          ${price}/mes · <span className="text-emerald-400 font-semibold">ahorras ${savingsAnual.toFixed(0)}</span>
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <p className={`text-5xl font-extrabold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>${price}</p>
                          <p className={`text-sm ${plan.highlight ? 'text-blue-200' : 'text-slate-400'}`}>/mes</p>
                        </div>
                        <p className={`text-sm mt-1.5 ${plan.highlight ? 'text-blue-200' : 'text-slate-400'}`}>{plan.tagline}</p>
                      </>
                    )}
                    {price !== 0 && <p className={`text-sm mt-3 ${plan.highlight ? 'text-blue-100' : 'text-slate-500'}`}>{plan.tagline}</p>}
                  </div>

                  <ul className="space-y-3 flex-1 mb-7">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-3">
                        <svg className={`w-4 h-4 mt-0.5 shrink-0 ${plan.highlight ? 'text-blue-200' : 'text-emerald-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        <span className={`text-sm ${plan.highlight ? 'text-white' : 'text-slate-600'}`}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handlePlan(plan.key)}
                    disabled={pricingLoading === plan.key}
                    className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-60 ${
                      plan.highlight ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}>
                    {pricingLoading === plan.key ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${plan.highlight ? 'border-blue-600' : 'border-white'}`} />
                        Redirigiendo...
                      </span>
                    ) : plan.cta}
                  </button>
                </div>
              )
            })}
          </div>
          <p className="text-center text-sm text-slate-400 mt-8">Todos los planes incluyen cifrado E2E y actualizaciones automáticas.</p>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl font-extrabold text-slate-900 mb-5 leading-tight">
            Tu equipo ya lo estaba<br />esperando.
          </h2>
          <p className="text-slate-500 text-xl mb-10 max-w-lg mx-auto leading-relaxed">
            Empieza gratis hoy. Sin instalación, sin tarjeta, listo en menos de un minuto.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login?start=phone"
              className="px-10 py-4 rounded-full bg-blue-600 text-white font-bold text-base hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 hover:-translate-y-0.5 active:scale-[0.98]">
              Crear cuenta gratis
            </Link>
            <a href="#precios"
              className="px-8 py-4 rounded-full border border-slate-200 text-slate-700 font-semibold text-base hover:bg-slate-50 transition-all">
              Ver precios →
            </a>
          </div>
          <p className="text-slate-400 text-sm mt-6">Sin tarjeta · Sin instalación · Cancela cuando quieras</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-100 py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-10">
            <div className="col-span-2 sm:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Image src="/dochatlogo.png" alt="DO Chat" width={20} height={20} className="rounded-lg" />
                </div>
                <span className="font-bold text-slate-900">DO Chat</span>
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed">
                Mensajería profesional con IA. Para equipos que producen.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Producto</p>
              <div className="space-y-3">
                <a href="#funciones" className="block text-sm text-slate-500 hover:text-slate-900 transition-colors">Funciones</a>
                <a href="#precios" className="block text-sm text-slate-500 hover:text-slate-900 transition-colors">Precios</a>
                <a href="#seguridad" className="block text-sm text-slate-500 hover:text-slate-900 transition-colors">Seguridad</a>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Legal</p>
              <div className="space-y-3">
                <Link href="/privacy" className="block text-sm text-slate-500 hover:text-slate-900 transition-colors">Privacidad</Link>
                <Link href="/terms" className="block text-sm text-slate-500 hover:text-slate-900 transition-colors">Términos</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Contacto</p>
              <div className="space-y-3">
                <Link href="/login" className="block text-sm text-slate-500 hover:text-slate-900 transition-colors">Iniciar sesión</Link>
                <Link href="/login?start=phone" className="block text-sm text-slate-500 hover:text-slate-900 transition-colors">Crear cuenta</Link>
                <a href="mailto:hola@getdochat.com" className="block text-sm text-slate-500 hover:text-slate-900 transition-colors">hola@getdochat.com</a>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-xs">© 2025 DO Chat. Todos los derechos reservados.</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Todos los sistemas operativos
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
