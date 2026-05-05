'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatMessageTime } from '@/lib/utils'

type Task = { id: string; content: string; done: boolean; created_at: string; source_room: string | null; due_date: string | null }

export default function PendientesPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()
  type Reminder = { id: string; content: string; remind_at: string }
  const [tasks, setTasks] = useState<Task[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchTasks()
    fetchReminders()
    const interval = setInterval(() => { fetchTasks(); fetchReminders() }, 4000)
    return () => clearInterval(interval)
  }, [])

  async function fetchReminders() {
    try {
      const res = await fetch(`/api/demo/reminders?user_id=${userId}`)
      const { reminders: r } = await res.json()
      setReminders(r ?? [])
    } catch { /* ignore */ }
  }

  async function dismissReminder(id: string) {
    setReminders(prev => prev.filter(r => r.id !== id))
    await fetch('/api/demo/reminders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  async function fetchTasks() {
    try {
      const res = await fetch(`/api/demo/tasks?user_id=${userId}`)
      const { tasks: t } = await res.json()
      setTasks(t ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function toggleDone(id: string, done: boolean) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done } : t))
    await fetch('/api/demo/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, done }),
    })
  }

  async function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
    await fetch('/api/demo/tasks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  async function addTask() {
    if (!newTask.trim()) return
    setAdding(true)
    const res = await fetch('/api/demo/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, content: newTask.trim(), due_date: newDueDate || null }),
    })
    const { task } = await res.json()
    if (task) setTasks(prev => [task, ...prev])
    setNewTask('')
    setNewDueDate('')
    setAdding(false)
  }


  const pending = tasks
    .filter(t => !t.done)
    .sort((a, b) => {
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
      if (a.due_date) return -1
      if (b.due_date) return 1
      return 0
    })
  const done = tasks.filter(t => t.done)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900">Mis pendientes</h1>
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-600 font-semibold">
            {pending.length} activas
          </span>
        </div>
        <p className="text-sm text-gray-400">Tareas extraídas por do AI o agregadas por vos</p>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {/* Add task */}
        <div className="px-4 py-3 bg-white border-b border-gray-100 space-y-2">
          <div className="flex gap-2">
            <input
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Agregar tarea manualmente…"
              className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-400 text-gray-800 placeholder:text-gray-400"
            />
            <button
              onClick={addTask}
              disabled={!newTask.trim() || adding}
              className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0"
            >
              +
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 shrink-0">Fecha límite:</span>
            <input
              type="date"
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400 text-gray-600"
            />
            {newDueDate && (
              <button onClick={() => setNewDueDate('')} className="text-xs text-gray-400 hover:text-gray-600">Quitar</button>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-8">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-2xl">✓</div>
            <p className="text-gray-600 font-medium">Sin pendientes por ahora</p>
            <p className="text-sm text-gray-400">Pedile a @do que extraiga tareas de tus conversaciones</p>
            <Link
              href={`/demo/${userId}/ai-${userId}`}
              className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Abrir do AI
            </Link>
          </div>
        )}

        {/* Reminders */}
        {reminders.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recordatorios</p>
            <div className="space-y-2">
              {reminders.map(r => {
                const dt = new Date(r.remind_at)
                const now = new Date()
                const isPast = dt <= now
                return (
                  <div key={r.id} className={`rounded-2xl border px-4 py-3 flex items-start gap-3 shadow-sm ${isPast ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                    <div className="shrink-0 mt-0.5">{isPast ? <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg> : <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-snug">{r.content}</p>
                      <p className={`text-xs mt-1 ${isPast ? 'text-blue-500 font-medium' : 'text-gray-400'}`}>
                        {isPast ? 'Ahora · ' : ''}{dt.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} {dt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button onClick={() => dismissReminder(r.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0 mt-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Pending tasks */}
        {pending.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Por hacer</p>
            <div className="space-y-2">
              {pending.map(task => (
                <TaskCard key={task.id} task={task} onToggle={toggleDone} onDelete={deleteTask} />
              ))}
            </div>
          </div>
        )}

        {/* Done tasks */}
        {done.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Completadas</p>
            <div className="space-y-2 opacity-60">
              {done.map(task => (
                <TaskCard key={task.id} task={task} onToggle={toggleDone} onDelete={deleteTask} />
              ))}
            </div>
          </div>
        )}

        <div className="h-4" />
      </div>

      <BottomNav userId={userId} active="tasks" />
    </div>
  )
}

function dueDateLabel(due: string | null, done: boolean): { label: string; className: string } | null {
  if (!due || done) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(due + 'T00:00:00')
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return { label: `Vencida hace ${Math.abs(diff)}d`, className: 'text-red-500 bg-red-50 border-red-200' }
  if (diff === 0) return { label: 'Vence hoy', className: 'text-orange-500 bg-orange-50 border-orange-200' }
  if (diff === 1) return { label: 'Vence mañana', className: 'text-yellow-600 bg-yellow-50 border-yellow-200' }
  if (diff <= 7) return { label: `${diff}d restantes`, className: 'text-blue-500 bg-blue-50 border-blue-200' }
  return { label: d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }), className: 'text-gray-400 bg-gray-50 border-gray-200' }
}

function TaskCard({ task, onToggle, onDelete }: { task: Task; onToggle: (id: string, done: boolean) => void; onDelete: (id: string) => void }) {
  const badge = dueDateLabel(task.due_date, task.done)
  return (
    <div className={`bg-white rounded-2xl border px-4 py-3 flex items-start gap-3 shadow-sm transition-all ${task.done ? 'border-gray-100' : 'border-gray-200'}`}>
      <button
        onClick={() => onToggle(task.id, !task.done)}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          task.done ? 'bg-blue-600 border-blue-600' : 'border-gray-300 hover:border-blue-400'
        }`}
      >
        {task.done && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {task.content}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {badge && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.className}`}>
              {badge.label}
            </span>
          )}
          <p className="text-xs text-gray-400">{formatMessageTime(task.created_at)}</p>
        </div>
      </div>
      <button
        onClick={() => onDelete(task.id)}
        className="text-gray-300 hover:text-red-400 transition-colors shrink-0 mt-0.5"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
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
    <div className="bg-white border-t border-gray-100 flex fixed bottom-0 left-0 right-0 max-w-md mx-auto z-10">
      {tabs.map(t => (
        <Link key={t.id} href={t.href} className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${active === t.id ? 'text-blue-600' : 'text-gray-400'}`}>
          {t.icon}
          <span className="text-[9px] font-medium">{t.label}</span>
        </Link>
      ))}
    </div>
  )
}
