// src/app/chat/[userId]/DoWelcomeScreen.tsx
'use client'

import { useEffect, useState } from 'react'
import type { DoChip } from '@/app/api/chat/do-context/route'

const CHIP_ICON: Record<DoChip['type'], string> = {
  task_today:    '⚠️',
  task_tomorrow: '🟡',
  active_chat:   '💬',
  awaiting_reply:'📨',
  generic:       '✦',
}

const CHIP_COLOR: Record<DoChip['type'], { border: string; title: string; bg: string }> = {
  task_today:    { border: 'border-red-200',    title: 'text-red-600',    bg: 'bg-white' },
  task_tomorrow: { border: 'border-amber-200',  title: 'text-amber-600',  bg: 'bg-white' },
  active_chat:   { border: 'border-blue-200',   title: 'text-blue-600',   bg: 'bg-white' },
  awaiting_reply:{ border: 'border-emerald-200',title: 'text-emerald-600',bg: 'bg-white' },
  generic:       { border: 'border-slate-200',  title: 'text-slate-500',  bg: 'bg-slate-50' },
}

function chipSendText(chip: DoChip): string {
  if (chip.type === 'task_today')
    return `Tengo ${chip.count} tarea${chip.count > 1 ? 's' : ''} que vence${chip.count > 1 ? 'n' : ''} hoy. Ayudame a organizarme.`
  if (chip.type === 'task_tomorrow')
    return `Tengo ${chip.count} tarea${chip.count > 1 ? 's' : ''} para mañana. ¿Cómo arrancamos?`
  if (chip.type === 'active_chat')
    return `Resumí el chat de ${chip.roomName} — tengo ${chip.unread} mensaje${chip.unread > 1 ? 's' : ''} sin leer.`
  if (chip.type === 'awaiting_reply')
    return `En el chat de ${chip.roomName} llevo ${chip.hours}h sin respuesta. Ayudame a redactar una respuesta.`
  return chip.text
}

function chipSubtitle(chip: DoChip): string {
  if (chip.type === 'task_today')     return 'Revisá tus tareas de hoy'
  if (chip.type === 'task_tomorrow')  return 'Planificá el día de mañana'
  if (chip.type === 'active_chat')    return chip.roomName
  if (chip.type === 'awaiting_reply') return chip.roomName
  return ''
}

export function DoWelcomeScreen({
  userId,
  userName,
  onSend,
}: {
  userId: string
  userName: string
  onSend: (text: string) => void
}) {
  const [chips, setChips] = useState<DoChip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/chat/do-context?user_id=${userId}`)
      .then(r => r.json())
      .then(d => setChips(d.chips ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  const dayName = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const displayName = userName.split(' ')[0] || userName

  return (
    <div className="flex flex-col items-center px-4 pt-12 pb-4 gap-5 min-h-[300px]">
      {/* Icon + greeting */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-indigo-900 flex items-center justify-center shadow-md">
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"/></svg>
        </div>
        <p className="text-lg font-bold text-slate-800">Hola, {displayName} 👋</p>
        <p className="text-xs text-slate-400 text-center capitalize">{dayName} · ¿En qué trabajamos?</p>
      </div>

      {/* Chips */}
      <div className="w-full max-w-sm flex flex-col gap-2.5">
        {loading ? (
          <>
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </>
        ) : (
          chips.map((chip, i) => {
            const colors = CHIP_COLOR[chip.type]
            const icon   = CHIP_ICON[chip.type]
            const sub    = chipSubtitle(chip)
            return (
              <button
                key={i}
                onClick={() => onSend(chipSendText(chip))}
                className={`w-full flex items-center gap-3 ${colors.bg} border-[1.5px] ${colors.border} rounded-2xl px-4 py-3 text-left active:scale-[0.98] transition-all shadow-sm`}
              >
                <span className="text-xl shrink-0">{icon}</span>
                <div className="min-w-0">
                  <p className={`text-xs font-bold ${colors.title} leading-tight`}>{chip.label}</p>
                  {sub && <p className="text-xs text-slate-500 truncate mt-0.5">{sub}</p>}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
