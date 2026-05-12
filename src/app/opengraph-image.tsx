import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'DO Chat — Professional messaging with AI that acts'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a6e 60%, #1d4ed8 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px 100px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Background circles decoration */}
        <div style={{
          position: 'absolute', right: -60, top: -60,
          width: 400, height: 400,
          borderRadius: '50%',
          background: 'rgba(59,130,246,0.15)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', right: 120, bottom: -80,
          width: 260, height: 260,
          borderRadius: '50%',
          background: 'rgba(99,102,241,0.12)',
          display: 'flex',
        }} />

        {/* Logo + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 48 }}>
          <div style={{
            width: 72, height: 72,
            borderRadius: 18,
            background: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40,
          }}>
            👤
          </div>
          <span style={{ fontSize: 32, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>
            DO Chat
          </span>
        </div>

        {/* Headline */}
        <div style={{ fontSize: 64, fontWeight: 800, color: '#ffffff', lineHeight: 1.1, marginBottom: 24, letterSpacing: '-1px' }}>
          Professional messaging<br />
          <span style={{ color: '#60a5fa' }}>with AI that acts</span>
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 26, color: '#94a3b8', lineHeight: 1.5, maxWidth: 700 }}>
          Encrypted chats · Task management · Smart AI assistant
        </div>

        {/* Bottom pill */}
        <div style={{
          position: 'absolute', bottom: 60, right: 100,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 100,
          padding: '12px 28px',
          color: '#cbd5e1',
          fontSize: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          🔒 End-to-end encrypted · getdochat.com
        </div>
      </div>
    ),
    { ...size }
  )
}
