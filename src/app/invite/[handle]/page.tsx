import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'

interface Props {
  params: Promise<{ handle: string }>
}

export const metadata: Metadata = {
  title: "You've been invited to DO Chat",
  description: 'Business messaging with built-in AI. Messages, calls, tasks and more — all in one place.',
}

export default async function InvitePage({ params }: Props) {
  const { handle } = await params
  const clean = handle.replace(/^@/, '').toLowerCase()

  return (
    <div className="min-h-screen bg-[#080c14] text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Image src="/dochatlogo.png" alt="DO Chat" width={72} height={72} className="rounded-2xl shadow-xl shadow-blue-500/20" />
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-3">You're invited to DO Chat</h1>
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
          href={`/login?ref=${clean}`}
          className="block w-full py-4 rounded-2xl bg-blue-600 text-white text-center text-base font-bold shadow-xl shadow-blue-500/25 active:scale-[0.98] transition-all hover:bg-blue-500">
          Join for free
        </Link>

        <p className="text-center text-xs text-white/20 mt-4">
          No credit card required · Free forever
        </p>

      </div>
    </div>
  )
}
