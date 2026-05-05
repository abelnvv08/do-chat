'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { usersCache, type Room } from '@/lib/demo'
import { formatMessageTime } from '@/lib/utils'
import { supabase } from '@/lib/supabase-client'
import { RoomView } from './RoomView'
import { ProjectWorkspace } from './ProjectWorkspace'
import { initKeyPair, getLocalPublicKey } from '@/lib/e2ee'

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'w-5 h-5 text-white/80'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
    </svg>
  )
}

function Avatar({ emoji, bg, size = 'md', avatarUrl }: { emoji: string; bg: string; size?: 'sm' | 'md' | 'lg'; avatarUrl?: string | null }) {
  const sizeClass = size === 'lg' ? 'w-12 h-12 text-xl' : size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-lg'
  const iconClass = size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  if (avatarUrl) return <img src={avatarUrl} alt="" className={`${sizeClass} rounded-full object-cover shrink-0`} />
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
type Contact = { id: string; name: string; firstName: string; lastName: string; emoji: string; bg: string; avatar_url?: string | null; room_id: string }
type Task = { id: string; content: string; done: boolean; created_at: string; source_room: string | null; due_date: string | null }
type Reminder = { id: string; content: string; remind_at: string }
type Invite = { id: string; from_user_id: string; from_name: string; from_emoji: string; content: string; invite_type: 'task' | 'reminder'; due_date: string | null; remind_at: string | null; created_at: string }
type SentInvite = { id: string; to_user_id: string; to_name: string; to_emoji: string; content: string; invite_type: 'task' | 'reminder'; due_date: string | null; remind_at: string | null; created_at: string }
type ProjectFile = { name: string; url: string; size: number; fileType: string }
type Project = { id: string; title: string; content?: string; instructions: string; project_files: ProjectFile[]; created_at: string }
type FileEntry = { id: string; name: string; url: string; size: number | null; type: 'file' | 'image'; room_id: string; created_at: string; sender: string; sender_emoji: string }

type Tab = 'contactos' | 'llamadas' | 'archivos' | 'mensajes' | 'tu'

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
  const [activeTab, setActiveTab] = useState<Tab>('mensajes')
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
  const [ncFirstName, setNcFirstName] = useState('')
  const [ncLastName, setNcLastName] = useState('')
  const [ncPhone, setNcPhone] = useState('')
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
  const [invites, setInvites] = useState<Invite[]>([])
  const [sentInvites, setSentInvites] = useState<SentInvite[]>([])
  const [inviteFilter, setInviteFilter] = useState<'all' | 'received' | 'sent'>('all')
  const [showSendInvite, setShowSendInvite] = useState(false)
  const [inviteTarget, setInviteTarget] = useState('')
  const [inviteContent, setInviteContent] = useState('')
  const [inviteType, setInviteType] = useState<'task' | 'reminder'>('task')
  const [inviteDue, setInviteDue] = useState('')
  const [inviteRemindAt, setInviteRemindAt] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)

  // Archivos tab (merged projects + docs)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsFetched, setProjectsFetched] = useState(false)
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [files, setFiles] = useState<FileEntry[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesFetched, setFilesFetched] = useState(false)
  const [archivosFilter, setArchivosFilter] = useState<'all' | 'proyectos' | 'archivos' | 'imagenes'>('all')
  const [archivosSearch, setArchivosSearch] = useState('')
  const [docsUploading, setDocsUploading] = useState(false)
  const docsFileRef = useRef<HTMLInputElement>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [forwardingItems, setForwardingItems] = useState(false)

  // Perfil tab
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
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)

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
    initKeyPair(userId).then(pubKey => {
      if (!pubKey) return
      const stored = getLocalPublicKey(userId)
      if (stored) fetch('/api/demo/e2ee', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, public_key: stored }) }).catch(() => {})
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
      fetchInvites()
      tasksIntervalRef.current = setInterval(() => { fetchTasks(); fetchTaskReminders(); fetchInvites() }, 4000)
    } else {
      if (tasksIntervalRef.current) { clearInterval(tasksIntervalRef.current); tasksIntervalRef.current = null }
    }
    if (activeTab === 'archivos') {
      if (!projectsFetched) { setProjectsFetched(true); setProjectsLoading(true); fetchProjects() }
      if (!filesFetched) { setFilesFetched(true); setFilesLoading(true); fetchFiles() }
    }
    if (activeTab === 'tu') {
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
    const list: Contact[] = data.contacts ?? []
    setContacts(list)
    // Populate cache with the name the current user saved for each contact
    for (const c of list) {
      usersCache[c.id] = { name: c.name, emoji: c.emoji, bg: c.bg, text: 'text-white', border: 'border-white/20', avatar_url: c.avatar_url }
    }
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
  async function ncSave() {
    if (!ncFirstName.trim()) { setNcError('Ingresa al menos el nombre'); return }
    const phone = ncPhone.trim().replace(/\s/g, '')
    if (phone.length < 7) { setNcError('Ingresa un número de teléfono válido'); return }
    setNcSaving(true); setNcError('')
    try {
      const res = await fetch('/api/demo/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, phone, first_name: ncFirstName.trim(), last_name: ncLastName.trim() || undefined }) })
      const data = await res.json()
      if (!res.ok) { setNcError(data.error ?? 'Error al guardar'); return }
      setShowNewContact(false)
      resetNc()
      await Promise.all([fetchContacts(), fetchRooms()])
      if (data.contact?.room_id) setActiveRoomId(data.contact.room_id)
    } finally { setNcSaving(false) }
  }
  function resetNc() { setNcFirstName(''); setNcLastName(''); setNcPhone(''); setNcError('') }

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
  async function fetchInvites() {
    try {
      const res = await fetch(`/api/demo/task-invites?user_id=${userId}`)
      const { invites: inv, sent } = await res.json()
      setInvites(inv ?? [])
      setSentInvites(sent ?? [])
    } catch { /* ignore */ }
  }
  async function respondInvite(id: string, action: 'accept' | 'reject') {
    setInvites(prev => prev.filter(i => i.id !== id))
    await fetch('/api/demo/task-invites', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, user_id: userId }) })
    if (action === 'accept') { fetchTasks(); fetchTaskReminders() }
  }
  async function sendInvite() {
    if (!inviteTarget || !inviteContent.trim()) return
    setSendingInvite(true)
    const contact = contacts.find(c => c.id === inviteTarget)
    await fetch('/api/demo/task-invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_user_id: userId,
        to_user_id: inviteTarget,
        content: inviteContent.trim(),
        invite_type: inviteType,
        due_date: inviteDue || null,
        remind_at: inviteRemindAt || null,
        from_name: profile?.name ?? 'Usuario',
        from_emoji: profile?.emoji ?? '😊',
      }),
    })
    setInviteContent(''); setInviteDue(''); setInviteRemindAt(''); setInviteTarget(''); setShowSendInvite(false)
    setSendingInvite(false)
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
  async function createProject() {
    const res = await fetch('/api/demo/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, title: 'Nuevo proyecto', instructions: '', project_files: [] }) })
    const { project } = await res.json()
    if (project) { setProjects(prev => [project, ...prev]); setActiveProject(project) }
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

  async function openCamera() {
    setShowAvatarMenu(false)
    setShowCamera(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      cameraStreamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
    } catch {
      setShowCamera(false)
      avatarInputRef.current?.click()
    }
  }
  function closeCamera() {
    cameraStreamRef.current?.getTracks().forEach(t => t.stop())
    cameraStreamRef.current = null
    setShowCamera(false)
  }
  function capturePhoto() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      closeCamera()
      const file = new File([blob], 'foto.jpg', { type: 'image/jpeg' })
      uploadAvatar(file)
    }, 'image/jpeg', 0.9)
  }

  async function deleteAvatar() {
    setShowAvatarMenu(false)
    setAvatarUploading(true)
    await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: profile!.name, emoji: profile!.emoji ?? '', avatar_url: null }),
    })
    setProfile(prev => prev ? { ...prev, avatar_url: null } as any : prev)
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

  if (!profile) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const visibleRooms = rooms.filter(r => {
    if (getPref(r.id).deleted) return false
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
  return (
    <div className="bg-white flex flex-col" style={{ minHeight: '100dvh' }}>
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
      {activeTab === 'mensajes' && (
        <>
          <div className="bg-[#0f172a] px-4 pb-0 sticky top-0 z-10" style={{ paddingTop: 'calc(env(safe-area-inset-top, 44px) + 12px)' }}>
            <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <Image src="/dochatlogo.png" alt="DO Chat" width={36} height={36} className="rounded-xl" />
              <div className="relative">
                <button onClick={() => setShowNewMenu(v => !v)} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 active:scale-95 transition-all">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
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
            <div className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2.5 mb-3">
              <svg className="w-4 h-4 text-white/70 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
              <input ref={searchInputRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar mensajes, chats…"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none" autoComplete="off" />
              {searchQuery.length > 0 && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]) }} className="text-white/70">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
            </div>
          </div>

          {isSearching ? (
            <div className="flex-1 overflow-y-auto pb-20">
            <div className="max-w-3xl mx-auto">
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
            </div>
          ) : (
            <div className="flex-1 pb-20">
            <div className="max-w-3xl mx-auto">
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
            </div>
          )}
        </>
      )}

      {/* ── ARCHIVOS TAB (merged projects + docs) ── */}
      {activeTab === 'archivos' && (() => {
        const filteredProjects = archivosFilter === 'all' || archivosFilter === 'proyectos'
          ? projects.filter(p => !archivosSearch || p.title.toLowerCase().includes(archivosSearch.toLowerCase()))
          : []
        const filteredFiles = archivosFilter === 'all' || archivosFilter === 'archivos' || archivosFilter === 'imagenes'
          ? files
              .filter(f => archivosFilter === 'imagenes' ? f.type === 'image' : archivosFilter === 'archivos' ? f.type === 'file' : true)
              .filter(f => !archivosSearch || f.name.toLowerCase().includes(archivosSearch.toLowerCase()) || f.sender.toLowerCase().includes(archivosSearch.toLowerCase()))
          : []
        const totalSelected = selectedIds.size
        const isLoading = projectsLoading || filesLoading

        async function deleteSelected() {
          const toDelete = [...selectedIds]
          for (const id of toDelete) {
            const proj = projects.find(p => p.id === id)
            if (proj) { await fetch('/api/demo/projects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); setProjects(prev => prev.filter(p => p.id !== id)) }
            const file = files.find(f => f.id === id)
            if (file) { await fetch('/api/demo/messages', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message_id: id }) }); setFiles(prev => prev.filter(f => f.id !== id)) }
          }
          setSelectedIds(new Set()); setSelectionMode(false)
        }

        async function askAISelected() {
          const selectedFiles = files.filter(f => selectedIds.has(f.id))
          const selectedProjs = projects.filter(p => selectedIds.has(p.id))
          const parts: string[] = []
          if (selectedFiles.length) parts.push(`Archivos: ${selectedFiles.map(f => `"${f.name}"`).join(', ')}`)
          if (selectedProjs.length) parts.push(`Proyectos: ${selectedProjs.map(p => `"${p.title}"`).join(', ')}`)
          setSelectedIds(new Set()); setSelectionMode(false)
          setActiveTab('mensajes')
          setActiveRoomId(`ai-${userId}`)
        }

        function toggleSelect(id: string) {
          setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
        }

        return (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-10">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-2xl font-bold text-gray-900">Archivos</h1>
                <div className="flex items-center gap-2">
                  {selectionMode ? (
                    <button onClick={() => { setSelectionMode(false); setSelectedIds(new Set()) }}
                      className="text-sm text-blue-600 font-medium px-3 py-1.5 rounded-xl bg-blue-50">Cancelar</button>
                  ) : (
                    <>
                      <button onClick={() => setSelectionMode(true)}
                        className="text-sm text-blue-600 font-medium px-3 py-1.5 rounded-xl bg-blue-50">Seleccionar</button>
                      <button onClick={createProject}
                        className="text-sm text-blue-600 font-medium px-3 py-1.5 rounded-xl border border-blue-200 bg-white">+ Proyecto</button>
                      <button onClick={() => docsFileRef.current?.click()} disabled={docsUploading}
                        className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-white disabled:opacity-40 shadow-sm active:scale-95 transition-all">
                        {docsUploading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>}
                      </button>
                      <input ref={docsFileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg,.gif,.webp,.zip" className="hidden" onChange={uploadDocFile} />
                    </>
                  )}
                </div>
              </div>
              <input value={archivosSearch} onChange={e => setArchivosSearch(e.target.value)} placeholder="Buscar…"
                className="w-full bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 mb-3" />
              <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
                {(['all', 'proyectos', 'archivos', 'imagenes'] as const).map(f => (
                  <button key={f} onClick={() => setArchivosFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${archivosFilter === f ? 'bg-[#2563EB] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {f === 'all' ? 'Todo' : f === 'proyectos' ? 'Proyectos' : f === 'archivos' ? 'Archivos' : 'Imágenes'}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pb-28 bg-gray-50">
              {isLoading && <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}

              {!isLoading && filteredProjects.length === 0 && filteredFiles.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-8">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                    <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                  </div>
                  <p className="text-gray-600 font-medium">Sin contenido aún</p>
                  <p className="text-sm text-gray-400">Sube un archivo con + o pídele a do AI que genere reportes</p>
                </div>
              )}

              {/* Proyectos */}
              {filteredProjects.length > 0 && (
                <div className="px-4 pt-4">
                  {(archivosFilter === 'all') && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Proyectos</p>}
                  <div className="space-y-2.5">
                    {filteredProjects.map(proj => (
                      <div key={proj.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${selectedIds.has(proj.id) ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
                        <button onClick={() => selectionMode ? toggleSelect(proj.id) : setActiveProject(proj)}
                          className="w-full flex items-start gap-3 px-4 py-3.5 text-left">
                          {selectionMode && (
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${selectedIds.has(proj.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                              {selectedIds.has(proj.id) && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
                            </div>
                          )}
                          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{proj.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{formatMessageTime(proj.created_at)} · {proj.project_files?.length ? `${proj.project_files.length} archivo${proj.project_files.length !== 1 ? 's' : ''}` : 'do AI'}</p>
                          </div>
                          {!selectionMode && <svg className="w-4 h-4 text-gray-400 mt-1 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Archivos e Imágenes */}
              {filteredFiles.length > 0 && (
                <div className="px-4 pt-4">
                  {(archivosFilter === 'all') && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-2">Archivos e imágenes</p>}
                  {archivosFilter === 'imagenes' ? (
                    <div className="grid grid-cols-3 gap-1.5">
                      {filteredFiles.map(file => (
                        <div key={file.id} className={`relative aspect-square rounded-xl overflow-hidden ${selectedIds.has(file.id) ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}>
                          {selectionMode && (
                            <button onClick={() => toggleSelect(file.id)} className="absolute inset-0 z-10 w-full h-full">
                              <div className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedIds.has(file.id) ? 'bg-blue-600 border-blue-600' : 'bg-white/80 border-white'}`}>
                                {selectedIds.has(file.id) && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
                              </div>
                            </button>
                          )}
                          <a href={!selectionMode ? file.url : undefined} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredFiles.map(file => (
                        <div key={file.id} className={`flex items-center gap-3 bg-white rounded-2xl border px-4 py-3 shadow-sm transition-all ${selectedIds.has(file.id) ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
                          {selectionMode && (
                            <button onClick={() => toggleSelect(file.id)}>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.has(file.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                {selectedIds.has(file.id) && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
                              </div>
                            </button>
                          )}
                          {file.type === 'image'
                            ? <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-gray-100"><img src={file.url} alt={file.name} className="w-full h-full object-cover" /></div>
                            : <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${fileColor(file.name)}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg></div>
                          }
                          <a href={!selectionMode ? file.url : undefined} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0" onClick={selectionMode ? (e) => { e.preventDefault(); toggleSelect(file.id) } : undefined}>
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{file.sender_emoji} {file.sender}{file.size ? ` · ${Math.round(file.size / 1024)} KB` : ''}</p>
                          </a>
                          {!selectionMode && <a href={file.url} target="_blank" rel="noopener noreferrer"><svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg></a>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="h-4" />
            </div>

            {/* Selection action bar */}
            {selectionMode && totalSelected > 0 && (
              <div className="fixed bottom-16 left-0 right-0 z-20 px-4 pb-2">
                <div className="bg-gray-900 rounded-2xl px-4 py-3 flex items-center gap-2 shadow-xl">
                  <span className="text-white text-sm font-medium flex-1">{totalSelected} seleccionado{totalSelected > 1 ? 's' : ''}</span>
                  <button onClick={askAISelected}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold active:scale-95 transition-all">
                    <span>✦</span> Preguntar a IA
                  </button>
                  <button onClick={deleteSelected}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold active:scale-95 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </>
        )
      })()}

      {/* ── CONTACTOS TAB ── */}
      {activeTab === 'contactos' && (
        <>
          <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
              <button onClick={() => { setShowNewContact(true); setShowNewMenu(false) }}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pb-24">
            {contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-8">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl">👥</div>
                <p className="text-gray-500 text-sm font-medium">Sin contactos aún</p>
                <p className="text-xs text-gray-400">Agrega contactos por su @usuario</p>
                <button onClick={() => setShowNewContact(true)}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full">
                  Agregar contacto
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {contacts.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                    {c.avatar_url
                      ? <img src={c.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                      : <div className={`w-11 h-11 rounded-full ${c.bg} flex items-center justify-center text-lg shrink-0`}>{c.emoji}</div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { setActiveTab('mensajes'); setActiveRoomId(c.room_id) }}
                        className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
                      </button>
                      <button
                        onClick={() => { setActiveTab('mensajes'); setActiveRoomId(c.room_id) }}
                        className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center hover:bg-green-100 transition-colors">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── LLAMADAS TAB ── */}
      {activeTab === 'llamadas' && (
        <>
          <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-10">
            <h1 className="text-2xl font-bold text-gray-900">Llamadas</h1>
          </div>
          <div className="flex-1 overflow-y-auto pb-24">
            {contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-8">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl">📞</div>
                <p className="text-gray-500 text-sm font-medium">Sin contactos para llamar</p>
                <p className="text-xs text-gray-400">Agrega contactos para hacer llamadas</p>
              </div>
            ) : (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-4 pt-4 pb-2">Contactos</p>
                <div className="divide-y divide-gray-100">
                  {contacts.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                      {c.avatar_url
                        ? <img src={c.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                        : <div className={`w-11 h-11 rounded-full ${c.bg} flex items-center justify-center text-lg shrink-0`}>{c.emoji}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                        <p className="text-xs text-gray-400">Chat privado</p>
                      </div>
                      <button
                        onClick={() => { setActiveTab('mensajes'); setActiveRoomId(c.room_id) }}
                        className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center hover:bg-green-100 active:scale-95 transition-all">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── PERFIL TAB ── */}
      {activeTab === 'tu' && (
        <>
          <div className="bg-[#f8fafc] border-b border-gray-200 px-4 pt-12 pb-4 sticky top-0 z-10">
            <h1 className="text-xl font-bold text-gray-900 text-center">Perfil</h1>
          </div>
          <div className="flex-1 overflow-y-auto pb-24 bg-[#f8fafc]">

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
                onClick={() => setShowAvatarMenu(true)}
                disabled={avatarUploading}
                className="mt-3 text-[15px] text-[#2563EB] font-medium disabled:opacity-40"
              >
                {avatarUploading ? 'Subiendo…' : 'Editar'}
              </button>
              {/* Gallery picker */}
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) { setShowAvatarMenu(false); uploadAvatar(f) } e.target.value = '' }} />
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


          </div>
        </>
      )}

      <BottomNav active={activeTab} onTabChange={setActiveTab} />

      {/* Daily panel — Lo importante de hoy */}
      {showDailyPanel && (
        <div className="fixed inset-0 z-40 flex flex-col bg-white"
          style={{ animation: 'slideInFromRight 0.22s cubic-bezier(0.4,0,0.2,1)' }}>
          {/* Header */}
          <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-10">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => setShowDailyPanel(false)} className="text-gray-400 hover:text-gray-600 p-1 -ml-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="flex-1">
                <h1 className="text-lg font-bold text-gray-900">Lo importante de hoy</h1>
              </div>
              <button onClick={() => setShowSendInvite(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 text-xs font-semibold">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" /></svg>
                Enviar
              </button>
            </div>
            {/* Tabs */}
            <div className="flex gap-2">
              {(['all', 'received', 'sent'] as const).map(f => (
                <button key={f} onClick={() => setInviteFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${inviteFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {f === 'all' ? 'Todos' : f === 'received' ? 'Recibidas' : 'Enviadas'}
                </button>
              ))}
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


            {/* Recibidas */}
            {(inviteFilter === 'all' || inviteFilter === 'received') && (
              <div className="px-4 py-3">
                {inviteFilter === 'all' && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">📥 Recibidas</p>}
                {invites.length === 0 ? (
                  <p className="text-sm text-gray-400 italic px-1">Sin tareas recibidas</p>
                ) : (
                  <div className="space-y-2">
                    {invites.map(inv => (
                      <div key={inv.id} className="bg-white rounded-2xl border border-blue-200 px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{inv.from_emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-700">{inv.from_name}</p>
                            <p className="text-[10px] text-gray-400">{inv.invite_type === 'reminder' ? 'Recordatorio' : 'Tarea'} · {formatMessageTime(inv.created_at)}</p>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${inv.invite_type === 'reminder' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                            {inv.invite_type === 'reminder' ? '🔔 Recordatorio' : '📋 Tarea'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 mb-1 leading-snug">{inv.content}</p>
                        {inv.due_date && <p className="text-xs text-amber-600 mb-2">📅 {new Date(inv.due_date + 'T00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                        {inv.remind_at && <p className="text-xs text-purple-600 mb-2">🔔 {new Date(inv.remind_at).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
                        <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                          <button onClick={() => respondInvite(inv.id, 'reject')}
                            className="flex-1 py-1.5 rounded-xl text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 transition-colors">
                            Rechazar
                          </button>
                          <button onClick={() => respondInvite(inv.id, 'accept')}
                            className="flex-1 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                            Aceptar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Enviadas */}
            {(inviteFilter === 'all' || inviteFilter === 'sent') && (
              <div className="px-4 py-3">
                {inviteFilter === 'all' && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">📤 Enviadas</p>}
                {sentInvites.length === 0 ? (
                  <p className="text-sm text-gray-400 italic px-1">Sin tareas enviadas</p>
                ) : (
                  <div className="space-y-2">
                    {sentInvites.map(inv => (
                      <div key={inv.id} className="bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{inv.to_emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-700">Para {inv.to_name}</p>
                            <p className="text-[10px] text-gray-400">{inv.invite_type === 'reminder' ? 'Recordatorio' : 'Tarea'} · {formatMessageTime(inv.created_at)}</p>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${inv.invite_type === 'reminder' ? 'bg-purple-100 text-purple-600' : 'bg-amber-100 text-amber-700'}`}>
                            {inv.invite_type === 'reminder' ? '🔔' : '📋'} Pendiente
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 leading-snug">{inv.content}</p>
                        {inv.due_date && <p className="text-xs text-amber-600 mt-1">📅 {new Date(inv.due_date + 'T00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                        {inv.remind_at && <p className="text-xs text-purple-600 mt-1">🔔 {new Date(inv.remind_at).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
                      </div>
                    ))}
                  </div>
                )}
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

          {/* Send invite sheet */}
          {showSendInvite && (
            <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/30" onClick={() => setShowSendInvite(false)}>
              <div className="bg-white rounded-t-3xl px-5 pt-5 pb-8 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-bold text-gray-900">Enviar tarea o recordatorio</h2>
                  <button onClick={() => setShowSendInvite(false)} className="text-gray-400 p-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Type toggle */}
                <div className="flex gap-2">
                  {(['task', 'reminder'] as const).map(t => (
                    <button key={t} onClick={() => setInviteType(t)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${inviteType === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {t === 'task' ? '📋 Tarea' : '🔔 Recordatorio'}
                    </button>
                  ))}
                </div>

                {/* Contact picker */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1.5">Enviar a</p>
                  <div className="flex gap-2 flex-wrap">
                    {contacts.map(c => (
                      <button key={c.id} onClick={() => setInviteTarget(c.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${inviteTarget === c.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        <span>{c.emoji}</span> <span>{c.firstName}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1.5">Descripción</p>
                  <textarea value={inviteContent} onChange={e => setInviteContent(e.target.value)}
                    placeholder={inviteType === 'task' ? 'Ej: Revisar el contrato antes del jueves' : 'Ej: Llamar al proveedor a las 10am'}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 resize-none"
                    rows={2} />
                </div>

                {/* Date */}
                {inviteType === 'task' ? (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-1.5">Fecha límite (opcional)</p>
                    <input type="date" value={inviteDue} onChange={e => setInviteDue(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-400" />
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-1.5">Fecha y hora</p>
                    <input type="datetime-local" value={inviteRemindAt} onChange={e => setInviteRemindAt(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-400" />
                  </div>
                )}

                <button onClick={sendInvite} disabled={!inviteTarget || !inviteContent.trim() || sendingInvite}
                  className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-2xl hover:bg-blue-700 disabled:opacity-40 transition-colors">
                  {sendingInvite ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Camera modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 pt-12 pb-3">
            <button onClick={closeCamera} className="text-white p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
            <p className="text-white font-semibold text-sm">Tomar foto</p>
            <div className="w-10" />
          </div>
          <div className="flex-1 relative overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 rounded-full border-4 border-white/40" />
            </div>
          </div>
          <div className="flex items-center justify-center pb-12 pt-6">
            <button onClick={capturePhoto}
              className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
              style={{ width: 72, height: 72 }}>
              <div className="w-14 h-14 rounded-full bg-white" />
            </button>
          </div>
        </div>
      )}

      {/* Avatar action sheet */}
      {showAvatarMenu && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowAvatarMenu(false)}>
          <div className="w-full bg-white rounded-t-3xl overflow-hidden shadow-2xl pb-8" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-4" />
            <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-5">Foto de perfil</p>
            <button onClick={() => avatarInputRef.current?.click()}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
              </div>
              <span className="text-[15px] text-gray-800 font-medium">Abrir galería</span>
            </button>
            <button onClick={openCamera}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
              </div>
              <span className="text-[15px] text-gray-800 font-medium">Tomar foto</span>
            </button>
            {(profile as any)?.avatar_url && (
              <button onClick={deleteAvatar}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors border-t border-gray-100">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                </div>
                <span className="text-[15px] text-red-500 font-medium">Eliminar foto de perfil</span>
              </button>
            )}
            <button onClick={() => setShowAvatarMenu(false)}
              className="w-full flex items-center justify-center px-6 py-3.5 mt-2 mx-5 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-[15px]" style={{width: 'calc(100% - 40px)'}}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {activeRoomId && (
        <div className="fixed inset-0 z-40 bg-white"
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

      {activeProject && (
        <ProjectWorkspace
          userId={userId}
          project={activeProject}
          onClose={() => setActiveProject(null)}
          onUpdate={p => { setActiveProject(p); setProjects(prev => prev.map(x => x.id === p.id ? p : x)) }}
        />
      )}

      {/* Action sheet */}
      {actionRoom && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={() => setActionRoom(null)}>
          <div className="w-full bg-white rounded-t-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
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
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-gray-100">
            <button onClick={() => { setShowNewContact(false); resetNc() }} className="text-blue-600 font-medium text-sm">Cancelar</button>
            <h2 className="flex-1 text-center text-base font-semibold text-gray-900">Nuevo contacto</h2>
            <button onClick={ncSave} disabled={ncSaving || !ncFirstName.trim() || ncPhone.trim().length < 7}
              className="text-blue-600 font-semibold text-sm disabled:opacity-40">
              {ncSaving ? 'Guardando…' : 'Agregar'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* Avatar placeholder */}
            <div className="flex flex-col items-center pt-8 pb-6">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
              </div>
            </div>
            {/* Name fields */}
            <div className="bg-white border-t border-b border-gray-100 divide-y divide-gray-100">
              <div className="flex items-center px-5 py-3.5 gap-3">
                <svg className="w-5 h-5 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
                <input type="text" placeholder="Nombre" value={ncFirstName}
                  onChange={e => setNcFirstName(e.target.value)}
                  className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none" autoFocus />
              </div>
              <div className="flex items-center px-5 py-3.5 gap-3">
                <div className="w-5 shrink-0" />
                <input type="text" placeholder="Apellido" value={ncLastName}
                  onChange={e => setNcLastName(e.target.value)}
                  className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none" />
              </div>
            </div>
            {/* Phone field */}
            <div className="bg-white border-t border-b border-gray-100 mt-6 flex items-center px-5 py-3.5 gap-3">
              <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 6.75Z" /></svg>
              <div className="flex-1 flex items-center gap-2">
                <input type="tel" placeholder="Número de teléfono" value={ncPhone}
                  onChange={e => { setNcPhone(e.target.value); setNcError('') }}
                  className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none" />
              </div>
            </div>
            {ncError && <p className="text-red-500 text-sm text-center mt-4 px-4">{ncError}</p>}
            <p className="text-xs text-gray-400 text-center mt-6 px-8">
              Si el número está registrado en do-chat, se agregará automáticamente como contacto.
            </p>
          </div>
        </div>
      )}

      {/* Nuevo grupo modal */}
      {showNewGroup && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
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
                    <Avatar emoji={c.emoji} bg={c.bg} size="lg" avatarUrl={c.avatar_url} />
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
          {room.otherAvatarUrl
            ? <img src={room.otherAvatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
            : <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl">
                {room.emoji ? room.emoji : <UserIcon className="w-6 h-6 text-gray-400" />}
              </div>
          }
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
    {
      id: 'contactos', label: 'Contactos',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>,
    },
    {
      id: 'llamadas', label: 'Llamadas',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>,
    },
    {
      id: 'archivos', label: 'Archivos',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>,
    },
    {
      id: 'mensajes', label: 'Mensajes',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>,
    },
    {
      id: 'tu', label: 'Tú',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>,
    },
  ]
  return (
    <div className="bg-white border-t border-gray-100 flex fixed bottom-0 left-0 right-0 z-10" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onTabChange(t.id)}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${active === t.id ? 'text-[#1a56db]' : 'text-gray-400'}`}>
          {t.icon}
          <span className="text-[9px] font-medium">{t.label}</span>
        </button>
      ))}
    </div>
  )
}
