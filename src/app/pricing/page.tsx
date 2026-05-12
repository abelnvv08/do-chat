'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useLanguage, LangToggle } from '@/lib/i18n'

const B = ({ children }: { children: React.ReactNode }) => (
  <span className="font-bold text-gray-900">{children}</span>
)

const PLAN_KEYS = ['free', 'pro', 'business'] as const
const PLAN_PRICES = { free: 0, pro: 12.99, business: 29.99 }
const PLAN_API_KEYS = { free: 'free', pro: 'pro', business: 'business' }
const PLAN_STYLES = {
  free:     { border: 'border-gray-200',   badgeBg: '',             cta: 'bg-gray-900 hover:bg-gray-700 text-white' },
  pro:      { border: 'border-blue-500 ring-2 ring-blue-500', badgeBg: 'bg-blue-600',   cta: 'bg-blue-600 hover:bg-blue-700 text-white' },
  business: { border: 'border-violet-500', badgeBg: 'bg-violet-600', cta: 'bg-violet-600 hover:bg-violet-700 text-white' },
}
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

  useEffect(() => {
    if (searchParams.get('canceled') === '1') {
      setError('Payment canceled. Your plan was not changed.')
      window.history.replaceState({}, '', '/pricing')
    }
  }, [searchParams])

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
      setError(data.error ?? 'Something went wrong. Please try again.')
    } catch {
      setError('Connection error. Please check your internet and try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/')} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
              <Image src="/icon-192.png" alt="DO Chat" width={20} height={20} className="rounded-lg" />
            </div>
            <span className="font-bold text-gray-900">DO Chat</span>
          </button>
          <div className="flex-1" />
          <LangToggle className="border-gray-200 text-gray-600 hover:border-gray-400" />
          <button onClick={() => router.push('/login')} className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">
            {p.signIn}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-8">
            <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            <p className="text-red-700 text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{p.header}</h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">{p.subtitle}</p>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {PLAN_KEYS.map(key => {
            const plan = p.plans[key]
            const styles = PLAN_STYLES[key]
            const notOk = PLAN_NOT_OK[key]
            return (
              <div key={key}
                className={`bg-white rounded-2xl border-2 p-7 flex flex-col relative ${styles.border} transition-shadow hover:shadow-lg`}>
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${styles.badgeBg}`}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h2>
                  <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">${PLAN_PRICES[key] === 0 ? '0' : PLAN_PRICES[key]}</span>
                    {PLAN_PRICES[key] > 0 && <span className="text-gray-400 text-sm">/ {plan.period}</span>}
                  </div>
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      {!notOk[i] ? (
                        <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={`text-sm ${!notOk[i] ? 'text-gray-700' : 'text-gray-300'}`}>
                        {i === 0 ? <><B>DO AI</B> · {f.replace(/^DO AI · /, '').replace(/^DO AI · /, '')}</> : f}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelect(PLAN_API_KEYS[key])}
                  disabled={loading === key}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 ${styles.cta}`}
                >
                  {loading === key ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {p.redirecting}
                    </span>
                  ) : plan.cta}
                </button>
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-gray-400 mt-10">{p.disclaimer}</p>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto space-y-4">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-8">{p.faq.title}</h2>
          {p.faq.items.map(([q, a]) => (
            <div key={q} className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="font-semibold text-gray-900 mb-1">{q}</p>
              <p className="text-sm text-gray-500">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
