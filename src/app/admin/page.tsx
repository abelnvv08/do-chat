'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Users, MessageSquare, Sparkles, TrendingUp, DollarSign,
  HardDrive, UserPlus, ShieldCheck, Settings, LogOut,
  Trash2, Search, ChevronLeft, ChevronRight, Crown, Zap
} from 'lucide-react'

type Stats = {
  totalUsers: number; activeToday: number; activeWeek: number; activeMonth: number
  msgsToday: number; msgsWeek: number; aiToday: number; filesStored: number
  newUsersWeek: number; proUsers: number; businessUsers: number; mrr: number
  daily: { day: string; text: number; ai: number }[]
}
type User = {
  id: string; name: string; phone: string | null; emoji: string; bg: string
  avatar_url: string | null; created_at: string; lastActive: string | null
  messageCount: number; plan: 'free' | 'pro' | 'business'; stripe_subscription_id: string | null
}
type Tab = 'dashboard' | 'usuarios' | 'sistema'

function timeAgo(iso: string | null): string {
  if (!iso) return 'Nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'Hace <1h'
  if (h < 24) return `Hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `Hace ${d}d`
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function Avatar({ emoji, bg, avatarUrl, size = 8 }: { emoji: string; bg: string; avatarUrl?: string | null; size?: number }) {
  const s = `w-${size} h-${size}`
  if (avatarUrl) return <img src={avatarUrl} alt="" className={`${s} rounded-full object-cover shrink-0`} />
  return <div className={`${s} rounded-full flex items-center justify-center shrink-0 ${bg} text-white text-sm`}>{emoji}</div>
}

function KpiCard({ icon: Icon, label, value, sub, trend, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; trend?: number; color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex gap-4 items-start">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-400 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      {trend !== undefined && (
        <span className={`text-xs font-semibold px-2 py-1 rounded-lg shrink-0 ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
  )
}

function PlanBadge({ plan }: { plan: 'free' | 'pro' | 'business' }) {
  if (plan === 'business') return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-violet-100 text-violet-700 rounded-full"><Crown className="w-3 h-3" />MAX</span>
  if (plan === 'pro') return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full"><Zap className="w-3 h-3" />Pro</span>
  return <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-400 rounded-full">Free</span>
}

const NAV: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
  { id: 'usuarios', label: 'Usuarios', icon: Users },
  { id: 'sistema', label: 'Sistema', icon: Settings },
]

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersPage, setUsersPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [cronRunning, setCronRunning] = useState<string | null>(null)
  const [cronResult, setCronResult] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<User | null>(null)

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/admin/stats')
    if (res.status === 403) { setForbidden(true); return }
    setStats(await res.json())
    setLoading(false)
  }, [])

  const fetchUsers = useCallback(async (page = 1, q = '') => {
    const res = await fetch(`/api/admin/users?page=${page}&search=${encodeURIComponent(q)}`)
    if (res.status === 403) { setForbidden(true); return }
    const data = await res.json()
    setUsers(data.users ?? [])
    setUsersTotal(data.total ?? 0)
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => {
    if (tab === 'usuarios') fetchUsers(usersPage, search)
  }, [tab, usersPage, search, fetchUsers])

  async function deleteUser(userId: string) {
    setDeletingId(userId)
    await fetch('/api/admin/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId }) })
    setDeletingId(null)
    setDeleteModal(null)
    fetchUsers(usersPage, search)
    fetchStats()
  }

  async function triggerCron(path: string, label: string) {
    setCronRunning(label); setCronResult(null)
    try {
      const res = await fetch(path)
      setCronResult(JSON.stringify(await res.json(), null, 2))
    } catch (e: any) { setCronResult('Error: ' + e.message) }
    setCronRunning(null)
  }

  if (forbidden) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-5xl mb-4">🔒</p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Acceso restringido</h1>
        <p className="text-gray-500 mb-6 text-sm">No tienes permisos para ver esta página.</p>
        <button onClick={() => router.push('/')} className="text-blue-600 text-sm font-medium">← Volver</button>
      </div>
    </div>
  )

  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const totalPages = Math.ceil(usersTotal / 20)

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* ── Sidebar ── */}
      <aside className="w-64 bg-[#0f172a] flex flex-col shrink-0 fixed inset-y-0 left-0 z-20">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <Image src="/dologo.png" alt="DO Chat" width={24} height={24} className="rounded-lg" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">DO Chat</p>
              <p className="text-white/40 text-xs mt-0.5">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Stats summary */}
        {stats && (
          <div className="px-4 py-4 border-t border-white/10 space-y-3">
            <div className="bg-white/5 rounded-xl px-4 py-3">
              <p className="text-white/40 text-xs mb-1">MRR</p>
              <p className="text-white font-bold text-lg">${stats.mrr.toFixed(0)} <span className="text-white/40 text-xs font-normal">USD</span></p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-3 pb-6 space-y-1">
          <button onClick={() => router.push('/')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <LogOut className="w-4 h-4 shrink-0" />
            Salir al chat
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 ml-64 min-h-screen">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {tab === 'dashboard' && 'Dashboard'}
                {tab === 'usuarios' && 'Usuarios'}
                {tab === 'sistema' && 'Sistema'}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {tab === 'dashboard' && `${stats?.totalUsers ?? 0} usuarios · ${stats?.activeToday ?? 0} activos hoy`}
                {tab === 'usuarios' && `${usersTotal} usuarios registrados`}
                {tab === 'sistema' && 'Configuración y cron jobs'}
              </p>
            </div>
            <button onClick={fetchStats}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors">
              Actualizar
            </button>
          </div>
        </header>

        <div className="px-8 py-6">

          {/* ─── Dashboard ─── */}
          {tab === 'dashboard' && stats && (
            <div className="space-y-6">

              {/* KPI Grid */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <KpiCard icon={Users} label="Usuarios totales" value={stats.totalUsers}
                  sub={`+${stats.newUsersWeek} esta semana`} color="bg-blue-600" />
                <KpiCard icon={TrendingUp} label="Activos hoy" value={stats.activeToday}
                  sub={`${stats.activeWeek} esta semana`} color="bg-emerald-500" />
                <KpiCard icon={MessageSquare} label="Mensajes hoy" value={stats.msgsToday}
                  sub={`${stats.msgsWeek} esta semana`} color="bg-slate-600" />
                <KpiCard icon={Sparkles} label="Consultas DO AI hoy" value={stats.aiToday}
                  sub={`~$${(stats.aiToday * 0.015).toFixed(2)} USD est.`} color="bg-violet-600" />
              </div>

              {/* Revenue + Plans */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="bg-[#0f172a] rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <p className="text-white/40 text-xs font-medium uppercase tracking-wide mb-1">Ingresos mensuales</p>
                    <p className="text-4xl font-bold text-white">${stats.mrr.toFixed(0)}</p>
                    <p className="text-white/40 text-sm mt-1">USD / mes</p>
                  </div>
                  <div className="mt-6 flex gap-4">
                    <div className="bg-white/5 rounded-xl px-4 py-3 flex-1 text-center">
                      <p className="text-2xl font-bold text-blue-400">{stats.proUsers}</p>
                      <p className="text-white/40 text-xs mt-0.5">Pro</p>
                    </div>
                    <div className="bg-white/5 rounded-xl px-4 py-3 flex-1 text-center">
                      <p className="text-2xl font-bold text-violet-400">{stats.businessUsers}</p>
                      <p className="text-white/40 text-xs mt-0.5">MAX</p>
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <p className="text-sm font-semibold text-gray-700 mb-4">Distribución de planes</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={[
                      { plan: 'Free', usuarios: stats.totalUsers - stats.proUsers - stats.businessUsers },
                      { plan: 'Pro', usuarios: stats.proUsers },
                      { plan: 'MAX', usuarios: stats.businessUsers },
                    ]} barSize={40}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="plan" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
                      <Bar dataKey="usuarios" fill="#3b82f6" radius={[6, 6, 0, 0]}
                        label={{ position: 'top', fontSize: 12, fill: '#64748b' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Activity chart */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Actividad — últimos 7 días</p>
                    <p className="text-xs text-gray-400 mt-0.5">Mensajes de usuarios y consultas a DO AI</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={stats.daily} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gText" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gAI" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
                    <Legend formatter={(v) => v === 'text' ? 'Mensajes' : 'DO AI'} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                    <Area type="monotone" dataKey="text" name="text" stroke="#3b82f6" strokeWidth={2} fill="url(#gText)" dot={false} activeDot={{ r: 5 }} />
                    <Area type="monotone" dataKey="ai" name="ai" stroke="#8b5cf6" strokeWidth={2} fill="url(#gAI)" dot={false} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* More KPIs */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <KpiCard icon={UserPlus} label="Nuevos esta semana" value={stats.newUsersWeek} color="bg-teal-500" />
                <KpiCard icon={HardDrive} label="Archivos almacenados" value={stats.filesStored} sub="DMs + grupos" color="bg-orange-500" />
                <KpiCard icon={DollarSign} label="Costo IA/mes (est.)" value={`$${(stats.aiToday * 30 * 0.015).toFixed(0)}`} sub="USD proyección" color="bg-pink-500" />
                <KpiCard icon={ShieldCheck} label="Activos este mes" value={stats.activeMonth} sub="usuarios únicos" color="bg-cyan-600" />
              </div>
            </div>
          )}

          {/* ─── Usuarios ─── */}
          {tab === 'usuarios' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setUsersPage(1) }}
                    placeholder="Buscar por nombre o teléfono…"
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 bg-white shadow-sm"
                  />
                </div>
                <span className="text-sm text-gray-400 shrink-0 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
                  {usersTotal} usuarios
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Usuario</th>
                      <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Plan</th>
                      <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Teléfono</th>
                      <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Registro</th>
                      <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Última act.</th>
                      <th className="px-6 py-3.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar emoji={u.emoji} bg={u.bg} avatarUrl={u.avatar_url} />
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
                              <p className="text-xs text-gray-400">{u.messageCount} mensajes</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4"><PlanBadge plan={u.plan} /></td>
                        <td className="px-4 py-4 text-gray-500 text-sm hidden lg:table-cell">{u.phone ?? '—'}</td>
                        <td className="px-4 py-4 text-gray-400 text-xs hidden md:table-cell">
                          {new Date(u.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </td>
                        <td className="px-4 py-4 text-gray-400 text-xs">{timeAgo(u.lastActive)}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => setDeleteModal(u)}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">No hay usuarios</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Página {usersPage} de {totalPages}</span>
                  <div className="flex gap-2">
                    <button disabled={usersPage <= 1} onClick={() => setUsersPage(p => p - 1)}
                      className="p-2 border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition-colors bg-white">
                      <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <button disabled={usersPage >= totalPages} onClick={() => setUsersPage(p => p + 1)}
                      className="p-2 border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition-colors bg-white">
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Sistema ─── */}
          {tab === 'sistema' && (
            <div className="space-y-4 max-w-2xl">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <p className="font-semibold text-gray-900">Cron Jobs</p>
                  <p className="text-xs text-gray-400 mt-0.5">Procesos automáticos del sistema</p>
                </div>
                <div className="divide-y divide-gray-50">
                  <div className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Agente Proactivo</p>
                      <p className="text-xs text-gray-400 mt-0.5">Brief diario · ejecuta a las 9:00am</p>
                    </div>
                    <button onClick={() => triggerCron('/api/cron/proactive', 'proactive')} disabled={!!cronRunning}
                      className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl disabled:opacity-40 hover:bg-blue-700 transition-colors">
                      {cronRunning === 'proactive' ? 'Ejecutando…' : 'Ejecutar'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Limpieza de datos</p>
                      <p className="text-xs text-gray-400 mt-0.5">Solo se elimina a petición del usuario</p>
                    </div>
                    <span className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-400 rounded-xl">Inactivo</span>
                  </div>
                </div>
                {cronResult && (
                  <pre className="bg-gray-50 border-t border-gray-100 px-6 py-4 text-xs text-gray-700 overflow-x-auto">{cronResult}</pre>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <p className="font-semibold text-gray-900">Privacidad & Seguridad</p>
                </div>
                <div className="px-6 py-4 space-y-3">
                  {[
                    { ok: true, text: 'Mensajes cifrados en reposo (AES-256-GCM)' },
                    { ok: true, text: 'E2EE para DMs y grupos (ECDH P-256)' },
                    { ok: true, text: 'Archivos eliminados del storage al borrar conversación' },
                    { ok: true, text: 'Datos eliminados solo a petición del usuario' },
                    { ok: false, text: 'Mensajes al agente IA pasan por API de Anthropic' },
                  ].map(({ ok, text }) => (
                    <div key={text} className="flex items-center gap-3 text-sm text-gray-600">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${ok ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                      {text}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <p className="font-semibold text-gray-900">Entorno</p>
                </div>
                <div className="px-6 py-4 space-y-2">
                  {[
                    ['Base de datos', 'Supabase (PostgreSQL)'],
                    ['Auth', 'Supabase Auth + OTP SMS'],
                    ['Storage', 'Supabase Storage'],
                    ['IA', 'Anthropic Claude (Haiku / Sonnet)'],
                    ['Pagos', 'Stripe'],
                    ['Push', 'Web Push API (VAPID)'],
                    ['Deploy', 'Vercel'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between py-1.5 text-sm">
                      <span className="text-gray-400">{k}</span>
                      <span className="font-medium text-gray-700">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Delete modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-2">¿Eliminar usuario?</h3>
            <p className="text-gray-500 text-sm mb-6">
              Se eliminarán todos los datos de <strong>{deleteModal.name}</strong>: mensajes, tareas, archivos y cuenta. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={() => deleteUser(deleteModal.id)} disabled={deletingId === deleteModal.id}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors">
                {deletingId === deleteModal.id ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
