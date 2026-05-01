'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { USERS } from '@/lib/demo'
import { formatMessageTime } from '@/lib/utils'

type Task = { id: string; content: string; done: boolean; created_at: string; source_room: string | null }

export default function PendientesPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()
  const me = USERS[userId]
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!me) { router.push('/demo'); return }
    fetchTasks()
    const interval = setInterval(fetchTasks, 4000)
    return () => clearInterval(interval)
  }, [])

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
      body: JSON.stringify({ user_id: userId, content: newTask.trim() }),
    })
    const { task } = await res.json()
    if (task) setTasks(prev => [task, ...prev])
    setNewTask('')
    setAdding(false)
  }

  if (!me) return null

  const pending = tasks.filter(t => !t.done)
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

      <div className="flex-1 overflow-y-auto">
        {/* Add task */}
        <div className="px-4 py-3 bg-white border-b border-gray-100">
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

function TaskCard({ task, onToggle, onDelete }: { task: Task; onToggle: (id: string, done: boolean) => void; onDelete: (id: string) => void }) {
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
        <p className="text-xs text-gray-400 mt-1">{formatMessageTime(task.created_at)}</p>
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
    { id: 'chats', label: 'Chats', href: `/demo/${userId}` },
    { id: 'ai', label: 'do IA', href: `/demo/${userId}/ai-${userId}` },
    { id: 'tasks', label: 'Pendientes', href: `/demo/${userId}/pendientes` },
    { id: 'projects', label: 'Proyectos', href: `/demo/${userId}/proyectos` },
    { id: 'docs', label: 'Docs', href: `/demo/${userId}/documentos` },
  ]
  return (
    <div className="bg-white border-t border-gray-100 flex sticky bottom-0 z-10">
      {tabs.map(t => (
        <Link key={t.id} href={t.href} className={`flex-1 flex flex-col items-center py-3 text-[10px] font-medium transition-colors ${active === t.id ? 'text-blue-600' : 'text-gray-400'}`}>
          {t.label}
        </Link>
      ))}
    </div>
  )
}
