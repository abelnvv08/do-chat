export type Profile = {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

export type Conversation = {
  id: string
  name: string | null
  type: 'direct' | 'group'
  created_at: string
  updated_at: string
  members?: ConversationMember[]
  last_message?: Message | null
}

export type ConversationMember = {
  conversation_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  profile?: Profile
}

export type Message = {
  id: string
  conversation_id: string
  sender_id: string | null
  content: string
  type: 'text' | 'file' | 'ai' | 'system'
  metadata: Record<string, unknown> | null
  created_at: string
  profile?: Profile
}

export type Task = {
  id: string
  conversation_id: string
  title: string
  description: string | null
  assigned_to: string | null
  created_by: string
  due_date: string | null
  status: 'pending' | 'in_progress' | 'done'
  created_at: string
  profile?: Profile
}

export type AIAction =
  | 'summarize'
  | 'extract_tasks'
  | 'search'
  | 'generate_report'
  | 'free'
