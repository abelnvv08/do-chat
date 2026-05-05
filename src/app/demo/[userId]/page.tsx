'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usersCache, type Room } from '@/lib/demo'
import { formatMessageTime } from '@/lib/utils'
import { supabase } from '@/lib/supabase-client'
import { RoomView } from './RoomView'

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'w-5 h-5 text-white/80'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
    </svg>
  )
}

function Avatar({ emoji, bg, size = 'md' }: { emoji: string; bg: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-12 h-12 text-xl' : size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-lg'
  const iconClass = size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center shrink-0 ${bg} text-white`}>
      {emoji ? emoji : <UserIcon className={`${iconClass} text-white/80`} />}
    </div>
  )
}

type RoomWithMeta = Room & {
  lastMsg: { content: string; created_at: string; user_id: string } | null
  unread: number
  seenByOthers: boolean
}
type RoomPref = { room_id: string; pinned: boolean; archived: boolean; deleted: boolean; muted_until: string | null }
type SearchResult = {
  id: string; room_id: string; room_name: string; room_emoji: string
  sender_name: string; sender_emoji: string; preview: string
  type: string; created_at: string; fileInfo: { name: string; url: string } | null
}
type Contact = { id: string; name: string; firstName: string; lastName: string; emoji: string; bg: string; room_id: string }
type Task = { id: string; content: string; done: boolean; created_at: string; source_room: string | null; due_date: string | null }
type Reminder = { id: string; content: string; remind_at: string }
type Project = { id: string; title: string; content: string; created_at: string }
type FileEntry = { id: string; name: string; url: string; size: number | null; type: 'file' | 'image'; room_id: string; created_at: string; sender: string; sender_emoji: string }

type Tab = 'chats' | 'projects' | 'docs' | 'tu'

const COUNTRY_CODES = [
  { code: '+52', label: '🇲🇽 +52' },
  { code: '+1',  label: '🇺🇸 +1'  },
  { code: '+54', label: '🇦🇷 +54' },
  { code: '+57', label: '🇨🇴 +57' },
  { code: '+34', label: '🇪🇸 +34' },
]

export default function ChatListPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()

  // Core
  const [activeTab, setActiveTab] = useState<Tab>('chats')
  const [profile, setProfile] = useState<{ name: string; username?: string; emoji: string; bg: string } | null>(null)
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)

  // Chats tab
  const [rooms, setRooms] = useState<RoomWithMeta[]>([])
  const [prefs, setPrefs] = useState<RoomPref[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [actionRoom, setActionRoom] = useState<RoomWithMeta | null>(null)
  const [dueReminder, setDueReminder] = useState<{ id: string; content: string } | null>(null)
  const [reminderVisible, setReminderVisible] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])

  // + menu
  const [showNewMenu, setShowNewMenu] = useState(false)
  const [showNewContact, setShowNewContact] = useState(false)
  const [ncUsername, setNcUsername] = useState('')
  const [ncFound, setNcFound] = useState<{ id: string; name: string; emoji: string; bg: string } | null>(null)
  const [ncSearching, setNcSearching] = useState(false)
  const [ncError, setNcError] = useState('')
  const [ncSaving, setNcSaving] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [ngName, setNgName] = useState('')
  const [ngSelected, setNgSelected] = useState<string[]>([])
  const [ngCreating, setNgCreating] = useState(false)
  const [ngError, setNgError] = useState('')

  // Tasks tab
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskReminders, setTaskReminders] = useState<Reminder[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasksFetched, setTasksFetched] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [showDailyPanel, setShowDailyPanel] = useState(false)

  // Projects tab
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsFetched, setProjectsFetched] = useState(false)
  const [expandedProject, setExpandedProject] = useState<string | null>(null)

  // Docs tab
  const [files, setFiles] = useState<FileEntry[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesFetched, setFilesFetched] = useState(false)
  const [fileFilter, setFileFilter] = useState<'all' | 'file' | 'image'>('all')
  const [fileSearch, setFileSearch] = useState('')
  const [docsUploading, setDocsUploading] = useState(false)
  const docsFileRef = useRef<HTMLInputElement>(null)

  // Perfil tab
  const [icalUrl, setIcalUrl] = useState('')
  const [icalSaved, setIcalSaved] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [editingUsername, setEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tasksIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/auth/profile').then(r => r.json()).then(d => {
      if (d.profile) {
        usersCache[userId] = { name: d.profile.name, emoji: d.profile.emoji, bg: d.profile.bg, text: 'text-white', border: 'border-white/20' }
        setProfile(d.profile)
      } else {
        router.push('/onboarding')
      }
    })
    fetchRooms()
    fetchPrefs()
    fetchContacts()
    checkReminders()
    registerPush()
    const reminderInterval = setInterval(checkReminders, 30000)
    const fallback = setInterval(fetchRooms, 30000)
    return () => { clearInterval(reminderInterval); clearInterval(fallback) }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return }
    debounceRef.current = setTimeout(doSearch, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery])

  useEffect(() => {
    if (showDailyPanel) {
      tasksIntervalRef.current = setInterval(() => { fetchTasks(); fetchTaskReminders() }, 4000)
    } else {
      if (tasksIntervalRef.current) { clearInterval(tasksIntervalRef.current); tasksIntervalRef.current = null }
    }
    if (activeTab === 'projects' && !projectsFetched) { setProjectsFetched(true); setProjectsLoading(true); fetchProjects() }
    if (activeTab === 'docs' && !filesFetched) { setFilesFetched(true); setFilesLoading(true); fetchFiles() }
    if (activeTab === 'tu') {
      setIcalUrl(localStorage.getItem(`ical_${userId}`) ?? '')
      setDarkMode(localStorage.getItem('dark_mode') === '1')
    }
    return () => { if (tasksIntervalRef.current) { clearInterval(tasksIntervalRef.current); tasksIntervalRef.current = null } }
  }, [activeTab])

  // Chats functions
  async function fetchRooms() {
    try {
      const res = await fetch(`/api/demo/chat-list?user_id=${userId}`)
      const { rooms: r } = await res.json()
      setRooms(r ?? [])
    } finally { setLoading(false) }
  }
  async function fetchContacts() {
    const res = await fetch(`/api/demo/contacts?user_id=${userId}`)
    const data = await res.json()
    setContacts(data.contacts ?? [])
  }
  async function fetchPrefs() {
    try {
      const res = await fetch(`/api/demo/room-prefs?user_id=${userId}`)
      const { prefs: p } = await res.json()
      setPrefs(p ?? [])
    } catch { /* ignore */ }
  }
  async function setPref(room_id: string, update: Partial<Omit<RoomPref, 'room_id'>>) {
    setPrefs(prev => {
      const existing = prev.find(p => p.room_id === room_id)
      if (existing) return prev.map(p => p.room_id === room_id ? { ...p, ...update } : p)
      return [...prev, { room_id, pinned: false, archived: false, deleted: false, muted_until: null, ...update }]
    })
    await fetch('/api/demo/room-prefs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, room_id, ...update }) })
  }
  function getPref(room_id: string): RoomPref {
    return prefs.find(p => p.room_id === room_id) ?? { room_id, pinned: false, archived: false, deleted: false, muted_until: null }
  }
  async function registerPush() {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
      const reg = await navigator.serviceWorker.register('/sw.js')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
      const existing = await reg.pushManager.getSubscription()
      const sub = existing ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY })
      await fetch('/api/demo/push-subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, subscription: sub.toJSON() }) })
    } catch { /* ignore */ }
  }
  useEffect(() => {
    if (!dueReminder) { setReminderVisible(false); return }
    setReminderVisible(true)
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Recordatorio', { body: dueReminder.content, icon: '/favicon.ico' })
    }
    const t = setTimeout(() => dismissGlobalReminder(dueReminder.id), 8000)
    return () => clearTimeout(t)
  }, [dueReminder?.id])
  async function checkReminders() {
    try {
      const [remRes] = await Promise.all([
        fetch(`/api/demo/reminders?user_id=${userId}`),
        fetch('/api/demo/push-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId }) }),
      ])
      const { reminders } = await remRes.json()
      const now = new Date()
      const due = (reminders ?? []).find((r: { remind_at: string }) => new Date(r.remind_at) <= now)
      if (due) setDueReminder(due)
    } catch { /* ignore */ }
  }
  async function dismissGlobalReminder(id: string) {
    setReminderVisible(false)
    setTimeout(() => setDueReminder(null), 300)
    await fetch('/api/demo/reminders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
  }
  async function doSearch() {
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/demo/search?user_id=${userId}&q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setSearchResults(data.results ?? [])
    } finally { setSearchLoading(false) }
  }

  // New contact
  async function ncSearchUsername() {
    const clean = ncUsername.replace(/^@/, '').trim()
    if (clean.length < 3) { setNcError('Ingresa un usuario válido'); return }
    setNcSearching(true); setNcError(''); setNcFound(null)
    try {
      const res = await fetch(`/api/auth/users?username=${encodeURIComponent(clean)}&exclude=${userId}`)
      const data = await res.json()
      if (data.user) setNcFound(data.user)
      else setNcError('No se encontró ningún usuario con ese @')
    } catch { setNcError('Error al buscar') }
    finally { setNcSearching(false) }
  }
  async function ncSave() {
    if (!ncFound) { setNcError('Busca un usuario primero'); return }
    setNcSaving(true); setNcError('')
    try {
      const res = await fetch('/api/demo/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, contact_id: ncFound.id }) })
      const data = await res.json()
      if (!res.ok) { setNcError(data.error ?? 'Error al guardar'); return }
      setShowNewContact(false)
      resetNc()
      await Promise.all([fetchContacts(), fetchRooms()])
      if (data.contact?.room_id) setActiveRoomId(data.contact.room_id)
    } finally { setNcSaving(false) }
  }
  function resetNc() { setNcUsername(''); setNcFound(null); setNcError('') }

  // New group
  async function createGroup() {
    if (!ngName.trim()) { setNgError('Ingresa un nombre para el grupo'); return }
    if (ngSelected.length === 0) { setNgError('Selecciona al menos un contacto'); return }
    setNgCreating(true); setNgError('')
    try {
      const res = await fetch('/api/demo/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, name: ngName.trim(), member_ids: ngSelected }) })
      const data = await res.json()
      if (!res.ok) { setNgError(data.error ?? 'Error al crear'); return }
      setShowNewGroup(false); setNgName(''); setNgSelected([])
      await fetchRooms()
      setActiveRoomId(data.room_id)
    } finally { setNgCreating(false) }
  }

  // Tasks functions
  async function fetchTasks() {
    try {
      const res = await fetch(`/api/demo/tasks?user_id=${userId}`)
      const { tasks: t } = await res.json()
      setTasks(t ?? [])
    } finally { setTasksLoading(false) }
  }
  async function fetchTaskReminders() {
    try {
      const res = await fetch(`/api/demo/reminders?user_id=${userId}`)
      const { reminders: r } = await res.json()
      setTaskReminders(r ?? [])
    } catch { /* ignore */ }
  }
  async function dismissTaskReminder(id: string) {
    setTaskReminders(prev => prev.filter(r => r.id !== id))
    await fetch('/api/demo/reminders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
  }
  async function toggleDone(id: string, done: boolean) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done } : t))
    await fetch('/api/demo/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, done }) })
  }
  async function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
    await fetch('/api/demo/tasks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
  }
  async function addTask() {
    if (!newTask.trim()) return
    setAddingTask(true)
    const res = await fetch('/api/demo/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, content: newTask.trim(), due_date: newDueDate || null }) })
    const { task } = await res.json()
    if (task) setTasks(prev => [task, ...prev])
    setNewTask(''); setNewDueDate(''); setAddingTask(false)
  }

  // Projects functions
  async function fetchProjects() {
    try {
      const res = await fetch(`/api/demo/projects?user_id=${userId}`)
      const { projects: p } = await res.json()
      setProjects(p ?? [])
    } finally { setProjectsLoading(false) }
  }
  async function deleteProject(id: string) {
    setProjects(prev => prev.filter(p => p.id !== id))
    await fetch('/api/demo/projects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
  }

  // Files functions
  async function fetchFiles() {
    try {
      const res = await fetch(`/api/demo/files?user_id=${userId}`)
      const { files: f } = await res.json()
      setFiles(f ?? [])
    } finally { setFilesLoading(false) }
  }

  async function uploadDocFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setDocsUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('user_id', userId)
    fd.append('room_id', `ai-${userId}`)
    await fetch('/api/demo/upload', { method: 'POST', body: fd })
    const res = await fetch(`/api/demo/files?user_id=${userId}`)
    const { files: f } = await res.json()
    setFiles(f ?? [])
    setDocsUploading(false)
    e.target.value = ''
  }

  // Profile functions
  async function saveProfile() {
    if (!editName.trim() || editName.trim().length < 2) return
    setProfileSaving(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), emoji: profile?.emoji ?? '😊' }),
      })
      const data = await res.json()
      if (data.profile) {
        setProfile(data.profile)
        usersCache[userId] = { name: data.profile.name, emoji: data.profile.emoji, bg: data.profile.bg, text: 'text-white', border: 'border-white/20' }
        setEditingProfile(false)
      }
    } finally {
      setProfileSaving(false)
    }
  }

  async function uploadAvatar(file: File) {
    setAvatarUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('user_id', userId)
    const res = await fetch('/api/auth/upload-avatar', { method: 'POST', body: fd })
    const data = await res.json()
    if (res.ok && data.url) {
      const db = (await import('@/lib/supabase-client')).supabase
      const { data: { session } } = await db.auth.getSession()
      await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ name: profile!.name, emoji: profile!.emoji ?? '', avatar_url: data.url }),
      })
      setProfile(prev => prev ? { ...prev, avatar_url: data.url } as any : prev)
    }
    setAvatarUploading(false)
  }

  async function saveUsername() {
    const clean = newUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (clean.length < 3) { setUsernameError('Mínimo 3 caracteres'); return }
    setUsernameChecking(true)
    const check = await fetch(`/api/auth/users?username=${clean}&exclude=${userId}`)
    const { user: taken } = await check.json()
    if (taken) { setUsernameError('Nombre de usuario no disponible'); setUsernameChecking(false); return }
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: profile!.name, emoji: profile!.emoji ?? '', username: clean }),
    })
    const data = await res.json()
    setUsernameChecking(false)
    if (data.profile) { setProfile(data.profile); setEditingUsername(false) }
    else { setUsernameError(data.error ?? 'Error guardando') }
  }

  function toggleDark() {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('dark_mode', next ? '1' : '0')
    window.dispatchEvent(new Event('dark-mode-changed'))
  }
  function saveIcal() {
    localStorage.setItem(`ical_${userId}`, icalUrl.trim())
    setIcalSaved(true)
    setTimeout(() => setIcalSaved(false), 2000)
  }

  if (!profile) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const visibleRooms = rooms.filter(r => {
    if (getPref(r.id).deleted) return false
    if (r.type === 'ai') return true
    if (r.type === 'dm' && !r.lastMsg) return false
    return true
  })
  const aiRoom = visibleRooms.find(r => r.type === 'ai')
  const pinnedRooms = visibleRooms.filter(r => r.type !== 'ai' && getPref(r.id).pinned && !getPref(r.id).archived)
  const normalRooms = visibleRooms.filter(r => r.type !== 'ai' && !getPref(r.id).pinned && !getPref(r.id).archived)
  const archivedRooms = visibleRooms.filter(r => r.type !== 'ai' && getPref(r.id).archived)
  const pinnedCount = pinnedRooms.length
  const isMuted = (pref: RoomPref) => !!pref.muted_until && new Date(pref.muted_until) > new Date()
  const isSearching = searchQuery.length >= 1
  const grouped: Record<string, SearchResult[]> = {}
  for (const r of searchResults) {
    if (!grouped[r.room_id]) grouped[r.room_id] = []
    grouped[r.room_id].push(r)
  }

  const pendingTasks = tasks.filter(t => !t.done).sort((a, b) => {
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
    if (a.due_date) return -1; if (b.due_date) return 1; return 0
  })
  const doneTasks = tasks.filter(t => t.done)
  const filteredFiles = files
    .filter(f => fileFilter === 'all' || f.type === fileFilter)
    .filter(f => !fileSearch || f.name.toLowerCase().includes(fileSearch.toLowerCase()) || f.sender.toLowerCase().includes(fileSearch.toLowerCase()))
  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* Reminder toast */}
      {dueReminder && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm transition-all duration-300 ${reminderVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="bg-blue-600 text-white rounded-2xl shadow-xl px-4 py-3 flex items-start gap-3">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold opacity-80 mb-0.5">Recordatorio</p>
              <p className="text-sm leading-snug">{dueReminder.content}</p>
            </div>
            <button onClick={() => dismissGlobalReminder(dueReminder.id)} className="text-white/70 hover:text-white shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── CHATS TAB ── */}
      {activeTab === 'chats' && (
        <>
          <div className="bg-white px-4 pt-12 pb-0 sticky top-0 z-10 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-2xl font-bold text-gray-900">DO Chat</h1>
              <div className="relative">
                <button onClick={() => setShowNewMenu(v => !v)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                </button>
                {showNewMenu && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowNewMenu(false)} />
                    <div className="absolute right-0 top-11 z-30 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 w-52 overflow-hidden">
                      <button onClick={() => { setShowNewMenu(false); setNgName(''); setNgSelected([]); setNgError(''); setShowNewGroup(true) }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
                        </div>
                        <span className="text-sm font-medium text-gray-800">Nuevo grupo</span>
                      </button>
                      <button onClick={() => { setShowNewMenu(false); resetNc(); setShowNewContact(true) }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                        </div>
                        <span className="text-sm font-medium text-gray-800">Nuevo contacto</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5 mb-3">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
              <input ref={searchInputRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar mensajes, chats…"
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none" autoComplete="off" />
              {searchQuery.length > 0 && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]) }} className="text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          </div>

          {isSearching ? (
            <div className="flex-1 overflow-y-auto pb-20">
              {searchLoading && <div className="flex items-center justify-center py-10"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}
              {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-8">
                  <p className="text-gray-500 font-medium">Sin resultados para &ldquo;{searchQuery}&rdquo;</p>
                </div>
              )}
              {searchQuery.length < 2 && <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-8"><p className="text-gray-500 text-sm">Escribe al menos 2 caracteres para buscar</p></div>}
              {!searchLoading && Object.entries(grouped).map(([roomId, msgs]) => (
                <div key={roomId}>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-y border-gray-100">
                    <span>{msgs[0].room_emoji}</span>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{msgs[0].room_name}</span>
                    <span className="ml-auto text-xs text-gray-400">{msgs.length} resultado{msgs.length > 1 ? 's' : ''}</span>
                  </div>
                  {msgs.map(result => (
                    <button key={result.id} onClick={() => { setSearchQuery(''); setActiveRoomId(result.room_id) }}
                      className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 border-b border-gray-50 text-left">
                      <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm mt-0.5 ${result.type === 'ai' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>{result.type === 'ai' ? '✦' : result.sender_emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-gray-800">{result.sender_name}</p>
                          <p className="text-xs text-gray-400 shrink-0">{formatMessageTime(result.created_at)}</p>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2">{result.fileInfo ? `📎 ${result.fileInfo.name}` : result.preview.slice(0, 140)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 pb-20">
              {loading && <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}
              {aiRoom && (
                <div className="px-4 pt-4 pb-2">
                  <button onClick={() => setActiveRoomId(aiRoom.id)}
                    className="w-full flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl px-4 py-3.5 shadow-sm active:scale-[0.98] transition-all">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl shrink-0">✦</div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-white font-bold text-sm">do AI</p>
                      <p className="text-white/70 text-xs truncate">{aiRoom.lastMsg?.content ?? 'Tu asistente inteligente'}</p>
                    </div>
                    {aiRoom.unread > 0 && <span className="min-w-[20px] h-5 rounded-full bg-white text-blue-600 text-[10px] font-bold flex items-center justify-center px-1.5">{aiRoom.unread}</span>}
                    <svg className="w-4 h-4 text-white/60 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                  </button>
                </div>
              )}
              <div className="px-4 pb-2">
                <button onClick={() => {
                  setShowDailyPanel(true)
                  if (!tasksFetched) { setTasksFetched(true); setTasksLoading(true); fetchTasks(); fetchTaskReminders() }
                }}
                  className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 border bg-white border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-all active:scale-[0.98]">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /></svg>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-800">Lo importante de hoy</p>
                    <p className="text-xs text-gray-400">{tasks.filter(t => !t.done).length > 0 ? `${tasks.filter(t => !t.done).length} pendiente${tasks.filter(t => !t.done).length > 1 ? 's' : ''}` : 'Tareas y recordatorios'}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                </button>
              </div>
              {pinnedRooms.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-4 pt-1 pb-1">Fijados</p>
                  <div className="divide-y divide-gray-50">{pinnedRooms.map(room => <ChatRow key={room.id} room={room} userId={userId} pref={getPref(room.id)} pinnedCount={pinnedCount} onAction={() => setActionRoom(room)} onOpenRoom={setActiveRoomId} />)}</div>
                </div>
              )}
              {normalRooms.length > 0 && (
                <div className={pinnedRooms.length > 0 ? 'border-t border-gray-100 mt-2' : 'mt-2'}>
                  {pinnedRooms.length > 0 && <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-4 pt-1 pb-1">Todos los chats</p>}
                  <div className="divide-y divide-gray-50">{normalRooms.map(room => <ChatRow key={room.id} room={room} userId={userId} pref={getPref(room.id)} pinnedCount={pinnedCount} onAction={() => setActionRoom(room)} onOpenRoom={setActiveRoomId} />)}</div>
                </div>
              )}
              {archivedRooms.length > 0 && (
                <div className="border-t border-gray-100 mt-2">
                  <button onClick={() => setShowArchived(!showArchived)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg></div>
                    <div className="flex-1"><p className="text-sm font-semibold text-gray-700">Archivadas</p><p className="text-xs text-gray-400">{archivedRooms.length} conversación{archivedRooms.length > 1 ? 'es' : ''}</p></div>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${showArchived ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                  </button>
                  {showArchived && <div className="divide-y divide-gray-50 bg-gray-50">{archivedRooms.map(room => <ChatRow key={room.id} room={room} userId={userId} pref={getPref(room.id)} pinnedCount={pinnedCount} onAction={() => setActionRoom(room)} onOpenRoom={setActiveRoomId} />)}</div>}
                </div>
              )}
              {!loading && normalRooms.length === 0 && pinnedRooms.length === 0 && !aiRoom && (
                <div className="flex flex-col items-center justify-center gap-3 py-20 px-8 text-center">
                  <p className="text-gray-500 text-sm">Toca <strong>+</strong> para agregar contactos y empezar a chatear</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── PROJECTS TAB ── */}
      {activeTab === 'projects' && (
        <>
          <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-600 font-semibold">{projects.length} docs</span>
            </div>
            <p className="text-sm text-gray-400">Reportes y resúmenes generados por do AI</p>
          </div>
          <div className="flex-1 overflow-y-auto pb-20 bg-gray-50">
            {projectsLoading && <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}
            {!projectsLoading && projects.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-8">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center"><svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg></div>
                <p className="text-gray-600 font-medium">Sin proyectos aún</p>
                <p className="text-sm text-gray-400">Pedile a @do que genere un reporte o acta de tus conversaciones</p>
              </div>
            )}
            {projects.length > 0 && (
              <div className="px-4 py-3 space-y-3">
                {projects.map(proj => (
                  <div key={proj.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <button onClick={() => setExpandedProject(expandedProject === proj.id ? null : proj.id)}
                      className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{proj.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatMessageTime(proj.created_at)} · por do AI</p>
                      </div>
                      <svg className={`w-4 h-4 text-gray-400 mt-1 shrink-0 transition-transform ${expandedProject === proj.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                    </button>
                    {expandedProject === proj.id && (
                      <div className="border-t border-gray-100 px-4 py-3">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{proj.content}</p>
                        <div className="flex justify-end mt-3">
                          <button onClick={() => deleteProject(proj.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Eliminar</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="h-4" />
          </div>
        </>
      )}

      {/* ── DOCS TAB ── */}
      {activeTab === 'docs' && (
        <>
          <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-10">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-600 font-semibold">{files.length} archivos</span>
                <button
                  onClick={() => docsFileRef.current?.click()}
                  disabled={docsUploading}
                  className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-white disabled:opacity-40 shadow-sm active:scale-95 transition-all"
                >
                  {docsUploading
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  }
                </button>
                <input ref={docsFileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg,.gif,.webp,.mp4,.zip" className="hidden" onChange={uploadDocFile} />
              </div>
            </div>
            <input value={fileSearch} onChange={e => setFileSearch(e.target.value)} placeholder="Buscar archivos…"
              className="w-full bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 mb-3" />
            <div className="flex gap-2">
              {(['all', 'file', 'image'] as const).map(f => (
                <button key={f} onClick={() => setFileFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${fileFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {f === 'all' ? 'Todos' : f === 'file' ? 'Archivos' : 'Imágenes'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pb-20 bg-gray-50">
            {filesLoading && <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}
            {!filesLoading && filteredFiles.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-8">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center"><svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg></div>
                <p className="text-gray-600 font-medium">{fileSearch ? 'Sin resultados' : 'Sin archivos compartidos'}</p>
                <p className="text-sm text-gray-400">{fileSearch ? 'Probá con otro término' : 'Los archivos e imágenes de tus chats aparecerán aquí'}</p>
              </div>
            )}
            {filteredFiles.length > 0 && (
              <div className="px-4 py-3 space-y-2">
                {filteredFiles.map(file => (
                  <a key={file.id} href={file.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-sm hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]">
                    {file.type === 'image' ? (
                      <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-gray-100"><img src={file.url} alt={file.name} className="w-full h-full object-cover" /></div>
                    ) : (
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${fileColor(file.name)}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{file.sender_emoji} {file.sender}{file.size ? ` · ${Math.round(file.size / 1024)} KB` : ''}</p>
                      <p className="text-xs text-gray-300 mt-0.5">{formatMessageTime(file.created_at)}</p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                  </a>
                ))}
              </div>
            )}
            <div className="h-4" />
          </div>
        </>
      )}

      {/* ── PERFIL TAB ── */}
      {activeTab === 'tu' && (
        <>
          <div className="bg-[#f0f2f5] border-b border-gray-200 px-4 pt-12 pb-4 sticky top-0 z-10">
            <h1 className="text-xl font-bold text-gray-900 text-center">Perfil</h1>
          </div>
          <div className="flex-1 overflow-y-auto pb-24 bg-[#f0f2f5]">

            {/* Avatar */}
            <div className="flex flex-col items-center pt-8 pb-2">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-[#d9d0f0] flex items-center justify-center shadow-sm">
                {avatarUploading ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (profile as any).avatar_url ? (
                  <img src={(profile as any).avatar_url} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-20 h-20 text-[#6b5fbd]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12Zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8Z"/>
                  </svg>
                )}
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="mt-3 text-[15px] text-[#2563EB] font-medium disabled:opacity-40"
              >
                Editar
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }} />
            </div>

            {/* Nombre */}
            <div className="px-4 mt-5">
              <p className="text-[13px] text-gray-500 mb-1 ml-1">Nombre</p>
              <div className="bg-white rounded-2xl overflow-hidden">
                {editingProfile ? (
                  <div className="px-4 py-3.5">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      maxLength={30}
                      autoFocus
                      className="w-full text-[15px] text-gray-900 focus:outline-none bg-transparent"
                    />
                    <p className="text-[11px] text-gray-400 text-right mt-1">{editName.length}/30</p>
                    <div className="flex justify-end gap-4 mt-2">
                      <button onClick={() => setEditingProfile(false)} className="text-sm text-gray-400 font-medium">Cancelar</button>
                      <button onClick={saveProfile} disabled={profileSaving || editName.trim().length < 2}
                        className="text-sm text-[#2563EB] font-semibold disabled:opacity-40">
                        {profileSaving ? 'Guardando…' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setEditName(profile.name); setEditingProfile(true) }}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-gray-50">
                    <span className="text-[15px] text-gray-900">{profile.name}</span>
                    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                  </button>
                )}
              </div>
            </div>

            {/* Nombre de usuario */}
            <div className="px-4 mt-5">
              <p className="text-[13px] text-gray-500 mb-1 ml-1">Nombre de usuario</p>
              <div className="bg-white rounded-2xl overflow-hidden">
                {editingUsername ? (
                  <div className="px-4 py-3.5">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={e => { setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setUsernameError('') }}
                      maxLength={20}
                      placeholder="nuevo_usuario"
                      autoFocus
                      className="w-full text-[15px] text-gray-900 focus:outline-none bg-transparent"
                    />
                    {usernameError && <p className="text-xs text-red-500 mt-1">{usernameError}</p>}
                    <div className="flex justify-end gap-4 mt-2">
                      <button onClick={() => { setEditingUsername(false); setUsernameError('') }} className="text-sm text-gray-400 font-medium">Cancelar</button>
                      <button onClick={saveUsername} disabled={usernameChecking || newUsername.length < 3}
                        className="text-sm text-[#2563EB] font-semibold disabled:opacity-40">
                        {usernameChecking ? '…' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setNewUsername(profile.username ?? ''); setEditingUsername(true); setUsernameError('') }}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-gray-50">
                    <span className="text-[15px] text-gray-900">{profile.username ? `@${profile.username}` : 'Sin usuario'}</span>
                    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                  </button>
                )}
              </div>
            </div>

            {/* Número de teléfono */}
            {(profile as any).phone && (
              <div className="px-4 mt-5">
                <p className="text-[13px] text-gray-500 mb-1 ml-1">Número de teléfono</p>
                <div className="bg-white rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <span className="text-[15px] text-gray-900">{(profile as any).phone}</span>
                    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                  </div>
                </div>
              </div>
            )}

            {/* Apariencia */}
            <div className="px-4 mt-5">
              <p className="text-[13px] text-gray-500 mb-1 ml-1">Apariencia</p>
              <div className="bg-white rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3.5">
                  <span className="text-[15px] text-gray-900">Modo oscuro</span>
                  <button onClick={toggleDark} className={`relative w-11 h-6 rounded-full transition-colors ${darkMode ? 'bg-[#2563EB]' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Google Calendar */}
            <div className="px-4 mt-5 mb-4">
              <p className="text-[13px] text-gray-500 mb-1 ml-1">Google Calendar</p>
              <div className="bg-white rounded-2xl overflow-hidden px-4 py-3.5 space-y-3">
                <p className="text-xs text-gray-400">Feed iCal para el resumen diario</p>
                <input type="url" value={icalUrl} onChange={e => setIcalUrl(e.target.value)}
                  placeholder="https://calendar.google.com/calendar/ical/…"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 transition-colors" />
                <button onClick={saveIcal} className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${icalSaved ? 'bg-green-100 text-green-700' : 'bg-[#2563EB] text-white active:scale-95'}`}>
                  {icalSaved ? 'Guardado ✓' : 'Guardar'}
                </button>
              </div>
            </div>

          </div>
        </>
      )}

      <BottomNav active={activeTab} onTabChange={setActiveTab} />

      {/* Daily panel — Lo importante de hoy */}
      {showDailyPanel && (
        <div className="fixed inset-0 z-40 max-w-md mx-auto flex flex-col bg-white"
          style={{ animation: 'slideInFromRight 0.22s cubic-bezier(0.4,0,0.2,1)' }}>
          {/* Header */}
          <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10 flex items-center gap-3">
            <button onClick={() => setShowDailyPanel(false)} className="text-gray-400 hover:text-gray-600 p-1 -ml-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-900">Lo importante de hoy</h1>
              <p className="text-xs text-gray-400">Tus tareas y recordatorios</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50 pb-8">
            {/* Add task input */}
            <div className="px-4 py-3 bg-white border-b border-gray-100 space-y-2">
              <div className="flex gap-2">
                <input
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTask()}
                  placeholder="Agregar tarea…"
                  className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-400 text-gray-800 placeholder:text-gray-400"
                />
                <button onClick={addTask} disabled={!newTask.trim() || addingTask}
                  className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0">
                  +
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 shrink-0">Fecha límite:</span>
                <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)}
                  className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400 text-gray-600" />
                {newDueDate && <button onClick={() => setNewDueDate('')} className="text-xs text-gray-400 hover:text-gray-600">Quitar</button>}
              </div>
            </div>

            {tasksLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!tasksLoading && tasks.length === 0 && taskReminders.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-8">
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                  <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                </div>
                <p className="text-gray-700 font-semibold">Sin pendientes por ahora</p>
                <p className="text-sm text-gray-400">Usa el campo de arriba para agregar una tarea</p>
              </div>
            )}

            {!tasksLoading && taskReminders.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recordatorios</p>
                <div className="space-y-2">
                  {taskReminders.map(r => {
                    const dt = new Date(r.remind_at); const isPast = dt <= new Date()
                    return (
                      <div key={r.id} className={`rounded-2xl border px-4 py-3 flex items-start gap-3 shadow-sm ${isPast ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                        <div className="shrink-0 mt-0.5">{isPast
                          ? <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>
                          : <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 leading-snug">{r.content}</p>
                          <p className={`text-xs mt-1 ${isPast ? 'text-blue-500 font-medium' : 'text-gray-400'}`}>{isPast ? 'Ahora · ' : ''}{dt.toLocaleDateString('es', { day: 'numeric', month: 'short' })} {dt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <button onClick={() => dismissTaskReminder(r.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0 mt-0.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {!tasksLoading && tasks.filter(t => !t.done).length > 0 && (
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Por hacer</p>
                <div className="space-y-2">
                  {tasks.filter(t => !t.done).sort((a, b) => {
                    if (a.due_date && !b.due_date) return -1
                    if (!a.due_date && b.due_date) return 1
                    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
                    return 0
                  }).map(task => <TaskCard key={task.id} task={task} onToggle={toggleDone} onDelete={deleteTask} />)}
                </div>
              </div>
            )}

            {!tasksLoading && tasks.filter(t => t.done).length > 0 && (
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Completadas</p>
                <div className="space-y-2 opacity-60">
                  {tasks.filter(t => t.done).map(task => <TaskCard key={task.id} task={task} onToggle={toggleDone} onDelete={deleteTask} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeRoomId && (
        <div className="fixed inset-0 z-40 max-w-md mx-auto bg-white"
          style={{ animation: 'slideInFromRight 0.22s cubic-bezier(0.4,0,0.2,1)' }}>
          <style>{`@keyframes slideInFromRight { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
          <RoomView
            userId={userId}
            roomId={activeRoomId}
            initialRoom={rooms.find(r => r.id === activeRoomId) ?? null}
            onBack={() => setActiveRoomId(null)}
          />
        </div>
      )}

      {/* Action sheet */}
      {actionRoom && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={() => setActionRoom(null)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${actionRoom.type === 'ai' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>{actionRoom.type === 'ai' ? '✦' : actionRoom.emoji}</div>
              <p className="font-semibold text-gray-900">{actionRoom.type === 'ai' ? 'do AI' : actionRoom.name}</p>
            </div>
            <div className="py-2">
              {actionRoom.type === 'ai' ? (
                <button onClick={async () => { await fetch('/api/demo/messages', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room_id: actionRoom.id, user_id: userId }) }); setActionRoom(null); fetchRooms() }}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 text-left">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                  <p className="text-sm font-medium text-red-500">Borrar conversación</p>
                </button>
              ) : (
                <>
                  <button onClick={async () => { const pref = getPref(actionRoom.id); if (!pref.pinned && pinnedCount >= 3) return; await setPref(actionRoom.id, { pinned: !pref.pinned }); setActionRoom(null) }}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 text-left">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" /></svg>
                    <div className="flex-1"><p className="text-sm font-medium text-gray-800">{getPref(actionRoom.id).pinned ? 'Quitar pin' : 'Fijar chat'}</p>{!getPref(actionRoom.id).pinned && pinnedCount >= 3 && <p className="text-xs text-orange-500">Máximo 3 fijados</p>}</div>
                  </button>
                  <button onClick={async () => { await setPref(actionRoom.id, { archived: !getPref(actionRoom.id).archived, pinned: false }); setActionRoom(null) }}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 text-left">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>
                    <p className="text-sm font-medium text-gray-800">{getPref(actionRoom.id).archived ? 'Desarchivar' : 'Archivar chat'}</p>
                  </button>
                  {(() => {
                    const pref = getPref(actionRoom.id); const muted = isMuted(pref)
                    return muted ? (
                      <button onClick={async () => { await setPref(actionRoom.id, { muted_until: null }); setActionRoom(null) }} className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 text-left">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>
                        <p className="text-sm font-medium text-gray-800">Activar notificaciones</p>
                      </button>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 pt-2 pb-1">Silenciar por…</p>
                        {[['8 horas', 8*3600000], ['1 semana', 7*86400000], ['Siempre', 365*86400000]].map(([label, ms]) => (
                          <button key={label as string} onClick={async () => { await setPref(actionRoom.id, { muted_until: new Date(Date.now() + (ms as number)).toISOString() }); setActionRoom(null) }}
                            className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 text-left">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.143 17.082a24.248 24.248 0 0 0 3.844.148m-3.844-.148a23.856 23.856 0 0 1-5.455-1.31 8.964 8.964 0 0 0 2.3-5.542m3.155 6.852a3 3 0 0 0 5.667 1.97m1.965-2.277L21 21m-4.225-4.225a23.81 23.81 0 0 0 .635-3.025m-12.21-12.21L3 3m4.5 4.5A6 6 0 0 0 6 9v.75a8.964 8.964 0 0 1-2.3 5.542m3.155-9.195A5.97 5.97 0 0 1 12 3c3.314 0 6 2.686 6 6v.75a8.964 8.964 0 0 0 2.3 5.542" /></svg>
                            <p className="text-sm font-medium text-gray-800">{label as string}</p>
                          </button>
                        ))}
                      </div>
                    )
                  })()}
                  {actionRoom.type === 'dm' && actionRoom.otherUserId && (
                    <button onClick={async () => {
                      await fetch('/api/demo/contacts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, contact_id: actionRoom.otherUserId }) })
                      await fetchContacts()
                      setActionRoom(null)
                    }} className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 text-left">
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>
                      <p className="text-sm font-medium text-red-500">Eliminar contacto</p>
                    </button>
                  )}
                  <button onClick={async () => { await Promise.all([setPref(actionRoom.id, { deleted: true, pinned: false, archived: false }), fetch('/api/demo/messages', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room_id: actionRoom.id }) })]); setActionRoom(null) }}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 text-left">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                    <p className="text-sm font-medium text-red-500">Eliminar chat</p>
                  </button>
                </>
              )}
            </div>
            <div className="h-6" />
          </div>
        </div>
      )}

      {/* Nuevo contacto modal */}
      {showNewContact && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col max-w-md mx-auto">
          <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-gray-100">
            <button onClick={() => { setShowNewContact(false); resetNc() }} className="text-blue-600 font-medium text-sm">Cancelar</button>
            <h2 className="flex-1 text-center text-base font-semibold text-gray-900">Nuevo contacto</h2>
            <button onClick={ncSave} disabled={ncSaving || !ncFound} className="text-blue-600 font-semibold text-sm disabled:opacity-40">
              {ncSaving ? 'Guardando…' : 'Agregar'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pt-8 space-y-4">
            <p className="text-sm text-gray-500 text-center">Busca a tu contacto por su @usuario</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">@</span>
                <input
                  type="text"
                  placeholder="usuario"
                  value={ncUsername.replace(/^@/, '')}
                  onChange={e => { setNcUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '')); setNcFound(null); setNcError('') }}
                  onKeyDown={e => e.key === 'Enter' && ncSearchUsername()}
                  className="w-full text-sm bg-gray-100 rounded-xl pl-7 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 placeholder-gray-400"
                  autoFocus
                />
              </div>
              <button onClick={ncSearchUsername} disabled={ncSearching || ncUsername.replace(/^@/, '').length < 3}
                className="px-4 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-colors shrink-0">
                {ncSearching ? '…' : 'Buscar'}
              </button>
            </div>
            {ncError && <p className="text-red-500 text-sm text-center">{ncError}</p>}
            {ncFound && (
              <div className="bg-green-50 rounded-2xl px-4 py-3 flex items-center gap-3 border border-green-100">
                <Avatar emoji={ncFound.emoji} bg={ncFound.bg} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{ncFound.name}</p>
                  <p className="text-xs text-green-600">Usuario registrado en do-chat ✓</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nuevo grupo modal */}
      {showNewGroup && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col max-w-md mx-auto">
          <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-gray-100">
            <button onClick={() => setShowNewGroup(false)} className="text-blue-600 font-medium text-sm">Cancelar</button>
            <h2 className="flex-1 text-center text-base font-semibold text-gray-900">Nuevo grupo</h2>
            <button onClick={createGroup} disabled={ngCreating || !ngName.trim() || ngSelected.length === 0}
              className="text-blue-600 font-semibold text-sm disabled:opacity-40">
              {ngCreating ? 'Creando…' : 'Crear'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3 mt-6">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl shrink-0">👥</div>
              <input type="text" placeholder="Nombre del grupo" value={ngName} onChange={e => setNgName(e.target.value)}
                className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none font-medium" autoFocus />
            </div>
            {ngError && <p className="text-red-500 text-sm px-5 mt-3">{ngError}</p>}
            {ngSelected.length > 0 && <p className="text-xs text-gray-400 px-5 pt-4 pb-2 font-medium">{ngSelected.length} participante{ngSelected.length > 1 ? 's' : ''} seleccionado{ngSelected.length > 1 ? 's' : ''}</p>}
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 pt-4 pb-2">Contactos</p>
            {contacts.length === 0 && <p className="text-sm text-gray-400 px-5">Primero agrega contactos para crear un grupo</p>}
            <div className="divide-y divide-gray-50">
              {contacts.map(c => {
                const selected = ngSelected.includes(c.id)
                return (
                  <button key={c.id} onClick={() => setNgSelected(prev => selected ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors">
                    <Avatar emoji={c.emoji} bg={c.bg} size="lg" />
                    <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900">{c.name}</p></div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {selected && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function fileColor(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['pdf'].includes(ext)) return 'bg-red-50 text-red-500'
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'bg-green-50 text-green-600'
  if (['docx', 'doc'].includes(ext)) return 'bg-blue-50 text-blue-600'
  if (['pptx', 'ppt'].includes(ext)) return 'bg-orange-50 text-orange-500'
  return 'bg-gray-100 text-gray-500'
}

function dueDateLabel(due: string | null, done: boolean): { label: string; className: string } | null {
  if (!due || done) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(due + 'T00:00:00')
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return { label: `Vencida hace ${Math.abs(diff)}d`, className: 'text-red-500 bg-red-50 border-red-200' }
  if (diff === 0) return { label: 'Vence hoy', className: 'text-orange-500 bg-orange-50 border-orange-200' }
  if (diff === 1) return { label: 'Vence mañana', className: 'text-yellow-600 bg-yellow-50 border-yellow-200' }
  if (diff <= 7) return { label: `${diff}d restantes`, className: 'text-blue-500 bg-blue-50 border-blue-200' }
  return { label: d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }), className: 'text-gray-400 bg-gray-50 border-gray-200' }
}

function TaskCard({ task, onToggle, onDelete }: { task: { id: string; content: string; done: boolean; created_at: string; due_date: string | null }; onToggle: (id: string, done: boolean) => void; onDelete: (id: string) => void }) {
  const badge = dueDateLabel(task.due_date, task.done)
  return (
    <div className={`bg-white rounded-2xl border px-4 py-3 flex items-start gap-3 shadow-sm transition-all ${task.done ? 'border-gray-100' : 'border-gray-200'}`}>
      <button onClick={() => onToggle(task.id, !task.done)}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${task.done ? 'bg-blue-600 border-blue-600' : 'border-gray-300 hover:border-blue-400'}`}>
        {task.done && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.content}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {badge && <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.className}`}>{badge.label}</span>}
          <p className="text-xs text-gray-400">{formatMessageTime(task.created_at)}</p>
        </div>
      </div>
      <button onClick={() => onDelete(task.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0 mt-0.5">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
    </div>
  )
}

function ChatRow({ room, userId, pref, pinnedCount, onAction, onOpenRoom }: { room: RoomWithMeta; userId: string; pref: RoomPref; pinnedCount: number; onAction: () => void; onOpenRoom: (roomId: string) => void }) {
  const muted = !!pref.muted_until && new Date(pref.muted_until) > new Date()
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => onOpenRoom(room.id)}>
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl">
            {room.emoji
              ? room.emoji
              : <UserIcon className="w-6 h-6 text-gray-400" />
            }
          </div>
          {room.unread > 0 && !muted && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center px-1">{room.unread > 99 ? '99+' : room.unread}</span>}
          {muted && <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gray-200 border border-white flex items-center justify-center"><svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg></span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {pref.pinned && <svg className="w-3 h-3 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" /></svg>}
              <p className={`text-sm font-semibold truncate ${room.unread > 0 ? 'text-gray-900' : 'text-gray-800'}`}>{room.name}</p>
            </div>
            {room.lastMsg && <span className={`text-xs shrink-0 ${room.unread > 0 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>{formatMessageTime(room.lastMsg.created_at)}</span>}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {room.lastMsg?.user_id === userId && <span className={`text-xs shrink-0 ${room.seenByOthers ? 'text-blue-500' : 'text-gray-400'}`}>✓✓</span>}
            <p className={`text-xs truncate ${room.unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{room.lastMsg?.content ?? 'Sin mensajes aún'}</p>
          </div>
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); onAction() }} className="p-2 text-gray-300 hover:text-gray-500 shrink-0 -mr-1 transition-colors">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
      </button>
    </div>
  )
}

export function BottomNav({ active, onTabChange }: { active: string; onTabChange: (tab: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'chats', label: 'Chats', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg> },
    { id: 'projects', label: 'Proyectos', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg> },
    { id: 'docs', label: 'Docs', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg> },
    { id: 'tu', label: 'Tú', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg> },
  ]
  return (
    <div className="bg-white border-t border-gray-100 flex fixed bottom-0 left-0 right-0 max-w-md mx-auto z-10">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onTabChange(t.id)}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${active === t.id ? 'text-blue-600' : 'text-gray-400'}`}>
          {t.icon}
          <span className="text-[9px] font-medium">{t.label}</span>
        </button>
      ))}
    </div>
  )
}
