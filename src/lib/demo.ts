// Dynamic cache — populated at runtime from Supabase
export const usersCache: Record<string, { name: string; emoji: string; bg: string; text: string; border: string; avatar_url?: string | null }> = {}

export function getUser(userId: string) {
  return usersCache[userId] ?? null
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
  otherAvatarUrl?: string | null
}

export type DemoMessage = {
  id: string
  user_id: string
  content: string
  type: string
  room_id: string
  created_at: string
  user: { name: string; emoji: string; avatar_url?: string | null } | null
  reactions: { emoji: string; user_ids: string[] }[]
  reply_to_id: string | null
  reply_preview: string | null
  reply_user_name: string | null
  edited?: boolean
}
