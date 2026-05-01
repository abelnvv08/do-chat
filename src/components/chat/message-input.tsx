'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { SendHorizonalIcon, BotIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  onSend: (content: string) => void
}

export function MessageInput({ onSend }: MessageInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isAIMode = value.trim().toLowerCase().startsWith('@do')

  function handleSend() {
    if (!value.trim()) return
    onSend(value.trim())
    setValue('')
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="p-4 border-t border-zinc-800 bg-zinc-950">
      {isAIMode && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <BotIcon className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-xs text-violet-400 font-medium">Modo IA activo — do procesará tu mensaje</span>
        </div>
      )}

      <div
        className={cn(
          'flex items-end gap-2 rounded-xl border bg-zinc-900 px-3 py-2 transition-colors',
          isAIMode
            ? 'border-violet-500/50 bg-violet-950/20'
            : 'border-zinc-700 focus-within:border-zinc-600'
        )}
      >
        <TextareaAutosize
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje… o @do para hablar con la IA"
          className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 resize-none focus:outline-none min-h-[20px] max-h-48 py-1"
          minRows={1}
          maxRows={8}
        />
        <Button
          size="icon"
          className="h-8 w-8 shrink-0 mb-0.5"
          onClick={handleSend}
          disabled={!value.trim()}
        >
          <SendHorizonalIcon className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-xs text-zinc-600 mt-1.5 px-1">
        Enter para enviar · Shift+Enter para nueva línea
      </p>
    </div>
  )
}
