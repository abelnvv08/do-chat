# @do AI como Contacto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert @do from a floating panel overlay to a dedicated room that appears pinned at the top of the chat list, with a contextual welcome screen (zero tokens) and real-time SSE streaming in the main input.

**Architecture:** The main @do room (`ai-${userId}`) already exists — it's created at registration in `register/route.ts`. No DB migration needed. The plan adds: (1) a new API that returns contextual chip data without touching Claude, (2) a `DoWelcomeScreen` component shown when the @do room has no messages, (3) SSE streaming wired into the main chat input for the AI room (replacing the fire-and-forget call), (4) a dynamic preview in the chat list entry, and (5) removal of the floating overlay panel.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase (admin client), Tailwind CSS 4, SSE (already set up in `api/chat/ai-chat/route.ts`)

---

## File Map

| File | Action | What it does |
|------|--------|--------------|
| `src/app/api/chat/do-context/route.ts` | **Create** | Returns chip data: tasks today/tomorrow, active unread room, awaiting-reply room. Zero Claude tokens. |
| `src/app/chat/[userId]/DoWelcomeScreen.tsx` | **Create** | Welcome screen with contextual chips shown in the @do room when there are no messages. |
| `src/app/chat/[userId]/RoomView.tsx` | **Modify** | Add `doStreamText` state, wire SSE streaming to the main input send, integrate `DoWelcomeScreen`, add streaming bubble, remove overlay panel states & JSX. |
| `src/app/chat/[userId]/page.tsx` | **Modify** | Fetch `do-context` on mount, display dynamic preview in the @do chat list entry. |

---

## Task 1: API — `/api/chat/do-context`

**Files:**
- Create: `src/app/api/chat/do-context/route.ts`

Returns up to 3 contextual data objects, sorted by priority, for the @do welcome screen and chat list preview. All queries hit Supabase directly — no Claude involved.

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/chat/do-context/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export type DoChip =
  | { type: 'task_today';    label: string; count: number }
  | { type: 'task_tomorrow'; label: string; count: number }
  | { type: 'active_chat';   label: string; roomName: string; unread: number }
  | { type: 'awaiting_reply'; label: string; roomName: string; hours: number }
  | { type: 'generic';       label: string; text: string }

export type DoContextResponse = {
  chips: DoChip[]
  previewText: string   // for the chat list row
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ chips: [], previewText: 'Tu asistente · siempre activo' })

  const db = admin()
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)           // YYYY-MM-DD
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10)
  const fortyEightHoursAgo = new Date(now.getTime() - 172800000).toISOString()

  // ── Query 1: tasks due today ──────────────────────────────────────────────
  const { count: todayCount } = await db
    .from('demo_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('due_date', todayStr)
    .eq('done', false)

  // ── Query 2: tasks due tomorrow ───────────────────────────────────────────
  const { count: tomorrowCount } = await db
    .from('demo_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('due_date', tomorrowStr)
    .eq('done', false)

  // ── Query 3: rooms with unread messages (non-AI) ──────────────────────────
  // Get this user's last-read timestamps
  const { data: reads } = await db
    .from('demo_reads')
    .select('room_id, last_read_at')
    .eq('user_id', userId)

  const readsMap: Record<string, string> = {}
  for (const r of reads ?? []) readsMap[r.room_id] = r.last_read_at

  // Get all rooms the user is in (non-AI)
  const { data: memberRows } = await db
    .from('demo_room_members')
    .select('room_id, demo_rooms!inner(id, name, type)')
    .eq('user_id', userId)
    .neq('demo_rooms.type', 'ai')

  const nonAiRoomIds = (memberRows ?? [])
    .map((m: any) => {
      const r = Array.isArray(m.demo_rooms) ? m.demo_rooms[0] : m.demo_rooms
      return r ? { id: r.id as string, name: (r.name ?? r.id) as string } : null
    })
    .filter(Boolean) as { id: string; name: string }[]

  let activeChatChip: DoChip | null = null
  if (nonAiRoomIds.length > 0) {
    // Count unread per room
    const roomIdList = nonAiRoomIds.map(r => r.id)
    const { data: unreadMsgs } = await db
      .from('demo_messages')
      .select('room_id, created_at, user_id')
      .in('room_id', roomIdList)
      .neq('user_id', userId)

    const unreadCountMap: Record<string, number> = {}
    for (const msg of unreadMsgs ?? []) {
      const lastRead = readsMap[msg.room_id]
      if (!lastRead || msg.created_at > lastRead) {
        unreadCountMap[msg.room_id] = (unreadCountMap[msg.room_id] ?? 0) + 1
      }
    }

    // Find room with most unread messages
    const [topRoomId, topCount] = Object.entries(unreadCountMap)
      .sort(([, a], [, b]) => b - a)[0] ?? [null, 0]

    if (topRoomId && topCount > 0) {
      const roomName = nonAiRoomIds.find(r => r.id === topRoomId)?.name ?? 'Chat'
      activeChatChip = {
        type: 'active_chat',
        label: `${topCount} mensaje${topCount > 1 ? 's' : ''} nuevo${topCount > 1 ? 's' : ''}`,
        roomName,
        unread: topCount,
      }
    }
  }

  // ── Query 4: awaiting reply (last msg is mine, no reply since, > 48h) ────
  let awaitingReplyChip: DoChip | null = null
  if (nonAiRoomIds.length > 0) {
    const roomIdList = nonAiRoomIds.map(r => r.id)
    const { data: lastMsgs } = await db
      .from('demo_messages')
      .select('room_id, user_id, created_at')
      .in('room_id', roomIdList)
      .order('created_at', { ascending: false })

    // Group last message per room
    const lastMsgPerRoom: Record<string, { userId: string; createdAt: string }> = {}
    for (const m of lastMsgs ?? []) {
      if (!lastMsgPerRoom[m.room_id]) {
        lastMsgPerRoom[m.room_id] = { userId: m.user_id, createdAt: m.created_at }
      }
    }

    // Find a room where last msg is mine and it's older than 48h
    for (const { id: roomId, name: roomName } of nonAiRoomIds) {
      const last = lastMsgPerRoom[roomId]
      if (last?.userId === userId && last.createdAt < fortyEightHoursAgo) {
        const diffHours = Math.floor((now.getTime() - new Date(last.createdAt).getTime()) / 3600000)
        awaitingReplyChip = {
          type: 'awaiting_reply',
          label: `Sin respuesta ${diffHours}h`,
          roomName,
          hours: diffHours,
        }
        break
      }
    }
  }

  // ── Build chips in priority order (max 3) ────────────────────────────────
  const chips: DoChip[] = []

  if ((todayCount ?? 0) > 0) {
    chips.push({
      type: 'task_today',
      label: `${todayCount} tarea${todayCount! > 1 ? 's' : ''} vence${todayCount! > 1 ? 'n' : ''} hoy`,
      count: todayCount!,
    })
  }

  if (chips.length < 3 && (tomorrowCount ?? 0) > 0) {
    chips.push({
      type: 'task_tomorrow',
      label: `${tomorrowCount} tarea${tomorrowCount! > 1 ? 's' : ''} para mañana`,
      count: tomorrowCount!,
    })
  }

  if (chips.length < 3 && activeChatChip) chips.push(activeChatChip)
  if (chips.length < 3 && awaitingReplyChip) chips.push(awaitingReplyChip)

  // Fill remaining slots with generics
  const generics: DoChip[] = [
    { type: 'generic', label: 'Resumí mis chats', text: 'Resumí los chats más activos de esta semana' },
    { type: 'generic', label: 'Ver pendientes', text: '¿Qué tengo pendiente esta semana?' },
    { type: 'generic', label: '¿En qué quedamos?', text: 'Revisá mis conversaciones y decime qué quedó pendiente de resolver' },
  ]
  for (const g of generics) {
    if (chips.length >= 3) break
    chips.push(g)
  }

  // ── Build preview text for chat list ─────────────────────────────────────
  const parts: string[] = []
  if ((todayCount ?? 0) > 0) parts.push(`${todayCount} tarea${todayCount! > 1 ? 's' : ''} vence hoy`)
  else if ((tomorrowCount ?? 0) > 0) parts.push(`${tomorrowCount} tarea${tomorrowCount! > 1 ? 's' : ''} para mañana`)
  if (activeChatChip) parts.push(`${activeChatChip.unread} chats sin leer`)
  const previewText = parts.length > 0 ? parts.join(' · ') : 'Tu asistente · siempre activo'

  return NextResponse.json({ chips, previewText } satisfies DoContextResponse)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/abel/Desktop/DO-CHAT/app-src && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors related to the new file.

- [ ] **Step 3: Commit**

```bash
cd /Users/abel/Desktop/DO-CHAT/app-src && git add src/app/api/chat/do-context/route.ts && git commit -m "feat: add /api/chat/do-context for zero-token @do chips"
```

---

## Task 2: Component — `DoWelcomeScreen`

**Files:**
- Create: `src/app/chat/[userId]/DoWelcomeScreen.tsx`

Shown inside RoomView when the @do room has no messages. Fetches chip data from the new endpoint and renders up to 3 interactive chips. Tapping a chip calls `onSend` with the chip's pre-set text.

- [ ] **Step 1: Create the component**

```typescript
// src/app/chat/[userId]/DoWelcomeScreen.tsx
'use client'

import { useEffect, useState } from 'react'
import type { DoChip } from '@/app/api/chat/do-context/route'

const CHIP_ICON: Record<DoChip['type'], string> = {
  task_today:    '⚠️',
  task_tomorrow: '🟡',
  active_chat:   '💬',
  awaiting_reply:'📨',
  generic:       '✦',
}

const CHIP_COLOR: Record<DoChip['type'], { border: string; title: string; bg: string }> = {
  task_today:    { border: 'border-red-200',    title: 'text-red-600',   bg: 'bg-white' },
  task_tomorrow: { border: 'border-amber-200',  title: 'text-amber-600', bg: 'bg-white' },
  active_chat:   { border: 'border-blue-200',   title: 'text-blue-600',  bg: 'bg-white' },
  awaiting_reply:{ border: 'border-emerald-200',title: 'text-emerald-600',bg: 'bg-white'},
  generic:       { border: 'border-slate-200',  title: 'text-slate-500', bg: 'bg-slate-50' },
}

function chipSendText(chip: DoChip): string {
  if (chip.type === 'task_today')     return `Tengo ${chip.count} tarea${chip.count > 1 ? 's' : ''} que vence${chip.count > 1 ? 'n' : ''} hoy. Ayudame a organizarme.`
  if (chip.type === 'task_tomorrow')  return `Tengo ${chip.count} tarea${chip.count > 1 ? 's' : ''} para mañana. ¿Cómo arrancamos?`
  if (chip.type === 'active_chat')    return `Resumí el chat de ${chip.roomName} — tengo ${chip.unread} mensaje${chip.unread > 1 ? 's' : ''} sin leer.`
  if (chip.type === 'awaiting_reply') return `En el chat de ${chip.roomName} llevo ${chip.hours}h sin respuesta. Ayudame a redactar una respuesta.`
  return chip.text
}

function chipSubtitle(chip: DoChip): string {
  if (chip.type === 'task_today')     return 'Revisá tus tareas de hoy'
  if (chip.type === 'task_tomorrow')  return 'Planificá el día de mañana'
  if (chip.type === 'active_chat')    return chip.roomName
  if (chip.type === 'awaiting_reply') return chip.roomName
  return ''
}

export function DoWelcomeScreen({
  userId,
  userName,
  onSend,
}: {
  userId: string
  userName: string
  onSend: (text: string) => void
}) {
  const [chips, setChips] = useState<DoChip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/chat/do-context?user_id=${userId}`)
      .then(r => r.json())
      .then(d => setChips(d.chips ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  const dayName = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  const displayName = userName.split(' ')[0] || userName // just first name

  return (
    <div className="flex flex-col items-center px-4 pt-12 pb-4 gap-5 min-h-[300px]">
      {/* Icon + greeting */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl shadow-md">
          ✦
        </div>
        <p className="text-lg font-bold text-slate-800">Hola, {displayName} 👋</p>
        <p className="text-xs text-slate-400 text-center capitalize">{dayName} · ¿En qué trabajamos?</p>
      </div>

      {/* Chips */}
      <div className="w-full max-w-sm flex flex-col gap-2.5">
        {loading ? (
          <>
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </>
        ) : (
          chips.map((chip, i) => {
            const colors = CHIP_COLOR[chip.type]
            const icon   = CHIP_ICON[chip.type]
            const sub    = chipSubtitle(chip)
            return (
              <button
                key={i}
                onClick={() => onSend(chipSendText(chip))}
                className={`w-full flex items-center gap-3 ${colors.bg} border-[1.5px] ${colors.border} rounded-2xl px-4 py-3 text-left active:scale-[0.98] transition-all shadow-sm`}
              >
                <span className="text-xl shrink-0">{icon}</span>
                <div className="min-w-0">
                  <p className={`text-xs font-bold ${colors.title} leading-tight`}>{chip.label}</p>
                  {sub && <p className="text-xs text-slate-500 truncate mt-0.5">{sub}</p>}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/abel/Desktop/DO-CHAT/app-src && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/abel/Desktop/DO-CHAT/app-src && git add src/app/chat/[userId]/DoWelcomeScreen.tsx && git commit -m "feat: add DoWelcomeScreen component for @do empty state"
```

---

## Task 3: RoomView — SSE Streaming + DoWelcomeScreen + Remove Overlay

**Files:**
- Modify: `src/app/chat/[userId]/RoomView.tsx`

Three related changes in one file, done in sub-steps:

### 3a — Add `doStreamText` state and import `DoWelcomeScreen`

- [ ] **Step 1: Add import and state at top of RoomView**

In `RoomView.tsx` line 6, add the import after the existing imports:
```typescript
import { DoWelcomeScreen } from './DoWelcomeScreen'
```

After line 378 (`const [aiProcessing, setAiProcessing] = useState(false)`), add:
```typescript
const [doStreamText, setDoStreamText] = useState('')
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/abel/Desktop/DO-CHAT/app-src && npx tsc --noEmit 2>&1 | head -30
```

### 3b — Convert `isAIRoom` branch of `sendMessage()` to SSE streaming

The current `isAIRoom` branch (around line 754) calls `/api/chat/ai-chat` and awaits the fetch promise but never reads the body. Replace the fire-and-forget AI call with proper SSE reading.

- [ ] **Step 1: Locate the current isAIRoom AI call block**

It looks like this (lines ~781-802):
```typescript
if (content || uploadedFiles.length > 0) {
  setAiTyping(true)
  const fileNames = uploadedFiles.map(f => `"${f.name}"`).join(', ')
  const query = uploadedFiles.length > 0 && content
    ? `${content}\n\n[Archivos adjuntos: ${fileNames}]`
    : uploadedFiles.length > 0
    ? `[Archivos adjuntos: ${fileNames}] ¿Qué contienen estos archivos?`
    : content
  await fetch('/api/chat/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, query }),
  })
  broadcast()
  await fetchMessages()
}
```

- [ ] **Step 2: Replace with the SSE-reading version**

Replace that exact block with:
```typescript
if (content || uploadedFiles.length > 0) {
  setAiTyping(true)
  const fileNames = uploadedFiles.map(f => `"${f.name}"`).join(', ')
  const query = uploadedFiles.length > 0 && content
    ? `${content}\n\n[Archivos adjuntos: ${fileNames}]`
    : uploadedFiles.length > 0
    ? `[Archivos adjuntos: ${fileNames}] ¿Qué contienen estos archivos?`
    : content

  const aiRes = await fetch('/api/chat/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, query, room_id: roomId }),
  })

  setAiTyping(false)

  if (aiRes.ok && aiRes.body) {
    const reader = aiRes.body.getReader()
    const decoder = new TextDecoder()
    let sseBuffer = ''
    let accumulated = ''

    outer: while (true) {
      const { done, value } = await reader.read()
      if (done) break
      sseBuffer += decoder.decode(value, { stream: true })

      const lines = sseBuffer.split('\n')
      sseBuffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (data.text !== undefined) {
            accumulated += data.text
            setDoStreamText(accumulated)
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
          }
          if (data.done) {
            setDoStreamText('')
            broadcast()
            await fetchMessages()
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
            break outer
          }
        } catch { /* ignore SSE parse errors */ }
      }
    }
  } else {
    // fallback: just refresh messages
    broadcast()
    await fetchMessages()
  }
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/abel/Desktop/DO-CHAT/app-src && npx tsc --noEmit 2>&1 | head -30
```

### 3c — Add streaming bubble in message list

- [ ] **Step 1: Find the `aiTyping` bubble and `bottomRef` (around line 2083)**

The current aiTyping bubble renders just before `<div ref={bottomRef} />`. Add the streaming bubble between the aiTyping bubble and bottomRef.

Replace this existing block:
```tsx
        )}
        <div ref={bottomRef} />
      </div>
      </div>

      {/* @do AI Panel */}
```

With:
```tsx
        )}
        {isAIRoom && doStreamText && (
          <div className="flex gap-2 items-start px-4 py-2 max-w-[85%]">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm shrink-0 shadow-sm">
              ✦
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm flex-1">
              <RenderAIContent content={doStreamText} />
              <span className="inline-block w-1 h-3.5 bg-blue-500 animate-pulse ml-0.5 align-text-bottom rounded-full" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      </div>

      {/* @do AI Panel */}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/abel/Desktop/DO-CHAT/app-src && npx tsc --noEmit 2>&1 | head -30
```

### 3d — Replace empty state with `DoWelcomeScreen`

- [ ] **Step 1: Find the empty state (line ~1886)**

The current block:
```tsx
        {firstLoadDone && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${isAIRoom ? 'bg-blue-100' : 'bg-gray-100'}`}>
              {isAIRoom ? '✦' : roomData.emoji}
            </div>
            <p className="text-gray-500 text-sm font-medium">{isAIRoom ? 'Cuéntame qué necesitas' : 'Sin mensajes aún'}</p>
            {isAIRoom && <p className="text-xs text-gray-400 max-w-[220px]">Puedo leer tus chats, resumirlos, extraer tareas y enviar mensajes</p>}
          </div>
        )}
```

- [ ] **Step 2: Replace with DoWelcomeScreen for AI room, generic for others**

```tsx
        {firstLoadDone && messages.length === 0 && (
          isAIRoom ? (
            <DoWelcomeScreen
              userId={userId}
              userName={me?.name ?? ''}
              onSend={(text) => {
                setInput(text)
                // Trigger send via a synthetic call
                setTimeout(() => {
                  const fakeEvent = { preventDefault: () => {} } as React.FormEvent
                  // We send directly using the shared logic
                  setInput('')
                  sendMessage(text)
                }, 0)
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl bg-gray-100">
                {roomData.emoji}
              </div>
              <p className="text-gray-500 text-sm font-medium">Sin mensajes aún</p>
            </div>
          )
        )}
```

> **Note on `sendMessage(text):`** The current `sendMessage` reads from local variable `content` passed in, not from `input` state. Check its signature — it likely takes the content as a parameter already via the form submit handler. If the function signature doesn't accept a string parameter directly, adjust to call the underlying form submit with the text pre-filled.

- [ ] **Step 3: Check `sendMessage` signature**

```bash
grep -n "async function sendMessage\|function sendMessage" /Users/abel/Desktop/DO-CHAT/app-src/src/app/chat/[userId]/RoomView.tsx | head -5
```

Look at how `sendMessage` is called from the form submit. If it reads `input` state (not a param), the `onSend` callback should set `input` and programmatically click the send button:

```tsx
onSend={(text) => {
  setInput(text)
  setTimeout(() => {
    sendBtnRef.current?.click()
  }, 0)
}}
```
Where `sendBtnRef` is a new ref: `const sendBtnRef = useRef<HTMLButtonElement>(null)` and added to the send button: `ref={sendBtnRef}`.

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/abel/Desktop/DO-CHAT/app-src && npx tsc --noEmit 2>&1 | head -30
```

### 3e — Remove overlay panel states and JSX

- [ ] **Step 1: Remove overlay states**

Remove these 5 state declarations (around lines 373-383):
```typescript
const [showAIPanel, setShowAIPanel] = useState(false)
const [aiQuery, setAiQuery] = useState('')
const [aiStreamText, setAiStreamText] = useState('')
const [aiCurrentQuery, setAiCurrentQuery] = useState('')
const [aiPanelHistory, setAiPanelHistory] = useState<{ query: string; response: string }[]>([])
const [aiProcessing, setAiProcessing] = useState(false)
// ...
const aiInputRef = useRef<HTMLTextAreaElement>(null)
const aiPanelScrollRef = useRef<HTMLDivElement>(null)
```

- [ ] **Step 2: Remove `askAI()` function**

Remove the entire `async function askAI()` (lines 860–942).

- [ ] **Step 3: Remove the ✦ button that opens the panel**

Search for the button that sets `setShowAIPanel(true)` and remove it along with any surrounding wrapper divs that were only for that button.

- [ ] **Step 4: Remove the overlay panel JSX**

Remove the entire `{showAIPanel && ( ... )}` block (lines 2099 to its closing `)}`, roughly 160 lines).

- [ ] **Step 5: Verify TypeScript — this is the key check**

```bash
cd /Users/abel/Desktop/DO-CHAT/app-src && npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors. Any remaining reference to the removed states will surface here — fix them.

- [ ] **Step 6: Commit all RoomView changes**

```bash
cd /Users/abel/Desktop/DO-CHAT/app-src && git add src/app/chat/[userId]/RoomView.tsx && git commit -m "feat: wire SSE streaming to @do main input, add DoWelcomeScreen, remove overlay panel"
```

---

## Task 4: page.tsx — Dynamic @do Preview in Chat List

**Files:**
- Modify: `src/app/chat/[userId]/page.tsx`

Add a `doPreviewText` state populated by fetching `/api/chat/do-context` on mount. Show it in the @do button instead of the last message content.

- [ ] **Step 1: Add state for `doPreviewText`**

Find the state declarations at the top of `ChatListPage` (around line 84). After `const [loading, setLoading] = useState(true)`, add:

```typescript
const [doPreviewText, setDoPreviewText] = useState('Tu asistente · siempre activo')
```

- [ ] **Step 2: Fetch do-context on mount**

In the `useEffect(() => { ... }, [])` at line 178, add a fetch call after `fetchRooms()`:

```typescript
fetch(`/api/chat/do-context?user_id=${userId}`)
  .then(r => r.json())
  .then(d => { if (d.previewText) setDoPreviewText(d.previewText) })
  .catch(() => {})
```

- [ ] **Step 3: Use `doPreviewText` in the @do button**

Find the @do button preview (around line 837):
```tsx
<p className="text-blue-100/80 text-xs truncate">{aiRoom.lastMsg?.content ?? a.chats.aiSubtitle}</p>
```

Replace with:
```tsx
<p className="text-blue-100/80 text-xs truncate">{doPreviewText}</p>
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/abel/Desktop/DO-CHAT/app-src && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/abel/Desktop/DO-CHAT/app-src && git add src/app/chat/[userId]/page.tsx && git commit -m "feat: show dynamic @do preview in chat list from do-context"
```

---

## Task 5: Manual smoke test

No automated tests exist in this codebase. Verify the feature end-to-end manually.

- [ ] **Step 1: Run dev server**

```bash
cd /Users/abel/Desktop/DO-CHAT/app-src && npm run dev
```

- [ ] **Step 2: Test welcome screen**

Open the app → open @do chat → verify:
- ✦ icon, greeting with name, today's date shown
- Up to 3 chips appear (or skeleton loaders while loading)
- Chips reflect real data (if you have tasks or unread chats)
- Tapping a chip → message is sent → @do responds with SSE streaming visible

- [ ] **Step 3: Test streaming**

Type a message in the @do room → send → verify:
- "do AI está pensando…" bouncing dots appear briefly
- Then the streaming bubble appears (✦ avatar + text appearing word-by-word with blinking cursor)
- When done → streaming bubble disappears → message appears in the normal message list

- [ ] **Step 4: Test chat list preview**

Go back to chat list → verify the @do row shows contextual text (e.g., "1 tarea vence hoy") instead of last message content.

- [ ] **Step 5: Test no overlay panel**

Open a regular chat (non-@do) → verify the ✦ button for the overlay panel is gone.

- [ ] **Step 6: TypeScript final check**

```bash
cd /Users/abel/Desktop/DO-CHAT/app-src && npx tsc --noEmit
```
Expected: exit 0.

---

## Self-Review Checklist

| Spec requirement | Covered by task |
|------------------|----------------|
| @do pinned as first contact with dynamic preview | Task 4 (preview text) — pin position was already implemented |
| Welcome screen with 3 contextual chips, zero tokens | Tasks 1 + 2 + 3d |
| Chips from DB (tasks today, active chat, awaiting reply) | Task 1 |
| Max 3 chips, generics as fallback | Task 1 |
| Bottom nav hidden in @do | Already works — RoomView is `fixed inset-0 z-40` which covers the `z-10` BottomNav |
| SSE streaming in main input | Task 3b |
| Streaming bubble in message list | Task 3c |
| Cleanup overlay panel | Task 3e |
| Bot user DB migration | **Not needed** — `ai-${userId}` room is created at registration in `register/route.ts:44` |
