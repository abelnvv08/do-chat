'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Conversation, Message, Profile } from '@/types'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'
import { ChatHeader } from './chat-header'
import { Spinner } from '@/components/ui/spinner'

interface ChatWindowProps {
  conversation: Conversation
  initialMessages: Message[]
  currentUser: Profile
}

export function ChatWindow({ conversation, initialMessages, currentUser }: ChatWindowProps) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isAITyping, setIsAITyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages(initialMessages)
  }, [conversation.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAITyping])

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        async (payload) => {
          const msg = payload.new as Message
          // Enrich with profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', msg.sender_id)
            .single()

          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev
            return [...prev, { ...msg, profile: profile ?? undefined }]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversation.id])

  async function sendMessage(content: string) {
    if (!content.trim()) return

    const isAI = content.trim().toLowerCase().startsWith('@do')

    // Insert user message
    const { data: newMsg } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: currentUser.id,
        content,
        type: 'text',
      })
      .select(`*, profile:profiles(*)`)
      .single()

    if (newMsg) {
      setMessages((prev) => {
        if (prev.find((m) => m.id === newMsg.id)) return prev
        return [...prev, newMsg]
      })
    }

    // Trigger AI if @do
    if (isAI) {
      setIsAITyping(true)
      try {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: conversation.id,
            message: content,
            conversationName: conversation.name || 'Chat',
          }),
        })

        const { reply } = await response.json()
        setIsAITyping(false)

        if (reply) {
          await supabase.from('messages').insert({
            conversation_id: conversation.id,
            sender_id: null,
            content: reply,
            type: 'ai',
          })
        }
      } catch {
        setIsAITyping(false)
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader conversation={conversation} currentUserId={currentUser.id} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <p className="text-zinc-400 text-sm">No hay mensajes aún</p>
              <p className="text-zinc-500 text-xs">
                Sé el primero en escribir, o escribe{' '}
                <span className="text-violet-400 font-mono">@do</span> para activar la IA
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const prevMsg = messages[i - 1]
          const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id
          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === currentUser.id}
              showAvatar={showAvatar}
            />
          )
        })}

        {isAITyping && (
          <div className="flex items-center gap-3 py-2">
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">AI</span>
            </div>
            <div className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={sendMessage} />
    </div>
  )
}
