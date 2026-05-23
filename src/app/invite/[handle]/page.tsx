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
  const name = data?.name ?? 'Someone'
  const title = `${name} invited you to DO Chat`
  const description = 'Join DO Chat — business messaging with built-in AI.'
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: '/api/og', width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/api/og'] },
  }
}

export default async function InvitePage({ params }: Props) {
  const { handle } = await params
  const clean = handle.replace(/^@/, '').toLowerCase()
  const { data: inviter } = await admin()
    .from('demo_profiles')
    .select('name')
    .eq('username', clean)
    .single()

  const name = inviter?.name ?? 'Someone'

  return (
    <div className="min-h-screen bg-[#080c14] text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Image
            src="/dochatlogo.png"
            alt="DO Chat"
            width={80}
            height={80}
            className="rounded-2xl shadow-xl shadow-blue-500/30"
          />
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-3">
            {name} invited you to DO Chat
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            The business messenger where AI works inside every conversation.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-8">
          {[
            { icon: '💬', text: 'End-to-end encrypted messages & calls' },
            { icon: '✦', text: 'DO AI that summarizes, drafts and acts for you' },
            { icon: '✓', text: 'Tasks, reminders and file sharing included' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3">
              <span className="text-lg shrink-0">{icon}</span>
              <span className="text-sm text-white/70">{text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href={`/login?start=phone&ref=${clean}`}
          className="block w-full py-4 rounded-2xl bg-blue-600 text-white text-center text-base font-bold shadow-xl shadow-blue-500/25 active:scale-[0.98] transition-all hover:bg-blue-500">
          Crear cuenta gratis
        </Link>

        <Link
          href="/login"
          className="block w-full py-3 rounded-2xl text-center text-sm font-medium text-white/40 hover:text-white/60 transition-colors mt-2">
          Ya tengo cuenta → Iniciar sesión
        </Link>

        <p className="text-center text-xs text-white/20 mt-4">
          Sin tarjeta de crédito · Gratis para siempre
        </p>

      </div>
    </div>
  )
}
