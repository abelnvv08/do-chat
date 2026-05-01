import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChatWindow } from '@/components/chat/chat-window'

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('conversation_members')
    .select('*')
    .eq('conversation_id', id)
    .eq('user_id', user.id)
    .single()

  if (!member) notFound()

  const { data: conversation } = await supabase
    .from('conversations')
    .select(`*, members:conversation_members(*, profile:profiles(*))`)
    .eq('id', id)
    .single()

  if (!conversation) notFound()

  const { data: messages } = await supabase
    .from('messages')
    .select(`*, profile:profiles(*)`)
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })
    .limit(50)

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <ChatWindow
      conversation={conversation}
      initialMessages={messages ?? []}
      currentUser={profile}
    />
  )
}
