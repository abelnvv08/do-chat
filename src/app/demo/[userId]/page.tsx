'use client'

import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { USERS, getRoomsForUser, type Room } from '@/lib/demo'
import { formatMessageTime } from '@/lib/utils'

type RoomWithMeta = Room & {
  lastMsg: { content: string; created_at: string; user_id: string } | null
  unread: number
  seenByOthers: boolean
}

type SearchResult = {
  id: string; room_id: string; room_name: string; room_emoji: string
  sender_name: string; sender_emoji: string; preview: string
  type: string; created_at: string; fileInfo: { name: string; url: string } | null
}

export default function ChatListPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()
  const me = USERS[userId]
  const [tab, setTab] = useState<'chats' | 'tu'>('chats')
  const [rooms, setRooms] = useState<RoomWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!me) { router.push('/demo'); return }
    fetchRooms()
    const interval = setInterval(fetchRooms, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (showSearch) setTimeout(() => searchInputRef.current?.focus(), 50)
  }, [showSearch])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return }
    debounceRef.current = setTimeout(doSearch, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery])

  async function fetchRooms() {
    try {
      const res = await fetch(`/api/demo/chat-list?user_id=${userId}`)
      const { rooms: r } = await res.json()
      setRooms(r ?? [])
    } finally { setLoading(false) }
  }

  async function doSearch() {
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/demo/search?user_id=${userId}&q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setSearchResults(data.results ?? [])
    } finally { setSearchLoading(false) }
  }

  function closeSearch() {
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
  }

  if (!me) return null

  const totalUnread = rooms.reduce((sum, r) => sum + r.unread, 0)

  // Group search results by room
  const grouped: Record<string, SearchResult[]> = {}
  for (const r of searchResults) {
    if (!grouped[r.room_id]) grouped[r.room_id] = []
    grouped[r.room_id].push(r)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-0 sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-900">DO Chat</h1>
          <button onClick={() => setShowSearch(true)} className="text-gray-500 hover:text-blue-600 transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button onClick={() => setTab('chats')} className={`flex-1 py-2.5 text-sm font-semibold relative transition-colors ${tab === 'chats' ? 'text-blue-600' : 'text-gray-400'}`}>
            Chats
            {totalUnread > 0 && <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold">{totalUnread > 9 ? '9+' : totalUnread}</span>}
            {tab === 'chats' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
          </button>
          <button onClick={() => setTab('tu')} className={`flex-1 py-2.5 text-sm font-semibold relative transition-colors ${tab === 'tu' ? 'text-blue-600' : 'text-gray-400'}`}>
            Tú
            {tab === 'tu' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
          </button>
        </div>
      </div>

      {tab === 'chats' && (
        <div className="flex-1 divide-y divide-gray-50">
          {loading && <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}
          {rooms.map(room => <ChatRow key={room.id} room={room} userId={userId} />)}
        </div>
      )}

      {tab === 'tu' && <ProfileTab userId={userId} me={me} />}

      <BottomNav userId={userId} active="chats" />

      {/* Search overlay */}
      {showSearch && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col max-w-md mx-auto">
          {/* Search header */}
          <div className="px-4 pt-12 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar mensajes, archivos…"
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
                  autoComplete="off"
                />
                {searchQuery.length > 0 && (
                  <button onClick={() => { setSearchQuery(''); setSearchResults([]) }} className="text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button onClick={closeSearch} className="text-blue-600 font-medium text-sm shrink-0">Cancelar</button>
            </div>
          </div>

          {/* Search results */}
          <div className="flex-1 overflow-y-auto">
            {!searchQuery && (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-8">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl">🔍</div>
                <p className="text-gray-700 font-medium">Buscá en todos tus chats</p>
                <p className="text-sm text-gray-400">Mensajes, archivos, respuestas de do AI</p>
              </div>
            )}

            {searchLoading && (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-8">
                <p className="text-gray-500 font-medium">Sin resultados para &ldquo;{searchQuery}&rdquo;</p>
              </div>
            )}

            {!searchLoading && Object.entries(grouped).map(([roomId, msgs]) => (
              <div key={roomId}>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-y border-gray-100">
                  <span>{msgs[0].room_emoji}</span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{msgs[0].room_name}</span>
                  <span className="ml-auto text-xs text-gray-400">{msgs.length} resultado{msgs.length > 1 ? 's' : ''}</span>
                </div>
                {msgs.map(result => (
                  <button
                    key={result.id}
                    onClick={() => { closeSearch(); router.push(`/demo/${userId}/${result.room_id}`) }}
                    className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 border-b border-gray-50 text-left"
                  >
                    <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm mt-0.5 ${result.type === 'ai' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                      {result.type === 'ai' ? '✦' : result.sender_emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-gray-800">{result.sender_name}</p>
                        <p className="text-xs text-gray-400 shrink-0">{formatMessageTime(result.created_at)}</p>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 text-left">
                        {result.fileInfo ? `📎 ${result.fileInfo.name}` : result.preview.slice(0, 140)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ChatRow({ room, userId }: { room: RoomWithMeta; userId: string }) {
  const otherUser = room.otherUserId ? USERS[room.otherUserId] : null
  const isAI = room.type === 'ai'

  return (
    <Link
      href={`/demo/${userId}/${room.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
          isAI ? 'bg-blue-600 text-white' : room.type === 'group' ? 'bg-gray-200' : otherUser ? otherUser.bg : 'bg-gray-200'
        }`}>
          {isAI ? '✦' : room.emoji}
        </div>
        {room.unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
            {room.unread > 99 ? '99+' : room.unread}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className={`text-sm font-semibold truncate ${room.unread > 0 ? 'text-gray-900' : 'text-gray-800'}`}>
            {isAI ? 'do AI' : room.name}
          </p>
          {room.lastMsg && (
            <span className={`text-xs shrink-0 ${room.unread > 0 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
              {formatMessageTime(room.lastMsg.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {/* Visto ticks on own last message */}
          {room.lastMsg?.user_id === userId && (
            <span className={`text-xs shrink-0 ${room.seenByOthers ? 'text-blue-500' : 'text-gray-400'}`}>
              {room.seenByOthers ? '✓✓' : '✓✓'}
            </span>
          )}
          <p className={`text-xs truncate ${room.unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
            {room.lastMsg?.content ?? (isAI ? 'Asistente inteligente' : 'Sin mensajes aún')}
          </p>
        </div>
      </div>
    </Link>
  )
}

function ProfileTab({ userId, me }: { userId: string; me: typeof USERS[string] }) {
  return (
    <div className="flex-1 bg-gray-50">
      {/* Avatar grande */}
      <div className="flex flex-col items-center py-10 bg-white border-b border-gray-100">
        <div className={`w-24 h-24 rounded-full ${me.bg} flex items-center justify-center text-4xl mb-3 shadow-sm`}>
          {me.emoji}
        </div>
        <p className="text-xl font-bold text-gray-900">{me.name}</p>
        <p className="text-sm text-gray-400 mt-0.5">Usuario #{userId}</p>
      </div>

      {/* Info */}
      <div className="mt-3 bg-white divide-y divide-gray-100">
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="w-8 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-400">Estado</p>
            <p className="text-sm text-gray-700">Disponible</p>
          </div>
        </div>

        <div className="flex items-center gap-4 px-5 py-4">
          <div className="w-8 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-400">Nombre</p>
            <p className="text-sm text-gray-700">{me.name}</p>
          </div>
        </div>
      </div>

      {/* Links rápidos */}
      <div className="mt-3 bg-white divide-y divide-gray-100">
        <Link href={`/demo/${userId}/ai-${userId}`} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm shrink-0">✦</div>
          <p className="text-sm text-gray-700 font-medium">Abrir do AI</p>
          <svg className="w-4 h-4 text-gray-300 ml-auto" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
        <Link href="/demo" className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </div>
          <p className="text-sm text-gray-700 font-medium">Cambiar usuario</p>
          <svg className="w-4 h-4 text-gray-300 ml-auto" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>
    </div>
  )
}

function BottomNav({ userId, active }: { userId: string; active: string }) {
  const tabs = [
    { id: 'chats', label: 'Chats', href: `/demo/${userId}`, icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
      </svg>
    )},
    { id: 'ai', label: 'do IA', href: `/demo/${userId}/ai-${userId}`, icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
      </svg>
    )},
    { id: 'tasks', label: 'Pendientes', href: `/demo/${userId}/pendientes`, icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    )},
    { id: 'projects', label: 'Proyectos', href: `/demo/${userId}/proyectos`, icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
      </svg>
    )},
    { id: 'docs', label: 'Docs', href: `/demo/${userId}/documentos`, icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    )},
  ]
  return (
    <div className="bg-white border-t border-gray-100 flex sticky bottom-0 z-10">
      {tabs.map(t => (
        <Link key={t.id} href={t.href} className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${active === t.id ? 'text-blue-600' : 'text-gray-400'}`}>
          {t.icon}
          <span className="text-[9px] font-medium">{t.label}</span>
        </Link>
      ))}
    </div>
  )
}
