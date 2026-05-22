import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

interface Props {
  params: Promise<{ handle: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  const clean = handle.replace(/^@/, '').toLowerCase()
  const { data } = await admin().from('demo_profiles').select('name').eq('username', clean).single()
  const name = data?.name ?? 'Alguien'
  return {
    title: `${name} te invita a DO Chat`,
    description: 'Chat empresarial con IA integrada. Mensajes, llamadas, tareas y más — todo en uno.',
  }
}

export default async function InvitePage({ params }: Props) {
  const { handle } = await params
  const clean = handle.replace(/^@/, '').toLowerCase()
  const { data: inviter } = await admin()
    .from('demo_profiles')
    .select('name, avatar_url, emoji, bg')
    .eq('username', clean)
    .single()

  const name = inviter?.name ?? null

  return (
    <div className="min-h-screen bg-[#080c14] text-white flex flex-col items-center justify-center px-6">

      {/* Card */}
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
            <Image src="/icon-192.png" alt="DO Chat" width={36} height={36} className="rounded-xl" />
          </div>
        </div>

        {/* Inviter info */}
        <div className="text-center mb-8">
          {inviter?.avatar_url ? (
            <img src={inviter.avatar_url} alt={name ?? ''} className="w-16 h-16 rounded-full object-cover mx-auto mb-4 ring-2 ring-white/10" />
          ) : name ? (
            <div className={`w-16 h-16 rounded-full ${inviter?.bg ?? 'bg-blue-600'} flex items-center justify-center text-2xl mx-auto mb-4`}>
              {inviter?.emoji ?? '👤'}
            </div>
          ) : null}

          {name ? (
            <>
              <h1 className="text-2xl font-bold mb-2">{name}</h1>
              <p className="text-white/50 text-base">te invita a unirte a DO Chat</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2">Únete a DO Chat</h1>
              <p className="text-white/50 text-base">El chat donde la IA trabaja por ti</p>
            </>
          )}
        </div>

        {/* Features */}
        <div className="space-y-3 mb-8">
          {[
            { icon: '💬', text: 'Mensajes cifrados de extremo a extremo' },
            { icon: '✦', text: '@do AI que resume, redacta y actúa por ti' },
            { icon: '✓', text: 'Tareas, recordatorios y llamadas incluidas' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3">
              <span className="text-lg shrink-0">{icon}</span>
              <span className="text-sm text-white/70">{text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href={`/login?ref=${clean}`}
          className="block w-full py-4 rounded-2xl bg-blue-600 text-white text-center text-base font-bold shadow-xl shadow-blue-500/25 active:scale-[0.98] transition-all hover:bg-blue-500">
          Unirme gratis
        </Link>

        <p className="text-center text-xs text-white/20 mt-4">
          Sin tarjeta de crédito · Gratis para siempre
        </p>
      </div>
    </div>
  )
}
