'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, full_name: fullName },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-full flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600 mb-4">
            <span className="text-2xl font-bold text-white">d</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Crear cuenta</h1>
          <p className="text-sm text-zinc-400 mt-1">Únete a do-chat</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Nombre completo</label>
            <Input
              type="text"
              placeholder="Tu nombre"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Username</label>
            <Input
              type="text"
              placeholder="@usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Email</label>
            <Input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Contraseña</label>
            <Input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4" /> : 'Crear cuenta'}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-400">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
