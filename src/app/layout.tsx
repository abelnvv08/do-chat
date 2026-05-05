import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import DarkModeProvider from '@/components/DarkModeProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'do-chat',
  description: 'El chat donde la IA trabaja por ti',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 antialiased h-full`}>
        <DarkModeProvider />
        {children}
      </body>
    </html>
  )
}
