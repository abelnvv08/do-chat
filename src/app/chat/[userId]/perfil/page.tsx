'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

function PinScreen({ userId, mode, onSuccess, onCancel }: {
  userId: string; mode: 'set' | 'change' | 'remove'; onSuccess: () => void; onCancel: () => void
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8 bg-white">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold mb-1 text-slate-900">{titles[step]}</h2>
      {error
        ? <p className="text-sm text-red-500 mb-6">{error}</p>
        : <p className="text-sm text-slate-400 mb-6">DO Chat</p>
      }
      <div className="flex gap-5 mb-10">
        {[0,1,2,3].map(i => (
          <div key={i}
            style={{ backgroundColor: i < pin.length ? '#3b82f6' : 'transparent', borderColor: i < pin.length ? '#3b82f6' : '#cbd5e1' }}
            className="w-4 h-4 rounded-full border-2 transition-all duration-150" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
          d === '' ? <div key={i} /> :
          d === '⌫' ? (
            <button key={i} onClick={() => { setPin(p => p.slice(0, -1)); setError('') }}
              className="h-16 rounded-2xl text-xl flex items-center justify-center active:scale-95 transition-all bg-slate-100 text-slate-600">{d}</button>
          ) : (
            <button key={i} onClick={() => handleDigit(d)}
              className="h-16 rounded-2xl text-2xl font-semibold flex items-center justify-center active:scale-95 transition-all bg-slate-100 text-slate-900 border border-slate-200">{d}</button>
          )
        ))}
      </div>
      <button onClick={onCancel} className="mt-10 text-sm text-blue-600 font-semibold">Cancelar</button>
    </div>
  )
}


export default function PerfilPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()
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

  if (!me) return (
    <div className="min-h-dvh bg-[#f8fafc] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const hasPin = typeof window !== 'undefined' && !!localStorage.getItem(`pin_${userId}`)

  function saveIcal() {
    localStorage.setItem(`ical_${userId}`, icalUrl.trim())
    setIcalSaved(true)
    setTimeout(() => setIcalSaved(false), 2000)
  }

  async function handleExport() {
    setExporting(true)
    const res = await fetch(`/api/chat/export?user_id=${userId}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'dochat-export.json'; a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar tu cuenta permanentemente? Esta acción no se puede deshacer.')) return
    setDeleting(true)
    await fetch(`/api/chat/delete-account?user_id=${userId}`, { method: 'DELETE' })
    router.push('/login')
  }

  if (pinMode) {
    return <PinScreen userId={userId} mode={pinMode}
      onSuccess={() => { setPinMode(null); forceUpdate(n => n + 1) }}
      onCancel={() => setPinMode(null)} />
  }

  return (
    <div className="min-h-dvh bg-[#f8fafc] flex flex-col">

      {/* ── Header fijo ── */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 bg-white/95 backdrop-blur-sm border-b border-slate-100"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 44px) + 8px)', paddingBottom: '12px' }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center active:scale-95 transition-all">
          <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <p className="text-sm font-semibold text-slate-700">Mi perfil</p>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto pb-32 px-4 space-y-4 pt-4">

        {/* ── Tarjeta de identidad ── */}
        <div className="relative rounded-3xl overflow-hidden p-6"
          style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)' }}>
          {/* Fondo decorativo */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />

          <div className="relative flex items-center gap-5">
            {/* Avatar cuadrado */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-white/30 shadow-xl shadow-blue-900/30">
                {me.avatar_url
                  ? <Image src={me.avatar_url} alt={me.name} width={80} height={80} className="w-full h-full object-cover" />
                  : <div className={`w-full h-full ${me.bg} flex items-center justify-center text-3xl`}>{me.emoji}</div>
                }
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white truncate">{me.name}</h1>
              {me.phone && <p className="text-sm text-blue-100 mt-0.5">{me.phone}</p>}
              <p className="text-xs text-blue-200/80 mt-1">DO Chat</p>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="relative mt-5 grid grid-cols-3 gap-2">
            {[
              { label: 'Exportar', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>, action: handleExport, loading: exporting },
              { label: 'Soporte', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>, href: 'mailto:hola@getdochat.com' },
            ].map((btn, i) => (
              btn.href
                ? <Link key={i} href={btn.href}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-white/15 border border-white/20 active:scale-95 transition-all hover:bg-white/20">
                    <span className="text-white/80">{btn.icon}</span>
                    <span className="text-[10px] font-medium text-white/60">{btn.label}</span>
                  </Link>
                : <button key={i} onClick={btn.action} disabled={btn.loading}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-white/15 border border-white/20 active:scale-95 transition-all hover:bg-white/20 disabled:opacity-40">
                    <span className="text-white/80">{btn.loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" /> : btn.icon}</span>
                    <span className="text-[10px] font-medium text-white/60">{btn.label}</span>
                  </button>
            ))}
          </div>
        </div>

        {/* ── Seguridad ── */}
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 pt-5 pb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-800">Seguridad</p>
            <div className={`ml-auto text-[10px] font-semibold px-2.5 py-1 rounded-full ${hasPin ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
              {hasPin ? 'PIN activo' : 'Sin PIN'}
            </div>
          </div>

          <div className="px-4 pb-4 grid grid-cols-2 gap-2">
            {!hasPin ? (
              <button onClick={() => setPinMode('set')}
                className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 text-sm font-semibold active:scale-95 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                Activar bloqueo con PIN
              </button>
            ) : (
              <>
                <button onClick={() => setPinMode('change')}
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 text-xs font-semibold active:scale-95 transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" /></svg>
                  Cambiar PIN
                </button>
                <button onClick={() => setPinMode('remove')}
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-500 text-xs font-semibold active:scale-95 transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  Quitar PIN
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Google Calendar ── */}
        <button onClick={() => setShowIcal(v => !v)}
          className="w-full rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden text-left active:scale-[0.98] transition-all">
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Google Calendar</p>
              <p className="text-xs text-slate-400 mt-0.5">{icalUrl ? '✓ Conectado' : 'Conecta tu calendario'}</p>
            </div>
            <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showIcal ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </button>
        {showIcal && (
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm px-5 py-4 space-y-3">
            <input
              type="url"
              value={icalUrl}
              onChange={e => setIcalUrl(e.target.value)}
              placeholder="https://calendar.google.com/calendar/ical/…"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button onClick={saveIcal}
              className={`w-full py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${icalSaved ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20'}`}>
              {icalSaved ? '✓ Guardado' : 'Guardar URL'}
            </button>
          </div>
        )}

        {/* ── Plan ── */}
        <div className="rounded-3xl bg-slate-50 border border-slate-100 px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-700">Planes</p>
            <p className="text-xs text-slate-400 mt-0.5">Próximamente</p>
          </div>
        </div>

        {/* ── Cuenta ── */}
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 pt-5 pb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-800">Cuenta</p>
          </div>
          <div className="px-4 pb-4 space-y-2">
            <button onClick={handleExport} disabled={exporting}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 border border-blue-100 active:scale-95 transition-all disabled:opacity-40">
              <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              <p className="text-sm font-medium text-blue-600">{exporting ? 'Exportando…' : 'Exportar mis datos'}</p>
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 active:scale-95 transition-all disabled:opacity-40">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
              <p className="text-sm font-medium text-red-500">{deleting ? 'Eliminando…' : 'Eliminar cuenta'}</p>
            </button>
          </div>
        </div>

        {/* ── Legal ── */}
        <div className="flex gap-4 justify-center py-2">
          <Link href="/privacy" className="text-xs text-slate-400 hover:text-blue-600 transition-colors">Privacidad</Link>
          <span className="text-slate-300">·</span>
          <Link href="/terms" className="text-xs text-slate-400 hover:text-blue-600 transition-colors">Términos</Link>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-400">v1.0.0</span>
        </div>
      </div>

      <BottomNav userId={userId} active="tu" />
    </div>
  )
}

function BottomNav({ userId, active }: { userId: string; active: string }) {
  const tabs = [
    { id: 'chats',    label: 'Chats',      href: `/chat/${userId}`,            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg> },
    { id: 'tasks',    label: 'Pendientes', href: `/chat/${userId}/pendientes`,  icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> },
    { id: 'projects', label: 'Proyectos',  href: `/chat/${userId}/proyectos`,  icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg> },
    { id: 'docs',     label: 'Docs',       href: `/chat/${userId}/documentos`, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg> },
    { id: 'tu',       label: 'Tú',         href: `/chat/${userId}/perfil`,     icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg> },
  ]
  return (
    <div className="bg-white/97 backdrop-blur-xl border-t border-slate-100 flex fixed bottom-0 left-0 right-0 z-10 shadow-[0_-1px_12px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {tabs.map(tab => {
        const isActive = active === tab.id
        return (
          <Link key={tab.id} href={tab.href}
            className="flex-1 flex flex-col items-center pt-2 pb-1.5 gap-0.5 transition-colors">
            <div className={`flex items-center justify-center w-14 h-[30px] rounded-full transition-all duration-300 ${isActive ? 'bg-blue-600/10' : ''}`}>
              <span className={`transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                {tab.icon}
              </span>
            </div>
            <span className={`text-[10px] font-semibold tracking-tight ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{tab.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
