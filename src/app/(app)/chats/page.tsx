export default function ChatsIndexPage() {
  return (
    <div className="flex-1 flex items-center justify-center text-center p-8">
      <div className="space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-2">
          <span className="text-3xl">💬</span>
        </div>
        <h2 className="text-xl font-semibold text-zinc-100">Selecciona un chat</h2>
        <p className="text-sm text-zinc-400 max-w-xs">
          Elige una conversación o crea una nueva para empezar.
        </p>
        <p className="text-xs text-zinc-500 mt-4">
          Tip: escribe{' '}
          <span className="text-violet-400 font-mono">@do</span>{' '}
          en cualquier chat para activar la IA
        </p>
      </div>
    </div>
  )
}
