import Link from 'next/link'

const USERS = [
  { id: '001', name: 'Abel',   emoji: '🟣', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { id: '002', name: 'Santi',  emoji: '🟢', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: '003', name: 'Hernan', emoji: '🟡', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: '004', name: 'Walter', emoji: '🔵', color: 'bg-blue-100 text-blue-700 border-blue-200' },
]

export default function DemoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <div className="flex justify-center mb-5">
            <img src="/dologo.png" alt="DO Chat" className="h-12 w-auto" />
          </div>
          <p className="text-sm text-gray-500">¿Quién eres hoy?</p>
        </div>

        <div className="space-y-2.5">
          {USERS.map(user => (
            <Link
              key={user.id}
              href={`/demo/${user.id}`}
              className="flex items-center gap-4 p-4 rounded-2xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all active:scale-95"
            >
              <div className={`w-11 h-11 rounded-full border flex items-center justify-center text-xl shrink-0 ${user.color}`}>
                {user.emoji}
              </div>
              <p className="font-semibold text-gray-800">{user.name}</p>
              <span className="ml-auto text-gray-400 text-lg">›</span>
            </Link>
          ))}
        </div>

        <p className="text-xs text-gray-400">Cada persona elige un nombre distinto · mensajes en tiempo real</p>
      </div>
    </div>
  )
}
