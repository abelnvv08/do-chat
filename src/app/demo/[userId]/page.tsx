import { USERS, getRoomsForUser } from '@/lib/demo'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function ChatListPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const me = USERS[userId]
  if (!me) redirect('/demo')

  const rooms = getRoomsForUser(userId)

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800 bg-zinc-900">
        <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
          <span className="text-sm font-bold text-white">d</span>
        </div>
        <div className="flex-1">
          <h1 className="text-sm font-semibold text-zinc-100">do-chat</h1>
          <p className="text-xs text-zinc-500">demo</p>
        </div>
        <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${me.border} ${me.text}`}>
          {me.emoji} {me.name}
        </div>
      </div>

      <div className="flex-1 p-3 space-y-1">
        {rooms.map(room => (
          <Link
            key={room.id}
            href={`/demo/${userId}/${room.id}`}
            className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-800 transition-colors active:scale-[0.98]"
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0 ${
              room.type === 'ai' ? 'bg-violet-600' : room.type === 'group' ? 'bg-zinc-700' : room.otherUserId ? USERS[room.otherUserId].bg : 'bg-zinc-700'
            }`}>
              {room.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-100">{room.name}</p>
              <p className="text-xs text-zinc-500 truncate">
                {room.type === 'ai' && 'Revisa chats, envía mensajes, extrae tareas…'}
                {room.type === 'group' && '001 · 002 · 003'}
                {room.type === 'dm' && `Chat privado con ${room.name}`}
              </p>
            </div>
            <span className="text-zinc-600 text-sm">›</span>
          </Link>
        ))}
      </div>

      <div className="p-4">
        <Link href="/demo" className="block text-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          Cambiar usuario
        </Link>
      </div>
    </div>
  )
}
