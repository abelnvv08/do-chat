'use client'

import { Message } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials, formatMessageTime, cn } from '@/lib/utils'
import { BotIcon } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showAvatar: boolean
}

export function MessageBubble({ message, isOwn, showAvatar }: MessageBubbleProps) {
  const { lang } = useLanguage()
  const isAI = message.type === 'ai'
  const isSystem = message.type === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-zinc-500 bg-zinc-800/50 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    )
  }

  if (isAI) {
    return (
      <div className="flex items-start gap-3 py-1 max-w-2xl">
        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0 mt-0.5">
          <BotIcon className="h-4 w-4 text-white" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-violet-400">do AI</span>
            <span className="text-xs text-zinc-500">{formatMessageTime(message.created_at, lang)}</span>
          </div>
          <div className="bg-violet-950/40 border border-violet-500/20 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed max-w-xl">
            {message.content}
          </div>
        </div>
      </div>
    )
  }

  const name = message.profile?.full_name || message.profile?.username || 'Usuario'

  return (
    <div className={cn('flex items-start gap-2.5 py-0.5', isOwn && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className="w-8 shrink-0">
        {showAvatar && (
          <Avatar className="h-8 w-8">
            {message.profile?.avatar_url && <AvatarImage src={message.profile.avatar_url} />}
            <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Bubble */}
      <div className={cn('max-w-xs sm:max-w-md space-y-1', isOwn && 'items-end')}>
        {showAvatar && !isOwn && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-semibold text-zinc-300">{name}</span>
            <span className="text-xs text-zinc-500">{formatMessageTime(message.created_at, lang)}</span>
          </div>
        )}
        <div
          className={cn(
            'px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed',
            isOwn
              ? 'bg-violet-600 text-white rounded-tr-sm'
              : 'bg-zinc-800 text-zinc-100 rounded-tl-sm'
          )}
        >
          {message.content}
        </div>
        {showAvatar && isOwn && (
          <div className="flex justify-end px-1">
            <span className="text-xs text-zinc-500">{formatMessageTime(message.created_at, lang)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
