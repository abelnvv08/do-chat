'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

function PinScreen({ userId, mode, onSuccess, onCancel }: {
  userId: string
  mode: 'set' | 'change' | 'remove'
  onSuccess: () => void
  onCancel: () => void
}) {
  const [step, setStep] = useState<'verify' | 'enter' | 'confirm'>(
    mode === 'change' || mode === 'remove' ? 'verify' : 'enter'
  )
  const [pin, setPin] = useState('')
  const [firstPin, setFirstPin] = useState('')
  const [error, setError] = useState('')

  const titles: Record<string, string> = {
    verify: mode === 'remove' ? 'Ingresa tu PIN actual' : 'Verificá tu PIN actual',
    enter: mode === 'set' ? 'Crea tu PIN' : 'Ingresa nuevo PIN',
    confirm: 'Confirmá tu PIN',
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

  function handleDelete() { setPin(p => p.slice(0, -1)); setError('') }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8">
      <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-6"><svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg></div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">{titles[step]}</h2>
      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
      {!error && <p className="text-sm text-gray-400 mb-6">do-chat</p>}
      <div className="flex gap-4 mb-10">
        {[0,1,2,3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${i < pin.length ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4 w-full max-w-[260px]">
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
          d === '' ? <div key={i} /> :
          d === '⌫' ? (
            <button key={i} onClick={handleDelete} className="h-16 rounded-2xl bg-gray-100 text-gray-600 text-xl flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all">{d}</button>
          ) : (
            <button key={i} onClick={() => handleDigit(d)} className="h-16 rounded-2xl bg-gray-50 text-gray-900 text-2xl font-semibold flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all border border-gray-100">{d}</button>
          )
        ))}
      </div>
      <button onClick={onCancel} className="mt-8 text-sm text-blue-600 font-medium">Cancelar</button>
    </div>
  )
}

export default function PerfilPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()
  const [me, setMe] = useState<{ name: string; emoji: string; bg: string } | null>(null)
  const [pinMode, setPinMode] = useState<'set' | 'change' | 'remove' | null>(null)
  const [, forceUpdate] = useState(0)
  const [icalUrl, setIcalUrl] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem(`ical_${userId}`) ?? '' : ''
  )
  const [icalSaved, setIcalSaved] = useState(false)
  const [darkMode, setDarkMode] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('dark_mode') === '1' : false
  )

  useEffect(() => {
    fetch('/api/auth/profile').then(r => r.json()).then(d => {
      if (d.profile) setMe(d.profile)
      else router.push('/login')
    })
  }, [])

  if (!me) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  function toggleDark() {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('dark_mode', next ? '1' : '0')
    window.dispatchEvent(new Event('dark-mode-changed'))
  }

  const hasPin = typeof window !== 'undefined' && !!localStorage.getItem(`pin_${userId}`)

  function saveIcal() {
    localStorage.setItem(`ical_${userId}`, icalUrl.trim())
    setIcalSaved(true)
    setTimeout(() => setIcalSaved(false), 2000)
  }

  if (pinMode) {
    return (
      <PinScreen
        userId={userId}
        mode={pinMode}
        onSuccess={() => { setPinMode(null); forceUpdate(n => n + 1) }}
        onCancel={() => setPinMode(null)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-900">Tú</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Avatar */}
        <div className="flex flex-col items-center py-10 bg-white border-b border-gray-100">
          <div className={`w-24 h-24 rounded-full ${me.bg} flex items-center justify-center text-4xl mb-3 shadow-sm`}>
            {me.emoji}
          </div>
          <p className="text-xl font-bold text-gray-900">{me.name}</p>
          <p className="text-sm text-gray-400 mt-0.5">do-chat</p>
        </div>

        {/* Info */}
        <div className="mt-3 bg-white divide-y divide-gray-100">
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-8 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-400">Nombre</p>
              <p className="text-sm text-gray-700">{me.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-8 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-400">Estado</p>
              <p className="text-sm text-gray-700">Disponible</p>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="mt-3 bg-white divide-y divide-gray-100">
          <div className="px-5 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Apariencia</p>
          </div>
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
            </div>
            <p className="text-sm text-gray-700 font-medium flex-1">Modo oscuro</p>
            <button
              onClick={toggleDark}
              className={`relative w-11 h-6 rounded-full transition-colors ${darkMode ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>

        {/* Integrations */}
        <div className="mt-3 bg-white divide-y divide-gray-100">
          <div className="px-5 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Integraciones</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Google Calendar</p>
                <p className="text-xs text-gray-400">Feed iCal para el resumen diario</p>
              </div>
            </div>
            <input
              type="url"
              value={icalUrl}
              onChange={e => setIcalUrl(e.target.value)}
              placeholder="https://calendar.google.com/calendar/ical/…"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
            />
            <button
              onClick={saveIcal}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                icalSaved
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
              }`}
            >
              {icalSaved ? 'Guardado' : 'Guardar'}
            </button>
          </div>
        </div>

        {/* Security */}
        <div className="mt-3 bg-white divide-y divide-gray-100">
          <div className="px-5 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Seguridad</p>
          </div>
          {!hasPin ? (
            <button onClick={() => setPinMode('set')} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg></div>
              <p className="text-sm text-gray-700 font-medium flex-1">Activar PIN</p>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ) : (
            <>
              <button onClick={() => setPinMode('change')} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" /></svg></div>
                <p className="text-sm text-gray-700 font-medium flex-1">Cambiar PIN</p>
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
              <button onClick={() => setPinMode('remove')} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left">
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0"><svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg></div>
                <p className="text-sm text-red-500 font-medium">Quitar PIN</p>
              </button>
            </>
          )}
        </div>
      </div>

      <BottomNav userId={userId} active="tu" />
    </div>
  )
}

function BottomNav({ userId, active }: { userId: string; active: string }) {
  const tabs = [
    { id: 'chats', label: 'Chats', href: `/demo/${userId}`, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg> },
    { id: 'tasks', label: 'Pendientes', href: `/demo/${userId}/pendientes`, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> },
    { id: 'projects', label: 'Proyectos', href: `/demo/${userId}/proyectos`, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg> },
    { id: 'docs', label: 'Docs', href: `/demo/${userId}/documentos`, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg> },
    { id: 'tu', label: 'Tú', href: `/demo/${userId}/perfil`, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg> },
  ]
  return (
    <div className="bg-white border-t border-gray-100 flex fixed bottom-0 left-0 right-0 z-10">
      {tabs.map(t => (
        <Link key={t.id} href={t.href} className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${active === t.id ? 'text-blue-600' : 'text-gray-400'}`}>
          {t.icon}
          <span className="text-[9px] font-medium">{t.label}</span>
        </Link>
      ))}
    </div>
  )
}
