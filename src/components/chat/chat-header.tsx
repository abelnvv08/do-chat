'use client'

import { Conversation } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { UsersIcon, InfoIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatHeaderProps {
  conversation: Conversation
  currentUserId: string
}

export function ChatHeader({ conversation, currentUserId }: ChatHeaderProps) {
  const otherMember = conversation.members?.find((m) => m.user_id !== currentUserId)
  const isDirect = conversation.type === 'direct'

  const name = conversation.name || otherMember?.profile?.full_name || otherMember?.profile?.username || 'Chat'
  const avatarUrl = isDirect ? otherMember?.profile?.avatar_url : null
  const memberCount = conversation.members?.length ?? 0

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950 shrink-0">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          {avatarUrl && <AvatarImage src={avatarUrl} />}
          <AvatarFallback className={!isDirect ? 'bg-emerald-900 text-emerald-300' : ''}>
            {isDirect ? getInitials(name) : <UsersIcon className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">{name}</h2>
          <p className="text-xs text-zinc-500">
            {isDirect
              ? `@${otherMember?.profile?.username || 'usuario'}`
              : `${memberCount} miembro${memberCount !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <Button variant="ghost" size="icon" className="h-8 w-8">
        <InfoIcon className="h-4 w-4" />
      </Button>
    </div>
  )
}
