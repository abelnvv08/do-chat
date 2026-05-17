'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Suspense } from 'react'

const STEPS = [
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
]

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId') ?? ''
  const [step, setStep] = useState(0)
  const [notifGranted, setNotifGranted] = useState(false)
  const [requesting, setRequesting] = useState(false)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  async function requestNotifications() {
    setRequesting(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setNotifGranted(true)
        // Register service worker push subscription
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

  function finish() {
    if (userId) {
      router.replace(`/chat/${userId}`)
    } else {
      router.replace('/login')
    }
  }

  function next() {
    if (isLast) { finish(); return }
    setStep(s => s + 1)
  }

  return (
    <div className="fixed inset-0 bg-[#080c14] flex flex-col overflow-hidden">
      {/* Background gradient */}
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
        <div className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${current.bg} flex items-center justify-center shadow-2xl text-5xl transition-all duration-500`}>
          {step === 0 ? (
            <Image src="/dologo.png" alt="DO Chat" width={64} height={64} className="rounded-2xl" />
          ) : (
            <span>{current.emoji}</span>
          )}
        </div>

        <div className="space-y-3 max-w-xs">
          <h1 className="text-2xl font-bold text-white leading-tight">{current.title}</h1>
          <p className="text-white/50 text-base leading-relaxed">{current.desc}</p>
        </div>

        {/* Notification step */}
        {current.isNotification && !notifGranted && (
          <button
            onClick={requestNotifications}
            disabled={requesting}
            className="mt-2 px-6 py-3 rounded-2xl bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {requesting
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Activando…</>
              : '🔔 Activar notificaciones'}
          </button>
        )}
        {notifGranted && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            Notificaciones activadas
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="z-10 px-8 pb-12 space-y-6">
        {/* Dots */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${i === step ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/25'}`} />
          ))}
        </div>

        {/* Button */}
        <button
          onClick={next}
          className={`w-full py-4 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.98] bg-gradient-to-r ${current.bg} shadow-xl`}
        >
          {isLast ? 'Empezar' : 'Siguiente'}
        </button>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return <Suspense><OnboardingContent /></Suspense>
}
