'use client'

import { useEffect, useRef, useState, KeyboardEvent } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { SendHorizonalIcon, ArrowLeftIcon, PaperclipIcon, FileIcon, XIcon, MicIcon, StopCircleIcon } from 'lucide-react'
import { usersCache, getAIRoom, DemoMessage } from '@/lib/demo'
import { deriveSharedKey, deriveRoomKey, encryptMsg, decryptMsg, isEncrypted } from '@/lib/e2ee'
import { formatMessageTime } from '@/lib/utils'
import { supabase } from '@/lib/supabase-client'

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|(https?:\/\/[^\s]+))/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[2] !== undefined) parts.push(<strong key={k++} className="font-semibold">{m[2]}</strong>)
    else if (m[3] !== undefined) parts.push(<em key={k++} className="italic">{m[3]}</em>)
    else if (m[4] !== undefined) parts.push(<code key={k++} className="bg-gray-100 text-blue-700 rounded px-1 py-0.5 text-xs font-mono">{m[4]}</code>)
    else if (m[5] !== undefined) parts.push(<a key={k++} href={m[5]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{m[5]}</a>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function RenderAIContent({ content }: { content: string }) {
  const lines = content.split('\n')
  type Segment =
    | { type: 'text'; text: string }
    | { type: 'heading'; level: 1 | 2 | 3; text: string }
    | { type: 'list'; ordered: boolean; items: string[] }
    | { type: 'table'; headers: string[]; rows: string[][] }
    | { type: 'gcal'; title: string; date: string; url: string }
  const segments: Segment[] = []
  let textLines: string[] = []

  function flushText() {
    const t = textLines.join('\n').trim()
    if (t) segments.push({ type: 'text', text: t })
    textLines = []
  }

  const gcalLineRegex = /^\[GCAL:([^|]+)\|([^|]+)\|([^\]]+)\]$/
  const ulRegex = /^[-*]\s+(.+)/
  const olRegex = /^\d+\.\s+(.+)/

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const nextLine = lines[i + 1] ?? ''
    const gcalMatch = line.trim().match(gcalLineRegex)
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
    const isUL = ulRegex.test(line.trim())
    const isOL = olRegex.test(line.trim())

    if (gcalMatch) {
      flushText()
      segments.push({ type: 'gcal', title: gcalMatch[1], date: gcalMatch[2], url: gcalMatch[3] })
      i++
    } else if (headingMatch) {
      flushText()
      segments.push({ type: 'heading', level: headingMatch[1].length as 1|2|3, text: headingMatch[2] })
      i++
    } else if ((isUL || isOL) ) {
      flushText()
      const ordered = isOL
      const items: string[] = []
      while (i < lines.length && (ordered ? olRegex.test(lines[i].trim()) : ulRegex.test(lines[i].trim()))) {
        const m = lines[i].trim().match(ordered ? olRegex : ulRegex)
        if (m) items.push(m[1])
        i++
      }
      segments.push({ type: 'list', ordered, items })
    } else if (line.trim().startsWith('|') && nextLine.trim().match(/^\|?[\s|:-]+\|?$/)) {
      flushText()
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const parseRow = (l: string) => l.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
      const headers = parseRow(tableLines[0])
      const rows = tableLines.slice(2).map(parseRow).filter(r => r.length > 0)
      if (headers.length > 0) segments.push({ type: 'table', headers, rows })
    } else {
      textLines.push(line)
      i++
    }
  }
  flushText()

  return (
    <div className="space-y-2">
      {segments.map((seg, idx) => {
        if (seg.type === 'gcal') {
          return (
            <a key={idx} href={seg.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-3.5 py-3 hover:bg-green-100 transition-colors no-underline group">
              <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{seg.title}</p>
                <p className="text-xs text-green-700">{seg.date}</p>
              </div>
              <span className="text-xs text-green-600 font-medium shrink-0 group-hover:underline">Agregar</span>
            </a>
          )
        }
        if (seg.type === 'heading') {
          const cls = seg.level === 1 ? 'text-base font-bold text-gray-900' : seg.level === 2 ? 'text-sm font-bold text-gray-800' : 'text-sm font-semibold text-gray-700'
          return <p key={idx} className={cls}>{renderInline(seg.text)}</p>
        }
        if (seg.type === 'list') {
          const Tag = seg.ordered ? 'ol' : 'ul'
          return (
            <Tag key={idx} className={`text-sm text-gray-800 space-y-0.5 pl-4 ${seg.ordered ? 'list-decimal' : 'list-disc'}`}>
              {seg.items.map((item, j) => (
                <li key={j} className="leading-relaxed">{renderInline(item)}</li>
              ))}
            </Tag>
          )
        }
        if (seg.type === 'text') {
          return (
            <p key={idx} className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {renderInline(seg.text)}
            </p>
          )
        }
        return (
          <div key={idx} className="overflow-x-auto -mx-1 rounded-xl border border-gray-100">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-blue-50">
                  {seg.headers.map((h, j) => (
                    <th key={j} className="px-3 py-2 text-left font-semibold text-blue-700 whitespace-nowrap border-b border-blue-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seg.rows.map((row, j) => (
                  <tr key={j} className={j % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.map((cell, k) => (
                      <td key={k} className="px-3 py-2 text-gray-700 border-b border-gray-100 whitespace-nowrap">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

function LinkPreview({ url, isOwn }: { url: string; isOwn: boolean }) {
  const [state, setState] = useState<'loading' | 'full' | 'minimal'>('loading')
  const [data, setData] = useState<{ title: string; description: string; image: string; siteName: string } | null>(null)

  useEffect(() => {
    fetch(`/api/demo/link-preview?url=${encodeURIComponent(url)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && !d.error && d.title) {
          setData(d)
          setState('full')
        } else {
          setState('minimal')
        }
      })
      .catch(() => setState('minimal'))
  }, [url])

  if (state === 'loading') return null

  if (state === 'minimal') {
    let domain = url
    try { domain = new URL(url).hostname } catch { /* keep raw url */ }
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className={`mt-1.5 flex items-center gap-2.5 rounded-xl px-3 py-2 border text-left no-underline ${
          isOwn ? 'border-blue-500/30 bg-blue-700/30' : 'border-gray-200 bg-gray-50'
        }`}>
        <svg className={`w-4 h-4 shrink-0 ${isOwn ? 'text-blue-200' : 'text-gray-400'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
        <div className="min-w-0">
          <p className={`text-[10px] font-medium uppercase tracking-wide ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>{domain}</p>
          <p className={`text-xs truncate ${isOwn ? 'text-white/80' : 'text-gray-500'}`}>{url}</p>
        </div>
      </a>
    )
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className={`mt-1.5 flex flex-col rounded-xl overflow-hidden border text-left no-underline ${
        isOwn ? 'border-blue-500/30 bg-blue-700/30' : 'border-gray-200 bg-gray-50'
      }`}>
      {data!.image && (
        <img src={data!.image} alt="" className="w-full max-h-32 object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
      )}
      <div className="px-3 py-2">
        <p className={`text-[10px] font-medium uppercase tracking-wide mb-0.5 ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>{data!.siteName}</p>
        <p className={`text-xs font-semibold leading-snug ${isOwn ? 'text-white' : 'text-gray-800'}`}>{data!.title}</p>
        {data!.description && <p className={`text-[11px] mt-0.5 line-clamp-2 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>{data!.description}</p>}
      </div>
    </a>
  )
}

function AudioMessage({ url, isOwn }: { url: string; isOwn: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [transcribing, setTranscribing] = useState(false)

  function toggle() {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause() } else { a.play() }
    setPlaying(!playing)
  }

  function seek(e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) {
    const a = audioRef.current
    const bar = progressRef.current
    if (!a || !bar || duration === 0) return
    const rect = bar.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    a.currentTime = ratio * duration
    setCurrent(ratio * duration)
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  async function transcribe() {
    setTranscribing(true)
    try {
      const res = await fetch('/api/demo/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_url: url }),
      })
      const { transcript: text } = await res.json()
      setTranscript(text ?? 'No se pudo transcribir')
    } catch {
      setTranscript('Error al transcribir')
    } finally {
      setTranscribing(false)
    }
  }

  const waveHeights = [3, 6, 10, 7, 4, 8, 12, 9, 5, 11, 8, 4, 7, 10, 6, 3, 9, 12, 7, 5]
  const progress = duration > 0 ? current / duration : 0

  return (
    <div className={`rounded-2xl min-w-[220px] max-w-[280px] overflow-hidden ${
      isOwn ? 'bg-blue-600' : 'bg-white border border-gray-100 shadow-sm'
    }`}>
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <audio
          ref={audioRef}
          src={url}
          onLoadedMetadata={e => setDuration((e.target as HTMLAudioElement).duration)}
          onTimeUpdate={e => setCurrent((e.target as HTMLAudioElement).currentTime)}
          onEnded={() => { setPlaying(false); setCurrent(0) }}
        />
        <button onClick={toggle} className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isOwn ? 'bg-white/20 text-white' : 'bg-blue-600 text-white'
        }`}>
          {playing
            ? <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            : <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          }
        </button>
        <div className="flex-1 min-w-0">
          {/* Waveform scrubber */}
          <div
            ref={progressRef}
            className="flex items-center gap-px h-8 cursor-pointer"
            onClick={seek}
            onTouchStart={seek}
          >
            {waveHeights.map((h, idx) => {
              const barPct = (idx + 1) / waveHeights.length
              const filled = barPct <= progress
              return (
                <div
                  key={idx}
                  className={`flex-1 rounded-full transition-colors ${
                    filled
                      ? isOwn ? 'bg-white' : 'bg-blue-500'
                      : isOwn ? 'bg-white/30' : 'bg-gray-200'
                  } ${playing && filled ? 'animate-pulse' : ''}`}
                  style={{ height: `${h}px` }}
                />
              )
            })}
          </div>
          <p className={`text-xs mt-0.5 ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>
            {duration > 0 ? (playing ? fmt(current) : fmt(duration)) : '—'}
          </p>
        </div>
        {!transcript && (
          <button onClick={transcribe} disabled={transcribing}
            className={`shrink-0 text-[10px] font-medium px-2 py-1 rounded-lg transition-colors ${
              isOwn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            } disabled:opacity-50`}>
            {transcribing ? '…' : 'Aa'}
          </button>
        )}
      </div>
      {transcript && (
        <div className={`px-3.5 pb-2.5 text-xs leading-relaxed ${isOwn ? 'text-white/90' : 'text-gray-600'}`}>
          <div className={`h-px mb-2 ${isOwn ? 'bg-white/20' : 'bg-gray-100'}`} />
          {transcript}
        </div>
      )}
    </div>
  )
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

export function RoomView({ userId, roomId, onBack, initialRoom }: { userId: string; roomId: string; onBack: () => void; initialRoom?: { id: string; name: string; emoji: string; type: string; otherUserId?: string } | null }) {
  const me = usersCache[userId]
  const isAIRoom = roomId === getAIRoom(userId)
  const [room, setRoom] = useState<{ id: string; name: string; emoji: string; type: string; otherUserId?: string } | null>(
    isAIRoom ? { id: roomId, name: 'do AI', emoji: '✦', type: 'ai' } : (initialRoom ?? null)
  )

  const [messages, setMessages] = useState<DemoMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiTyping, setAiTyping] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiQuery, setAiQuery] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const aiInputRef = useRef<HTMLTextAreaElement>(null)
  const fetchingRef = useRef(false)
  const pendingFetchRef = useRef(false)
  const lastMsgCountRef = useRef(0)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const [otherReads, setOtherReads] = useState<Record<string, string>>({})
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<{ id: string; preview: string; userName: string } | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [editingMsg, setEditingMsg] = useState<{ id: string; content: string } | null>(null)
  const [editInput, setEditInput] = useState('')
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tableLoadingMsgId, setTableLoadingMsgId] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [groupMembers, setGroupMembers] = useState<{ id: string; name: string; emoji: string; bg: string }[]>([])
  const [groupContacts, setGroupContacts] = useState<{ id: string; name: string; emoji: string; bg: string; room_id: string }[]>([])
  const [groupCreatedBy, setGroupCreatedBy] = useState<string | null>(null)
  const [addingMembers, setAddingMembers] = useState(false)
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([])
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [editingGroupName, setEditingGroupName] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [savingGroupName, setSavingGroupName] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const matchRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const [matchIdx, setMatchIdx] = useState(0)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [encKey, setEncKey] = useState<CryptoKey | null>(null)
  const [encReady, setEncReady] = useState(false)

  // ── Call state ──────────────────────────────────────────────────────────────
  const [callState, _setCallState] = useState<'idle' | 'calling' | 'incoming' | 'active'>('idle')
  const callStateRef = useRef<'idle' | 'calling' | 'incoming' | 'active'>('idle')
  function setCallState(s: typeof callState) { callStateRef.current = s; _setCallState(s) }
  const [incomingOffer, setIncomingOffer] = useState<{ sdp: string; callerId: string; callerName: string } | null>(null)
  const [muted, setMuted] = useState(false)
  const [callSeconds, setCallSeconds] = useState(0)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])

  useEffect(() => {
    if (!isAIRoom && !room) {
      fetch(`/api/demo/chat-list?user_id=${userId}`).then(r => r.json()).then(d => {
        const found = (d.rooms ?? []).find((r: any) => r.id === roomId)
        if (found) setRoom(found)
      })
    }

    // Initialize encryption key for non-AI rooms
    if (!isAIRoom) {
      const isDM = roomId.startsWith('dm-')
      if (isDM) {
        // DM: derive ECDH shared key with the other user
        // Room ID format: dm-{uuid1}-{uuid2}. UUIDs are 36 chars each, joined by one extra dash.
        const withoutPrefix = roomId.slice(3)
        const uuid1 = withoutPrefix.slice(0, 36)
        const uuid2 = withoutPrefix.slice(37)
        const otherUserId = initialRoom?.otherUserId ?? (uuid1 === userId ? uuid2 : uuid1)
        fetch(`/api/demo/e2ee?user_id=${otherUserId}`)
          .then(r => r.json())
          .then(async d => {
            if (d.public_key) {
              const key = await deriveSharedKey(userId, d.public_key)
              setEncKey(key)
            }
            setEncReady(true)
          }).catch(() => setEncReady(true))
      } else {
        // Group: derive per-room key from user's private key + roomId
        deriveRoomKey(userId, roomId).then(key => { setEncKey(key); setEncReady(true) }).catch(() => setEncReady(true))
      }
    } else {
      setEncReady(true)
    }

    markRead()
    fetchMessages()
    fetchReads()
    // Reset deleted flag so the room reappears in chats after re-entering
    fetch('/api/demo/room-prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, room_id: roomId, deleted: false }),
    }).catch(() => {})

    const channel = supabase
      .channel(`room:${roomId}`)
      .on('broadcast', { event: 'msg' }, () => { fetchMessages(); fetchReads() })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'demo_messages', filter: `room_id=eq.${roomId}` }, () => { fetchMessages(); fetchReads() })
      // ── Call signaling ──────────────────────────────────────────
      .on('broadcast', { event: 'call-offer' }, ({ payload }) => {
        if (payload.from === userId) return
        if (callStateRef.current !== 'idle') {
          // Busy — auto-reject
          channelRef.current?.send({ type: 'broadcast', event: 'call-reject', payload: { from: userId } })
          return
        }
        setIncomingOffer({ sdp: payload.sdp, callerId: payload.from, callerName: payload.callerName ?? 'Usuario' })
        setCallState('incoming')
      })
      .on('broadcast', { event: 'call-answer' }, async ({ payload }) => {
        if (payload.from === userId) return
        const pc = pcRef.current
        if (!pc) return
        await pc.setRemoteDescription({ type: 'answer', sdp: payload.sdp })
        for (const c of pendingCandidatesRef.current) await pc.addIceCandidate(c).catch(() => {})
        pendingCandidatesRef.current = []
        setCallState('active')
        setCallSeconds(0)
        callTimerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000)
      })
      .on('broadcast', { event: 'call-ice' }, async ({ payload }) => {
        if (payload.from === userId) return
        const pc = pcRef.current
        if (!pc || !pc.remoteDescription) { pendingCandidatesRef.current.push(payload.candidate); return }
        await pc.addIceCandidate(payload.candidate).catch(() => {})
      })
      .on('broadcast', { event: 'call-end' }, ({ payload }) => {
        if (payload.from === userId) return
        cleanupCall()
      })
      .on('broadcast', { event: 'call-reject' }, ({ payload }) => {
        if (payload.from === userId) return
        cleanupCall()
      })
      .subscribe()
    channelRef.current = channel

    // Refresh when tab becomes visible again (phone back from background)
    const onVisible = () => { if (document.visibilityState === 'visible') { fetchMessages(); fetchReads() } }
    document.addEventListener('visibilitychange', onVisible)

    // Fallback every 3s in case websocket drops
    const interval = setInterval(() => { fetchMessages(); fetchReads() }, 3000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      // Signal the other side before tearing down the channel
      if (callStateRef.current !== 'idle') {
        channel.send({ type: 'broadcast', event: 'call-end', payload: { from: userId } })
      }
      supabase.removeChannel(channel)
      channelRef.current = null
      clearInterval(interval)
      cleanupCall()
    }
  }, [roomId])

  async function exportChat(format: 'docx' | 'pdf') {
    setExporting(true); setShowExportMenu(false)
    try {
      const url = `/api/demo/export?room_id=${roomId}&user_id=${userId}&format=${format}`
      if (format === 'docx') {
        const res = await fetch(url)
        const blob = await res.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `chat.docx`
        a.click()
        URL.revokeObjectURL(a.href)
      } else {
        const res = await fetch(url)
        const data = await res.json()
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${data.roomName}</title><style>
          body { font-family: -apple-system, sans-serif; max-width: 700px; margin: 0 auto; padding: 24px; color: #111827; }
          h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
          .meta { font-size: 12px; color: #9ca3af; margin-bottom: 32px; }
          .msg { margin-bottom: 16px; }
          .sender { font-size: 12px; font-weight: 700; margin-bottom: 2px; }
          .sender.ai { color: #2563eb; }
          .sender.user { color: #111827; }
          .time { font-size: 11px; color: #9ca3af; margin-left: 8px; font-weight: 400; }
          .content { font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap; }
          .divider { border: none; border-top: 1px solid #f3f4f6; margin: 12px 0; }
          @media print { body { padding: 0; } }
        </style></head><body>
          <h1>${data.roomName}</h1>
          <div class="meta">Exportado el ${new Date(data.exportedAt).toLocaleString('es-AR')} · ${data.messages.length} mensajes</div>
          ${data.messages.map((m: any) => `
            <div class="msg">
              <div class="sender ${m.isAI ? 'ai' : 'user'}">${m.emoji} ${m.sender}<span class="time">${m.time}</span></div>
              <div class="content">${m.content.replace(/</g, '&lt;')}</div>
            </div><hr class="divider">`).join('')}
        </body></html>`
        const win = window.open('', '_blank')
        if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 400) }
      }
    } finally { setExporting(false) }
  }

  async function markRead() {
    await fetch('/api/demo/reads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, room_id: roomId }),
    })
  }

  async function fetchReads() {
    try {
      const res = await fetch(`/api/demo/reads?room_id=${encodeURIComponent(roomId)}`)
      if (!res.ok) return
      const { reads } = await res.json()
      const map: Record<string, string> = {}
      for (const r of reads ?? []) {
        if (r.user_id !== userId) map[r.user_id] = r.last_read_at
      }
      setOtherReads(map)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    const isNearBottom = distanceFromBottom < 120
    const gotNewMessages = messages.length > lastMsgCountRef.current
    lastMsgCountRef.current = messages.length
    if (isNearBottom || gotNewMessages) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, aiTyping])

  async function fetchMessages() {
    if (fetchingRef.current) { pendingFetchRef.current = true; return }
    fetchingRef.current = true
    pendingFetchRef.current = false
    try {
      const res = await fetch(`/api/demo/messages?room=${encodeURIComponent(roomId)}`)
      if (!res.ok) return
      const { messages: msgs } = await res.json()
      setMessages(msgs ?? [])
      markRead()
    } catch {
      // retry on next poll
    } finally {
      fetchingRef.current = false
      if (pendingFetchRef.current) {
        pendingFetchRef.current = false
        fetchMessages()
      }
    }
  }

  async function send() {
    if ((!input.trim() && pendingFiles.length === 0) || loading) return
    const content = input.trim()
    const reply = replyingTo
    const filesToSend = [...pendingFiles]
    setInput('')
    setReplyingTo(null)
    setPendingFiles([])

    const broadcast = () => channelRef.current?.send({ type: 'broadcast', event: 'msg', payload: {} })

    if (isAIRoom) {
      setLoading(true)
      try {
        const uploadedFiles: { name: string; url: string; type: string }[] = []
        for (const file of filesToSend) {
          const fd = new FormData()
          fd.append('file', file); fd.append('user_id', userId); fd.append('room_id', roomId)
          const res = await fetch('/api/demo/upload', { method: 'POST', body: fd })
          const data = await res.json()
          if (data.message?.content) {
            try {
              const meta = JSON.parse(data.message.content)
              uploadedFiles.push({ name: file.name, url: meta.url, type: file.type })
            } catch { /* skip */ }
          }
        }
        if (content) {
          await fetch('/api/demo/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, content, room_id: roomId }),
          })
        }
        broadcast()
        await fetchMessages()
        setLoading(false)
        if (content || uploadedFiles.length > 0) {
          setAiTyping(true)
          const fileNames = uploadedFiles.map(f => `"${f.name}"`).join(', ')
          const query = uploadedFiles.length > 0 && content
            ? `${content}\n\n[Archivos adjuntos: ${fileNames}]`
            : uploadedFiles.length > 0
            ? `[Archivos adjuntos: ${fileNames}] ¿Qué contienen estos archivos?`
            : content
          await fetch('/api/demo/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, query }),
          })
          broadcast()
          await fetchMessages()
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
        setAiTyping(false)
      }
      return
    }

    // ── Non-AI room: optimistic update so message appears instantly ──
    const tempId = `temp-${Date.now()}`
    const meUser = usersCache[userId]
    if (content && !filesToSend.length) {
      setMessages(prev => [...prev, {
        id: tempId,
        user_id: userId,
        content,
        type: 'text',
        room_id: roomId,
        created_at: new Date().toISOString(),
        user: meUser ? { name: meUser.name, emoji: meUser.emoji } : null,
        reactions: [],
        reply_to_id: reply?.id ?? null,
        reply_preview: reply?.preview ?? null,
        reply_user_name: null,
        edited: false,
      }])
    } else if (filesToSend.length) {
      setLoading(true)
    }

    try {
      const finalContent = (encKey && content) ? await encryptMsg(content, encKey) : content
      for (const file of filesToSend) {
        const fd = new FormData()
        fd.append('file', file); fd.append('user_id', userId); fd.append('room_id', roomId)
        await fetch('/api/demo/upload', { method: 'POST', body: fd })
      }
      if (finalContent) {
        await fetch('/api/demo/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId, content: finalContent, room_id: roomId,
            reply_to_id: reply?.id ?? null,
            reply_preview: reply?.preview ?? null,
          }),
        })
      }
      broadcast()
      await fetchMessages()
    } catch {
      // remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } finally {
      setLoading(false)
    }
  }

  async function askAI() {
    if (!aiQuery.trim()) return
    const query = aiQuery.trim()
    setAiQuery('')
    setShowAIPanel(false)
    setAiTyping(true)
    try {
      await fetch('/api/demo/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, content: `@do ${query}`, room_id: roomId }),
      })
      channelRef.current?.send({ type: 'broadcast', event: 'msg', payload: {} })
      await fetchMessages()
      await fetch('/api/demo/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, query, room_id: roomId }),
      })
      channelRef.current?.send({ type: 'broadcast', event: 'msg', payload: {} })
      await fetchMessages()
    } catch {
      // ignore
    } finally {
      setAiTyping(false)
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      audioChunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.start()
      mediaRecorderRef.current = mr
      setIsRecording(true)
      setRecordingSeconds(0)
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch {
      alert('No se pudo acceder al micrófono')
    }
  }

  async function stopRecording() {
    const mr = mediaRecorderRef.current
    if (!mr) return
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    setIsRecording(false)
    setRecordingSeconds(0)

    await new Promise<void>(resolve => {
      mr.onstop = () => resolve()
      mr.stop()
      mr.stream.getTracks().forEach(t => t.stop())
    })

    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
    if (blob.size < 1000) return // too short

    setUploading(true)
    const formData = new FormData()
    formData.append('file', blob, `audio-${Date.now()}.webm`)
    formData.append('user_id', userId)
    formData.append('room_id', roomId)
    await fetch('/api/demo/upload', { method: 'POST', body: formData })
    channelRef.current?.send({ type: 'broadcast', event: 'msg', payload: {} })
    await fetchMessages()
    setUploading(false)
  }

  function cancelRecording() {
    const mr = mediaRecorderRef.current
    if (!mr) return
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    mr.stop()
    mr.stream.getTracks().forEach(t => t.stop())
    audioChunksRef.current = []
    setIsRecording(false)
    setRecordingSeconds(0)
  }

  async function fetchGroupInfo() {
    const [roomRes, contactsRes] = await Promise.all([
      fetch(`/api/demo/rooms?room_id=${roomId}`),
      fetch(`/api/demo/contacts?user_id=${userId}`),
    ])
    const { members, room: roomData } = await roomRes.json()
    const { contacts } = await contactsRes.json()
    setGroupMembers(members ?? [])
    setGroupCreatedBy(roomData?.created_by ?? null)
    const memberIds = new Set((members ?? []).map((m: any) => m.id))
    setGroupContacts((contacts ?? []).filter((c: any) => !memberIds.has(c.id)))
  }

  async function leaveGroup() {
    await fetch('/api/demo/rooms', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: roomId, remove_user_id: userId }),
    })
    onBack()
  }

  async function removeMember(memberId: string) {
    await fetch('/api/demo/rooms', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: roomId, remove_user_id: memberId }),
    })
    setGroupMembers(prev => prev.filter(m => m.id !== memberId))
  }

  async function addMembers() {
    if (!selectedToAdd.length) return
    setAddingMembers(true)
    await fetch('/api/demo/rooms', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: roomId, add_member_ids: selectedToAdd }),
    })
    await fetchGroupInfo()
    setSelectedToAdd([])
    setShowAddMembers(false)
    setAddingMembers(false)
  }

  async function saveGroupName() {
    if (!newGroupName.trim()) return
    setSavingGroupName(true)
    await fetch('/api/demo/rooms', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: roomId, name: newGroupName.trim() }),
    })
    setRoom(prev => prev ? { ...prev, name: newGroupName.trim() } : prev)
    setEditingGroupName(false)
    setSavingGroupName(false)
  }

  async function saveEdit() {
    if (!editingMsg || !editInput.trim()) return
    const plainContent = editInput.trim()
    const finalContent = (encKey && !isAIRoom) ? await encryptMsg(plainContent, encKey) : plainContent
    setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, content: finalContent, edited: true } : m))
    setEditingMsg(null)
    await fetch('/api/demo/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: editingMsg.id, content: finalContent, user_id: userId }),
    })
  }

  async function deleteMessage(messageId: string) {
    setMessages(prev => prev.filter(m => m.id !== messageId))
    setReactionPickerMsgId(null)
    await fetch('/api/demo/messages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: messageId, user_id: userId }),
    })
  }

  async function toggleReaction(messageId: string, emoji: string) {
    setReactionPickerMsgId(null)
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m
      const existing = m.reactions.find(r => r.emoji === emoji)
      if (existing) {
        const newUserIds = existing.user_ids.filter(id => id !== userId)
        return { ...m, reactions: newUserIds.length === 0 ? m.reactions.filter(r => r.emoji !== emoji) : m.reactions.map(r => r.emoji === emoji ? { ...r, user_ids: newUserIds } : r) }
      }
      return { ...m, reactions: [...m.reactions, { emoji, user_ids: [userId] }] }
    }))
    await fetch('/api/demo/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: messageId, user_id: userId, emoji, room_id: roomId }),
    })
  }

  // ── WebRTC call functions ───────────────────────────────────────────────────
  function cleanupCall() {
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    pcRef.current?.close()
    pcRef.current = null
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null }
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null }
    setCallState('idle')
    setIncomingOffer(null)
    setMuted(false)
    setCallSeconds(0)
    pendingCandidatesRef.current = []
  }

  function buildPC(): RTCPeerConnection {
    const pc = new RTCPeerConnection(RTC_CONFIG)
    pcRef.current = pc
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        channelRef.current?.send({ type: 'broadcast', event: 'call-ice', payload: { candidate: candidate.toJSON(), from: userId } })
      }
    }
    pc.ontrack = e => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = e.streams[0]
        remoteAudioRef.current.play().catch(() => {})
      }
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        channelRef.current?.send({ type: 'broadcast', event: 'call-end', payload: { from: userId } })
        cleanupCall()
      }
    }
    return pc
  }

  async function startCall() {
    if (callStateRef.current !== 'idle') return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream
      const pc = buildPC()
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      setCallState('calling')
      channelRef.current?.send({ type: 'broadcast', event: 'call-offer', payload: { sdp: offer.sdp, from: userId, callerName: me?.name ?? 'Usuario' } })
      // Auto-cancel if nobody answers in 30 seconds
      callTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current === 'calling') {
          channelRef.current?.send({ type: 'broadcast', event: 'call-end', payload: { from: userId } })
          cleanupCall()
        }
      }, 30000)
    } catch {
      cleanupCall()
      alert('No se pudo acceder al micrófono')
    }
  }

  async function acceptCall() {
    if (!incomingOffer) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream
      const pc = buildPC()
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      await pc.setRemoteDescription({ type: 'offer', sdp: incomingOffer.sdp })
      for (const c of pendingCandidatesRef.current) await pc.addIceCandidate(c).catch(() => {})
      pendingCandidatesRef.current = []
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      channelRef.current?.send({ type: 'broadcast', event: 'call-answer', payload: { sdp: answer.sdp, from: userId } })
      setIncomingOffer(null)
      setCallState('active')
      setCallSeconds(0)
      callTimerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000)
    } catch {
      rejectCall()
    }
  }

  function rejectCall() {
    channelRef.current?.send({ type: 'broadcast', event: 'call-reject', payload: { from: userId } })
    cleanupCall()
  }

  function endCall() {
    channelRef.current?.send({ type: 'broadcast', event: 'call-end', payload: { from: userId } })
    cleanupCall()
  }

  function toggleMute() {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setMuted(!track.enabled)
  }

  function fmtDuration(s: number) {
    const m = Math.floor(s / 60)
    return `${m}:${(s % 60).toString().padStart(2, '0')}`
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    if (isAIRoom) {
      // In AI room: attach as pending files, let user type their question first
      setPendingFiles(prev => [...prev, ...files])
    } else {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', files[0])
      formData.append('user_id', userId)
      formData.append('room_id', roomId)
      await fetch('/api/demo/upload', { method: 'POST', body: formData })
      channelRef.current?.send({ type: 'broadcast', event: 'msg', payload: {} })
      await fetchMessages()
      setUploading(false)
    }
    e.target.value = ''
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function DecryptedText({ content, isOwn }: { content: string; isOwn: boolean }) {
    const [text, setText] = useState<string | null>(null)
    useEffect(() => {
      if (!encKey) { setText('🔒 Mensaje cifrado'); return }
      decryptMsg(content, encKey).then(setText).catch(() => setText('🔒 Mensaje cifrado'))
    }, [content, encKey])
    if (text === null) return <span className="text-sm opacity-50">Descifrando…</span>
    const urlMatch = text.match(/https?:\/\/[^\s]+/)
    return (
      <div>
        <span className="whitespace-pre-wrap leading-relaxed text-sm">{renderInline(text)}</span>
        {urlMatch && <LinkPreview url={urlMatch[0]} isOwn={isOwn} />}
      </div>
    )
  }

  function renderContent(msg: DemoMessage, isOwn: boolean) {
    if (msg.type === 'audio') {
      return <AudioMessage url={msg.content} isOwn={isOwn} />
    }
    if (msg.type === 'image') {
      return (
        <a href={msg.content} target="_blank" rel="noopener noreferrer">
          <img src={msg.content} alt="imagen" className="max-w-[240px] rounded-2xl hover:opacity-90 transition-opacity" style={{ maxHeight: 260 }} />
        </a>
      )
    }
    if (msg.type === 'file') {
      try {
        const { url, name, size } = JSON.parse(msg.content)
        const ext = name.split('.').pop()?.toLowerCase() ?? ''
        const canConvert = ['xlsx', 'xls', 'csv', 'pdf', 'docx', 'doc', 'txt'].includes(ext)
        const isConverting = tableLoadingMsgId === msg.id
        return (
          <div className="flex flex-col gap-2 max-w-[260px]">
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <FileIcon className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                <p className="text-xs text-gray-400">{size != null ? `${Math.round(size / 1024)} KB` : 'Archivo'}</p>
              </div>
            </a>
            {canConvert && (
              <button
                onClick={async () => {
                  setTableLoadingMsgId(msg.id)
                  await fetch('/api/demo/file-to-table', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ file_url: url, file_name: name, room_id: roomId, user_id: userId }),
                  })
                  setTableLoadingMsgId(null)
                }}
                disabled={isConverting}
                className={`flex items-center justify-center gap-2 w-full rounded-xl px-3 py-2 text-xs font-medium transition-all border ${
                  isConverting
                    ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed'
                    : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 active:scale-95'
                }`}
              >
                {isConverting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Convirtiendo…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0c0 .621.504 1.125 1.125 1.125h15A1.125 1.125 0 0 0 21.75 8.25m-19.5 0v6.75" />
                    </svg>
                    Ver como tabla
                  </>
                )}
              </button>
            )}
          </div>
        )
      } catch {
        return <span className="text-sm text-gray-600">archivo adjunto</span>
      }
    }
    if (isEncrypted(msg.content)) return <DecryptedText content={msg.content} isOwn={isOwn} />
    const urlMatch = msg.content.match(/https?:\/\/[^\s]+/)
    return (
      <div>
        <span className="whitespace-pre-wrap leading-relaxed text-sm">{renderInline(msg.content)}</span>
        {urlMatch && <LinkPreview url={urlMatch[0]} isOwn={isOwn} />}
      </div>
    )
  }

  const roomData = room ?? { id: roomId, name: '…', emoji: '💬', type: 'dm' }
  if (!me) return null

  const isMedia = (type: string) => type === 'image' || type === 'file' || type === 'audio'

  const isDMRoom = !isAIRoom && (room?.type === 'dm' || roomId.startsWith('dm-'))

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto">
      {/* Hidden remote audio element */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

      {/* ── Incoming call sheet ───────────────────────────────────── */}
      {callState === 'incoming' && incomingOffer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl p-6 pb-10">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-4xl animate-pulse">
                📞
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Llamada entrante</p>
                <p className="text-xl font-bold text-gray-900">{incomingOffer.callerName}</p>
              </div>
              <div className="flex items-center justify-center gap-12 mt-2">
                <button
                  onClick={rejectCall}
                  className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8Z"/>
                    <line x1="4" y1="4" x2="20" y2="20" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </button>
                <button
                  onClick={acceptCall}
                  className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8Z"/>
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-400">Rechazar · Aceptar</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Active call overlay ───────────────────────────────────── */}
      {callState === 'active' && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-gray-900">
          <div className="flex flex-col items-center gap-5">
            <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-4xl">
              {room?.emoji ?? '👤'}
            </div>
            <div className="text-center">
              <p className="text-white text-xl font-semibold">{room?.name ?? 'Llamada'}</p>
              <p className="text-white/60 text-sm mt-1">{fmtDuration(callSeconds)}</p>
            </div>
          </div>
          <div className="absolute bottom-16 flex items-center gap-8">
            <button
              onClick={toggleMute}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${muted ? 'bg-white/20' : 'bg-white/10'}`}
            >
              {muted ? (
                <svg className="w-7 h-7 text-white/50" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63Zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71ZM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3ZM12 4 9.91 6.09 12 8.18V4Z"/>
                </svg>
              ) : (
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3Zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V21h2v-2.28c3.28-.49 6-3.3 6-6.72h-1.7Z"/>
                </svg>
              )}
              <span className="sr-only">{muted ? 'Activar mic' : 'Silenciar'}</span>
            </button>
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-xl active:scale-95 transition-transform"
            >
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8Z"/>
                <line x1="3" y1="3" x2="21" y2="21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
            <div className="w-16 h-16" /> {/* spacer for symmetry */}
          </div>
          <p className="absolute bottom-6 text-white/30 text-xs">{muted ? 'Micrófono silenciado' : 'Micrófono activo'}</p>
        </div>
      )}

      {/* ── Calling (ringing) overlay ─────────────────────────────── */}
      {callState === 'calling' && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-gray-900">
          <div className="flex flex-col items-center gap-5">
            <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-4xl animate-pulse">
              {room?.emoji ?? '👤'}
            </div>
            <div className="text-center">
              <p className="text-white text-xl font-semibold">{room?.name ?? '…'}</p>
              <p className="text-white/60 text-sm mt-1">Llamando…</p>
            </div>
          </div>
          <div className="absolute bottom-16">
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-xl active:scale-95 transition-transform"
            >
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8Z"/>
                <line x1="3" y1="3" x2="21" y2="21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-10">
        {showSearch ? (
          /* Search mode — full header replaced */
          (() => {
            const q = searchQuery.trim().toLowerCase()
            const matches = q ? messages.filter(m => (m.type === 'text' || m.type === 'ai') && m.content.toLowerCase().includes(q)) : []
            return (
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  <input
                    ref={searchRef}
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setMatchIdx(0) }}
                    placeholder="Buscar en este chat…"
                    className="flex-1 text-sm text-gray-800 bg-transparent focus:outline-none placeholder:text-gray-400 min-w-0"
                  />
                  {searchQuery ? (
                    <button onClick={() => setSearchQuery('')} className="text-gray-400 shrink-0">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" /></svg>
                    </button>
                  ) : null}
                </div>
                {matches.length > 0 && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <span className="text-xs text-gray-400 w-8 text-center">{matchIdx + 1}/{matches.length}</span>
                    <button onClick={() => {
                      const prev = (matchIdx - 1 + matches.length) % matches.length
                      setMatchIdx(prev)
                      matchRefs.current[messages.indexOf(matches[prev])]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
                    </button>
                    <button onClick={() => {
                      const next = (matchIdx + 1) % matches.length
                      setMatchIdx(next)
                      matchRefs.current[messages.indexOf(matches[next])]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                    </button>
                  </div>
                )}
                {searchQuery && matches.length === 0 && (
                  <span className="text-xs text-gray-400 shrink-0">Sin resultados</span>
                )}
                <button
                  onClick={() => { setShowSearch(false); setSearchQuery(''); setMatchIdx(0) }}
                  className="text-blue-600 text-sm font-medium shrink-0 pl-1"
                >
                  Listo
                </button>
              </div>
            )
          })()
        ) : (
          /* Normal header */
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors p-1 -ml-1">
              <ArrowLeftIcon className="h-5 w-5" />
            </button>

            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
              isAIRoom ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              {isAIRoom ? '✦' : roomData.emoji}
            </div>

            <button
              className="flex-1 min-w-0 text-left"
              onClick={() => {
                if (roomData.type === 'group') { fetchGroupInfo(); setShowGroupInfo(true) }
              }}
            >
              <h1 className="text-sm font-semibold text-gray-900">{isAIRoom ? 'do AI' : roomData.name}</h1>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                {isAIRoom ? 'Asistente inteligente' : roomData.type === 'group' ? `${groupMembers.length || '…'} participantes` : 'Chat privado'}
                {!isAIRoom && encReady && encKey && <span className="text-green-500 font-medium">· 🔒 Cifrado E2E</span>}
                {!isAIRoom && encReady && !encKey && <span className="text-yellow-500">· Sin cifrar</span>}
              </p>
            </button>

            {/* Call button — DM rooms only */}
            {isDMRoom && callState === 'idle' && (
              <button
                onClick={startCall}
                className="text-gray-400 hover:text-green-600 transition-colors p-1 shrink-0"
                title="Llamar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
              </button>
            )}

            <button
              onClick={() => { setShowSearch(true); setSearchQuery(''); setMatchIdx(0); setTimeout(() => searchRef.current?.focus(), 50) }}
              className="text-gray-400 hover:text-blue-600 transition-colors p-1 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </button>

            <div className="relative shrink-0">
              <button onClick={() => setShowExportMenu(v => !v)} className="text-gray-400 hover:text-blue-600 transition-colors p-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/></svg>
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden min-w-[168px]"
                  onMouseLeave={() => setShowExportMenu(false)}>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Exportar chat</p>
                  <button onClick={() => exportChat('pdf')} disabled={exporting}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                    {exporting ? 'Exportando…' : 'Exportar PDF'}
                  </button>
                  <button onClick={() => exportChat('docx')} disabled={exporting}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 border-t border-gray-100">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                    {exporting ? 'Exportando…' : 'Exportar Word'}
                  </button>
                </div>
              )}
            </div>

            {!isAIRoom && (
              <button
                onClick={() => { setShowAIPanel(true); setTimeout(() => aiInputRef.current?.focus(), 50) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shrink-0"
              >
                ✦ @do
              </button>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${isAIRoom ? 'bg-blue-100' : 'bg-gray-100'}`}>
              {isAIRoom ? '✦' : roomData.emoji}
            </div>
            <p className="text-gray-500 text-sm font-medium">{isAIRoom ? 'Cuéntame qué necesitas' : 'Sin mensajes aún'}</p>
            {isAIRoom && <p className="text-xs text-gray-400 max-w-[220px]">Puedo leer tus chats, resumirlos, extraer tareas y enviar mensajes</p>}
          </div>
        )}

        {(() => {
          const q = searchQuery.trim().toLowerCase()
          const searchMatchIds = showSearch && q
            ? new Set(messages.filter(m => (m.type === 'text' || m.type === 'ai') && m.content.toLowerCase().includes(q)).map(m => m.id))
            : new Set<string>()
          const searchMatchList = showSearch && q
            ? messages.filter(m => searchMatchIds.has(m.id))
            : []
          const activeMatchId = searchMatchList[matchIdx]?.id ?? null

          const lastOwnMsgId = [...messages].reverse().find(m => m.user_id === userId)?.id ?? null
          const readerCount = Object.keys(otherReads).length
          const anyReaderAfter = (msgCreatedAt: string) =>
            Object.values(otherReads).some(t => t >= msgCreatedAt)

          return messages.map((msg, i) => {
          const isOwn = msg.user_id === userId
          const isAI = msg.type === 'ai'
          const prevMsg = messages[i - 1]
          const showAvatar = !prevMsg || prevMsg.user_id !== msg.user_id || prevMsg.type !== msg.type
          const sender = usersCache[msg.user_id]
          const isSearchMatch = showSearch && q && searchMatchIds.has(msg.id)
          const isActiveMatch = isSearchMatch && msg.id === activeMatchId

          if (isAI) {
            return (
              <div key={msg.id} ref={el => { matchRefs.current[i] = el }} className={`flex items-start gap-2.5 py-1 max-w-[85%] ${isSearchMatch && !isActiveMatch ? 'opacity-60' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5 text-white text-sm">
                  ✦
                </div>
                <div className="space-y-1">
                  {showAvatar && <p className="text-xs text-gray-400 px-1">do AI · {formatMessageTime(msg.created_at)}</p>}
                  <div className={`border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm ${isActiveMatch ? 'bg-yellow-50' : 'bg-white'}`}>
                    <RenderAIContent content={msg.content} />
                  </div>
                </div>
              </div>
            )
          }

          const msgReactions = msg.reactions ?? []

          return (
            <div key={msg.id} ref={el => { matchRefs.current[i] = el }} className={`flex items-end gap-2 py-0.5 ${isOwn ? 'flex-row-reverse' : ''} ${isSearchMatch && !isActiveMatch ? 'opacity-60' : ''}`}>
              <div className="w-7 shrink-0">
                {showAvatar && (
                  <div className={`w-7 h-7 rounded-full ${sender?.bg ?? 'bg-gray-300'} flex items-center justify-center text-xs`}>
                    {sender?.emoji
                      ? sender.emoji
                      : <svg className="w-4 h-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    }
                  </div>
                )}
              </div>
              <div className={`max-w-[72%] space-y-0.5 ${isOwn ? 'items-end flex flex-col' : ''}`}>
                {showAvatar && !isOwn && (
                  <p className={`text-xs font-medium px-1 ${sender?.text ?? 'text-gray-500'}`}>
                    {msg.user?.name} · {formatMessageTime(msg.created_at)}
                  </p>
                )}
                {showAvatar && isOwn && (
                  <div className="flex items-center justify-end gap-1 px-1">
                    {msg.edited && <span className="text-xs text-gray-400 italic">Editado ·</span>}
                    <p className="text-xs text-gray-400">{formatMessageTime(msg.created_at)}</p>
                    {readerCount > 0 && anyReaderAfter(msg.created_at)
                      ? <span className="text-xs text-blue-400">✓✓</span>
                      : <span className="text-xs text-gray-400">✓✓</span>
                    }
                  </div>
                )}
                {msg.id === lastOwnMsgId && readerCount > 0 && anyReaderAfter(msg.created_at) && (
                  <div className="flex justify-end gap-0.5 px-1 mt-0.5">
                    {Object.keys(otherReads).filter(uid => otherReads[uid] >= msg.created_at).map(uid => (
                      <span key={uid} className={`w-4 h-4 rounded-full ${usersCache[uid]?.bg ?? 'bg-gray-300'} flex items-center justify-center text-[9px]`} title={usersCache[uid]?.name ?? uid}>
                        {usersCache[uid]?.emoji || '👤'}
                      </span>
                    ))}
                  </div>
                )}
                <div
                  onMouseDown={() => { longPressRef.current = setTimeout(() => setReactionPickerMsgId(msg.id), 500) }}
                  onMouseUp={() => { if (longPressRef.current) clearTimeout(longPressRef.current) }}
                  onMouseLeave={() => { if (longPressRef.current) clearTimeout(longPressRef.current) }}
                  onTouchStart={() => { longPressRef.current = setTimeout(() => setReactionPickerMsgId(msg.id), 500) }}
                  onTouchEnd={() => { if (longPressRef.current) clearTimeout(longPressRef.current) }}
                >
                  {isMedia(msg.type) ? (
                    <div>
                      {msg.reply_preview && (
                        <div className={`mb-1 px-3 py-1.5 rounded-xl border-l-2 text-xs ${isOwn ? 'bg-blue-700/50 border-white/50 text-white/80' : 'bg-gray-100 border-blue-400 text-gray-500'}`}>
                          <p className="font-semibold">{msg.reply_user_name}</p>
                          <p className="truncate">{msg.reply_preview}</p>
                        </div>
                      )}
                      {renderContent(msg, isOwn)}
                    </div>
                  ) : (
                    <div className={`px-3.5 py-2.5 rounded-2xl ${
                      isOwn
                        ? `bg-blue-600 text-white rounded-br-sm${isActiveMatch ? ' outline outline-2 outline-yellow-400 outline-offset-1' : ''}`
                        : `bg-white text-gray-800 rounded-bl-sm shadow-sm${isActiveMatch ? ' border-2 border-yellow-400' : ' border border-gray-100'}`
                    }`}>
                      {msg.reply_preview && (
                        <div className={`mb-2 px-2.5 py-1.5 rounded-xl border-l-2 text-xs ${isOwn ? 'bg-blue-700/50 border-white/50 text-white/80' : 'bg-gray-100 border-blue-400 text-gray-500'}`}>
                          <p className="font-semibold">{msg.reply_user_name}</p>
                          <p className="truncate">{msg.reply_preview}</p>
                        </div>
                      )}
                      {renderContent(msg, isOwn)}
                    </div>
                  )}
                </div>
                {/* Reactions */}
                {msgReactions.length > 0 && (
                  <div className={`flex flex-wrap gap-1 px-1 ${isOwn ? 'justify-end' : ''}`}>
                    {msgReactions.map(r => (
                      <button key={r.emoji} onClick={() => toggleReaction(msg.id, r.emoji)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                          r.user_ids.includes(userId)
                            ? 'bg-blue-100 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}>
                        <span>{r.emoji}</span>
                        {r.user_ids.length > 1 && <span className="font-medium">{r.user_ids.length}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {/* Emoji picker + reply */}
                {reactionPickerMsgId === msg.id && (
                  <div className={`flex items-center gap-1 bg-white rounded-2xl shadow-xl border border-gray-100 px-2 py-2 ${isOwn ? 'self-end' : ''}`}>
                    {['👍','❤️','😂','😮','😢','🔥','👏','🙏'].map(e => (
                      <button key={e} onClick={() => toggleReaction(msg.id, e)}
                        className="text-xl hover:scale-125 transition-transform active:scale-110 px-0.5">
                        {e}
                      </button>
                    ))}
                    <div className="w-px h-5 bg-gray-200 mx-1" />
                    <button onClick={() => {
                      const preview = msg.type === 'text' ? msg.content.slice(0, 80) : msg.type === 'image' ? 'Imagen' : msg.type === 'audio' ? 'Audio' : 'Archivo'
                      setReplyingTo({ id: msg.id, preview, userName: msg.user?.name ?? 'Usuario' })
                      setReactionPickerMsgId(null)
                    }} className="flex items-center gap-1 px-2 py-1 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                      <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                      </svg>
                      <span className="text-xs text-gray-600 font-medium">Responder</span>
                    </button>
                    {isOwn && msg.type === 'text' && (
                      <button onClick={() => { setEditInput(msg.content); setEditingMsg({ id: msg.id, content: msg.content }); setReactionPickerMsgId(null) }}
                        className="flex items-center gap-1 px-2 py-1 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                        <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                        </svg>
                        <span className="text-xs text-gray-600 font-medium">Editar</span>
                      </button>
                    )}
                    {isOwn && (
                      <button onClick={() => deleteMessage(msg.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-xl bg-red-50 hover:bg-red-100 transition-colors">
                        <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                        <span className="text-xs text-red-500 font-medium">Eliminar</span>
                      </button>
                    )}
                    <button onClick={() => setReactionPickerMsgId(null)} className="text-gray-400 hover:text-gray-600 ml-0.5 p-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })
        })()}

        {aiTyping && (
          <div className="flex items-center gap-2.5 py-1">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm shrink-0">✦</div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* @do AI Panel */}
      {showAIPanel && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowAIPanel(false)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white">✦</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">do AI</p>
                <p className="text-xs text-gray-400">¿Qué necesitás de este chat?</p>
              </div>
              <button onClick={() => { setShowAIPanel(false); setAiQuery('') }} className="text-gray-400 hover:text-gray-600">
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {['Resumir este chat', 'Extraer tareas', 'Buscar acuerdos', 'Generar reporte'].map(s => (
                  <button
                    key={s}
                    onClick={() => setAiQuery(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors bg-gray-50"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 items-end bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-400 px-3.5 py-2.5 transition-colors">
                <TextareaAutosize
                  ref={aiInputRef}
                  value={aiQuery}
                  onChange={e => setAiQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAI() } }}
                  placeholder="Ej: resume los pendientes, extrae compromisos…"
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none min-h-[20px] max-h-28 py-0.5"
                  minRows={1}
                  maxRows={4}
                />
                <button
                  onClick={askAI}
                  disabled={!aiQuery.trim()}
                  className="h-8 w-8 shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl flex items-center justify-center transition-colors"
                >
                  <SendHorizonalIcon className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
            <div className="h-6" />
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 pb-6">
        {editingMsg && (
          <div className="flex items-end gap-2 bg-blue-50 rounded-2xl border border-blue-200 px-3.5 py-2 mb-2">
            <div className="flex-1">
              <p className="text-xs text-blue-500 font-medium mb-1">Editando mensaje</p>
              <TextareaAutosize
                autoFocus
                value={editInput}
                onChange={e => setEditInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() } if (e.key === 'Escape') setEditingMsg(null) }}
                className="w-full bg-transparent text-sm text-gray-800 resize-none focus:outline-none min-h-[20px] max-h-32 py-0.5"
                minRows={1} maxRows={4}
              />
            </div>
            <div className="flex gap-1 mb-0.5 shrink-0">
              <button onClick={() => setEditingMsg(null)} className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
              <button onClick={saveEdit} disabled={!editInput.trim()}
                className="h-8 w-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 rounded-xl flex items-center justify-center transition-colors">
                <SendHorizonalIcon className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        )}
        {replyingTo && (
          <div className="flex items-start gap-2 mb-2 bg-blue-50 rounded-xl px-3 py-2 border-l-2 border-blue-500">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-blue-600">{replyingTo.userName}</p>
              <p className="text-xs text-gray-500 truncate">{replyingTo.preview}</p>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600 shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {uploading && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-400">Subiendo…</span>
          </div>
        )}
        {isRecording ? (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-3.5 py-2.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            {/* Animated waveform bars */}
            <div className="flex items-center gap-0.5 h-6">
              {(['4px','10px','7px','12px','6px','9px','5px'] as const).map((h, i) => (
                <span key={i} className="w-0.5 rounded-full bg-red-400 animate-bounce"
                  style={{ height: h, animationDelay: `${i * 80}ms`, animationDuration: '600ms' }} />
              ))}
            </div>
            <span className="text-sm font-medium text-red-600 flex-1 tabular-nums">
              {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}
            </span>
            <button onClick={cancelRecording} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">
              ✕
            </button>
            <button onClick={stopRecording}
              className="h-8 w-8 shrink-0 bg-red-500 hover:bg-red-600 rounded-xl flex items-center justify-center transition-colors">
              <StopCircleIcon className="h-4 w-4 text-white" />
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 focus-within:border-blue-400 bg-gray-50 transition-colors overflow-hidden">
            {/* Pending file chips — AI room only */}
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-3 pt-2.5 pb-1">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-xl px-2.5 py-1 max-w-[200px]">
                    <FileIcon className="h-3 w-3 text-blue-500 shrink-0" />
                    <span className="text-xs text-blue-700 truncate font-medium">{f.name}</span>
                    <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                      className="text-blue-400 hover:text-blue-600 shrink-0">
                      <XIcon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2 px-3.5 py-2">
              <button onClick={() => fileRef.current?.click()} disabled={uploading || aiTyping}
                className="h-8 w-8 mb-0.5 shrink-0 text-gray-400 hover:text-blue-500 disabled:opacity-40 flex items-center justify-center transition-colors">
                <PaperclipIcon className="h-4 w-4" />
              </button>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg,.gif,.webp" multiple className="hidden" onChange={handleFile} />
              <TextareaAutosize
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={isAIRoom ? (pendingFiles.length > 0 ? '¿Qué quieres hacer con este archivo?' : 'Adjunta un archivo o pregúntame algo…') : 'Escribe un mensaje…'}
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none min-h-[20px] max-h-32 py-1"
                minRows={1}
                maxRows={4}
                autoFocus
              />
              {(input.trim() || pendingFiles.length > 0) ? (
                <button onClick={send} disabled={loading}
                  className="h-8 w-8 mb-0.5 shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors">
                  <SendHorizonalIcon className="h-4 w-4 text-white" />
                </button>
              ) : !isAIRoom ? (
                <button onClick={startRecording} disabled={uploading}
                  className="h-8 w-8 mb-0.5 shrink-0 text-gray-400 hover:text-blue-500 disabled:opacity-40 flex items-center justify-center transition-colors">
                  <MicIcon className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={send} disabled={!input.trim() || loading}
                  className="h-8 w-8 mb-0.5 shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors">
                  <SendHorizonalIcon className="h-4 w-4 text-white" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Group info panel */}
      {showGroupInfo && roomData.type === 'group' && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-gray-100">
            <button onClick={() => { setShowGroupInfo(false); setShowAddMembers(false); setEditingGroupName(false) }} className="text-blue-600 font-medium text-sm">Cerrar</button>
            <h2 className="flex-1 text-center text-base font-semibold text-gray-900">Info del grupo</h2>
            <div className="w-16" />
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50">
            {/* Group avatar + name */}
            <div className="flex flex-col items-center py-8 bg-white border-b border-gray-100">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-4xl mb-3">👥</div>
              {editingGroupName ? (
                <div className="flex items-center gap-2">
                  <input autoFocus value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                    className="text-lg font-bold text-gray-900 text-center bg-transparent border-b-2 border-blue-400 focus:outline-none px-2 pb-1 w-48"
                    onKeyDown={e => e.key === 'Enter' && saveGroupName()} />
                  <button onClick={saveGroupName} disabled={savingGroupName || !newGroupName.trim()}
                    className="text-sm text-blue-600 font-semibold disabled:opacity-40">
                    {savingGroupName ? '…' : 'OK'}
                  </button>
                </div>
              ) : (
                <button onClick={() => { setNewGroupName(roomData.name); setEditingGroupName(true) }}
                  className="flex items-center gap-1.5 group">
                  <p className="text-lg font-bold text-gray-900">{roomData.name}</p>
                  <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                  </svg>
                </button>
              )}
              <p className="text-sm text-gray-400 mt-1">Grupo · {groupMembers.length} participantes</p>
            </div>

            {/* Members */}
            <div className="mt-3 bg-white">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{groupMembers.length} participantes</p>
                <button onClick={() => setShowAddMembers(v => !v)}
                  className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Agregar
                </button>
              </div>

              {/* Add members picker */}
              {showAddMembers && groupContacts.length > 0 && (
                <div className="border-b border-gray-100 bg-blue-50 px-4 py-3">
                  <p className="text-xs text-blue-600 font-medium mb-2">Selecciona contactos para agregar</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {groupContacts.map(c => {
                      const sel = selectedToAdd.includes(c.id)
                      return (
                        <button key={c.id} onClick={() => setSelectedToAdd(prev => sel ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                          className="w-full flex items-center gap-3 py-2 text-left">
                          <div className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center text-sm text-white shrink-0`}>{c.emoji}</div>
                          <span className="flex-1 text-sm text-gray-800">{c.name}</span>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${sel ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                            {sel && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  {selectedToAdd.length > 0 && (
                    <button onClick={addMembers} disabled={addingMembers}
                      className="mt-2 w-full py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40">
                      {addingMembers ? 'Agregando…' : `Agregar ${selectedToAdd.length} participante${selectedToAdd.length > 1 ? 's' : ''}`}
                    </button>
                  )}
                </div>
              )}
              {showAddMembers && groupContacts.length === 0 && (
                <p className="text-sm text-gray-400 px-5 py-3 border-b border-gray-100">Todos tus contactos ya están en el grupo</p>
              )}

              {/* Member list */}
              <div className="divide-y divide-gray-50">
                {groupMembers.map(member => (
                  <div key={member.id} className="flex items-center gap-3 px-5 py-3">
                    <div className={`w-10 h-10 rounded-full ${member.bg} flex items-center justify-center text-lg text-white shrink-0`}>{member.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{member.name}</p>
                      {member.id === groupCreatedBy && <p className="text-xs text-blue-500">Admin</p>}
                      {member.id === userId && <p className="text-xs text-gray-400">Tú</p>}
                    </div>
                    {member.id !== userId && groupCreatedBy === userId && (
                      <button onClick={() => removeMember(member.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium">Eliminar</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Leave group */}
            <div className="mt-3 bg-white">
              <button onClick={leaveGroup}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-red-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-red-500">Salir del grupo</p>
              </button>
            </div>

            <div className="h-8" />
          </div>
        </div>
      )}
    </div>
  )
}
