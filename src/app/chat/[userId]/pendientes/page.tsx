'use client'

import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { formatMessageTime } from '@/lib/utils'

type Task = {
  id: string
  content: string
  done: boolean
  created_at: string
  source_room: string | null
  due_date: string | null
  task_status: string | null
  assigned_to: string | null
  assigned_by: string | null
  assigned_by_name: string | null
  assigned_by_emoji: string | null
  assigned_to_name: string | null
  evidence_url: string | null
  evidence_name: string | null
  completed_at: string | null
}

type Reminder = { id: string; content: string; remind_at: string }

export default function PendientesPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const [tasks, setTasks] = useState<Task[]>([])
  const [received, setReceived] = useState<Task[]>([])
  const [sent, setSent] = useState<Task[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [adding, setAdding] = useState(false)
  const [tab, setTab] = useState<'personal' | 'recibidas' | 'enviadas'>('personal')
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [uploadingEvidence, setUploadingEvidence] = useState(false)
  const evidenceRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchAll() {
    try {
      const res = await fetch(`/api/chat/tasks?user_id=${userId}`)
      const data = await res.json()
      setTasks(data.tasks ?? [])
      setReceived(data.received ?? [])
      setSent(data.sent ?? [])
    } finally {
      setLoading(false)
    }
    try {
      const res = await fetch(`/api/chat/reminders?user_id=${userId}`)
      const { reminders: r } = await res.json()
      setReminders(r ?? [])
    } catch { /* ignore */ }
  }

  async function dismissReminder(id: string) {
    setReminders(prev => prev.filter(r => r.id !== id))
    await fetch('/api/chat/reminders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
  }

  async function toggleDone(id: string, done: boolean) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done } : t))
    await fetch('/api/chat/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, done }) })
  }

  async function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
    await fetch('/api/chat/tasks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
  }

  async function addTask() {
    if (!newTask.trim()) return
    setAdding(true)
    const res = await fetch('/api/chat/tasks', {
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

  async function handleAction(id: string, action: 'accept' | 'reject') {
    setReceived(prev => prev.map(t => t.id === id ? { ...t, task_status: action === 'accept' ? 'in_progress' : 'rejected' } : t))
    await fetch('/api/chat/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) })
    fetchAll()
  }

  async function handleComplete(id: string) {
    setUploadingEvidence(true)
    let evidence_url = null
    let evidence_name = null

    if (evidenceFile) {
      const fd = new FormData()
      fd.append('file', evidenceFile)
      fd.append('user_id', userId)
      fd.append('room_id', 'task-evidence')
      const uploadRes = await fetch('/api/chat/upload', { method: 'POST', body: fd })
      const uploadData = await uploadRes.json()
      if (uploadData.message?.content) {
        try {
          const meta = JSON.parse(uploadData.message.content)
          evidence_url = meta.url
          evidence_name = evidenceFile.name
        } catch {
          evidence_url = uploadData.message.content
          evidence_name = evidenceFile.name
        }
      }
    }

    await fetch('/api/chat/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'complete', evidence_url, evidence_name }),
    })
    setCompletingId(null)
    setEvidenceFile(null)
    setUploadingEvidence(false)
    fetchAll()
  }

  const pendingPersonal = tasks.filter(t => !t.done).sort((a, b) => {
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
    if (a.due_date) return -1; if (b.due_date) return 1; return 0
  })
  const donePersonal = tasks.filter(t => t.done)
  const pendingReceived = received.filter(t => t.task_status === 'pending')
  const inProgressReceived = received.filter(t => t.task_status === 'in_progress')
  const completedReceived = received.filter(t => t.task_status === 'completed' || t.task_status === 'rejected')

  const totalBadge = pendingReceived.length + inProgressReceived.length

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-0 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
          {totalBadge > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-600 font-semibold">
              {totalBadge} pendiente{totalBadge > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-100">
          {(['personal', 'recibidas', 'enviadas'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors relative ${tab === t ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {t === 'personal' ? 'Mis tareas' : t === 'recibidas' ? 'Recibidas' : 'Enviadas'}
              {t === 'recibidas' && totalBadge > 0 && (
                <span className="ml-1.5 text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5">{totalBadge}</span>
              )}
              {tab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ── MIS TAREAS ── */}
        {!loading && tab === 'personal' && (
          <>
            {/* Add task */}
            <div className="px-4 py-3 bg-white border-b border-gray-100 space-y-2">
              <div className="flex gap-2">
                <input
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTask()}
                  placeholder="Agregar tarea…"
                  className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-400 text-gray-800 placeholder:text-gray-400"
                />
                <button onClick={addTask} disabled={!newTask.trim() || adding}
                  className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0">+</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 shrink-0">Fecha límite:</span>
                <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)}
                  className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400 text-gray-600" />
                {newDueDate && <button onClick={() => setNewDueDate('')} className="text-xs text-gray-400 hover:text-gray-600">Quitar</button>}
              </div>
            </div>

            {/* Reminders */}
            {reminders.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recordatorios</p>
                <div className="space-y-2">
                  {reminders.map(r => {
                    const dt = new Date(r.remind_at)
                    const isPast = dt <= new Date()
                    return (
                      <div key={r.id} className={`rounded-2xl border px-4 py-3 flex items-start gap-3 shadow-sm ${isPast ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                        <div className="shrink-0 mt-0.5">
                          {isPast
                            ? <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>
                            : <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 leading-snug">{r.content}</p>
                          <p className={`text-xs mt-1 ${isPast ? 'text-blue-500 font-medium' : 'text-gray-400'}`}>
                            {isPast ? 'Ahora · ' : ''}{dt.toLocaleDateString('es', { day: 'numeric', month: 'short' })} {dt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button onClick={() => dismissReminder(r.id)} className="text-gray-300 hover:text-red-400 shrink-0 mt-0.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {tasks.length === 0 && reminders.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-8">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-2xl">✓</div>
                <p className="text-gray-600 font-medium">Sin pendientes por ahora</p>
                <p className="text-sm text-gray-400">Pedile a @do que extraiga tareas de tus conversaciones</p>
              </div>
            )}

            {pendingPersonal.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Por hacer</p>
                <div className="space-y-2">
                  {pendingPersonal.map(task => (
                    <TaskCard key={task.id} task={task} onToggle={toggleDone} onDelete={deleteTask} />
                  ))}
                </div>
              </div>
            )}
            {donePersonal.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Completadas</p>
                <div className="space-y-2 opacity-60">
                  {donePersonal.map(task => (
                    <TaskCard key={task.id} task={task} onToggle={toggleDone} onDelete={deleteTask} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── RECIBIDAS ── */}
        {!loading && tab === 'recibidas' && (
          <>
            {received.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-8">
                <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center text-2xl">📋</div>
                <p className="text-gray-600 font-medium">Sin tareas recibidas</p>
                <p className="text-sm text-gray-400">Cuando alguien te asigne una tarea aparecerá aquí</p>
              </div>
            )}

            {pendingReceived.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Esperando tu respuesta</p>
                <div className="space-y-3">
                  {pendingReceived.map(task => (
                    <ReceivedTaskCard key={task.id} task={task}
                      onAccept={() => handleAction(task.id, 'accept')}
                      onReject={() => handleAction(task.id, 'reject')}
                      onStartComplete={() => setCompletingId(task.id)}
                      completing={completingId === task.id}
                      evidenceFile={evidenceFile}
                      onEvidenceChange={setEvidenceFile}
                      onConfirmComplete={() => handleComplete(task.id)}
                      onCancelComplete={() => { setCompletingId(null); setEvidenceFile(null) }}
                      uploading={uploadingEvidence}
                      evidenceRef={evidenceRef}
                    />
                  ))}
                </div>
              </div>
            )}

            {inProgressReceived.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">En proceso</p>
                <div className="space-y-3">
                  {inProgressReceived.map(task => (
                    <ReceivedTaskCard key={task.id} task={task}
                      onAccept={() => {}}
                      onReject={() => {}}
                      onStartComplete={() => setCompletingId(task.id)}
                      completing={completingId === task.id}
                      evidenceFile={evidenceFile}
                      onEvidenceChange={setEvidenceFile}
                      onConfirmComplete={() => handleComplete(task.id)}
                      onCancelComplete={() => { setCompletingId(null); setEvidenceFile(null) }}
                      uploading={uploadingEvidence}
                      evidenceRef={evidenceRef}
                    />
                  ))}
                </div>
              </div>
            )}

            {completedReceived.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Historial</p>
                <div className="space-y-3 opacity-60">
                  {completedReceived.map(task => (
                    <ReceivedTaskCard key={task.id} task={task}
                      onAccept={() => {}} onReject={() => {}} onStartComplete={() => {}}
                      completing={false} evidenceFile={null} onEvidenceChange={() => {}}
                      onConfirmComplete={() => {}} onCancelComplete={() => {}}
                      uploading={false} evidenceRef={evidenceRef}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── ENVIADAS ── */}
        {!loading && tab === 'enviadas' && (
          <>
            {sent.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-8">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-2xl">📤</div>
                <p className="text-gray-600 font-medium">Sin tareas enviadas</p>
                <p className="text-sm text-gray-400">Asigna tareas desde un chat para verlas aquí</p>
              </div>
            )}
            {sent.length > 0 && (
              <div className="px-4 py-3 space-y-3">
                {sent.map(task => (
                  <SentTaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </>
        )}

        <div className="h-4" />
      </div>

      <input ref={evidenceRef} type="file" className="hidden"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.mp4,.mov"
        onChange={e => setEvidenceFile(e.target.files?.[0] ?? null)} />

      <BottomNav userId={userId} active="tasks" />
    </div>
  )
}

function dueDateLabel(due: string | null, done: boolean) {
  if (!due || done) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(due + 'T00:00:00')
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return { label: `Vencida hace ${Math.abs(diff)}d`, className: 'text-red-500 bg-red-50 border-red-200' }
  if (diff === 0) return { label: 'Vence hoy', className: 'text-orange-500 bg-orange-50 border-orange-200' }
  if (diff === 1) return { label: 'Vence mañana', className: 'text-yellow-600 bg-yellow-50 border-yellow-200' }
  if (diff <= 7) return { label: `${diff}d restantes`, className: 'text-blue-500 bg-blue-50 border-blue-200' }
  return { label: d.toLocaleDateString('es', { day: 'numeric', month: 'short' }), className: 'text-gray-400 bg-gray-50 border-gray-200' }
}

function statusBadge(status: string | null) {
  if (!status || status === 'personal') return null
  const map: Record<string, { label: string; className: string }> = {
    pending:   { label: 'Esperando aceptación', className: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
    in_progress: { label: 'En proceso', className: 'bg-blue-50 text-blue-600 border-blue-200' },
    completed: { label: 'Completada ✓', className: 'bg-green-50 text-green-600 border-green-200' },
    rejected:  { label: 'Rechazada', className: 'bg-red-50 text-red-500 border-red-200' },
  }
  return map[status] ?? null
}

function TaskCard({ task, onToggle, onDelete }: { task: Task; onToggle: (id: string, done: boolean) => void; onDelete: (id: string) => void }) {
  const badge = dueDateLabel(task.due_date, task.done)
  return (
    <div className={`bg-white rounded-2xl border px-4 py-3 flex items-start gap-3 shadow-sm ${task.done ? 'border-gray-100' : 'border-gray-200'}`}>
      <button onClick={() => onToggle(task.id, !task.done)}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${task.done ? 'bg-blue-600 border-blue-600' : 'border-gray-300 hover:border-blue-400'}`}>
        {task.done && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{parseContent(task.content)}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {badge && <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.className}`}>{badge.label}</span>}
          <p className="text-xs text-gray-400">{formatMessageTime(task.created_at)}</p>
        </div>
      </div>
      <button onClick={() => onDelete(task.id)} className="text-gray-300 hover:text-red-400 shrink-0 mt-0.5">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
    </div>
  )
}

function ReceivedTaskCard({ task, onAccept, onReject, onStartComplete, completing, evidenceFile, onEvidenceChange, onConfirmComplete, onCancelComplete, uploading, evidenceRef }: {
  task: Task
  onAccept: () => void
  onReject: () => void
  onStartComplete: () => void
  completing: boolean
  evidenceFile: File | null
  onEvidenceChange: (f: File | null) => void
  onConfirmComplete: () => void
  onCancelComplete: () => void
  uploading: boolean
  evidenceRef: React.RefObject<HTMLInputElement | null>
}) {
  const badge = statusBadge(task.task_status)
  const isPending = task.task_status === 'pending'
  const isInProgress = task.task_status === 'in_progress'
  const isCompleted = task.task_status === 'completed'
  const isRejected = task.task_status === 'rejected'

  const senderName = task.assigned_by_name ?? parseSourceRoom(task.source_room).name ?? 'Alguien'
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3">
        {/* From */}
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-6 h-6 rounded-full bg-[#707070] flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          </div>
          <span className="text-xs text-gray-400">De <span className="font-medium text-gray-600">{senderName}</span></span>
          {badge && <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.className}`}>{badge.label}</span>}
        </div>

        <p className="text-sm text-gray-800 leading-snug font-medium">{parseContent(task.content)}</p>

        {task.due_date && (
          <p className="text-xs text-gray-400 mt-1">Vence: {new Date(task.due_date + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'long' })}</p>
        )}

        {/* Evidence on completed */}
        {isCompleted && task.evidence_url && (
          <a href={task.evidence_url} target="_blank" rel="noopener noreferrer"
            className="mt-2 flex items-center gap-2 text-xs text-blue-600 hover:underline">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg>
            {task.evidence_name ?? 'Ver evidencia'}
          </a>
        )}
      </div>

      {/* Actions */}
      {isPending && (
        <div className="px-4 pb-3 flex gap-2">
          <button onClick={onReject}
            className="flex-1 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            Rechazar
          </button>
          <button onClick={onAccept}
            className="flex-1 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            Aceptar
          </button>
        </div>
      )}

      {isInProgress && !completing && (
        <div className="px-4 pb-3">
          <button onClick={onStartComplete}
            className="w-full py-2 rounded-xl text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors">
            Marcar como terminada
          </button>
        </div>
      )}

      {isInProgress && completing && (
        <div className="px-4 pb-3 space-y-2">
          <p className="text-xs text-gray-500 font-medium">¿Adjuntar evidencia? (opcional)</p>
          {evidenceFile ? (
            <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
              <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg>
              <span className="text-xs text-blue-700 truncate flex-1">{evidenceFile.name}</span>
              <button onClick={() => onEvidenceChange(null)} className="text-blue-400 hover:text-blue-600 text-xs">✕</button>
            </div>
          ) : (
            <button onClick={() => evidenceRef.current?.click()}
              className="w-full py-2 rounded-xl text-sm border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors">
              + Adjuntar archivo / foto
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={onCancelComplete}
              className="flex-1 py-2 rounded-xl text-sm border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button onClick={onConfirmComplete} disabled={uploading}
              className="flex-1 py-2 rounded-xl text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1">
              {uploading ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Subiendo…</> : 'Confirmar'}
            </button>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red-400 text-center">Tarea rechazada</p>
        </div>
      )}
    </div>
  )
}

// Parse name from source_room like 'sent-invite|userId|Name||type' or 'invite|userId|Name||type'
function parseSourceRoom(source: string | null) {
  if (!source) return { name: null }
  const parts = source.split('|')
  return { name: parts[2] || null }
}

// Parse content — handles plain text and old JSON reminder format
function parseContent(content: string) {
  try {
    const obj = JSON.parse(content)
    if (obj.text) return obj.text
  } catch { /* plain text */ }
  return content
}

function SentTaskCard({ task }: { task: Task }) {
  const badge = statusBadge(task.task_status)
  const recipientName = task.assigned_to_name ?? parseSourceRoom(task.source_room).name ?? 'Alguien'
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-base">{task.assigned_by_emoji ?? '👤'}</span>
        <span className="text-xs text-gray-400">Para <span className="font-medium text-gray-600">{recipientName}</span></span>
        {badge && <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.className}`}>{badge.label}</span>}
      </div>
      <p className="text-sm text-gray-800 leading-snug">{parseContent(task.content)}</p>
      {task.due_date && (
        <p className="text-xs text-gray-400 mt-1">Vence: {new Date(task.due_date + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'long' })}</p>
      )}
      {task.task_status === 'completed' && task.evidence_url && (
        <a href={task.evidence_url} target="_blank" rel="noopener noreferrer"
          className="mt-2 flex items-center gap-2 text-xs text-blue-600 hover:underline">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg>
          Ver evidencia — {task.evidence_name ?? 'archivo'}
        </a>
      )}
    </div>
  )
}

function BottomNav({ userId, active }: { userId: string; active: string }) {
  const tabs = [
    { id: 'chats', label: 'Chats', href: `/chat/${userId}`, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg> },
    { id: 'tasks', label: 'Pendientes', href: `/chat/${userId}/pendientes`, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> },
    { id: 'projects', label: 'Proyectos', href: `/chat/${userId}/proyectos`, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg> },
    { id: 'docs', label: 'Docs', href: `/chat/${userId}/documentos`, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg> },
    { id: 'tu', label: 'Tú', href: `/chat/${userId}/perfil`, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg> },
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
