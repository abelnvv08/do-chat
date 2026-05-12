'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

function useDark() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    function sync() { setDark(localStorage.getItem('dark_mode') === '1') }
    sync()
    window.addEventListener('dark-mode-changed', sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener('dark-mode-changed', sync); window.removeEventListener('storage', sync) }
  }, [])
  return dark
}

function PinScreen({ userId, mode, onSuccess, onCancel, dark }: {
  userId: string; mode: 'set' | 'change' | 'remove'; onSuccess: () => void; onCancel: () => void; dark: boolean
}) {
  const [step, setStep] = useState<'verify' | 'enter' | 'confirm'>(
    mode === 'change' || mode === 'remove' ? 'verify' : 'enter'
  )
  const [pin, setPin] = useState('')
  const [firstPin, setFirstPin] = useState('')
  const [error, setError] = useState('')

  const titles: Record<string, string> = {
    verify: mode === 'remove' ? 'Ingresa tu PIN actual' : 'Verifica tu PIN actual',
    enter: mode === 'set' ? 'Crea tu PIN' : 'Ingresa nuevo PIN',
    confirm: 'Confirma tu PIN',
  }

  function handleDigit(d: string) {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    setError('')
    if (next.length === 4) setTimeout(() => handleComplete(next), 80)
  }

  function handleComplete(value: string) {
    const stored = localStorage.getItem(`pin_${userId}`) ?? ''
    if (step === 'verify') {
      if (value !== stored) { setPin(''); setError('PIN incorrecto'); return }
      if (mode === 'remove') { localStorage.removeItem(`pin_${userId}`); onSuccess(); return }
      setStep('enter'); setPin('')
    } else if (step === 'enter') {
      setFirstPin(value); setStep('confirm'); setPin('')
    } else if (step === 'confirm') {
      if (value !== firstPin) { setPin(''); setError('Los PINs no coinciden'); return }
      localStorage.setItem(`pin_${userId}`, value)
      onSuccess()
    }
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center px-8 ${dark ? 'bg-[#0f172a]' : 'bg-white'}`}>
      <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      </div>
      <h2 className={`text-xl font-bold mb-1 ${dark ? 'text-white' : 'text-gray-900'}`}>{titles[step]}</h2>
      {error
        ? <p className="text-sm text-red-400 mb-6">{error}</p>
        : <p className="text-sm text-gray-400 mb-6">DO Chat</p>
      }
      <div className="flex gap-5 mb-10">
        {[0,1,2,3].map(i => (
          <div key={i} style={{ backgroundColor: i < pin.length ? '#2563eb' : 'transparent', borderColor: i < pin.length ? '#2563eb' : dark ? '#334155' : '#d1d5db' }}
            className="w-4 h-4 rounded-full border-2 transition-all duration-150" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
          d === '' ? <div key={i} /> :
          d === '⌫' ? (
            <button key={i} onClick={() => { setPin(p => p.slice(0, -1)); setError('') }}
              className={`h-16 rounded-2xl text-xl flex items-center justify-center active:scale-95 transition-all ${dark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>{d}</button>
          ) : (
            <button key={i} onClick={() => handleDigit(d)}
              className={`h-16 rounded-2xl text-2xl font-semibold flex items-center justify-center active:scale-95 transition-all ${dark ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white text-gray-900 border border-gray-200 shadow-sm'}`}>{d}</button>
          )
        ))}
      </div>
      <button onClick={onCancel} className="mt-10 text-sm text-blue-400 font-semibold">Cancelar</button>
    </div>
  )
}

const PLAN_META: Record<string, { label: string; color: string; bg: string }> = {
  pro:      { label: 'Pro',      color: 'text-blue-600',   bg: 'bg-blue-50' },
  business: { label: 'Business', color: 'text-violet-600', bg: 'bg-violet-50' },
  free:     { label: 'Free',     color: 'text-gray-500',   bg: 'bg-gray-100' },
}

export default function PerfilPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()
  const dark = useDark()
  const [me, setMe] = useState<{ name: string; emoji: string; bg: string; phone?: string | null; plan?: string; avatar_url?: string | null } | null>(null)
  const [pinMode, setPinMode] = useState<'set' | 'change' | 'remove' | null>(null)
  const [, forceUpdate] = useState(0)
  const [icalUrl, setIcalUrl] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem(`ical_${userId}`) ?? '' : ''
  )
  const [icalSaved, setIcalSaved] = useState(false)
  const [showIcal, setShowIcal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetch('/api/auth/profile').then(r => r.json()).then(d => {
      if (d.profile) setMe(d.profile)
      else router.push('/login')
    })
  }, [])

  const bg = dark ? 'bg-[#0f172a]' : 'bg-gray-50'
  const card = dark ? 'bg-[#1e293b]' : 'bg-white'
  const border = dark ? 'border-slate-700/50' : 'border-gray-100'
  const textPrimary = dark ? 'text-white' : 'text-gray-900'
  const textMuted = dark ? 'text-slate-400' : 'text-gray-400'

  if (!me) return (
    <div className={`min-h-dvh ${bg} flex items-center justify-center`}>
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const plan = PLAN_META[me.plan ?? 'free'] ?? PLAN_META.free
  const hasPin = typeof window !== 'undefined' && !!localStorage.getItem(`pin_${userId}`)

  function toggleDark() {
    localStorage.setItem('dark_mode', dark ? '0' : '1')
    window.dispatchEvent(new Event('dark-mode-changed'))
  }

  function saveIcal() {
    localStorage.setItem(`ical_${userId}`, icalUrl.trim())
    setIcalSaved(true)
    setTimeout(() => setIcalSaved(false), 2000)
  }

  async function handleExport() {
    setExporting(true)
    const res = await fetch(`/api/demo/export?user_id=${userId}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'dochat-export.json'; a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar tu cuenta permanentemente? Esta acción no se puede deshacer.')) return
    setDeleting(true)
    await fetch(`/api/demo/delete-account?user_id=${userId}`, { method: 'DELETE' })
    router.push('/login')
  }

  if (pinMode) {
    return <PinScreen userId={userId} mode={pinMode} dark={dark}
      onSuccess={() => { setPinMode(null); forceUpdate(n => n + 1) }}
      onCancel={() => setPinMode(null)} />
  }

  return (
    <div className={`min-h-dvh ${bg} flex flex-col`}>

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 pt-14 pb-8 px-6">
        {/* Back */}
        <button onClick={() => router.back()} className="absolute top-12 left-4 p-2 text-white/70 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>

        <div className="flex flex-col items-center">
          {/* Avatar */}
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full ring-4 ring-white/20 overflow-hidden shadow-xl shadow-black/30">
              {me.avatar_url
                ? <Image src={me.avatar_url} alt={me.name} width={96} height={96} className="w-full h-full object-cover" />
                : <div className={`w-full h-full ${me.bg} flex items-center justify-center text-4xl`}>{me.emoji}</div>
              }
            </div>
            <Link href={`/demo/${userId}/perfil`}
              className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md">
              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>
            </Link>
          </div>

          {/* Name & plan */}
          <h1 className="text-2xl font-bold text-white mb-1">{me.name}</h1>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${plan.bg} ${plan.color}`}>
            {plan.label}
          </span>
          {me.phone && <p className="text-white/50 text-sm mt-2">{me.phone}</p>}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-28 px-4 pt-5 space-y-3">

        {/* Apariencia */}
        <div className={`${card} rounded-2xl border ${border} overflow-hidden`}>
          <p className={`text-[11px] font-semibold uppercase tracking-widest ${textMuted} px-4 pt-4 pb-2`}>Apariencia</p>
          <div className="flex items-center gap-4 px-4 pb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
            </div>
            <p className={`text-sm font-medium flex-1 ${textPrimary}`}>Modo oscuro</p>
            <button onClick={toggleDark} className={`relative w-12 h-6.5 h-7 rounded-full transition-colors duration-200 ${dark ? 'bg-blue-600' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-200 ${dark ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Seguridad */}
        <div className={`${card} rounded-2xl border ${border} overflow-hidden`}>
          <p className={`text-[11px] font-semibold uppercase tracking-widest ${textMuted} px-4 pt-4 pb-2`}>Seguridad</p>
          {!hasPin ? (
            <button onClick={() => setPinMode('set')} className="w-full flex items-center gap-4 px-4 pb-4 active:opacity-60 text-left">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${textPrimary}`}>Activar bloqueo con PIN</p>
                <p className={`text-xs ${textMuted}`}>Protege tu cuenta con un PIN de 4 dígitos</p>
              </div>
              <svg className={`w-4 h-4 ${textMuted}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </button>
          ) : (
            <div className="px-4 pb-4 space-y-1">
              <button onClick={() => setPinMode('change')} className="w-full flex items-center gap-4 py-2 active:opacity-60 text-left">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" /></svg>
                </div>
                <p className={`text-sm font-medium flex-1 ${textPrimary}`}>Cambiar PIN</p>
                <svg className={`w-4 h-4 ${textMuted}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
              </button>
              <button onClick={() => setPinMode('remove')} className="w-full flex items-center gap-4 py-2 active:opacity-60 text-left">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                </div>
                <p className="text-sm font-medium text-red-400 flex-1">Quitar PIN</p>
              </button>
            </div>
          )}
        </div>

        {/* Integraciones */}
        <div className={`${card} rounded-2xl border ${border} overflow-hidden`}>
          <button onClick={() => setShowIcal(v => !v)} className="w-full flex items-center gap-4 px-4 py-4 active:opacity-60 text-left">
            <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${textPrimary}`}>Google Calendar</p>
              <p className={`text-xs ${textMuted}`}>{icalUrl ? 'Conectado' : 'Conecta tu calendario'}</p>
            </div>
            <svg className={`w-4 h-4 ${textMuted} transition-transform ${showIcal ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </button>
          {showIcal && (
            <div className="px-4 pb-4 space-y-3">
              <input
                type="url"
                value={icalUrl}
                onChange={e => setIcalUrl(e.target.value)}
                placeholder="https://calendar.google.com/calendar/ical/…"
                className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors ${dark ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder:text-slate-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400'}`}
              />
              <button onClick={saveIcal}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${icalSaved ? 'bg-green-500/20 text-green-500' : 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'}`}>
                {icalSaved ? '✓ Guardado' : 'Guardar URL'}
              </button>
            </div>
          )}
        </div>

        {/* Plan */}
        <Link href="/pricing" className={`${card} rounded-2xl border ${border} flex items-center gap-4 px-4 py-4 active:opacity-60`}>
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg>
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${textPrimary}`}>Plan actual</p>
            <p className={`text-xs ${textMuted}`}>{me.plan === 'pro' ? 'Pro — $12.99/mes' : me.plan === 'business' ? 'Business — $29.99/mes' : 'Gratis — Actualiza para más funciones'}</p>
          </div>
          <svg className={`w-4 h-4 ${textMuted}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
        </Link>

        {/* Cuenta */}
        <div className={`${card} rounded-2xl border ${border} overflow-hidden`}>
          <p className={`text-[11px] font-semibold uppercase tracking-widest ${textMuted} px-4 pt-4 pb-2`}>Cuenta</p>
          <div className="px-4 pb-4 space-y-1">
            <button onClick={handleExport} disabled={exporting} className="w-full flex items-center gap-4 py-2 active:opacity-60 text-left disabled:opacity-40">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              </div>
              <p className={`text-sm font-medium flex-1 ${textPrimary}`}>{exporting ? 'Exportando…' : 'Exportar mis datos'}</p>
            </button>
            <button onClick={handleDelete} disabled={deleting} className="w-full flex items-center gap-4 py-2 active:opacity-60 text-left disabled:opacity-40">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
              </div>
              <p className="text-sm font-medium text-red-400 flex-1">{deleting ? 'Eliminando…' : 'Eliminar cuenta'}</p>
            </button>
          </div>
        </div>

        {/* Legal */}
        <div className="flex gap-4 justify-center pt-2 pb-2">
          <Link href="/privacy" className={`text-xs ${textMuted} hover:text-blue-400 transition-colors`}>Privacidad</Link>
          <span className={textMuted}>·</span>
          <Link href="/terms" className={`text-xs ${textMuted} hover:text-blue-400 transition-colors`}>Términos</Link>
          <span className={textMuted}>·</span>
          <span className={`text-xs ${textMuted}`}>v1.0.0</span>
        </div>
      </div>

      <BottomNav userId={userId} active="tu" dark={dark} />
    </div>
  )
}

function BottomNav({ userId, active, dark }: { userId: string; active: string; dark: boolean }) {
  const card = dark ? 'bg-[#1e293b] border-slate-700/50' : 'bg-white border-gray-100'
  const tabs = [
    { id: 'chats',    label: 'Chats',      href: `/demo/${userId}`,            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg> },
    { id: 'tasks',    label: 'Pendientes', href: `/demo/${userId}/pendientes`,  icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> },
    { id: 'projects', label: 'Proyectos',  href: `/demo/${userId}/proyectos`,  icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg> },
    { id: 'docs',     label: 'Docs',       href: `/demo/${userId}/documentos`, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg> },
    { id: 'tu',       label: 'Tú',         href: `/demo/${userId}/perfil`,     icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg> },
  ]
  return (
    <div className={`border-t flex fixed bottom-0 left-0 right-0 z-10 ${card}`} style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {tabs.map(tab => (
        <Link key={tab.id} href={tab.href}
          style={{ color: active === tab.id ? '#2563eb' : dark ? '#64748b' : '#9ca3af' }}
          className="flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors">
          {tab.icon}
          <span className="text-[9px] font-medium">{tab.label}</span>
        </Link>
      ))}
    </div>
  )
}
