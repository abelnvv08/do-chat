'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { USERS } from '@/lib/demo'
import { formatMessageTime } from '@/lib/utils'

type Project = { id: string; title: string; content: string; created_at: string }

export default function ProyectosPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()
  const me = USERS[userId]
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!me) { router.push('/demo'); return }
    fetchProjects()
    const interval = setInterval(fetchProjects, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchProjects() {
    try {
      const res = await fetch(`/api/demo/projects?user_id=${userId}`)
      const { projects: p } = await res.json()
      setProjects(p ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function deleteProject(id: string) {
    setProjects(prev => prev.filter(p => p.id !== id))
    await fetch('/api/demo/projects', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  if (!me) return null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-600 font-semibold">
            {projects.length} docs
          </span>
        </div>
        <p className="text-sm text-gray-400">Reportes y resúmenes generados por do AI</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-8">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-2xl">📁</div>
            <p className="text-gray-600 font-medium">Sin proyectos aún</p>
            <p className="text-sm text-gray-400">Pedile a @do que genere un reporte o acta de tus conversaciones</p>
            <Link
              href={`/demo/${userId}/ai-${userId}`}
              className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Abrir do AI
            </Link>
          </div>
        )}

        {projects.length > 0 && (
          <div className="px-4 py-3 space-y-3">
            {projects.map(proj => (
              <div key={proj.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === proj.id ? null : proj.id)}
                  className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-base">📄</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{proj.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatMessageTime(proj.created_at)} · por do AI</p>
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 mt-1 shrink-0 transition-transform ${expanded === proj.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {expanded === proj.id && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{proj.content}</p>
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={() => deleteProject(proj.id)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="h-4" />
      </div>

      <BottomNav userId={userId} active="projects" />
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
