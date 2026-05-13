'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingV2() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [annual, setAnnual] = useState(false)
  const [pricingLoading, setPricingLoading] = useState<string | null>(null)
  const [pricingError, setPricingError] = useState<string | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
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
    <div className="min-h-screen bg-[#080c14] text-white font-sans antialiased">

      {/* ── NAV ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#080c14]/95 backdrop-blur-md border-b border-white/5' : ''}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Image src="/dochatlogo.png" alt="DO Chat" width={20} height={20} className="rounded-lg" />
            </div>
            <span className="text-base font-bold tracking-tight">DO Chat</span>
          </Link>

          <div className="hidden sm:flex items-center gap-6">
            <a href="#funciones" className="text-sm text-white/60 hover:text-white transition-colors">Funciones</a>
            <a href="#como-funciona" className="text-sm text-white/60 hover:text-white transition-colors">Cómo funciona</a>
            <a href="#seguridad" className="text-sm text-white/60 hover:text-white transition-colors">Seguridad</a>
            <a href="#precios" className="text-sm text-white/60 hover:text-white transition-colors">Precios</a>
            <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">Iniciar sesión</Link>
            <Link href="/login?start=phone"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20">
              Empezar gratis
            </Link>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden p-2">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
        {menuOpen && (
          <div className="sm:hidden bg-[#0d1320] border-t border-white/5 px-6 py-4 space-y-3">
            <a href="#funciones" onClick={() => setMenuOpen(false)} className="block text-sm text-white/70">Funciones</a>
            <a href="#como-funciona" onClick={() => setMenuOpen(false)} className="block text-sm text-white/70">Cómo funciona</a>
            <Link href="/pricing" onClick={() => setMenuOpen(false)} className="block text-sm text-white/70">Precios</Link>
            <Link href="/login" onClick={() => setMenuOpen(false)} className="block text-sm text-white/70">Iniciar sesión</Link>
            <Link href="/login?start=phone" className="block w-full text-center px-4 py-3 rounded-lg bg-blue-600 text-white text-sm font-semibold">
              Empezar gratis
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden pt-32 pb-28 px-6">
        {/* bg glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Disponible en iOS, Android y web — sin instalar nada
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
            Mensajería con IA<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-300">
              para equipos que producen
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-10">
            DO Chat combina mensajería cifrada end-to-end con una IA que gestiona tareas, recuerda compromisos y notifica a tu equipo — todo desde la misma conversación.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Link href="/login?start=phone"
              className="px-8 py-4 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 hover:-translate-y-0.5 active:scale-95">
              Empezar gratis
            </Link>
            <a href="#precios"
              className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-base hover:bg-white/10 transition-all">
              Ver precios →
            </a>
          </div>
          <p className="text-white/25 text-sm">Sin tarjeta de crédito · Gratis para siempre en el plan básico</p>
        </div>

        {/* Metrics bar */}
        <div className="relative max-w-3xl mx-auto mt-20 grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
          {[
            { n: 'AES-256', label: 'Cifrado GCM' },
            { n: '<100ms', label: 'Entrega de mensajes' },
            { n: '100%', label: 'Privado por diseño' },
            { n: '✦ do AI', label: 'IA integrada' },
          ].map(m => (
            <div key={m.label} className="bg-[#0d1320] px-6 py-5 text-center">
              <p className="text-lg font-bold text-white">{m.n}</p>
              <p className="text-xs text-white/40 mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CAPABILITIES GRID ── */}
      <section id="funciones" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-bold text-white/20 tracking-widest uppercase">01</span>
            <div className="h-px flex-1 bg-white/5 max-w-[60px]" />
          </div>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold max-w-lg leading-tight">
              Todo lo que necesita<br />un equipo moderno
            </h2>
            <p className="text-white/40 max-w-sm text-sm leading-relaxed">
              Diseñado para que la comunicación y la productividad sucedan en el mismo lugar.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: '✦',
                title: 'IA integrada',
                desc: 'do AI entiende el contexto de tus conversaciones, gestiona tareas y notifica a tu equipo automáticamente.',
                color: 'from-blue-500/10 to-indigo-500/5',
                border: 'border-blue-500/20',
                iconBg: 'bg-blue-500/10 text-blue-400',
              },
              {
                icon: '🔒',
                title: 'Cifrado E2E',
                desc: 'AES-256-GCM aplicado mensaje a mensaje. Ni nosotros podemos leer tu historial.',
                color: 'from-emerald-500/10 to-teal-500/5',
                border: 'border-emerald-500/20',
                iconBg: 'bg-emerald-500/10 text-emerald-400',
              },
              {
                icon: '✅',
                title: 'Tareas y recordatorios',
                desc: 'Crea, asigna y recibe alertas de tareas directamente en la conversación. La IA hace el seguimiento.',
                color: 'from-violet-500/10 to-purple-500/5',
                border: 'border-violet-500/20',
                iconBg: 'bg-violet-500/10 text-violet-400',
              },
              {
                icon: '📁',
                title: 'Archivos y proyectos',
                desc: 'Organiza documentos en proyectos compartidos. Fotos, PDFs, hojas de cálculo — todo accesible.',
                color: 'from-amber-500/10 to-orange-500/5',
                border: 'border-amber-500/20',
                iconBg: 'bg-amber-500/10 text-amber-400',
              },
            ].map(c => (
              <div key={c.title} className={`rounded-2xl bg-gradient-to-b ${c.color} border ${c.border} p-6 flex flex-col gap-4`}>
                <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center text-lg`}>{c.icon}</div>
                <div>
                  <h3 className="font-bold text-white mb-2">{c.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="como-funciona" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-bold text-white/20 tracking-widest uppercase">02</span>
            <div className="h-px flex-1 bg-white/5 max-w-[60px]" />
          </div>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold max-w-lg leading-tight">
              Listo en menos<br />de un minuto
            </h2>
            <p className="text-white/40 max-w-sm text-sm leading-relaxed">
              Sin configuración. Sin servidores. Sin IT. Entra y empieza a producir.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {[
              {
                step: '01',
                title: 'Crea tu cuenta',
                desc: 'Regístrate con tu número de teléfono en segundos. Sin contraseñas. Sin formularios largos.',
                detail: 'Solo tu número → código SMS → listo',
              },
              {
                step: '02',
                title: 'Invita a tu equipo',
                desc: 'Busca contactos por número o @usuario. Crea grupos de trabajo con un toque.',
                detail: 'Por contacto · Por grupo · Por proyecto',
              },
              {
                step: '03',
                title: 'Chatea y produce',
                desc: 'La IA do AI está disponible en cualquier chat. Asigna tareas, recibe resúmenes, automatiza avisos.',
                detail: 'IA contextual · Sin apps extra · Tiempo real',
              },
            ].map(s => (
              <div key={s.step} className="rounded-2xl bg-white/3 border border-white/8 p-6 flex flex-col gap-4">
                <span className="text-4xl font-extrabold text-white/10">{s.step}</span>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed mb-4">{s.desc}</p>
                  <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-xs text-white/30 font-mono">{s.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* AI demo snippet */}
          <div className="rounded-2xl bg-[#0d1320] border border-white/8 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs text-white/20 font-mono">do AI — conversación real</span>
            </div>
            <div className="px-6 py-5 space-y-3 font-mono text-sm">
              <div className="flex items-start gap-3">
                <span className="text-white/20 shrink-0 mt-0.5">Tu</span>
                <span className="text-white/70">Notifica al equipo que el cierre de contrato es el viernes a las 5pm</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-400 shrink-0 mt-0.5">✦</span>
                <span className="text-white/50">Mensaje enviado a <span className="text-blue-400">4 contactos</span>. Recordatorio creado para el <span className="text-blue-400">viernes 17:00</span>.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-white/20 shrink-0 mt-0.5">Tu</span>
                <span className="text-white/70">Resume los puntos clave de la reunión de hoy</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-400 shrink-0 mt-0.5">✦</span>
                <span className="text-white/50"><span className="text-emerald-400">3 acuerdos</span>: aprobar presupuesto Q3, lanzar beta en julio, revisar KPIs el viernes.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECURITY ── */}
      <section id="seguridad" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-bold text-white/20 tracking-widest uppercase">03</span>
            <div className="h-px flex-1 bg-white/5 max-w-[60px]" />
          </div>
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="flex-1">
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
                Privacidad sin compromisos.<br />
                <span className="text-white/40">Por diseño.</span>
              </h2>
              <p className="text-white/40 text-lg leading-relaxed mb-8">
                Cada mensaje se cifra con AES-256-GCM antes de salir de tu dispositivo. Ni DO Chat tiene acceso a tu historial.
              </p>
              <div className="space-y-3">
                {[
                  { icon: '🔐', text: 'AES-256-GCM — el mismo estándar que usan los bancos' },
                  { icon: '🚫', text: 'Sin anuncios. Sin venta de datos. Sin rastreo' },
                  { icon: '🛡️', text: 'Cifrado punto a punto en mensajes, archivos y llamadas' },
                  { icon: '✅', text: 'Solo tú y tus contactos pueden leer las conversaciones' },
                ].map(b => (
                  <div key={b.text} className="flex items-center gap-3 text-white/60 text-sm">
                    <span className="text-base">{b.icon}</span>
                    <span>{b.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="shrink-0 grid grid-cols-2 gap-4">
              {[
                { label: 'Cifrado', value: 'AES-256-GCM', icon: '🔒' },
                { label: 'Acceso externo', value: 'Ninguno', icon: '🚫' },
                { label: 'Datos vendidos', value: 'Cero', icon: '✋' },
                { label: 'Privacidad', value: 'Por diseño', icon: '🛡️' },
              ].map(c => (
                <div key={c.label} className="rounded-2xl bg-white/3 border border-white/8 p-5 text-center w-36">
                  <div className="text-2xl mb-2">{c.icon}</div>
                  <p className="text-white font-bold text-sm">{c.value}</p>
                  <p className="text-white/30 text-xs mt-1">{c.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="precios" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-bold text-white/20 tracking-widest uppercase">04</span>
            <div className="h-px flex-1 bg-white/5 max-w-[60px]" />
          </div>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold max-w-md leading-tight">
              Precios simples,<br />sin sorpresas
            </h2>
            <div className="flex items-center gap-3">
              <span className={`text-sm ${!annual ? 'text-white' : 'text-white/40'}`}>Mensual</span>
              <button onClick={() => setAnnual(!annual)}
                className={`w-12 h-6 rounded-full transition-colors relative ${annual ? 'bg-blue-600' : 'bg-white/10'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${annual ? 'left-7' : 'left-1'}`} />
              </button>
              <span className={`text-sm ${annual ? 'text-white' : 'text-white/40'}`}>
                Anual <span className="text-emerald-400 text-xs font-bold">−20%</span>
              </span>
            </div>
          </div>

          {pricingError && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4 mb-8">
              <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
              <p className="text-red-300 text-sm flex-1">{pricingError}</p>
              <button onClick={() => setPricingError(null)} className="text-red-400 hover:text-red-200"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6">
            {([
              {
                key: 'free',
                name: 'Free',
                price: '$0',
                period: 'para siempre',
                desc: 'Para personas y equipos pequeños.',
                features: ['Mensajes ilimitados', 'Cifrado E2E', 'do AI (básico)', '1 GB de archivos', 'Hasta 5 contactos activos'],
                cta: 'Empezar gratis',
                highlight: false,
                badge: '',
              },
              {
                key: 'pro',
                name: 'Pro',
                price: annual ? '$10' : '$12.99',
                period: 'por usuario / mes',
                desc: 'Para equipos que necesitan más poder.',
                features: ['Todo en Free', 'do AI sin límites', '100 GB de archivos', 'Contactos ilimitados', 'Llamadas grupales', 'Soporte prioritario'],
                cta: 'Probar gratis 14 días',
                highlight: true,
                badge: 'Más popular',
              },
              {
                key: 'business',
                name: 'Business',
                price: annual ? '$79' : '$99',
                period: 'por usuario / mes',
                desc: 'Para empresas con necesidades avanzadas.',
                features: ['Todo en Pro', 'Almacenamiento ilimitado', 'Integraciones custom', 'SLA garantizado', 'Soporte 24/7', 'Factura empresarial'],
                cta: 'Contactar ventas',
                highlight: false,
                badge: '',
              },
            ] as const).map(plan => (
              <div key={plan.name}
                className={`rounded-2xl border p-7 flex flex-col relative transition-all ${plan.highlight ? 'bg-blue-600 border-blue-500 shadow-2xl shadow-blue-500/20' : 'bg-white/3 border-white/10 hover:bg-white/5'}`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full bg-white text-blue-600 text-xs font-bold shadow">{plan.badge}</span>
                  </div>
                )}
                <div className="mb-5">
                  <h3 className={`text-sm font-semibold mb-2 ${plan.highlight ? 'text-blue-100' : 'text-white/60'}`}>{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                    {plan.period && <span className={`text-sm ${plan.highlight ? 'text-blue-200' : 'text-white/30'}`}>{plan.period}</span>}
                  </div>
                  <p className={`text-sm ${plan.highlight ? 'text-blue-200' : 'text-white/40'}`}>{plan.desc}</p>
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5">
                      <svg className={`w-4 h-4 shrink-0 ${plan.highlight ? 'text-blue-200' : 'text-emerald-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={`text-sm ${plan.highlight ? 'text-white' : 'text-white/60'}`}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handlePlan(plan.key)}
                  disabled={pricingLoading === plan.key}
                  className={`w-full py-3 rounded-xl font-semibold text-sm text-center transition-all active:scale-[0.98] disabled:opacity-50 ${plan.highlight ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-white/8 text-white hover:bg-white/12 border border-white/10'}`}>
                  {pricingLoading === plan.key ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${plan.highlight ? 'border-blue-600' : 'border-white'}`} />
                      Redirigiendo...
                    </span>
                  ) : plan.cta}
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-white/20 mt-8">Todos los planes incluyen actualizaciones automáticas, cifrado E2E y soporte.</p>
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
              Para cada momento de tu vida
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              DO Chat es para todos. Úsalo con tu familia, tus amigos, tu equipo de trabajo — o los tres a la vez.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1 — Familia/amigos */}
            <div className="rounded-2xl bg-white/3 border border-white/8 overflow-hidden">
              <div className="bg-[#0d1320] px-5 py-4 border-b border-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center text-sm">👨‍👩‍👧</div>
                <div>
                  <p className="text-white text-xs font-semibold">Familia 🏡</p>
                  <p className="text-white/30 text-[10px]">4 miembros · en línea</p>
                </div>
              </div>
              <div className="px-4 py-4 space-y-3">
                <div className="flex gap-2 items-end">
                  <div className="w-6 h-6 rounded-full bg-orange-400/20 text-orange-300 flex items-center justify-center text-[10px] shrink-0">M</div>
                  <div className="bg-white/8 rounded-2xl rounded-bl-sm px-3 py-2 max-w-[75%]">
                    <p className="text-white/80 text-xs">¿A qué hora llegamos mañana?</p>
                    <p className="text-white/25 text-[9px] mt-1">10:14</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-blue-600 rounded-2xl rounded-br-sm px-3 py-2 max-w-[75%]">
                    <p className="text-white text-xs">Como a las 3pm, les aviso cuando salga 🚗</p>
                    <p className="text-blue-200/60 text-[9px] mt-1 text-right">10:15 ✓✓</p>
                  </div>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="w-6 h-6 rounded-full bg-purple-400/20 text-purple-300 flex items-center justify-center text-[10px] shrink-0">P</div>
                  <div className="bg-white/8 rounded-2xl rounded-bl-sm px-3 py-2 max-w-[75%]">
                    <p className="text-white/80 text-xs">Yo hago la carnita 🔥🔥🔥</p>
                    <p className="text-white/25 text-[9px] mt-1">10:16</p>
                  </div>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="w-6 h-6 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center text-[10px] shrink-0">L</div>
                  <div className="bg-white/8 rounded-2xl rounded-bl-sm px-3 py-2">
                    <p className="text-white/80 text-xs">❤️❤️ los queremos mucho</p>
                    <p className="text-white/25 text-[9px] mt-1">10:17</p>
                  </div>
                </div>
              </div>
              <div className="px-4 pb-4">
                <p className="text-white/20 text-[11px] text-center">Cifrado · Solo tu familia lo lee</p>
              </div>
            </div>

            {/* Card 2 — Amigos */}
            <div className="rounded-2xl bg-white/3 border border-white/8 overflow-hidden">
              <div className="bg-[#0d1320] px-5 py-4 border-b border-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-sm">🎉</div>
                <div>
                  <p className="text-white text-xs font-semibold">Los del barrio</p>
                  <p className="text-white/30 text-[10px]">7 miembros · 3 en línea</p>
                </div>
              </div>
              <div className="px-4 py-4 space-y-3">
                <div className="flex gap-2 items-end">
                  <div className="w-6 h-6 rounded-full bg-blue-400/20 text-blue-300 flex items-center justify-center text-[10px] shrink-0">R</div>
                  <div className="bg-white/8 rounded-2xl rounded-bl-sm px-3 py-2 max-w-[75%]">
                    <p className="text-white/80 text-xs">¿Viernes de partido o sábado?</p>
                    <p className="text-white/25 text-[9px] mt-1">18:02</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-blue-600 rounded-2xl rounded-br-sm px-3 py-2">
                    <p className="text-white text-xs">Sábado para mí 🙌</p>
                    <p className="text-blue-200/60 text-[9px] mt-1 text-right">18:03 ✓✓</p>
                  </div>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="w-6 h-6 rounded-full bg-rose-400/20 text-rose-300 flex items-center justify-center text-[10px] shrink-0">✦</div>
                  <div className="bg-white/8 rounded-2xl rounded-bl-sm px-3 py-2 max-w-[80%]">
                    <p className="text-white/80 text-xs">📊 Sábado: 5 votos · Viernes: 2 votos</p>
                    <p className="text-white/25 text-[9px] mt-1">do AI · 18:03</p>
                  </div>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center text-[10px] shrink-0">K</div>
                  <div className="bg-white/8 rounded-2xl rounded-bl-sm px-3 py-2">
                    <p className="text-white/80 text-xs">Jajaja la IA votó 😂 sábado es</p>
                    <p className="text-white/25 text-[9px] mt-1">18:04</p>
                  </div>
                </div>
              </div>
              <div className="px-4 pb-4">
                <p className="text-white/20 text-[11px] text-center">La IA te ayuda sin que se lo pidas</p>
              </div>
            </div>

            {/* Card 3 — Trabajo */}
            <div className="rounded-2xl bg-white/3 border border-white/8 overflow-hidden">
              <div className="bg-[#0d1320] px-5 py-4 border-b border-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm">💼</div>
                <div>
                  <p className="text-white text-xs font-semibold">Equipo Ventas</p>
                  <p className="text-white/30 text-[10px]">5 miembros · reunión activa</p>
                </div>
              </div>
              <div className="px-4 py-4 space-y-3">
                <div className="flex gap-2 items-end">
                  <div className="w-6 h-6 rounded-full bg-slate-400/20 text-slate-300 flex items-center justify-center text-[10px] shrink-0">A</div>
                  <div className="bg-white/8 rounded-2xl rounded-bl-sm px-3 py-2 max-w-[80%]">
                    <p className="text-white/80 text-xs">Cliente confirmó contrato ✅</p>
                    <p className="text-white/25 text-[9px] mt-1">09:41</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-blue-600 rounded-2xl rounded-br-sm px-3 py-2 max-w-[75%]">
                    <p className="text-white text-xs">Avisa al equipo legal por favor</p>
                    <p className="text-blue-200/60 text-[9px] mt-1 text-right">09:42 ✓✓</p>
                  </div>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="w-6 h-6 rounded-full bg-rose-400/20 text-rose-300 flex items-center justify-center text-[10px] shrink-0">✦</div>
                  <div className="bg-white/8 rounded-2xl rounded-bl-sm px-3 py-2 max-w-[80%]">
                    <p className="text-white/80 text-xs">✅ Notifiqué a Legal. Recordatorio creado: revisar contrato hoy 17:00.</p>
                    <p className="text-white/25 text-[9px] mt-1">do AI · 09:42</p>
                  </div>
                </div>
              </div>
              <div className="px-4 pb-4">
                <p className="text-white/20 text-[11px] text-center">IA que actúa, no solo responde</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
            Tu equipo merece<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              una mejor herramienta
            </span>
          </h2>
          <p className="text-white/40 text-lg mb-10 max-w-lg mx-auto">
            Empieza gratis hoy. Sin tarjeta. Sin instalación. Listo en menos de un minuto.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login?start=phone"
              className="px-10 py-4 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 hover:-translate-y-0.5 active:scale-95">
              Empezar gratis ahora
            </Link>
            <Link href="/pricing"
              className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-base hover:bg-white/10 transition-all">
              Ver planes →
            </Link>
          </div>
          <p className="text-white/20 text-sm mt-6">Sin tarjeta de crédito · Cancela cuando quieras</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-14">
            <div className="col-span-2 sm:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Image src="/dochatlogo.png" alt="DO Chat" width={20} height={20} className="rounded-lg" />
                </div>
                <span className="font-bold text-white">DO Chat</span>
              </Link>
              <p className="text-white/30 text-sm leading-relaxed">
                Mensajería con IA para equipos que necesitan producir más y preocuparse menos.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-white/20 uppercase tracking-widest mb-4">Producto</p>
              <div className="space-y-3">
                <a href="#funciones" className="block text-sm text-white/40 hover:text-white transition-colors">Funciones</a>
                <a href="#como-funciona" className="block text-sm text-white/40 hover:text-white transition-colors">Cómo funciona</a>
                <a href="#precios" className="block text-sm text-white/40 hover:text-white transition-colors">Precios</a>
                <a href="#seguridad" className="block text-sm text-white/40 hover:text-white transition-colors">Seguridad</a>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-white/20 uppercase tracking-widest mb-4">Empresa</p>
              <div className="space-y-3">
                <Link href="/privacy" className="block text-sm text-white/40 hover:text-white transition-colors">Privacidad</Link>
                <Link href="/terms" className="block text-sm text-white/40 hover:text-white transition-colors">Términos</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-white/20 uppercase tracking-widest mb-4">Soporte</p>
              <div className="space-y-3">
                <Link href="/login" className="block text-sm text-white/40 hover:text-white transition-colors">Iniciar sesión</Link>
                <Link href="/login?start=phone" className="block text-sm text-white/40 hover:text-white transition-colors">Registrarse</Link>
                <a href="mailto:hola@getdochat.com" className="block text-sm text-white/40 hover:text-white transition-colors">hola@getdochat.com</a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/20 text-xs">© 2025 DO Chat. Todos los derechos reservados.</p>
            <div className="flex items-center gap-2 text-xs text-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Todos los sistemas operativos
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
