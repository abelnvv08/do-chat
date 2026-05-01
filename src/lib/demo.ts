export const USERS: Record<string, { name: string; emoji: string; bg: string; text: string; border: string }> = {
  '001': { name: 'Usuario 001', emoji: '🟣', bg: 'bg-violet-600',  text: 'text-violet-400',  border: 'border-violet-500/40'  },
  '002': { name: 'Usuario 002', emoji: '🟢', bg: 'bg-emerald-600', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  '003': { name: 'Usuario 003', emoji: '🟡', bg: 'bg-amber-500',   text: 'text-amber-400',   border: 'border-amber-500/40'   },
}

export function getDMRoom(a: string, b: string) {
  return `dm-${[a, b].sort().join('-')}`
}

export function getAIRoom(userId: string) {
  return `ai-${userId}`
}

export type Room = {
  id: string
  name: string
  emoji: string
  type: 'group' | 'dm' | 'ai'
  otherUserId?: string
}

export function getRoomsForUser(userId: string): Room[] {
  const others = Object.keys(USERS).filter(id => id !== userId)
  return [
    { id: 'group', name: 'Grupo general', emoji: '👥', type: 'group' },
    { id: getAIRoom(userId), name: 'do AI', emoji: '🤖', type: 'ai' },
    ...others.map(otherId => ({
      id: getDMRoom(userId, otherId),
      name: USERS[otherId].name,
      emoji: USERS[otherId].emoji,
      type: 'dm' as const,
      otherUserId: otherId,
    })),
  ]
}

export type DemoMessage = {
  id: string
  user_id: string
  content: string
  type: string
  room_id: string
  created_at: string
  user: { name: string; emoji: string } | null
}
