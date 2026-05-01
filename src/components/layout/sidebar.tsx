'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Profile, Conversation } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { getInitials, formatRelativeTime, cn } from '@/lib/utils'
import { PlusIcon, MessageSquareIcon, LogOutIcon, UsersIcon } from 'lucide-react'
import { NewConversationModal } from '@/components/chat/new-conversation-modal'

interface SidebarProps {
  profile: Profile
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ profile, isOpen }: SidebarProps) {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)

  useEffect(() => {
    loadConversations()

    const channel = supabase
      .channel('conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        loadConversations()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        loadConversations()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadConversations() {
    const { data } = await supabase
      .from('conversation_members')
      .select(`
        conversation:conversations(
          id, name, type, updated_at,
          members:conversation_members(user_id, profile:profiles(id, username, full_name, avatar_url))
        )
      `)
      .eq('user_id', profile.id)
      .order('joined_at', { ascending: false })

    if (data) {
      const convs = data
        .map((d) => d.conversation as unknown as Conversation)
        .filter(Boolean)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      setConversations(convs)
    }
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function getConversationName(conv: Conversation) {
    if (conv.name) return conv.name
    const other = conv.members?.find((m) => m.user_id !== profile.id)?.profile
    return other?.full_name || other?.username || 'Chat'
  }

  function getConversationAvatar(conv: Conversation) {
    if (conv.type === 'direct') {
      const other = conv.members?.find((m) => m.user_id !== profile.id)?.profile
      return other?.avatar_url || null
    }
    return null
  }

  return (
    <>
      <aside
        className={cn(
          'flex flex-col bg-zinc-900 border-r border-zinc-800 transition-all duration-300',
          isOpen ? 'w-72' : 'w-0 overflow-hidden'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <span className="text-sm font-bold text-white">d</span>
            </div>
            <span className="font-semibold text-zinc-100 text-sm">do-chat</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowNewModal(true)}
            title="Nuevo chat"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquareIcon className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">No hay conversaciones</p>
              <p className="text-xs text-zinc-600 mt-1">Crea una nueva para empezar</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const name = getConversationName(conv)
              const avatarUrl = getConversationAvatar(conv)
              const isActive = pathname === `/chats/${conv.id}`

              return (
                <Link
                  key={conv.id}
                  href={`/chats/${conv.id}`}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
                    isActive
                      ? 'bg-violet-600/20 border border-violet-500/30'
                      : 'hover:bg-zinc-800'
                  )}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    {avatarUrl && <AvatarImage src={avatarUrl} />}
                    <AvatarFallback className={conv.type === 'group' ? 'bg-emerald-900 text-emerald-300' : ''}>
                      {conv.type === 'group'
                        ? <UsersIcon className="h-4 w-4" />
                        : getInitials(name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">{name}</p>
                    <p className="text-xs text-zinc-500 truncate">
                      {formatRelativeTime(conv.updated_at)}
                    </p>
                  </div>
                </Link>
              )
            })
          )}
        </div>

        {/* User profile footer */}
        <div className="p-3 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="text-xs">
                {getInitials(profile.full_name || profile.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-100 truncate">
                {profile.full_name || profile.username}
              </p>
              <p className="text-xs text-zinc-500 truncate">@{profile.username}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleLogout}
              title="Cerrar sesión"
            >
              <LogOutIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      <NewConversationModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        currentUserId={profile.id}
        onCreated={(id) => {
          setShowNewModal(false)
          router.push(`/chats/${id}`)
        }}
      />
    </>
  )
}
