'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { SendHorizonalIcon, BotIcon, UserIcon } from 'lucide-react'
import { formatMessageTime } from '@/lib/utils'

type Message = {
  id: string
  role: 'user' | 'ai'
  content: string
  time: string
}

type HistoryItem = {
  role: 'user' | 'assistant'
  content: string
}

export default function TestPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'ai',
      content: 'Hola, soy do — tu IA accionable. Cuéntame algo o pídeme que haga algo. Puedo resumir, extraer tareas, buscar info, generar reportes o responder cualquier consulta.',
      time: new Date().toISOString(),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    if (!input.trim() || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      time: new Date().toISOString(),
    }

    const history: HistoryItem[] = messages
      .filter(m => m.id !== '0')
      .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }))

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const res = await fetch('/api/ai-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg.content, history }),
    })
    const { reply } = await res.json()
    setLoading(false)

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'ai',
      content: reply,
      time: new Date().toISOString(),
    }])
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
          <span className="text-sm font-bold text-white">d</span>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-zinc-100">do-chat</h1>
          <p className="text-xs text-zinc-500">IA accionable · modo prueba</p>
        </div>
        <span className="ml-auto text-xs bg-violet-600/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full">
          beta
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              msg.role === 'ai' ? 'bg-violet-600' : 'bg-zinc-700'
            }`}>
              {msg.role === 'ai'
                ? <BotIcon className="h-4 w-4 text-white" />
                : <UserIcon className="h-4 w-4 text-zinc-300" />
              }
            </div>

            {/* Bubble */}
            <div className={`max-w-xs sm:max-w-lg space-y-1 ${msg.role === 'user' ? 'items-end' : ''}`}>
              <div className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'ai'
                  ? 'bg-violet-950/40 border border-violet-500/20 text-zinc-100 rounded-tl-sm'
                  : 'bg-violet-600 text-white rounded-tr-sm'
              }`}>
                {msg.content}
              </div>
              <p className={`text-xs text-zinc-600 px-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                {msg.role === 'ai' ? 'do AI · ' : ''}{formatMessageTime(msg.time)}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
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

      {/* Input */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950 shrink-0">
        <div className="flex items-end gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 focus-within:border-violet-500/50 transition-colors">
          <TextareaAutosize
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Escríbeme algo… o pídeme que haga algo"
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 resize-none focus:outline-none min-h-[20px] max-h-48 py-1"
            minRows={1}
            maxRows={6}
            autoFocus
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="h-8 w-8 mb-0.5 shrink-0 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
          >
            <SendHorizonalIcon className="h-4 w-4 text-white" />
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-1.5 px-1">Enter para enviar · Shift+Enter nueva línea</p>
      </div>
    </div>
  )
}
