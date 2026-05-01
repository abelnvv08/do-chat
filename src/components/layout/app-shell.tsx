'use client'

import { useState } from 'react'
import { Profile } from '@/types'
import { Sidebar } from './sidebar'

interface AppShellProps {
  profile: Profile
  children: React.ReactNode
}

export function AppShell({ profile, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-full bg-zinc-950">
      <Sidebar profile={profile} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
