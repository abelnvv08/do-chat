import Link from 'next/link'
import Image from 'next/image'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#080c14] text-white flex flex-col">
      {/* Nav */}
      <nav className="px-6 h-16 flex items-center">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Image src="/icon-192.png" alt="DO Chat" width={20} height={20} className="rounded-lg" />
          </div>
          <span className="text-base font-bold tracking-tight">DO Chat</span>
        </Link>
      </nav>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8">
          <svg className="w-9 h-9 text-white/40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
          </svg>
        </div>
        <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-4">Planes</p>
        <h1 className="text-4xl font-extrabold mb-4">Próximamente</h1>
        <p className="text-white/40 text-base max-w-sm">
          Estamos trabajando en los planes. Por ahora disfruta DO Chat sin límites.
        </p>
        <Link href="javascript:history.back()"
          className="mt-10 px-6 py-3 rounded-xl bg-white/8 border border-white/10 text-sm font-medium text-white/70 hover:bg-white/12 transition-colors">
          Volver
        </Link>
      </div>

      <div className="py-8 text-center">
        <p className="text-white/20 text-xs">© 2025 DO Chat</p>
      </div>
    </div>
  )
}
