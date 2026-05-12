'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Stats = {
  totalUsers: number; activeToday: number; activeWeek: number; activeMonth: number
  msgsToday: number; msgsWeek: number; aiToday: number; filesStored: number
  newUsersWeek: number; proUsers: number; businessUsers: number; mrr: number
  daily: { day: string; text: number; ai: number }[]
}
type User = {
  id: string; name: string; phone: string | null; emoji: string; bg: string
  avatar_url: string | null; created_at: string; lastActive: string | null; messageCount: number
  plan: 'free' | 'pro' | 'business'; stripe_subscription_id: string | null
}

type Tab = 'dashboard' | 'usuarios' | 'sistema'

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color ?? 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function Avatar({ emoji, bg, avatarUrl, size = 8 }: { emoji: string; bg: string; avatarUrl?: string | null; size?: number }) {
  const s = `w-${size} h-${size}`
  if (avatarUrl) return <img src={avatarUrl} alt="" className={`${s} rounded-full object-cover shrink-0`} />
  return (
    <div className={`${s} rounded-full flex items-center justify-center shrink-0 ${bg} text-white text-sm`}>
      {emoji}
    </div>
  )
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'Hace menos de 1h'
  if (h < 24) return `Hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `Hace ${d}d`
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

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
  const [deleteAccountModal, setDeleteAccountModal] = useState<User | null>(null)

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/admin/stats')
    if (res.status === 403) { setForbidden(true); return }
    const data = await res.json()
    setStats(data)
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
    setDeleteAccountModal(null)
    fetchUsers(usersPage, search)
    fetchStats()
  }

  async function triggerCron(path: string, label: string) {
    setCronRunning(label)
    setCronResult(null)
    try {
      const res = await fetch(path)
      const data = await res.json()
      setCronResult(JSON.stringify(data, null, 2))
    } catch (e: any) { setCronResult('Error: ' + e.message) }
    setCronRunning(null)
  }

  if (forbidden) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl mb-4">🔒</p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Acceso restringido</h1>
        <p className="text-gray-500 mb-6">No tienes permisos para ver esta página.</p>
        <button onClick={() => router.push('/')} className="text-blue-600 text-sm font-medium">Volver al inicio</button>
      </div>
    </div>
  )

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const maxBar = Math.max(...(stats?.daily ?? []).map(d => d.text + d.ai), 1)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
            <Image src="/dochatlogo.png" alt="DO Chat" width={20} height={20} className="rounded-lg" />
          </div>
          <span className="font-bold text-gray-900">DO Chat</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500 font-medium">Admin</span>
          <div className="flex-1" />
          <button onClick={() => router.push('/')} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            ← Salir
          </button>
        </div>
        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 pb-0">
          {([['dashboard', 'Dashboard'], ['usuarios', 'Usuarios'], ['sistema', 'Sistema']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ─── Dashboard ─── */}
        {tab === 'dashboard' && stats && (
          <div className="space-y-6">
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Usuarios totales" value={stats.totalUsers} sub={`+${stats.newUsersWeek} esta semana`} color="text-blue-600" />
              <StatCard label="Activos hoy" value={stats.activeToday} sub={`${stats.activeWeek} esta semana`} color="text-emerald-600" />
              <StatCard label="Mensajes hoy" value={stats.msgsToday} sub={`${stats.msgsWeek} esta semana`} />
              <StatCard label="Consultas IA hoy" value={stats.aiToday} sub={`~$${(stats.aiToday * 0.015).toFixed(2)} USD est.`} color="text-violet-600" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Activos este mes" value={stats.activeMonth} />
              <StatCard label="Archivos almacenados" value={stats.filesStored} sub="Se borran al eliminar la conversación" />
              <StatCard label="Mensajes esta semana" value={stats.msgsWeek} />
              <StatCard label="Costo IA estimado" value={`$${(stats.aiToday * 30 * 0.015).toFixed(0)}`} sub="USD / mes (proyección)" color="text-orange-600" />
            </div>

            {/* Subscription revenue */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Suscripciones activas</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-emerald-600">${stats.mrr.toFixed(0)}</p>
                  <p className="text-xs text-gray-400 mt-1">MRR (USD)</p>
                </div>
                <div className="text-center border-x border-gray-100">
                  <p className="text-3xl font-bold text-blue-600">{stats.proUsers}</p>
                  <p className="text-xs text-gray-400 mt-1">Pro · $12.99/mes</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-violet-600">{stats.businessUsers}</p>
                  <p className="text-xs text-gray-400 mt-1">Business · $29.99/mes</p>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Actividad últimos 7 días</h2>
              <div className="flex items-end gap-3 h-36">
                {stats.daily.map(d => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: '100px' }}>
                      <div className="w-full bg-violet-200 rounded-t" style={{ height: `${(d.ai / maxBar) * 100}%` }} title={`AI: ${d.ai}`} />
                      <div className="w-full bg-blue-400 rounded-t" style={{ height: `${(d.text / maxBar) * 100}%` }} title={`Mensajes: ${d.text}`} />
                    </div>
                    <span className="text-[10px] text-gray-400">{d.day}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded bg-blue-400 inline-block" />Mensajes</span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded bg-violet-200 inline-block" />IA</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── Usuarios ─── */}
        {tab === 'usuarios' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setUsersPage(1) }}
                  placeholder="Buscar por nombre o teléfono…"
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 bg-white"
                />
              </div>
              <span className="text-sm text-gray-400 shrink-0">{usersTotal} usuarios</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Usuario</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Plan</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Teléfono</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Registrado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Última actividad</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Acc.</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar emoji={u.emoji} bg={u.bg} avatarUrl={u.avatar_url} />
                          <div>
                            <p className="font-medium text-gray-900">{u.name}</p>
                            <p className="text-xs text-gray-400">{u.messageCount} mensajes</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.plan === 'pro' && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">Pro</span>
                        )}
                        {u.plan === 'business' && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-violet-100 text-violet-700 rounded-full">Business</span>
                        )}
                        {u.plan === 'free' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-400 rounded-full">Free</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{u.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                        {new Date(u.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{timeAgo(u.lastActive)}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setDeleteAccountModal(u)}
                          className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400 text-sm">No hay usuarios</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {usersTotal > 20 && (
              <div className="flex items-center justify-center gap-2">
                <button disabled={usersPage <= 1} onClick={() => setUsersPage(p => p - 1)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  ← Anterior
                </button>
                <span className="text-sm text-gray-500">Página {usersPage} de {Math.ceil(usersTotal / 20)}</span>
                <button disabled={usersPage >= Math.ceil(usersTotal / 20)} onClick={() => setUsersPage(p => p + 1)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Sistema ─── */}
        {tab === 'sistema' && (
          <div className="space-y-4 max-w-2xl">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="font-semibold text-gray-900">Cron Jobs</h2>

              <div className="flex items-center justify-between py-3 border-b border-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">Agente Proactivo</p>
                  <p className="text-xs text-gray-400">Envía brief diario a usuarios activos · 9:00am</p>
                </div>
                <button
                  onClick={() => triggerCron('/api/cron/proactive', 'proactive')}
                  disabled={!!cronRunning}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl disabled:opacity-40 hover:bg-blue-700 transition-colors"
                >
                  {cronRunning === 'proactive' ? 'Ejecutando…' : 'Ejecutar ahora'}
                </button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">Limpieza de datos</p>
                  <p className="text-xs text-gray-400">Sin borrado automático · datos solo se eliminan a petición del usuario</p>
                </div>
                <span className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-400 rounded-xl">Desactivado</span>
              </div>

              {cronResult && (
                <pre className="bg-gray-50 rounded-xl p-4 text-xs text-gray-700 overflow-x-auto">{cronResult}</pre>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <h2 className="font-semibold text-gray-900">Privacidad & Retención</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  Mensajes cifrados en reposo (AES-256-GCM)
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  Archivos eliminados del storage al borrar la conversación
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  Mensajes y archivos solo se eliminan cuando el usuario borra la conversación
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  Mensajes al agente IA pasan por API de Anthropic (como ChatGPT)
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete user confirmation modal */}
      {deleteAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900 text-lg mb-2">¿Eliminar usuario?</h3>
            <p className="text-gray-500 text-sm mb-5">
              Se eliminarán todos los datos de <strong>{deleteAccountModal.name}</strong>: mensajes, tareas, archivos y cuenta. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteAccountModal(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => deleteUser(deleteAccountModal.id)}
                disabled={deletingId === deleteAccountModal.id}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors"
              >
                {deletingId === deleteAccountModal.id ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
