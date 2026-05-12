import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import DarkModeProvider from '@/components/DarkModeProvider'
import Providers from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: 'DO Chat', template: '%s — DO Chat' },
  description: 'Professional messaging with AI that acts. Encrypted chats, task management, and smart assistants.',
  metadataBase: new URL('https://getdochat.com'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DO Chat',
  },
  openGraph: {
    siteName: 'DO Chat',
    images: [{ url: '/icon-512.png', width: 512, height: 512 }],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-visual',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </head>
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 antialiased h-full`}>
        <DarkModeProvider />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
