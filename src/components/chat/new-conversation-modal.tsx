'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { Profile } from '@/types'
import { SearchIcon, UsersIcon, MessageSquareIcon } from 'lucide-react'

interface NewConversationModalProps {
  open: boolean
  onClose: () => void
  currentUserId: string
  onCreated: (conversationId: string) => void
}

export function NewConversationModal({ open, onClose, currentUserId, onCreated }: NewConversationModalProps) {
  const supabase = createClient()
  const [tab, setTab] = useState<'direct' | 'group'>('direct')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [selected, setSelected] = useState<Profile[]>([])
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  async function searchUsers(query: string) {
    setSearch(query)
    if (!query.trim()) { setResults([]); return }
    setSearching(true)

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId)
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(10)

    setResults(data || [])
    setSearching(false)
  }

  function toggleUser(user: Profile) {
    if (tab === 'direct') {
      setSelected([user])
    } else {
      setSelected((prev) =>
        prev.find((u) => u.id === user.id)
          ? prev.filter((u) => u.id !== user.id)
          : [...prev, user]
      )
    }
  }

  async function createConversation() {
    if (selected.length === 0) return
    setLoading(true)

    const { data: conv } = await supabase
      .from('conversations')
      .insert({
        type: tab,
        name: tab === 'group' ? groupName || 'Grupo' : null,
        created_by: currentUserId,
      })
      .select()
      .single()

    if (!conv) { setLoading(false); return }

    const members = [
      { conversation_id: conv.id, user_id: currentUserId, role: 'admin' },
      ...selected.map((u) => ({ conversation_id: conv.id, user_id: u.id, role: 'member' })),
    ]

    await supabase.from('conversation_members').insert(members)
    await supabase.from('messages').insert({
      conversation_id: conv.id,
      sender_id: null,
      content: tab === 'group' ? 'Grupo creado' : 'Conversación iniciada',
      type: 'system',
    })

    onCreated(conv.id)
    reset()
  }

  function reset() {
    setSearch(''); setResults([]); setSelected([]); setGroupName(''); setLoading(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="font-semibold text-zinc-100">Nueva conversación</h2>

          {/* Tabs */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { setTab('direct'); setSelected([]) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === 'direct' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MessageSquareIcon className="h-3.5 w-3.5" />
              Directo
            </button>
            <button
              onClick={() => { setTab('group'); setSelected([]) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === 'group' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <UsersIcon className="h-3.5 w-3.5" />
              Grupo
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {tab === 'group' && (
            <Input
              placeholder="Nombre del grupo"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          )}

          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Buscar por nombre o @username"
              value={search}
              onChange={(e) => searchUsers(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Selected */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map((u) => (
                <span
                  key={u.id}
                  onClick={() => toggleUser(u)}
                  className="flex items-center gap-1.5 bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs px-2.5 py-1 rounded-full cursor-pointer hover:bg-red-900/20 hover:border-red-500/30 hover:text-red-300 transition-colors"
                >
                  {u.full_name || u.username}
                  <span>×</span>
                </span>
              ))}
            </div>
          )}

          {/* Results */}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {searching && <div className="flex justify-center py-4"><Spinner /></div>}
            {!searching && results.map((user) => {
              const isSelected = selected.find((u) => u.id === user.id)
              return (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                    isSelected ? 'bg-violet-600/20 border border-violet-500/30' : 'hover:bg-zinc-800'
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(user.full_name || user.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{user.full_name || user.username}</p>
                    <p className="text-xs text-zinc-500">@{user.username}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => { onClose(); reset() }}>Cancelar</Button>
          <Button onClick={createConversation} disabled={selected.length === 0 || loading}>
            {loading ? <Spinner className="h-4 w-4" /> : 'Crear'}
          </Button>
        </div>
      </div>
    </div>
  )
}
