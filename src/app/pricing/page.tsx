'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'

const PLAN_KEYS = ['free', 'pro', 'business'] as const
const PLAN_PRICES = { free: 0, pro: 12.99, business: 99 }
const PLAN_PRICES_ANNUAL = { free: 0, pro: 10, business: 79 }
const PLAN_API_KEYS = { free: 'free', pro: 'pro', business: 'business' }
const PLAN_NOT_OK = {
  free: [false, false, false, false, true, true, true],
  pro:  [true, true, true, true, true, true, true],
  business: [true, true, true, true, true, true, true],
}

export default function PricingPage() {
  return <Suspense><PricingContent /></Suspense>
}

function PricingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const p = t.pricing
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [annual, setAnnual] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (searchParams.get('canceled') === '1') {
      setError('Pago cancelado. Tu plan no fue modificado.')
      window.history.replaceState({}, '', '/pricing')
    }
  }, [searchParams])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  async function handleSelect(plan: string) {
    if (plan === 'free') { router.push('/login'); return }
    setLoading(plan)
    setError(null)
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (res.status === 401) { router.push('/login?next=/pricing'); return }
      if (data.url) { window.location.href = data.url; return }
      setError(data.error ?? 'Algo salió mal. Intenta de nuevo.')
    } catch {
      setError('Error de conexión. Revisa tu internet e intenta de nuevo.')
    } finally {
      setLoading(null)
    }
  }

  const planConfig = [
    {
      key: 'free' as const,
      name: 'Free',
      price: '$0',
      period: 'para siempre',
      desc: 'Para personas y equipos pequeños.',
      features: ['Mensajes ilimitados', 'Cifrado E2E', 'do AI (básico)', '2 GB de archivos', 'Hasta 5 contactos activos', '—', '—'],
      cta: 'Empezar gratis',
      highlight: false,
      badge: '',
    },
    {
      key: 'pro' as const,
      name: 'Pro',
      price: annual ? '$10' : `$${PLAN_PRICES.pro}`,
      period: 'por usuario / mes',
      desc: 'Para equipos que necesitan más.',
      features: ['Mensajes ilimitados', 'Cifrado E2E', 'do AI sin límites', '100 GB de archivos', 'Contactos ilimitados', 'Llamadas grupales', 'Soporte prioritario'],
      cta: p.plans.pro.cta,
      highlight: true,
      badge: 'Más popular',
    },
    {
      key: 'business' as const,
      name: 'Business',
      price: 'A medida',
      period: '',
      desc: 'Para empresas con necesidades avanzadas.',
      features: ['Todo en Pro', '500 GB de archivos', 'Integraciones custom', 'SLA garantizado', 'Soporte 24/7', 'Factura empresarial', 'Contrato personalizado'],
      cta: p.plans.business.cta,
      highlight: false,
      badge: '',
    },
  ]

  return (
    <div className="min-h-screen bg-[#080c14] text-white font-sans antialiased">

      {/* Nav */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#080c14]/95 backdrop-blur-md border-b border-white/5' : ''}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Image src="/icon-192.png" alt="DO Chat" width={20} height={20} className="rounded-lg" />
            </div>
            <span className="text-base font-bold tracking-tight">DO Chat</span>
          </Link>
          <div className="hidden sm:flex items-center gap-6">
            <Link href="/landing-v2#funciones" className="text-sm text-white/60 hover:text-white transition-colors">Funciones</Link>
            <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">Iniciar sesión</Link>
            <Link href="/login?start=phone" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20">
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 pt-32 pb-24">

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4 mb-8">
            <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            <p className="text-red-300 text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6">
            Sin contratos · Cancela cuando quieras
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
            Precios simples,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">sin sorpresas</span>
          </h1>
          <p className="text-white/40 text-lg max-w-lg mx-auto">{p.subtitle}</p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm ${!annual ? 'text-white' : 'text-white/40'}`}>Mensual</span>
            <button onClick={() => setAnnual(!annual)}
              className={`w-12 h-6 rounded-full transition-colors relative ${annual ? 'bg-blue-600' : 'bg-white/10'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${annual ? 'left-7' : 'left-1'}`} />
            </button>
            <span className={`text-sm ${annual ? 'text-white' : 'text-white/40'}`}>
              Anual <span className="text-emerald-400 text-xs font-bold ml-1">−20%</span>
            </span>
          </div>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {planConfig.map(plan => (
            <div key={plan.key}
              className={`rounded-2xl border p-7 flex flex-col relative transition-all ${plan.highlight ? 'bg-blue-600 border-blue-500 shadow-2xl shadow-blue-500/20' : 'bg-white/3 border-white/10 hover:bg-white/5'}`}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-white text-blue-600 text-xs font-bold shadow">{plan.badge}</span>
                </div>
              )}
              <div className="mb-6">
                <h2 className={`text-sm font-semibold mb-2 ${plan.highlight ? 'text-blue-100' : 'text-white/50'}`}>{plan.name}</h2>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  {plan.period && <span className={`text-sm ${plan.highlight ? 'text-blue-200' : 'text-white/30'}`}>{plan.period}</span>}
                </div>
                <p className={`text-sm mt-2 ${plan.highlight ? 'text-blue-200' : 'text-white/40'}`}>{plan.desc}</p>
              </div>

              <ul className="space-y-3 flex-1 mb-7">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    {f === '—' ? (
                      <svg className="w-4 h-4 shrink-0 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className={`w-4 h-4 shrink-0 ${plan.highlight ? 'text-blue-200' : 'text-emerald-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <span className={`text-sm ${f === '—' ? 'text-white/15' : plan.highlight ? 'text-white' : 'text-white/60'}`}>
                      {f === '—' ? 'No incluido' : f}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(PLAN_API_KEYS[plan.key])}
                disabled={loading === plan.key}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 ${plan.highlight ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-white/8 text-white hover:bg-white/12 border border-white/10'}`}>
                {loading === plan.key ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${plan.highlight ? 'border-blue-600' : 'border-white'}`} />
                    {p.redirecting}
                  </span>
                ) : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-white/20 mb-20">{p.disclaimer}</p>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {p.faq.items.map(([q, a]) => (
              <div key={q} className="rounded-2xl bg-white/3 border border-white/8 p-5">
                <p className="font-semibold text-white mb-2 text-sm">{q}</p>
                <p className="text-sm text-white/40 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer mini */}
      <div className="border-t border-white/5 py-8 px-6 text-center">
        <p className="text-white/20 text-xs">© 2025 DO Chat · <Link href="/privacy" className="hover:text-white transition-colors">Privacidad</Link> · <Link href="/terms" className="hover:text-white transition-colors">Términos</Link></p>
      </div>
    </div>
  )
}
