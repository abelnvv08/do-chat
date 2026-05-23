'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace(`/chat/${user.id}`)
      } else {
        router.replace('/landing')
      }
    })
  }, [router])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#080c14]">
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/dochatlogo.png"
          alt="DO Chat"
          width={80}
          height={80}
          className="rounded-2xl animate-pulse"
          priority
        />
      </div>
    </div>
  )
}
