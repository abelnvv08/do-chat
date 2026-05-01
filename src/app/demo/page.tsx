import Link from 'next/link'

const USERS = [
  { id: '001', name: 'Abel',   emoji: '🟣' },
  { id: '002', name: 'Santi',  emoji: '🟢' },
  { id: '003', name: 'Hernan', emoji: '🟡' },
  { id: '004', name: 'Walter', emoji: '🔵' },
]

export default function DemoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-950">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600 mb-3">
            <span className="text-2xl font-bold text-white">d</span>
          </div>
          <h1 className="text-xl font-bold text-zinc-100">do-chat · demo</h1>
          <p className="text-sm text-zinc-400 mt-1">¿Quién eres tú?</p>
        </div>

        <div className="space-y-3">
          {USERS.map(user => (
            <Link
              key={user.id}
              href={`/demo/${user.id}`}
              className="flex items-center gap-4 p-4 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-violet-500/40 transition-all active:scale-95"
            >
              <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl shrink-0">
                {user.emoji}
              </div>
              <div className="text-left">
                <p className="font-semibold text-zinc-100">{user.name}</p>
              </div>
              <span className="ml-auto text-zinc-500 text-lg">→</span>
            </Link>
          ))}
        </div>

        <p className="text-xs text-zinc-600">
          Cada persona elige un número diferente · los mensajes se ven en tiempo real
        </p>
      </div>
    </div>
  )
}
