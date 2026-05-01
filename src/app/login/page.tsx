'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Credenciales incorrectas. Intenta de nuevo.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-full flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600 mb-4">
            <span className="text-2xl font-bold text-white">d</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">do-chat</h1>
          <p className="text-sm text-zinc-400 mt-1">El chat donde la IA trabaja por ti</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Email</label>
            <Input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Contraseña</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4" /> : 'Entrar'}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-400">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-violet-400 hover:text-violet-300 font-medium">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
