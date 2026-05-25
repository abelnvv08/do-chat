// src/app/chat/[userId]/DoWelcomeScreen.tsx
'use client'

import { useLanguage } from '@/lib/i18n'

type DoScreen = {
  quickActionsTitle: string
  actions: {
    summarize: string
    createTask: string
    searchWeb: string
    draftMessage: string
    generateExcel: string
    viewReminders: string
  }
  greeting: string
  workingOn: string
}

function QUICK_ACTIONS(lang: string, ds: DoScreen) {
  const isEs = lang === 'es'
  return [
    {
      key: 'summarize',
      icon: '📋',
      label: ds.actions.summarize,
      prefill: isEs ? 'Resumí el chat de @' : 'Summarize the chat with @',
    },
    {
      key: 'draftMessage',
      icon: '✍️',
      label: ds.actions.draftMessage,
      prefill: isEs ? 'Redactá un mensaje para @' : 'Draft a message to @',
    },
    {
      key: 'createTask',
      icon: '✅',
      label: ds.actions.createTask,
      prefill: isEs ? 'Crear tarea: ' : 'Create task: ',
    },
    {
      key: 'viewReminders',
      icon: '📅',
      label: ds.actions.viewReminders,
      prefill: isEs
        ? 'Mostrá mis recordatorios y tareas de esta semana'
        : 'Show my reminders and tasks for this week',
    },
    {
      key: 'searchWeb',
      icon: '🌐',
      label: ds.actions.searchWeb,
      prefill: isEs ? 'Buscá en internet: ' : 'Search for: ',
    },
    {
      key: 'generateExcel',
      icon: '📊',
      label: ds.actions.generateExcel,
      prefill: isEs ? 'Generá un Excel con: ' : 'Generate Excel with: ',
    },
    {
      key: 'meetingSummary',
      icon: '📝',
      label: isEs ? 'Resumen de reunión' : 'Meeting summary',
      prefill: isEs
        ? 'Hacé un resumen de mi reunión de hoy sobre: '
        : 'Summarize my meeting today about: ',
    },
    {
      key: 'pendingReply',
      icon: '💬',
      label: isEs ? 'Responder pendiente' : 'Reply pending',
      prefill: isEs
        ? 'En el chat de @, ayudame a redactar una respuesta'
        : 'In the chat with @, help me draft a reply',
    },
    {
      key: 'analyzeData',
      icon: '📈',
      label: isEs ? 'Analizar datos' : 'Analyze data',
      prefill: isEs ? 'Analizá los datos de: ' : 'Analyze the data for: ',
    },
  ]
}

export function DoWelcomeScreen({
  userName,
  onPrefill,
}: {
  userId: string
  userName: string
  onPrefill: (text: string) => void
}) {
  const { lang, t } = useLanguage()
  const ds = t.app.doScreen

  const locale = lang === 'es' ? 'es-MX' : 'en-US'
  const dayName = new Date().toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const displayName = userName.split(' ')[0] || userName
  const greeting = ds.greeting.replace('{name}', displayName)

  return (
    <div className="flex flex-col items-center px-4 pt-10 pb-4 gap-5">
      {/* Icon + greeting */}
      <div className="flex flex-col items-center gap-2">
        <img src="/dochatlogo.png" className="w-14 h-14 rounded-2xl object-cover shadow-md" alt="do AI" />
        <p className="text-lg font-bold text-slate-800">{greeting}</p>
        <p className="text-xs text-slate-400 text-center capitalize">{dayName} · {ds.workingOn}</p>
      </div>

      {/* Quick Actions grid */}
      <div className="w-full max-w-sm">
        <p className="text-xs text-slate-400 font-medium mb-3 px-1">{ds.quickActionsTitle}</p>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACTIONS(lang, ds).map((action) => (
            <button
              key={action.key}
              onClick={() => onPrefill(action.prefill)}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-left active:scale-[0.97] transition-all hover:bg-slate-100"
            >
              <span className="text-base shrink-0">{action.icon}</span>
              <span className="text-xs text-slate-700 font-medium leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
