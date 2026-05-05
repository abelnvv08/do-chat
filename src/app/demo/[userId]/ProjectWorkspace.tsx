'use client'

import { useEffect, useRef, useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { formatMessageTime } from '@/lib/utils'
import { supabase } from '@/lib/supabase-client'

type ProjectFile = { name: string; url: string; size: number; fileType: string }
type Project = { id: string; title: string; instructions: string; project_files: ProjectFile[]; created_at: string }
type Message = { id: string; content: string; type: string; created_at: string }

function fileColor(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['pdf'].includes(ext)) return 'bg-red-100 text-red-600'
  if (['doc', 'docx'].includes(ext)) return 'bg-blue-100 text-blue-600'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'bg-green-100 text-green-600'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'bg-purple-100 text-purple-600'
  return 'bg-gray-100 text-gray-600'
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const label = ext.toUpperCase().slice(0, 4)
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-bold ${fileColor(name)}`}>
      {label}
    </div>
  )
}

function renderContent(text: string) {
  return text.split('\n').map((line, i) => {
    const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const bold = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    return <p key={i} className="text-sm text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: bold || '&nbsp;' }} />
  })
}

export function ProjectWorkspace({ userId, project: initial, onClose, onUpdate }: {
  userId: string
  project: Project
  onClose: () => void
  onUpdate: (p: Project) => void
}) {
  const [project, setProject] = useState(initial)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [aiTyping, setAiTyping] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState(initial.title)
  const [editingInstructions, setEditingInstructions] = useState(false)
  const [instructionsVal, setInstructionsVal] = useState(initial.instructions ?? '')
  const [savingMeta, setSavingMeta] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const roomId = `project-${project.id}`

  useEffect(() => { fetchMessages() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, aiTyping])

  async function fetchMessages() {
    const res = await fetch(`/api/demo/messages?room=${roomId}&user_id=${userId}`)
    const data = await res.json()
    setMessages(data.messages ?? [])
  }

  async function send() {
    if (!input.trim() || aiTyping) return
    const q = input.trim()
    setInput('')
    setMessages(prev => [...prev, { id: Date.now().toString(), content: q, type: 'text', created_at: new Date().toISOString() }])
    setAiTyping(true)
    await fetch('/api/demo/project-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, project_id: project.id, query: q }),
    })
    await fetchMessages()
    setAiTyping(false)
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('user_id', userId)
    fd.append('room_id', roomId)
    const res = await fetch('/api/demo/upload', { method: 'POST', body: fd })
    const data = await res.json()
    e.target.value = ''
    if (data.message?.content) {
      try {
        const meta = JSON.parse(data.message.content)
        const newFile: ProjectFile = { name: file.name, url: meta.url, size: file.size, fileType: file.type }
        const updated = { ...project, project_files: [...(project.project_files ?? []), newFile] }
        await fetch('/api/demo/projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: project.id, project_files: updated.project_files }) })
        setProject(updated); onUpdate(updated)
      } catch { /* skip */ }
    }
    setUploading(false)
  }

  async function removeFile(idx: number) {
    const updated = { ...project, project_files: project.project_files.filter((_, i) => i !== idx) }
    await fetch('/api/demo/projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: project.id, project_files: updated.project_files }) })
    setProject(updated); onUpdate(updated)
  }

  async function saveMeta() {
    setSavingMeta(true)
    const updated = { ...project, title: titleVal.trim() || project.title, instructions: instructionsVal }
    await fetch('/api/demo/projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: project.id, title: updated.title, instructions: updated.instructions }) })
    setProject(updated); onUpdate(updated)
    setEditingTitle(false); setEditingInstructions(false)
    setSavingMeta(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" style={{ animation: 'slideInFromRight 0.22s cubic-bezier(0.4,0,0.2,1)' }}>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={onClose} className="p-1 -ml-1 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          {editingTitle ? (
            <input autoFocus value={titleVal} onChange={e => setTitleVal(e.target.value)}
              onBlur={saveMeta} onKeyDown={e => e.key === 'Enter' && saveMeta()}
              className="flex-1 text-lg font-bold text-gray-900 focus:outline-none border-b-2 border-blue-400 pb-0.5" />
          ) : (
            <button onClick={() => setEditingTitle(true)} className="flex-1 text-left">
              <h1 className="text-lg font-bold text-gray-900 truncate">{project.title}</h1>
            </button>
          )}
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-white shrink-0 disabled:opacity-40">
            {uploading
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg,.gif,.webp" className="hidden" onChange={uploadFile} />
        </div>
        <p className="text-xs text-gray-400 ml-9">{project.project_files?.length ?? 0} archivo{(project.project_files?.length ?? 0) !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50">

        {/* Files section */}
        {(project.project_files?.length ?? 0) > 0 && (
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Archivos del proyecto</p>
            <div className="space-y-2">
              {project.project_files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-3 py-2.5 shadow-sm">
                  <FileIcon name={f.name} />
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                    <p className="text-xs text-gray-400">{f.size ? `${Math.round(f.size / 1024)} KB` : ''}</p>
                  </a>
                  <button onClick={() => removeFile(i)} className="text-gray-300 hover:text-red-400 p-1 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="px-4 pt-3 pb-2">
          <button onClick={() => setEditingInstructions(!editingInstructions)}
            className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 w-full text-left">
            <span>Instrucciones</span>
            <svg className={`w-3 h-3 transition-transform ${editingInstructions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
          </button>
          {editingInstructions ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-3">
              <TextareaAutosize
                value={instructionsVal}
                onChange={e => setInstructionsVal(e.target.value)}
                placeholder="Ej: Eres un analista financiero. Siempre responde con tablas cuando sea posible. Usa un tono profesional."
                className="w-full text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none resize-none bg-transparent"
                minRows={3} maxRows={8} autoFocus
              />
              <div className="flex justify-end gap-3 mt-2 pt-2 border-t border-gray-100">
                <button onClick={() => setEditingInstructions(false)} className="text-sm text-gray-400">Cancelar</button>
                <button onClick={saveMeta} disabled={savingMeta} className="text-sm text-blue-600 font-semibold disabled:opacity-40">
                  {savingMeta ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          ) : project.instructions ? (
            <button onClick={() => setEditingInstructions(true)} className="w-full text-left bg-white rounded-2xl border border-gray-200 px-3 py-2.5 shadow-sm">
              <p className="text-sm text-gray-600 line-clamp-2">{project.instructions}</p>
            </button>
          ) : (
            <button onClick={() => setEditingInstructions(true)} className="w-full text-left bg-white rounded-2xl border border-dashed border-gray-300 px-3 py-2.5 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors">
              + Agregar instrucciones para la IA…
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="px-4 py-2">
          <div className="border-t border-gray-200" />
        </div>

        {/* Chat messages */}
        <div className="px-4 pb-4 space-y-3">
          {messages.length === 0 && !aiTyping && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl">✦</div>
              <p className="text-sm font-medium text-gray-600">do AI está listo para ayudarte</p>
              <p className="text-xs text-gray-400">Hazme una pregunta sobre tus archivos o pídeme una acción</p>
            </div>
          )}
          {messages.filter(msg => msg.type === 'text' || msg.type === 'ai').map(msg => {
            const isAI = msg.type === 'ai'
            return (
              <div key={msg.id} className={`flex gap-2.5 ${isAI ? '' : 'flex-row-reverse'}`}>
                {isAI && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm shrink-0 mt-0.5">✦</div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${isAI ? 'bg-white border border-gray-100 rounded-tl-sm' : 'bg-blue-600 rounded-tr-sm'}`}>
                  <div className={isAI ? '' : 'text-white'}>
                    {isAI ? renderContent(msg.content) : <p className="text-sm text-white">{msg.content}</p>}
                  </div>
                  <p className={`text-[10px] mt-1.5 ${isAI ? 'text-gray-400' : 'text-blue-200'}`}>{formatMessageTime(msg.created_at)}</p>
                </div>
              </div>
            )
          })}
          {aiTyping && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm shrink-0">✦</div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center h-4">
                  {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 pb-6 pt-2 bg-white border-t border-gray-100">
        <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-400 px-3.5 py-2 transition-colors">
          <TextareaAutosize
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Pregunta sobre tus archivos o pide una acción…"
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none min-h-[20px] max-h-32 py-1"
            minRows={1} maxRows={4}
          />
          <button onClick={send} disabled={!input.trim() || aiTyping}
            className="h-8 w-8 mb-0.5 shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 rounded-xl flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
