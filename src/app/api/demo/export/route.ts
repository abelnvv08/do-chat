import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, BorderStyle } from 'docx'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#{1,3}\s+/g, '')
    .replace(/\[GCAL:[^\]]+\]/g, '')
    .trim()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export async function GET(req: NextRequest) {
  const room_id = req.nextUrl.searchParams.get('room_id')
  const user_id = req.nextUrl.searchParams.get('user_id')
  const format = req.nextUrl.searchParams.get('format') ?? 'docx'

  if (!room_id || !user_id) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const db = admin()

  // Fetch messages
  const { data: rawMessages } = await db
    .from('demo_messages')
    .select('content, type, created_at, user_id, user:demo_profiles(name, emoji)')
    .eq('room_id', room_id)
    .order('created_at', { ascending: true })
    .limit(500)

  const messages = (rawMessages ?? []).map((m: any) => ({
    content: m.content as string,
    type: m.type as string,
    created_at: m.created_at as string,
    user_id: m.user_id as string,
    user: Array.isArray(m.user) ? (m.user[0] ?? null) : (m.user ?? null),
  })) as { content: string; type: string; created_at: string; user_id: string; user: { name: string; emoji: string } | null }[]

  // Fetch room name
  let roomName = room_id
  if (room_id.startsWith('ai-')) {
    roomName = 'Chat con do AI'
  } else {
    const { data: roomData } = await db.from('demo_rooms').select('name').eq('id', room_id).single()
    if (roomData?.name) roomName = roomData.name
  }

  const textMessages = messages.filter(m => m.type === 'text' || m.type === 'ai')

  if (format === 'docx') {
    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: roomName,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `Exportado el ${formatDate(new Date().toISOString())} · ${textMessages.length} mensajes`,
        spacing: { after: 400 },
        run: { color: '888888' },
      } as any),
    ]

    for (const msg of textMessages) {
      const senderName = msg.type === 'ai' ? 'do AI' : (msg.user?.name ?? 'Usuario')
      const emoji = msg.type === 'ai' ? '✦' : (msg.user?.emoji ?? '')
      const clean = stripMarkdown(msg.content)

      paragraphs.push(
        new Paragraph({
          spacing: { before: 160, after: 40 },
          children: [
            new TextRun({
              text: `${emoji} ${senderName}`,
              bold: true,
              color: msg.type === 'ai' ? '2563EB' : '111827',
              size: 20,
            }),
            new TextRun({
              text: `  ${formatDate(msg.created_at)}`,
              color: '9CA3AF',
              size: 16,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: clean, size: 20, color: '374151' })],
        })
      )
    }

    const doc = new Document({
      sections: [{ properties: {}, children: paragraphs }],
    })

    const buffer = await Packer.toBuffer(doc)

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(roomName)}.docx"`,
      },
    })
  }

  // PDF: return structured JSON for client-side print
  return NextResponse.json({
    roomName,
    exportedAt: new Date().toISOString(),
    messages: textMessages.map(m => ({
      sender: m.type === 'ai' ? 'do AI' : (m.user?.name ?? 'Usuario'),
      emoji: m.type === 'ai' ? '✦' : (m.user?.emoji ?? ''),
      content: stripMarkdown(m.content),
      time: formatDate(m.created_at),
      isAI: m.type === 'ai',
    })),
  })
}
