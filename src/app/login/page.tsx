'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

const COUNTRIES = [
  { name: 'México', code: 'MX', dial: '+52', flag: '🇲🇽' },
  { name: 'Estados Unidos', code: 'US', dial: '+1', flag: '🇺🇸' },
  { name: 'España', code: 'ES', dial: '+34', flag: '🇪🇸' },
  { name: 'Argentina', code: 'AR', dial: '+54', flag: '🇦🇷' },
  { name: 'Colombia', code: 'CO', dial: '+57', flag: '🇨🇴' },
  { name: 'Chile', code: 'CL', dial: '+56', flag: '🇨🇱' },
  { name: 'Perú', code: 'PE', dial: '+51', flag: '🇵🇪' },
  { name: 'Venezuela', code: 'VE', dial: '+58', flag: '🇻🇪' },
  { name: 'Ecuador', code: 'EC', dial: '+593', flag: '🇪🇨' },
  { name: 'Bolivia', code: 'BO', dial: '+591', flag: '🇧🇴' },
  { name: 'Paraguay', code: 'PY', dial: '+595', flag: '🇵🇾' },
  { name: 'Uruguay', code: 'UY', dial: '+598', flag: '🇺🇾' },
  { name: 'Costa Rica', code: 'CR', dial: '+506', flag: '🇨🇷' },
  { name: 'Guatemala', code: 'GT', dial: '+502', flag: '🇬🇹' },
  { name: 'Honduras', code: 'HN', dial: '+504', flag: '🇭🇳' },
  { name: 'El Salvador', code: 'SV', dial: '+503', flag: '🇸🇻' },
  { name: 'Nicaragua', code: 'NI', dial: '+505', flag: '🇳🇮' },
  { name: 'Panamá', code: 'PA', dial: '+507', flag: '🇵🇦' },
  { name: 'República Dominicana', code: 'DO', dial: '+1', flag: '🇩🇴' },
  { name: 'Cuba', code: 'CU', dial: '+53', flag: '🇨🇺' },
  { name: 'Puerto Rico', code: 'PR', dial: '+1', flag: '🇵🇷' },
  { name: 'Brasil', code: 'BR', dial: '+55', flag: '🇧🇷' },
  { name: 'Portugal', code: 'PT', dial: '+351', flag: '🇵🇹' },
  { name: 'Reino Unido', code: 'GB', dial: '+44', flag: '🇬🇧' },
  { name: 'Francia', code: 'FR', dial: '+33', flag: '🇫🇷' },
  { name: 'Alemania', code: 'DE', dial: '+49', flag: '🇩🇪' },
  { name: 'Italia', code: 'IT', dial: '+39', flag: '🇮🇹' },
  { name: 'Canadá', code: 'CA', dial: '+1', flag: '🇨🇦' },
  { name: 'Australia', code: 'AU', dial: '+61', flag: '🇦🇺' },
  { name: 'Japón', code: 'JP', dial: '+81', flag: '🇯🇵' },
]

type Step = 'welcome' | 'phone' | 'otp' | 'profile'

function OtpBoxes({ value, onChange, disabled }: {
  value: string[]
  onChange: (v: string[]) => void
  disabled?: boolean
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  function handleChange(i: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...value]; next[i] = digit; onChange(next)
    if (digit && i < 5) refs.current[i + 1]?.focus()
  }
  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus()
  }
  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = ['', '', '', '', '', '']
    pasted.split('').forEach((ch, i) => { next[i] = ch })
    onChange(next)
    refs.current[Math.min(pasted.length, 5)]?.focus()
  }
  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {value.map((d, i) => (
        <input key={i} ref={el => { refs.current[i] = el }}
          type="tel" inputMode="numeric" maxLength={1} value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          disabled={disabled}
          className={`w-11 rounded-2xl text-center text-xl font-bold border-2 focus:outline-none transition-all disabled:opacity-40 ${
            d ? 'border-[#2563EB] bg-[#eff6ff] text-[#2563EB]' : 'border-gray-200 bg-gray-50 text-gray-900'
          } focus:border-[#2563EB]`}
          style={{ height: 52 }}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
        />
      ))}
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('welcome')
  const [country, setCountry] = useState(COUNTRIES[0])
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [phone, setPhone] = useState('')
  const [fullPhone, setFullPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [name, setName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const phoneRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  useEffect(() => {
    if (otp.join('').length === 6) verifyOtp()
  }, [otp])

  async function sendSMS() {
    const digits = phone.replace(/\D/g, '')
    if (!digits || digits.length < 6) { setError('Ingresa un número válido'); return }
    const full = `${country.dial}${digits}`
    setFullPhone(full)
    setLoading(true); setError('')
    const res = await fetch('/api/auth/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: full }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Error enviando SMS'); return }
    setStep('otp')
    setCooldown(60)
  }

  async function resendSMS() {
    if (cooldown > 0) return
    setLoading(true); setError('')
    const res = await fetch('/api/auth/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: fullPhone }),
    })
    setLoading(false)
    if (res.ok) { setCooldown(60); setOtp(['', '', '', '', '', '']) }
  }

  async function verifyOtp() {
    const code = otp.join('')
    if (code.length < 6) { setError('Ingresa el código completo'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/auth/verify-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: fullPhone, code }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok && !data.needs_profile) {
      setError(data.error ?? 'Código incorrecto')
      setOtp(['', '', '', '', '', ''])
      return
    }
    if (data.needs_profile) {
      setPendingUserId(data.user_id)
      setStep('profile')
      setTimeout(() => nameRef.current?.focus(), 100)
      return
    }
    await finishLogin(data.token_hash, data.user_id)
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const url = URL.createObjectURL(file)
    setAvatarPreview(url)
  }

  async function createProfile() {
    const trimmed = name.trim()
    if (trimmed.length < 2) { setError('Mínimo 2 caracteres'); return }
    if (trimmed.length > 30) { setError('Máximo 30 caracteres'); return }
    if (!pendingUserId) { setError('Sesión expirada, intenta de nuevo'); setStep('phone'); return }
    setLoading(true); setError('')

    let avatar_url: string | null = null
    if (avatarFile) {
      const fd = new FormData()
      fd.append('file', avatarFile)
      fd.append('user_id', pendingUserId)
      const upRes = await fetch('/api/auth/upload-avatar', { method: 'POST', body: fd })
      const upData = await upRes.json()
      if (upRes.ok) avatar_url = upData.url
    }

    const res = await fetch('/api/auth/complete-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: pendingUserId, name: trimmed, phone: fullPhone, avatar_url }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Error'); return }
    await finishLogin(data.token_hash, data.user_id)
  }

  async function finishLogin(token_hash: string, user_id: string) {
    const { error: sessionErr } = await supabase.auth.verifyOtp({ token_hash, type: 'email' })
    if (sessionErr) { setError('Error iniciando sesión'); return }
    router.push(`/demo/${user_id}`)
  }

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.dial.includes(countrySearch) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  )

  // ── Welcome ──────────────────────────────────────────────
  if (step === 'welcome') return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #2563EB 0%, #1d4ed8 100%)' }}>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        {/* Logo — multiply blends the white canvas into the blue bg */}
        <div className="mb-10 flex flex-col items-center">
          <img
            src="/dochatlogo.png"
            alt="do-chat"
            className="w-64 h-auto object-contain mb-5"
            style={{ mixBlendMode: 'multiply' }}
          />
          <p className="text-white/60 text-xs font-medium tracking-widest uppercase">Mensajería inteligente</p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-col gap-3 w-full max-w-xs mb-12">
          {[
            { icon: '⚡', text: 'Mensajes en tiempo real' },
            { icon: '✦', text: 'IA integrada en cada chat' },
            { icon: '🔒', text: 'Verificado con tu número' },
          ].map(f => (
            <div key={f.icon} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
              <span className="text-lg">{f.icon}</span>
              <span className="text-white text-sm font-medium">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-8 pb-14 space-y-3">
        <button
          onClick={() => setStep('phone')}
          className="w-full text-[#2563EB] font-bold py-4 rounded-2xl text-base transition-all active:scale-95"
          style={{ background: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}
        >
          Comenzar
        </button>
        <p className="text-white/40 text-xs text-center">
          Al continuar aceptas nuestros Términos y Política de privacidad
        </p>
      </div>
    </div>
  )

  // ── Phone entry ───────────────────────────────────────────
  if (step === 'phone') return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex items-center px-4 pt-12 pb-2">
        <button onClick={() => setStep('welcome')} className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
      </div>

      <div className="flex-1 px-6 pt-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Tu número</h1>
          <p className="text-gray-400 text-sm">Te enviaremos un SMS para verificar tu cuenta</p>
        </div>

        {/* Country selector */}
        <button
          onClick={() => { setShowCountryPicker(true); setCountrySearch('') }}
          className="w-full flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 mb-3 hover:bg-gray-100 transition-colors"
        >
          <span className="text-2xl">{country.flag}</span>
          <span className="flex-1 text-left text-sm font-medium text-gray-800">{country.name}</span>
          <span className="text-sm text-gray-400 font-medium">{country.dial}</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>

        {/* Phone input */}
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 gap-3 focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#06B6D4]/20 transition-all mb-6">
          <span className="text-sm font-semibold text-gray-500 shrink-0">{country.dial}</span>
          <div className="w-px h-5 bg-gray-300" />
          <input
            ref={phoneRef}
            type="tel"
            inputMode="tel"
            placeholder="Número de teléfono"
            value={phone}
            onChange={e => { setPhone(e.target.value.replace(/[^\d\s\-]/g, '')); setError('') }}
            onKeyDown={e => e.key === 'Enter' && sendSMS()}
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
            autoFocus
            autoComplete="tel"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
      </div>

      <div className="px-6 pb-12">
        <button
          onClick={sendSMS}
          disabled={loading || phone.replace(/\D/g, '').length < 6}
          className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-4 rounded-2xl text-sm disabled:opacity-40 transition-all active:scale-95"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enviando…
            </span>
          ) : 'Enviar código'}
        </button>
      </div>

      {/* Country picker modal */}
      {showCountryPicker && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center gap-3 px-4 pt-12 pb-3 border-b border-gray-100">
            <button onClick={() => setShowCountryPicker(false)} className="p-1 text-gray-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <input
              type="text"
              placeholder="Buscar país o código"
              value={countrySearch}
              onChange={e => setCountrySearch(e.target.value)}
              className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredCountries.map(c => (
              <button key={c.code + c.dial} onClick={() => { setCountry(c); setShowCountryPicker(false) }}
                className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50 text-left transition-colors">
                <span className="text-xl">{c.flag}</span>
                <span className="flex-1 text-sm text-gray-800">{c.name}</span>
                <span className="text-sm text-gray-400">{c.dial}</span>
                {c.code === country.code && (
                  <svg className="w-4 h-4 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // ── OTP ───────────────────────────────────────────────────
  if (step === 'otp') return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex items-center px-4 pt-12 pb-2">
        <button onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError('') }} className="p-2 -ml-2 text-gray-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
      </div>

      <div className="flex-1 px-6 pt-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Código de verificación</h1>
          <p className="text-gray-400 text-sm">
            Enviamos un SMS al{' '}
            <span className="font-semibold text-gray-700">{fullPhone}</span>
            {' '}·{' '}
            <button onClick={() => setStep('phone')} className="text-[#2563EB] font-medium">Editar</button>
          </p>
        </div>

        <OtpBoxes value={otp} onChange={v => { setOtp(v); setError('') }} disabled={loading} />

        {error && <p className="text-red-500 text-sm text-center mt-5">{error}</p>}

        {loading && (
          <div className="flex items-center justify-center gap-2 mt-5">
            <div className="w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Verificando…</span>
          </div>
        )}

        <div className="text-center mt-8">
          {cooldown > 0 ? (
            <p className="text-sm text-gray-400">Reenviar en <span className="font-semibold text-gray-600">{cooldown}s</span></p>
          ) : (
            <button onClick={resendSMS} disabled={loading} className="text-sm text-[#2563EB] font-semibold hover:text-[#2563EB]">
              Reenviar código
            </button>
          )}
        </div>
      </div>
    </div>
  )

  // ── Profile setup ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6">
        <div className="flex flex-col items-center mb-10">
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full mb-6 overflow-hidden group"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12Zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8Z"/>
                </svg>
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
            </div>
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <p className="text-xs text-gray-400 mb-1">Foto de perfil <span className="text-gray-300">(opcional)</span></p>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 mt-4">¿Cómo te llamas?</h1>
          <p className="text-gray-400 text-sm text-center">Este nombre será visible para tus contactos</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 mb-3 focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#06B6D4]/20 transition-all">
          <input
            ref={nameRef}
            type="text"
            placeholder="Tu nombre"
            value={name}
            maxLength={30}
            onChange={e => { setName(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && createProfile()}
            className="w-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
            autoComplete="name"
          />
        </div>
        <p className="text-xs text-gray-400 text-right mb-6">{name.length}/30</p>

        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
      </div>

      <div className="px-6 pb-12">
        <button
          onClick={createProfile}
          disabled={loading || name.trim().length < 2}
          className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-4 rounded-2xl text-sm disabled:opacity-40 transition-all active:scale-95"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creando perfil…
            </span>
          ) : 'Entrar a do-chat'}
        </button>
      </div>
    </div>
  )
}
