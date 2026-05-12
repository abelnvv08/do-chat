'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useLanguage, LangToggle } from '@/lib/i18n'

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-[220px] shrink-0">
      <div className="relative rounded-[2.2rem] p-2.5 shadow-2xl border bg-[#1a1a1a] border-white/10 shadow-black/40">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-14 h-1 bg-white/20 rounded-full" />
        <div className="rounded-[1.8rem] overflow-hidden" style={{ height: 420 }}>{children}</div>
      </div>
      <div className="absolute inset-0 rounded-[2.2rem] bg-blue-500/10 blur-2xl -z-10 scale-90" />
    </div>
  )
}

function ChatHeader({ name, sub, emoji, bg }: { name: string; sub: string; emoji: string; bg: string }) {
  return (
    <div className="bg-[#0f172a] px-3 pt-9 pb-2.5 flex items-center gap-2.5">
      <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center text-sm shrink-0`}>{emoji}</div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold truncate">{name}</p>
        <p className="text-blue-300/70 text-[9px]">{sub}</p>
      </div>
    </div>
  )
}

function Msg({ own, text, time, avatar, reaction }: { own: boolean; text: string; time?: string; avatar?: string; reaction?: string }) {
  return (
    <div className={`flex ${own ? 'justify-end' : 'gap-1.5 items-end'}`}>
      {!own && avatar && <div className={`w-5 h-5 rounded-full ${avatar} flex items-center justify-center text-[8px] text-white shrink-0`} />}
      <div className="relative">
        <div className={`rounded-xl px-2.5 py-1.5 max-w-[160px] text-[10px] leading-relaxed ${own ? 'bg-[#dbeafe] text-gray-800 rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm'} shadow-sm`}>
          {text}
          {time && <span className="block text-[8px] text-gray-400 text-right mt-0.5">{time} {own ? '✓✓' : ''}</span>}
        </div>
        {reaction && <div className="absolute -bottom-2 right-0 bg-white rounded-full px-1 py-0.5 text-[9px] shadow-sm border border-gray-100">{reaction}</div>}
      </div>
    </div>
  )
}

function InputBar({ placeholder }: { placeholder: string }) {
  return (
    <div className="bg-[#f0f2f5] px-2.5 py-2 flex items-center gap-1.5">
      <div className="flex-1 bg-white rounded-full px-3 py-1.5">
        <p className="text-gray-400 text-[9px]">{placeholder}</p>
      </div>
      <div className="w-7 h-7 rounded-full bg-[#1a56db] flex items-center justify-center shrink-0">
        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
      </div>
    </div>
  )
}

const PLAN_COLORS = {
  free:     { border: 'border-gray-200',   badge: '',            badgeBg: '',             cta: 'bg-gray-900 hover:bg-gray-700 text-white', href: '/login' },
  pro:      { border: 'border-blue-500 ring-2 ring-blue-500', badge: '', badgeBg: 'bg-blue-600',   cta: 'bg-blue-600 hover:bg-blue-700 text-white',   href: '/pricing' },
  business: { border: 'border-violet-500', badge: '',            badgeBg: 'bg-violet-600', cta: 'bg-violet-600 hover:bg-violet-700 text-white', href: '/pricing' },
}

export default function LandingPage() {
  const { t, lang, setLang } = useLanguage()
  const l = t.landing
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const phoneMocks = [
    <Phone key="ai">
      <div className="flex flex-col h-full bg-[#f1f5f9]">
        <ChatHeader name="DO AI" sub={t.app.chat.online} emoji="✦" bg="bg-blue-600" />
        <div className="flex-1 px-2.5 py-2 space-y-2 overflow-hidden">
          <Msg own time="9:01" text={lang === 'en' ? 'Summarize the key points from today\'s meeting' : 'Resume los puntos clave de la junta de hoy'} />
          <Msg own={false} avatar="bg-blue-600" text={lang === 'en' ? '📋 3 agreements: approve Q3 budget, launch beta in July, review KPIs Friday.' : '📋 3 acuerdos: aprobar presupuesto Q3, lanzar beta en julio, revisar KPIs el viernes.'} time="9:01" />
          <Msg own time="9:04" text={lang === 'en' ? 'Notify the team that the deadline is Thursday at 6pm' : 'Notifica al equipo que el cierre es el jueves a las 6pm'} />
          <Msg own={false} avatar="bg-blue-600" text={lang === 'en' ? '✅ Message sent to 4 team contacts.' : '✅ Mensaje enviado a 4 contactos del equipo.'} time="9:04" />
          <Msg own time="9:07" text={lang === 'en' ? 'Schedule review with Management for Monday' : 'Agenda revisión con Dirección para el lunes'} />
          <Msg own={false} avatar="bg-blue-600" text={lang === 'en' ? '📅 Reminder set: Monday 9:00 AM — Review with Management.' : '📅 Recordatorio creado: Lunes 9:00 AM — Revisión con Dirección.'} time="9:07" />
        </div>
        <InputBar placeholder={t.app.chat.placeholder} />
      </div>
    </Phone>,
    <Phone key="chats">
      <div className="flex flex-col h-full bg-[#f1f5f9]">
        <ChatHeader name={lang === 'en' ? 'Commercial Management' : 'Dirección Comercial'} sub={lang === 'en' ? 'Director, Manager, Coordinator · 4' : 'Directora, Gerente, Coordinador · 4'} emoji="🏢" bg="bg-slate-700" />
        <div className="flex-1 px-2.5 py-2 space-y-2 overflow-hidden">
          <Msg own={false} avatar="bg-slate-600" text={lang === 'en' ? 'Client confirmed the contract. Digital signature Wednesday.' : 'El cliente confirmó el contrato. Firma digital el miércoles.'} time="10:05" />
          <Msg own={false} avatar="bg-blue-700" text={lang === 'en' ? 'Perfect. Coordinate technical delivery next week?' : 'Perfecto. ¿Coordinamos la entrega técnica para la siguiente semana?'} time="10:07" reaction="✅ 2" />
          <Msg own time="10:09" text={lang === 'en' ? 'Confirmed. Preparing onboarding plan for Thursday.' : 'Confirmo. Preparo el plan de onboarding para el jueves.'} />
          <Msg own={false} avatar="bg-slate-600" text={lang === 'en' ? 'Done. Shared contract in Projects.' : 'Listo. Compartí el contrato en Proyectos.'} time="10:11" />
          <Msg own time="10:12" text={lang === 'en' ? 'Reviewed. All good. 👍' : 'Revisado. Todo en orden. 👍'} />
        </div>
        <InputBar placeholder={t.app.chat.placeholder} />
      </div>
    </Phone>,
    <Phone key="tasks">
      <div className="flex flex-col h-full bg-[#f2f2f7]">
        <div className="bg-white px-3 pt-9 pb-2.5 border-b border-gray-100">
          <p className="text-gray-900 text-sm font-bold">{l.features.items[2].tag}</p>
          <p className="text-gray-400 text-[9px]">{lang === 'en' ? '3 for today · 2 urgent' : '3 para hoy · 2 urgentes'}</p>
        </div>
        <div className="flex-1 overflow-hidden px-3 py-2 space-y-1.5">
          {[
            { done: true,  text: lang === 'en' ? 'Send commercial proposal' : 'Enviar propuesta comercial',        sub: lang === 'en' ? 'Completed · yesterday' : 'Completado · ayer' },
            { done: true,  text: lang === 'en' ? 'Validate client access'    : 'Validar accesos del cliente',       sub: lang === 'en' ? 'Completed · tue'       : 'Completado · mar' },
            { done: false, text: lang === 'en' ? 'Review contract with legal' : 'Revisar contrato con legal',        sub: lang === 'en' ? 'Today · Urgent'        : 'Hoy · Urgente', red: true },
            { done: false, text: lang === 'en' ? 'Present report to board'   : 'Presentar informe a dirección',     sub: lang === 'en' ? 'Today · Urgent'        : 'Hoy · Urgente', red: true },
            { done: false, text: lang === 'en' ? 'Coordinate technical delivery' : 'Coordinar entrega técnica',    sub: lang === 'en' ? 'Thu May 8'             : 'Jue 8 mayo' },
          ].map((task, i) => (
            <div key={i} className="flex items-start gap-2.5 bg-white rounded-xl px-2.5 py-2 shadow-sm">
              <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${task.done ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                {task.done && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-medium truncate ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.text}</p>
                <p className={`text-[8px] mt-0.5 ${(task as any).red ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>{task.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Phone>,
    <Phone key="projects">
      <div className="flex flex-col h-full bg-[#f2f2f7]">
        <div className="bg-white px-3 pt-9 pb-2.5 border-b border-gray-100">
          <p className="text-gray-900 text-sm font-bold">{l.features.items[3].tag}</p>
          <p className="text-[9px] text-gray-400">{lang === 'en' ? '4 active this month' : '4 activos este mes'}</p>
        </div>
        <div className="flex-1 overflow-hidden px-3 py-3 space-y-2.5">
          {[
            { initials: 'CC', name: lang === 'en' ? 'Nexum Client Closing' : 'Cierre Cliente Nexum', files: 5, color: 'bg-blue-50 border-blue-100', bg: 'bg-blue-600' },
            { initials: 'RR', name: lang === 'en' ? 'Q2 Regulatory Report' : 'Informe Regulatorio Q2', files: 8, color: 'bg-slate-50 border-slate-200', bg: 'bg-slate-600' },
            { initials: 'OP', name: lang === 'en' ? '2026 Operational Plan' : 'Plan Operativo 2026', files: 4, color: 'bg-indigo-50 border-indigo-100', bg: 'bg-indigo-600' },
            { initials: 'CA', name: lang === 'en' ? 'Contract Audit' : 'Auditoría de Contratos', files: 11, color: 'bg-teal-50 border-teal-100', bg: 'bg-teal-600' },
          ].map((p, i) => (
            <div key={i} className={`bg-white rounded-xl p-3 shadow-sm border ${p.color}`}>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className={`w-7 h-7 rounded-lg ${p.bg} flex items-center justify-center text-[9px] font-bold text-white shrink-0`}>{p.initials}</div>
                <p className="text-[11px] font-bold text-gray-900 flex-1 truncate">{p.name}</p>
              </div>
              <p className="text-[9px] text-gray-400">{p.files} {lang === 'en' ? 'files · Updated today' : 'archivos · Actualizado hoy'}</p>
              <div className="flex gap-1 mt-2">
                {['pdf', 'docx', 'xlsx'].map((ext, j) => (
                  <span key={j} className="text-[8px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-medium">.{ext}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Phone>,
  ]

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
              <Image src="/dochatlogo.png" alt="DO Chat" width={20} height={20} className="rounded-lg" />
            </div>
            <span className={`text-lg font-extrabold tracking-tight transition-colors ${scrolled ? 'text-gray-900' : 'text-white'}`}>DO Chat</span>
          </Link>

          <div className="hidden sm:flex items-center gap-5">
            <a href="#funciones" className={`text-sm font-medium transition-colors ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'}`}>{l.nav.features}</a>
            <Link href="/pricing" className={`text-sm font-medium transition-colors ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'}`}>{l.nav.pricing}</Link>
            <Link href="/login" className={`text-sm font-medium transition-colors ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'}`}>{l.nav.signIn}</Link>
            <LangToggle className={scrolled ? 'border-gray-200 text-gray-600 hover:border-gray-400' : 'border-white/30 text-white/80 hover:border-white'} />
            <Link href="/login?start=phone" className="px-5 py-2.5 rounded-full bg-[#1a56db] text-white text-sm font-semibold hover:bg-[#1648c8] transition-colors shadow-sm">
              {l.nav.getStarted}
            </Link>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden p-2">
            <svg className={`w-5 h-5 ${scrolled ? 'text-gray-900' : 'text-white'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="sm:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3">
            <a href="#funciones" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700">{l.nav.features}</a>
            <Link href="/pricing" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700">{l.nav.pricing}</Link>
            <Link href="/login" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700">{l.nav.signIn}</Link>
            <button onClick={() => { setLang(lang === 'en' ? 'es' : 'en'); setMenuOpen(false) }} className="block text-sm font-medium text-blue-600">
              {lang === 'en' ? '🌐 Cambiar a Español' : '🌐 Switch to English'}
            </button>
            <Link href="/login?start=phone" className="block w-full text-center px-5 py-3 rounded-full bg-blue-600 text-white text-sm font-semibold">
              {l.nav.getStarted}
            </Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#1a56db]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-blue-400 blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-indigo-400 blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 pt-32 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-blue-200 text-xs font-medium mb-6 border border-white/20">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {l.hero.badge}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
            {l.hero.title}<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">
              {l.hero.titleHighlight}
            </span>
          </h1>
          <p className="text-lg text-blue-100 mb-10 max-w-xl mx-auto leading-relaxed">{l.hero.subtitle}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login?start=phone" className="px-10 py-4 rounded-full bg-white text-[#1a56db] font-bold text-base hover:bg-blue-50 transition-all shadow-xl hover:-translate-y-0.5 active:scale-95">
              {l.hero.ctaPrimary}
            </Link>
            <Link href="/pricing" className="px-8 py-4 rounded-full bg-white/10 text-white font-semibold text-base hover:bg-white/20 transition-all border border-white/20">
              {l.hero.ctaSecondary}
            </Link>
          </div>
          <p className="text-blue-300/60 text-xs mt-5">{l.hero.disclaimer}</p>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="bg-[#0f172a] border-t border-white/5 py-5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-3">
            {[
              { icon: '🔒', text: l.trust.encryption },
              { icon: '⚡', text: l.trust.ai },
              { icon: '📱', text: l.trust.device },
              { icon: '🌐', text: l.trust.noInstall },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-2 text-white/60 text-sm">
                <span>{item.icon}</span><span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="funciones" className="bg-[#f8fafc] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">{l.features.sectionTitle}</h2>
            <p className="text-gray-500 text-lg max-w-lg mx-auto">{l.features.sectionSub}</p>
          </div>
          <div className="space-y-24">
            {l.features.items.map((f, i) => (
              <div key={f.tag} className={`flex flex-col ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12`}>
                <div className="flex-1 text-center lg:text-left">
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide mb-4">{f.tag}</span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">{f.title}</h3>
                  <p className="text-gray-500 text-lg leading-relaxed max-w-md mx-auto lg:mx-0">{f.desc}</p>
                </div>
                <div className="flex justify-center">{phoneMocks[i]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="rounded-3xl bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] p-10 lg:p-16 flex flex-col lg:flex-row items-center gap-10">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-blue-200 text-xs font-bold uppercase tracking-wide mb-5 border border-white/20">
                {l.security.badge}
              </div>
              <h2 className="text-3xl font-extrabold text-white mb-4">{l.security.title}</h2>
              <p className="text-blue-200 text-lg leading-relaxed mb-6">{l.security.subtitle}</p>
              <div className="flex flex-col gap-2">
                {l.security.bullets.map(b => (
                  <div key={b} className="flex items-center gap-2 text-white/80 text-sm">
                    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {b}
                  </div>
                ))}
              </div>
            </div>
            <div className="shrink-0">
              <div className="w-32 h-32 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center">
                <svg className="w-16 h-16 text-blue-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section id="precios" className="py-20 bg-[#f8fafc]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">{l.pricingSection.title}</h2>
            <p className="text-gray-500 text-lg">{l.pricingSection.sub}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {(['free', 'pro', 'business'] as const).map(key => {
              const plan = l.plans[key]
              const colors = PLAN_COLORS[key]
              return (
                <div key={key} className={`bg-white rounded-2xl border-2 p-7 flex flex-col relative ${colors.border} transition-shadow hover:shadow-lg`}>
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${colors.badgeBg}`}>{plan.badge}</span>
                    </div>
                  )}
                  <div className="mb-5">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                      {key !== 'free' && <span className="text-gray-400 text-sm">/ {plan.period}</span>}
                    </div>
                  </div>
                  <ul className="space-y-2.5 flex-1 mb-6">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        <span className="text-sm text-gray-700">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={colors.href} className={`w-full py-3 rounded-xl font-semibold text-sm text-center transition-all active:scale-[0.98] ${colors.cta}`}>
                    {plan.cta}
                  </Link>
                </div>
              )
            })}
          </div>
          <p className="text-center text-sm text-gray-400 mt-8">{l.pricingSection.disclaimer}</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-[#0f172a] to-[#1a56db]">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">{l.cta.title}</h2>
          <p className="text-blue-200 text-lg mb-10 max-w-lg mx-auto">{l.cta.subtitle}</p>
          <Link href="/login?start=phone" className="inline-block px-12 py-4 rounded-full bg-white text-[#1a56db] font-bold text-lg hover:bg-blue-50 transition-all shadow-xl hover:-translate-y-0.5 active:scale-95">
            {l.cta.button}
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0f172a] py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <Image src="/dochatlogo.png" alt="DO Chat" width={16} height={16} className="rounded-md" />
              </div>
              <span className="text-sm font-bold text-white/60 tracking-tight">DO Chat</span>
            </Link>
            <div className="flex gap-6 text-gray-500 text-sm">
              <a href="#funciones" className="hover:text-white transition-colors">{l.footer.features}</a>
              <Link href="/pricing" className="hover:text-white transition-colors">{l.footer.pricing}</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">{l.footer.privacy}</Link>
              <Link href="/terms" className="hover:text-white transition-colors">{l.footer.terms}</Link>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6">
            <p className="text-gray-600 text-xs text-center">{l.footer.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
