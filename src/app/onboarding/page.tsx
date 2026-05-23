'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Suspense } from 'react'

const SLIDES = [
  {
    emoji: '💬',
    title: 'Mensajes que trabajan',
    desc: 'Chatea con tu equipo con cifrado de extremo a extremo. Todo seguro, todo en tiempo real.',
    bg: 'from-blue-600 to-blue-500',
  },
  {
    emoji: '✦',
    title: 'DO AI en cada chat',
    desc: 'Pregúntale a DO AI que resuma la conversación, extraiga tareas, redacte correos o busque información — sin salir del chat.',
    bg: 'from-violet-600 to-blue-600',
  },
  {
    emoji: '✓',
    title: 'Tareas con seguimiento',
    desc: 'Asigna tareas a tu equipo directamente desde el chat. Ellos aceptan, trabajan y suben evidencia cuando terminan.',
    bg: 'from-emerald-600 to-blue-600',
  },
  {
    emoji: '🔔',
    title: 'Activa notificaciones',
    desc: 'Recibe alertas de mensajes, llamadas y tareas en tiempo real. No te pierdas nada importante.',
    bg: 'from-orange-500 to-blue-600',
    isNotification: true,
  },
  {
    emoji: '@',
    title: 'Elige tu @usuario',
    desc: 'Con tu @usuario, tus contactos pueden encontrarte fácilmente y podrás compartir tu link de invitación.',
    bg: 'from-indigo-600 to-blue-600',
    isUsername: true,
  },
]

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId') ?? ''
  const [step, setStep] = useState(0)
  const [notifGranted, setNotifGranted] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [usernameOk, setUsernameOk] = useState(false)
  const [savingUsername, setSavingUsername] = useState(false)

  const current = SLIDES[step]
  const isLast = step === SLIDES.length - 1

  async function requestNotifications() {
    setRequesting(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setNotifGranted(true)
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        const sub = existing ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })
        await fetch('/api/chat/push-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, subscription: sub }),
        })
      }
    } catch { /* ignore */ } finally {
      setRequesting(false)
    }
  }

  async function saveUsername() {
    const clean = username.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9._]/g, '')
    if (clean.length < 3) { setUsernameError('Mínimo 3 caracteres'); return }
    setSavingUsername(true)
    setUsernameError('')
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, username: clean, name: clean }),
      })
      const data = await res.json()
      if (!res.ok) { setUsernameError(data.error ?? 'Usuario no disponible'); return }
      setUsernameOk(true)
      setUsername(clean)
    } catch { setUsernameError('Error al guardar') } finally {
      setSavingUsername(false)
    }
  }

  function finish() {
    router.replace(userId ? `/chat/${userId}` : '/login')
  }

  async function next() {
    if (isLast) { finish(); return }
    // On username step, save if filled and not yet saved
    if (current.isUsername && username.trim().length >= 3 && !usernameOk) {
      await saveUsername()
    }
    setStep(s => s + 1)
  }

  return (
    <div className="fixed inset-0 bg-[#080c14] flex flex-col overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${current.bg} opacity-20 transition-all duration-500`} />

      {/* Skip */}
      {!isLast && (
        <button onClick={finish} className="absolute top-14 right-6 z-10 text-white/40 text-sm hover:text-white/70 transition-colors">
          Omitir
        </button>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center z-10 gap-6">
        {/* Icon */}
        <div className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${current.bg} flex items-center justify-center shadow-2xl transition-all duration-500`}>
          {step === 0 ? (
            <Image src="/dochatlogo.png" alt="DO Chat" width={64} height={64} className="rounded-2xl" />
          ) : current.isUsername ? (
            <span className="text-5xl font-black text-white">@</span>
          ) : (
            <span className="text-5xl">{current.emoji}</span>
          )}
        </div>

        <div className="space-y-3 max-w-xs">
          <h1 className="text-2xl font-bold text-white leading-tight">{current.title}</h1>
          <p className="text-white/50 text-base leading-relaxed">{current.desc}</p>
        </div>

        {/* Notification step */}
        {current.isNotification && !notifGranted && (
          <button onClick={requestNotifications} disabled={requesting}
            className="mt-2 px-6 py-3 rounded-2xl bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center gap-2">
            {requesting
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Activando…</>
              : '🔔 Activar notificaciones'}
          </button>
        )}
        {current.isNotification && notifGranted && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            Notificaciones activadas
          </div>
        )}

        {/* Username step */}
        {current.isUsername && (
          <div className="w-full max-w-xs space-y-3">
            {usernameOk ? (
              <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium py-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                @{username} guardado
              </div>
            ) : (
              <>
                <div className="flex items-center bg-white/10 border border-white/20 rounded-2xl px-4 py-3 gap-2">
                  <span className="text-white/50 text-base font-medium">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '')); setUsernameError('') }}
                    placeholder="tu_usuario"
                    maxLength={20}
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="flex-1 bg-transparent text-white placeholder:text-white/30 text-base focus:outline-none"
                  />
                  {savingUsername && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />}
                </div>
                {usernameError && <p className="text-red-400 text-xs text-center">{usernameError}</p>}
                {username.length >= 3 && !savingUsername && (
                  <button onClick={saveUsername}
                    className="w-full py-2.5 rounded-xl bg-white/15 border border-white/20 text-white text-sm font-medium hover:bg-white/20 transition-colors">
                    Guardar @{username}
                  </button>
                )}
              </>
            )}
            <p className="text-white/30 text-xs">Puedes cambiarlo después en tu perfil. Es opcional.</p>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="z-10 px-8 pb-12 space-y-6">
        <div className="flex items-center justify-center gap-2">
          {SLIDES.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${i === step ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/25'}`} />
          ))}
        </div>
        <button onClick={next}
          className={`w-full py-4 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.98] bg-gradient-to-r ${current.bg} shadow-xl`}>
          {isLast ? 'Empezar' : 'Siguiente'}
        </button>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return <Suspense><OnboardingContent /></Suspense>
}
