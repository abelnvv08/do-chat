'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { formatMessageTime } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'

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

function fileColor(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['pdf'].includes(ext)) return 'bg-red-50 text-red-500'
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'bg-green-50 text-green-600'
  if (['docx', 'doc'].includes(ext)) return 'bg-blue-50 text-blue-600'
  if (['pptx', 'ppt'].includes(ext)) return 'bg-orange-50 text-orange-500'
  return 'bg-gray-100 text-gray-500'
}

export default function DocumentosPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const { lang } = useLanguage()
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'file' | 'image'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchFiles()
    const interval = setInterval(fetchFiles, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchFiles() {
    try {
      const res = await fetch(`/api/chat/files?user_id=${userId}`)
      const { files: f } = await res.json()
      setFiles(f ?? [])
    } finally {
      setLoading(false)
    }
  }

  const filtered = files
    .filter(f => filter === 'all' || f.type === filter)
    .filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.sender.toLowerCase().includes(search.toLowerCase()))


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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

      <div className="flex-1 overflow-y-auto pb-20">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-8">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center"><svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg></div>
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
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${fileColor(file.name)}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {file.sender_emoji} {file.sender}
                    {file.size ? ` · ${Math.round(file.size / 1024)} KB` : ''}
                  </p>
                  <p className="text-xs text-gray-300 mt-0.5">{formatMessageTime(file.created_at, lang)}</p>
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
  const { t } = useLanguage()
  const nav = t.app.nav
  const tabs = [
    { id: 'chats',    label: nav.chats,      href: `/chat/${userId}`,           icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg> },
    { id: 'tasks',    label: nav.tasks,      href: `/chat/${userId}/pendientes`, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> },
    { id: 'projects', label: nav.projects,   href: `/chat/${userId}/proyectos`,  icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg> },
    { id: 'docs',     label: nav.docs,       href: `/chat/${userId}/documentos`, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg> },
    { id: 'tu',       label: t.app.tabs.you, href: `/chat/${userId}/perfil`,     icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg> },
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
