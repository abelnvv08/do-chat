'use client'

import { use, useEffect, useRef, useState, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import TextareaAutosize from 'react-textarea-autosize'
import { SendHorizonalIcon, BotIcon, ArrowLeftIcon, PaperclipIcon, FileIcon, SparklesIcon, XIcon } from 'lucide-react'
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
    const res = await fetch(`/api/demo/messages?room=${encodeURIComponent(roomId)}`)
    const { messages: msgs } = await res.json()
    setMessages(msgs)
  }

  async function send() {
    if (!input.trim() || loading) return
    const content = input.trim()
    setInput('')
    setLoading(true)

    if (isAIRoom) {
      // Guardar mensaje del usuario en el chat de IA
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
      setAiTyping(false)
    } else {
      await fetch('/api/demo/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, content, room_id: roomId }),
      })
      await fetchMessages()
      setLoading(false)
    }
  }

  async function askAI() {
    if (!aiQuery.trim()) return
    const query = aiQuery.trim()
    setAiQuery('')
    setShowAIPanel(false)
    setAiTyping(true)

    // Guardar pregunta del usuario en este chat
    await fetch('/api/demo/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, content: `@do ${query}`, room_id: roomId }),
    })
    await fetchMessages()

    // Llamar a la IA con contexto de este chat
    await fetch('/api/demo/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, query, room_id: roomId }),
    })
    await fetchMessages()
    setAiTyping(false)
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
          <img src={msg.content} alt="imagen" className="max-w-xs rounded-xl border border-zinc-700 hover:opacity-90 transition-opacity" style={{ maxHeight: 280 }} />
        </a>
      )
    }
    if (msg.type === 'file') {
      const { url, name, size } = JSON.parse(msg.content)
      return (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 bg-zinc-700/50 border border-zinc-600 rounded-xl px-4 py-3 hover:bg-zinc-700 transition-colors max-w-xs">
          <FileIcon className="h-5 w-5 text-violet-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-100 truncate">{name}</p>
            <p className="text-xs text-zinc-500">{Math.round(size / 1024)} KB</p>
          </div>
        </a>
      )
    }
    return <span className="whitespace-pre-wrap leading-relaxed">{msg.content}</span>
  }

  if (!me || !room) return null
  const isMedia = (type: string) => type === 'image' || type === 'file'

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-900">
        <button onClick={() => router.push(`/demo/${userId}`)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 ${
          isAIRoom ? 'bg-violet-600' : room.type === 'group' ? 'bg-zinc-700' : room.otherUserId ? USERS[room.otherUserId].bg : 'bg-zinc-700'
        }`}>
          {room.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-zinc-100">{room.name}</h1>
          <p className="text-xs text-zinc-500">
            {isAIRoom ? 'Acceso a todos tus chats · puede enviar mensajes' : room.type === 'group' ? '4 participantes' : 'Chat privado'}
          </p>
        </div>
        {!isAIRoom && (
          <button
            onClick={() => { setShowAIPanel(true); setTimeout(() => aiInputRef.current?.focus(), 50) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-400 hover:bg-violet-600/30 transition-colors text-xs font-medium shrink-0"
          >
            <SparklesIcon className="h-3.5 w-3.5" />
            @do
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 px-4 py-4 space-y-2 pb-36">
        {messages.length === 0 && (
          <div className="flex items-center justify-center py-20 text-center">
            <div className="space-y-2">
              <div className="text-3xl">{room.emoji}</div>
              <p className="text-zinc-400 text-sm">{isAIRoom ? 'Cuéntame qué necesitas' : 'Sin mensajes aún'}</p>
              {isAIRoom && (
                <p className="text-xs text-zinc-600 max-w-xs">
                  Puedo leer tus chats, resumirlos, extraer tareas y enviar mensajes por ti
                </p>
              )}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.user_id === userId
          const isAI = msg.type === 'ai'
          const prevMsg = messages[i - 1]
          const showName = !prevMsg || prevMsg.user_id !== msg.user_id || prevMsg.type !== msg.type
          const sender = USERS[msg.user_id]

          if (isAI) {
            return (
              <div key={msg.id} className="flex items-start gap-3 py-1">
                <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                  <BotIcon className="h-4 w-4 text-white" />
                </div>
                <div className="space-y-1 max-w-sm sm:max-w-lg">
                  {showName && <p className="text-xs font-semibold text-violet-400 px-1">do AI · {formatMessageTime(msg.created_at)}</p>}
                  <div className="bg-violet-950/40 border border-violet-500/20 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div key={msg.id} className={`flex items-start gap-2.5 py-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 shrink-0">
                {showName && (
                  <div className={`w-8 h-8 rounded-full ${sender?.bg ?? 'bg-zinc-700'} flex items-center justify-center text-sm`}>
                    {sender?.emoji ?? '👤'}
                  </div>
                )}
              </div>
              <div className={`max-w-xs sm:max-w-md space-y-0.5 ${isOwn ? 'items-end flex flex-col' : ''}`}>
                {showName && (
                  <p className={`text-xs font-medium px-1 ${isOwn ? 'text-right' : ''} ${sender?.text ?? 'text-zinc-400'}`}>
                    {isOwn ? 'Tú' : msg.user?.name} · {formatMessageTime(msg.created_at)}
                  </p>
                )}
                {isMedia(msg.type) ? renderContent(msg) : (
                  <div className={`px-3.5 py-2 rounded-2xl text-sm ${isOwn ? `${me.bg} text-white rounded-tr-sm` : 'bg-zinc-800 text-zinc-100 rounded-tl-sm'}`}>
                    {renderContent(msg)}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {aiTyping && (
          <div className="flex items-center gap-3 py-1">
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
              <BotIcon className="h-4 w-4 text-white" />
            </div>
            <div className="bg-violet-950/40 border border-violet-500/20 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Panel @do AI */}
      {showAIPanel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center">
                <BotIcon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-100">do AI</p>
                <p className="text-xs text-zinc-500">¿Qué quieres que haga en este chat?</p>
              </div>
              <button onClick={() => { setShowAIPanel(false); setAiQuery('') }} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {['Resumir este chat', 'Extraer tareas', 'Buscar acuerdos', 'Generar reporte'].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => setAiQuery(suggestion)}
                    className="text-xs px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-400 hover:border-violet-500/50 hover:text-violet-400 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 items-end bg-zinc-800 rounded-xl border border-zinc-700 focus-within:border-violet-500/50 px-3 py-2 transition-colors">
                <TextareaAutosize
                  ref={aiInputRef}
                  value={aiQuery}
                  onChange={e => setAiQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAI() } }}
                  placeholder="Ej: resume los pendientes, extrae los compromisos…"
                  className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 resize-none focus:outline-none min-h-[20px] max-h-28 py-1"
                  minRows={1}
                  maxRows={4}
                />
                <button
                  onClick={askAI}
                  disabled={!aiQuery.trim()}
                  className="h-8 w-8 mb-0.5 shrink-0 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
                >
                  <SendHorizonalIcon className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-zinc-800 bg-zinc-950">
        {uploading && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-zinc-400">Subiendo…</span>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-xl border border-zinc-700 focus-within:border-zinc-600 bg-zinc-900 px-3 py-2 transition-colors">
          {!isAIRoom && (
            <>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="h-8 w-8 mb-0.5 shrink-0 text-zinc-500 hover:text-zinc-300 disabled:opacity-40 flex items-center justify-center transition-colors">
                <PaperclipIcon className="h-4 w-4" />
              </button>
              <input ref={fileRef} type="file" accept="*/*" className="hidden" onChange={handleFile} />
            </>
          )}
          <TextareaAutosize
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={isAIRoom ? 'Pregúntame algo o pídeme una acción…' : 'Escribe un mensaje…'}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 resize-none focus:outline-none min-h-[20px] max-h-32 py-1"
            minRows={1}
            maxRows={4}
            autoFocus
          />
          <button onClick={send} disabled={!input.trim() || loading}
            className="h-8 w-8 mb-0.5 shrink-0 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors">
            <SendHorizonalIcon className="h-4 w-4 text-white" />
          </button>
        </div>
        {isAIRoom && (
          <p className="text-xs text-zinc-600 mt-1.5 px-1">
            Ejemplos: "resume mis chats" · "manda mensaje a todos" · "qué archivos me mandaron"
          </p>
        )}
      </div>
    </div>
  )
}
