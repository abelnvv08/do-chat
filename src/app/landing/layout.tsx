import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DO Chat — Professional messaging with AI that acts',
  description: 'Team chats, task management, and a smart assistant that takes real actions — all in one platform. Encrypted messages. No install required.',
  keywords: ['AI chat', 'team messaging', 'encrypted chat', 'AI assistant', 'task management', 'DO Chat'],
  authors: [{ name: 'DO Chat' }],
  metadataBase: new URL('https://getdochat.com'),
  openGraph: {
    title: 'DO Chat — Professional messaging with AI that acts',
    description: 'Team chats, task management, and a smart assistant that takes real actions — all in one platform.',
    url: 'https://getdochat.com',
    siteName: 'DO Chat',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'DO Chat — Professional messaging with AI that acts',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DO Chat — Professional messaging with AI that acts',
    description: 'Team chats, task management, and a smart assistant that takes real actions.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
