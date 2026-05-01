'use client'

import { use, useEffect, useRef, useState, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import TextareaAutosize from 'react-textarea-autosize'
import { SendHorizonalIcon, ArrowLeftIcon, PaperclipIcon, FileIcon, XIcon } from 'lucide-react'
import { USERS, getRoomsForUser, getAIRoom, DemoMessage } from '@/lib/demo'
import { formatMessageTime } from '@/lib/utils'

export default function ChatRoomPage({ params }: { params: Promise<{ userId: string; roomId: string }> }) {
  const { userId, roomId } = use(params)
  const router = useRouter()
  const me = USERS[userId]
  const rooms = getRoomsForUser(userId)
  const room = rooms.find(r => r.id === roomId)
  const isAIRoom = roomId === getAIRoom(userId)

  const [messages, setMessages] = useState<DemoMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiTyping, setAiTyping] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiQuery, setAiQuery] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const aiInputRef = useRef<HTMLTextAreaElement>(null)
  const fetchingRef = useRef(false)

  useEffect(() => {
    if (!me || !room) { router.push(`/demo/${userId}`); return }
    fetchMessages()
    const interval = setInterval(fetchMessages, 2000)
    return () => clearInterval(interval)
  }, [roomId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, aiTyping])

  async function fetchMessages() {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const res = await fetch(`/api/demo/messages?room=${encodeURIComponent(roomId)}`)
      if (!res.ok) return
      const { messages: msgs } = await res.json()
      setMessages(msgs ?? [])
    } catch {
      // retry on next poll
    } finally {
      fetchingRef.current = false
    }
  }

  async function send() {
    if (!input.trim() || loading) return
    const content = input.trim()
    setInput('')
    setLoading(true)
    try {
      if (isAIRoom) {
        await fetch('/api/demo/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, content, room_id: roomId }),
        })
        await fetchMessages()
        setLoading(false)
        setAiTyping(true)
        await fetch('/api/demo/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, query: content }),
        })
        await fetchMessages()
      } else {
        await fetch('/api/demo/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, content, room_id: roomId }),
        })
        await fetchMessages()
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
      setAiTyping(false)
    }
  }

  async function askAI() {
    if (!aiQuery.trim()) return
    const query = aiQuery.trim()
    setAiQuery('')
    setShowAIPanel(false)
    setAiTyping(true)
    try {
      await fetch('/api/demo/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, content: `@do ${query}`, room_id: roomId }),
      })
      await fetchMessages()
      await fetch('/api/demo/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, query, room_id: roomId }),
      })
      await fetchMessages()
    } catch {
      // ignore
    } finally {
      setAiTyping(false)
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_id', userId)
    formData.append('room_id', roomId)
    await fetch('/api/demo/upload', { method: 'POST', body: formData })
    await fetchMessages()
    setUploading(false)
    e.target.value = ''
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function renderContent(msg: DemoMessage) {
    if (msg.type === 'image') {
      return (
        <a href={msg.content} target="_blank" rel="noopener noreferrer">
          <img src={msg.content} alt="imagen" className="max-w-[240px] rounded-2xl hover:opacity-90 transition-opacity" style={{ maxHeight: 260 }} />
        </a>
      )
    }
    if (msg.type === 'file') {
      try {
        const { url, name, size } = JSON.parse(msg.content)
        return (
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 hover:bg-gray-50 transition-colors max-w-[240px]">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <FileIcon className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
              <p className="text-xs text-gray-400">{Math.round(size / 1024)} KB</p>
            </div>
          </a>
        )
      } catch {
        return <span className="text-sm text-gray-600">📎 archivo adjunto</span>
      }
    }
    return <span className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</span>
  }

  if (!me || !room) return null

  const isMedia = (type: string) => type === 'image' || type === 'file'

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push(`/demo/${userId}`)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 -ml-1">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>

        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
          isAIRoom ? 'bg-blue-600 text-white' : room.type === 'group' ? 'bg-gray-100' : room.otherUserId ? USERS[room.otherUserId].bg : 'bg-gray-200'
        }`}>
          {isAIRoom ? '✦' : room.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-gray-900">{isAIRoom ? 'do AI' : room.name}</h1>
          <p className="text-xs text-gray-400">
            {isAIRoom ? 'Asistente inteligente' : room.type === 'group' ? '4 participantes' : 'Chat privado'}
          </p>
        </div>

        {!isAIRoom && (
          <button
            onClick={() => { setShowAIPanel(true); setTimeout(() => aiInputRef.current?.focus(), 50) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shrink-0"
          >
            ✦ @do
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${isAIRoom ? 'bg-blue-100' : 'bg-gray-100'}`}>
              {isAIRoom ? '✦' : room.emoji}
            </div>
            <p className="text-gray-500 text-sm font-medium">{isAIRoom ? 'Cuéntame qué necesitas' : 'Sin mensajes aún'}</p>
            {isAIRoom && <p className="text-xs text-gray-400 max-w-[220px]">Puedo leer tus chats, resumirlos, extraer tareas y enviar mensajes</p>}
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.user_id === userId
          const isAI = msg.type === 'ai'
          const prevMsg = messages[i - 1]
          const showAvatar = !prevMsg || prevMsg.user_id !== msg.user_id || prevMsg.type !== msg.type
          const sender = USERS[msg.user_id]

          if (isAI) {
            return (
              <div key={msg.id} className="flex items-start gap-2.5 py-1 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5 text-white text-sm">
                  ✦
                </div>
                <div className="space-y-1">
                  {showAvatar && <p className="text-xs text-gray-400 px-1">do AI · {formatMessageTime(msg.created_at)}</p>}
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div key={msg.id} className={`flex items-end gap-2 py-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
              <div className="w-7 shrink-0">
                {showAvatar && (
                  <div className={`w-7 h-7 rounded-full ${sender?.bg ?? 'bg-gray-300'} flex items-center justify-center text-xs`}>
                    {sender?.emoji ?? '👤'}
                  </div>
                )}
              </div>
              <div className={`max-w-[72%] space-y-0.5 ${isOwn ? 'items-end flex flex-col' : ''}`}>
                {showAvatar && !isOwn && (
                  <p className={`text-xs font-medium px-1 ${sender?.text ?? 'text-gray-500'}`}>
                    {msg.user?.name} · {formatMessageTime(msg.created_at)}
                  </p>
                )}
                {showAvatar && isOwn && (
                  <p className="text-xs text-gray-400 px-1 text-right">{formatMessageTime(msg.created_at)}</p>
                )}
                {isMedia(msg.type) ? renderContent(msg) : (
                  <div className={`px-3.5 py-2.5 rounded-2xl ${
                    isOwn
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100 shadow-sm'
                  }`}>
                    {renderContent(msg)}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {aiTyping && (
          <div className="flex items-center gap-2.5 py-1">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm shrink-0">✦</div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* @do AI Panel */}
      {showAIPanel && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowAIPanel(false)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white">✦</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">do AI</p>
                <p className="text-xs text-gray-400">¿Qué necesitás de este chat?</p>
              </div>
              <button onClick={() => { setShowAIPanel(false); setAiQuery('') }} className="text-gray-400 hover:text-gray-600">
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {['Resumir este chat', 'Extraer tareas', 'Buscar acuerdos', 'Generar reporte'].map(s => (
                  <button
                    key={s}
                    onClick={() => setAiQuery(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors bg-gray-50"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 items-end bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-400 px-3.5 py-2.5 transition-colors">
                <TextareaAutosize
                  ref={aiInputRef}
                  value={aiQuery}
                  onChange={e => setAiQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAI() } }}
                  placeholder="Ej: resume los pendientes, extrae compromisos…"
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none min-h-[20px] max-h-28 py-0.5"
                  minRows={1}
                  maxRows={4}
                />
                <button
                  onClick={askAI}
                  disabled={!aiQuery.trim()}
                  className="h-8 w-8 shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl flex items-center justify-center transition-colors"
                >
                  <SendHorizonalIcon className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
            <div className="h-6" />
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 pb-6">
        {uploading && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-400">Subiendo…</span>
          </div>
        )}
        <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-400 px-3.5 py-2 transition-colors">
          {!isAIRoom && (
            <>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="h-8 w-8 mb-0.5 shrink-0 text-gray-400 hover:text-blue-500 disabled:opacity-40 flex items-center justify-center transition-colors">
                <PaperclipIcon className="h-4 w-4" />
              </button>
              <input ref={fileRef} type="file" accept="*/*" className="hidden" onChange={handleFile} />
            </>
          )}
          <TextareaAutosize
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={isAIRoom ? 'Preguntame algo…' : 'Escribe un mensaje…'}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none min-h-[20px] max-h-32 py-1"
            minRows={1}
            maxRows={4}
            autoFocus
          />
          <button onClick={send} disabled={!input.trim() || loading}
            className="h-8 w-8 mb-0.5 shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors">
            <SendHorizonalIcon className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
