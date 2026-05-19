import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #080c14 0%, #0f1a2e 50%, #080c14 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Glow */}
        <div style={{
          position: 'absolute', width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />

        {/* Logo placeholder circle */}
        <div style={{
          width: '100px', height: '100px', borderRadius: '28px',
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '32px', boxShadow: '0 20px 60px rgba(59,130,246,0.4)',
          fontSize: '52px',
        }}>
          💬
        </div>

        <div style={{ fontSize: '64px', fontWeight: 800, color: '#ffffff', marginBottom: '16px', letterSpacing: '-2px' }}>
          DO Chat
        </div>

        <div style={{ fontSize: '24px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: '700px', lineHeight: 1.5 }}>
          Mensajería profesional con IA que actúa
        </div>

        <div style={{ display: 'flex', gap: '16px', marginTop: '40px' }}>
          {['Chats cifrados', 'DO AI integrado', 'Tareas y seguimiento'].map(f => (
            <div key={f} style={{
              padding: '10px 20px', borderRadius: '100px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.7)', fontSize: '16px',
            }}>
              {f}
            </div>
          ))}
        </div>

        <div style={{ position: 'absolute', bottom: '32px', color: 'rgba(255,255,255,0.25)', fontSize: '16px' }}>
          getdochat.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
