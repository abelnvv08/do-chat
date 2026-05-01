'use client'

import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { USERS } from '@/lib/demo'
import { formatMessageTime } from '@/lib/utils'

type SearchResult = {
  id: string
  room_id: string
  room_name: string
  room_emoji: string
  room_type: string
  sender_name: string
  sender_emoji: string
  preview: string
  type: string
  created_at: string
  fileInfo: { name: string; url: string } | null
}

function highlight(text: string, query: string) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-gray-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function BuscarPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()
  const me = USERS[userId]
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!me) { router.push('/demo'); return }
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) { setResults([]); setSearched(false); return }
    debounceRef.current = setTimeout(search, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  async function search() {
    setLoading(true)
    try {
      const res = await fetch(`/api/demo/search?user_id=${userId}&q=${encodeURIComponent(query)}`)
      const { results: r } = await res.json()
      setResults(r ?? [])
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  if (!me) return null

  // Group results by room
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.room_id]) acc[r.room_id] = []
    acc[r.room_id].push(r)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-blue-600 font-medium text-sm shrink-0">
            Cancelar
          </button>
          <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar en mensajes, archivos, chats…"
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); setSearched(false) }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Empty state */}
        {!query && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl">🔍</div>
            <p className="text-gray-600 font-medium">Buscá en todos tus chats</p>
            <p className="text-sm text-gray-400">Mensajes, archivos, respuestas de do AI — todo en un lugar</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* No results */}
        {!loading && searched && results.length === 0 && query.length >= 2 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 px-8 text-center">
            <p className="text-gray-500 font-medium">Sin resultados para "{query}"</p>
            <p className="text-sm text-gray-400">Probá con otras palabras</p>
          </div>
        )}

        {/* Results grouped by room */}
        {!loading && Object.entries(grouped).map(([roomId, msgs]) => (
          <div key={roomId} className="mb-1">
            {/* Room header */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-y border-gray-100">
              <span className="text-base">{msgs[0].room_emoji}</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{msgs[0].room_name}</span>
              <span className="ml-auto text-xs text-gray-400">{msgs.length} resultado{msgs.length > 1 ? 's' : ''}</span>
            </div>

            {/* Messages */}
            {msgs.map(result => (
              <Link
                key={result.id}
                href={`/demo/${userId}/${result.room_id}`}
                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors active:bg-gray-100"
              >
                {/* Sender avatar */}
                <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm mt-0.5 ${
                  result.type === 'ai' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {result.type === 'ai' ? '✦' : result.sender_emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <p className="text-sm font-medium text-gray-800">{result.sender_name}</p>
                    <p className="text-xs text-gray-400 shrink-0">{formatMessageTime(result.created_at)}</p>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 leading-snug">
                    {result.fileInfo ? (
                      <span className="flex items-center gap-1">
                        📎 <span>{highlight(result.fileInfo.name, query)}</span>
                      </span>
                    ) : (
                      highlight(result.preview.slice(0, 120), query)
                    )}
                  </p>
                </div>

                <svg className="w-4 h-4 text-gray-300 shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>
        ))}

        <div className="h-4" />
      </div>
    </div>
  )
}
