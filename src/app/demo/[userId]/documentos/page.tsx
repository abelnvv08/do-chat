'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { USERS, getRoomsForUser } from '@/lib/demo'
import { formatMessageTime } from '@/lib/utils'

type FileEntry = {
  id: string
  name: string
  url: string
  size: number | null
  type: 'file' | 'image'
  room_id: string
  created_at: string
  sender: string
  sender_emoji: string
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️'
  if (['pdf'].includes(ext)) return '📕'
  if (['xlsx', 'xls', 'csv'].includes(ext)) return '📗'
  if (['docx', 'doc'].includes(ext)) return '📘'
  if (['pptx', 'ppt'].includes(ext)) return '📙'
  return '📄'
}

export default function DocumentosPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()
  const me = USERS[userId]
  const rooms = getRoomsForUser(userId)
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'file' | 'image'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!me) { router.push('/demo'); return }
    fetchFiles()
    const interval = setInterval(fetchFiles, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchFiles() {
    try {
      const res = await fetch(`/api/demo/files?user_id=${userId}`)
      const { files: f } = await res.json()
      setFiles(f ?? [])
    } finally {
      setLoading(false)
    }
  }

  function roomName(roomId: string) {
    return rooms.find(r => r.id === roomId)?.name ?? roomId
  }

  const filtered = files
    .filter(f => filter === 'all' || f.type === filter)
    .filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.sender.toLowerCase().includes(search.toLowerCase()))

  if (!me) return null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-600 font-semibold">
            {files.length} archivos
          </span>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar archivos…"
          className="w-full bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 mb-3"
        />
        <div className="flex gap-2">
          {(['all', 'file', 'image'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'file' ? 'Archivos' : 'Imágenes'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-8">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-2xl">📄</div>
            <p className="text-gray-600 font-medium">
              {search ? 'Sin resultados' : 'Sin archivos compartidos'}
            </p>
            <p className="text-sm text-gray-400">
              {search ? 'Probá con otro término' : 'Los archivos e imágenes de tus chats aparecerán aquí'}
            </p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-4 py-3 space-y-2">
            {filtered.map(file => (
              <a
                key={file.id}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-sm hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
              >
                {file.type === 'image' ? (
                  <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                    <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-xl">
                    {fileIcon(file.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {file.sender_emoji} {file.sender} · {roomName(file.room_id)}
                    {file.size ? ` · ${Math.round(file.size / 1024)} KB` : ''}
                  </p>
                  <p className="text-xs text-gray-300 mt-0.5">{formatMessageTime(file.created_at)}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            ))}
          </div>
        )}

        <div className="h-4" />
      </div>

      <BottomNav userId={userId} active="docs" />
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
