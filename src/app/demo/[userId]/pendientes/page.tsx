import Link from 'next/link'
import { USERS } from '@/lib/demo'
import { redirect } from 'next/navigation'

export default async function PendientesPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const me = USERS[userId]
  if (!me) redirect('/demo')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-900">Mis pendientes</h1>
        <p className="text-sm text-gray-400 mt-0.5">Tareas extraídas de tus chats por do AI</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8 py-20">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-2xl">✓</div>
        <p className="text-gray-600 font-medium">Sin pendientes por ahora</p>
        <p className="text-sm text-gray-400">Pedile a @do que extraiga tareas de tus conversaciones</p>
        <Link
          href={`/demo/${userId}/ai-${userId}`}
          className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          Abrir do AI
        </Link>
      </div>

      <BottomNav userId={userId} active="tasks" />
    </div>
  )
}

function BottomNav({ userId, active }: { userId: string; active: string }) {
  const tabs = [
    { id: 'chats', label: 'Chats', href: `/demo/${userId}` },
    { id: 'ai',    label: 'do IA', href: `/demo/${userId}/ai-${userId}` },
    { id: 'tasks', label: 'Pendientes', href: `/demo/${userId}/pendientes` },
    { id: 'docs',  label: 'Docs', href: `/demo/${userId}/documentos` },
  ]
  return (
    <div className="bg-white border-t border-gray-100 flex sticky bottom-0 z-10">
      {tabs.map(t => (
        <Link key={t.id} href={t.href} className={`flex-1 flex flex-col items-center py-3 text-[11px] font-medium transition-colors ${active === t.id ? 'text-blue-600' : 'text-gray-400'}`}>
          {t.label}
        </Link>
      ))}
    </div>
  )
}
