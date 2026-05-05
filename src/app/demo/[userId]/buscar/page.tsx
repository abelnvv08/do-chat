'use client'

import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-gray-900 rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function BuscarPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query || query.length < 2) {
      setResults([])
      setSearched(false)
      return
    }
    debounceRef.current = setTimeout(doSearch, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  async function doSearch() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/demo/search?user_id=${userId}&q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error('Error al buscar')
      const data = await res.json()
      setResults(data.results ?? [])
      setSearched(true)
    } catch {
      setError('Error al buscar. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }


  // Group results by room
  const grouped: Record<string, SearchResult[]> = {}
  for (const r of results) {
    if (!grouped[r.room_id]) grouped[r.room_id] = []
    grouped[r.room_id].push(r)
  }
  const groupEntries = Object.entries(grouped)

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-blue-600 font-medium text-sm shrink-0"
          >
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
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="Buscar en mensajes y archivos…"
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
              autoComplete="off"
            />
            {query.length > 0 && (
              <button
                onClick={() => { setQuery(''); setResults([]); setSearched(false) }}
                className="text-gray-400 hover:text-gray-600 p-0.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Initial empty state */}
        {!query && !searched && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl">🔍</div>
            <p className="text-gray-700 font-medium">Buscá en todos tus chats</p>
            <p className="text-sm text-gray-400">Mensajes, archivos, respuestas de do AI</p>
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
            {error}
          </div>
        )}

        {/* No results */}
        {!loading && searched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 px-8 text-center">
            <p className="text-gray-500 font-medium">Sin resultados para &ldquo;{query}&rdquo;</p>
            <p className="text-sm text-gray-400">Probá con otras palabras</p>
          </div>
        )}

        {/* Results grouped by room */}
        {!loading && groupEntries.map(([roomId, msgs]) => (
          <div key={roomId}>
            {/* Room label */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-y border-gray-100 sticky top-[72px] z-[5]">
              <span className="text-sm">{msgs[0].room_emoji}</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{msgs[0].room_name}</span>
              <span className="ml-auto text-xs text-gray-400">{msgs.length} resultado{msgs.length > 1 ? 's' : ''}</span>
            </div>

            {msgs.map(result => (
              <Link
                key={result.id}
                href={`/demo/${userId}/${result.room_id}`}
                className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 border-b border-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm mt-0.5 ${
                  result.type === 'ai' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {result.type === 'ai' ? '✦' : result.sender_emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-800 truncate">{result.sender_name}</p>
                    <p className="text-xs text-gray-400 shrink-0">{formatMessageTime(result.created_at)}</p>
                  </div>
                  <p className="text-sm text-gray-500 leading-snug line-clamp-2">
                    <Highlighted
                      text={result.fileInfo ? `📎 ${result.fileInfo.name}` : result.preview.slice(0, 140)}
                      query={query}
                    />
                  </p>
                </div>

                <svg className="w-4 h-4 text-gray-300 shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>
        ))}

        <div className="h-6" />
      </div>
    </div>
  )
}
