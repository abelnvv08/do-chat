import { USERS, getRoomsForUser } from '@/lib/demo'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function ChatListPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const me = USERS[userId]
  if (!me) redirect('/demo')

  const rooms = getRoomsForUser(userId).filter(r => r.type !== 'ai')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-900">Chats</h1>
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 font-medium">
            {me.emoji} {me.name}
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar conversación..."
            readOnly
            className="w-full bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-500 placeholder:text-gray-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 bg-white divide-y divide-gray-50">
        {/* AI room pinned at top */}
        <Link
          href={`/demo/${userId}/ai-${userId}`}
          className="flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 transition-colors active:scale-[0.99]"
        >
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
            <span className="text-lg">✦</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-gray-900">do AI</p>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">IA</span>
            </div>
            <p className="text-xs text-gray-400 truncate mt-0.5">Resume chats, envía mensajes, extrae tareas…</p>
          </div>
        </Link>

        {rooms.map(room => {
          const other = room.otherUserId ? USERS[room.otherUserId] : null
          return (
            <Link
              key={room.id}
              href={`/demo/${userId}/${room.id}`}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors active:scale-[0.99]"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${
                room.type === 'group' ? 'bg-gray-100' : other ? `${other.bg}` : 'bg-gray-200'
              }`}>
                {room.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{room.name}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {room.type === 'group' ? 'Abel · Santi · Hernan · Walter' : `Chat privado con ${room.name}`}
                </p>
              </div>
              <span className="text-gray-300 text-lg shrink-0">›</span>
            </Link>
          )
        })}
      </div>

      {/* Bottom nav */}
      <BottomNav userId={userId} active="chats" />
    </div>
  )
}

function BottomNav({ userId, active }: { userId: string; active: string }) {
  const tabs = [
    { id: 'chats',    label: 'Chats',      href: `/demo/${userId}`, icon: ChatIcon },
    { id: 'ai',       label: 'do IA',      href: `/demo/${userId}/ai-${userId}`, icon: AIIcon },
    { id: 'tasks',    label: 'Pendientes', href: `/demo/${userId}/pendientes`, icon: TaskIcon },
    { id: 'projects', label: 'Proyectos',  href: `/demo/${userId}/proyectos`, icon: ProjectIcon },
    { id: 'docs',     label: 'Docs',       href: `/demo/${userId}/documentos`, icon: DocIcon },
  ]
  return (
    <div className="bg-white border-t border-gray-100 flex sticky bottom-0 z-10">
      {tabs.map(t => {
        const Icon = t.icon
        const isActive = active === t.id
        return (
          <Link key={t.id} href={t.href} className="flex-1 flex flex-col items-center py-2.5 gap-0.5">
            <Icon active={isActive} />
            <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>{t.label}</span>
          </Link>
        )
      })}
    </div>
  )
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  )
}

function AIIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  )
}

function TaskIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function ProjectIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  )
}

function DocIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}
