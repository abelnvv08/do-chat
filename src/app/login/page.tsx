'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-client'
import { useLanguage, LangToggle } from '@/lib/i18n'

const COUNTRIES = [
  { name: 'Mexico', code: 'MX', dial: '+52', flag: '🇲🇽' },
  { name: 'United States', code: 'US', dial: '+1', flag: '🇺🇸' },
  { name: 'Spain', code: 'ES', dial: '+34', flag: '🇪🇸' },
  { name: 'Argentina', code: 'AR', dial: '+54', flag: '🇦🇷' },
  { name: 'Colombia', code: 'CO', dial: '+57', flag: '🇨🇴' },
  { name: 'Chile', code: 'CL', dial: '+56', flag: '🇨🇱' },
  { name: 'Peru', code: 'PE', dial: '+51', flag: '🇵🇪' },
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
  { name: 'Panama', code: 'PA', dial: '+507', flag: '🇵🇦' },
  { name: 'Dominican Republic', code: 'DO', dial: '+1', flag: '🇩🇴' },
  { name: 'Cuba', code: 'CU', dial: '+53', flag: '🇨🇺' },
  { name: 'Puerto Rico', code: 'PR', dial: '+1', flag: '🇵🇷' },
  { name: 'Brazil', code: 'BR', dial: '+55', flag: '🇧🇷' },
  { name: 'Portugal', code: 'PT', dial: '+351', flag: '🇵🇹' },
  { name: 'United Kingdom', code: 'GB', dial: '+44', flag: '🇬🇧' },
  { name: 'France', code: 'FR', dial: '+33', flag: '🇫🇷' },
  { name: 'Germany', code: 'DE', dial: '+49', flag: '🇩🇪' },
  { name: 'Italy', code: 'IT', dial: '+39', flag: '🇮🇹' },
  { name: 'Canada', code: 'CA', dial: '+1', flag: '🇨🇦' },
  { name: 'Australia', code: 'AU', dial: '+61', flag: '🇦🇺' },
  { name: 'Japan', code: 'JP', dial: '+81', flag: '🇯🇵' },
]

type Step = 'phone' | 'otp' | 'profile'

/* ── OTP Boxes ─────────────────────────────────────────────── */
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
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {value.map((d, i) => (
        <input
          key={i} ref={el => { refs.current[i] = el }}
          type="tel" inputMode="numeric" maxLength={1} value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          disabled={disabled}
          className={`w-11 h-14 rounded-2xl text-center text-xl font-black border-2 focus:outline-none transition-all duration-150 disabled:opacity-40 ${
            d ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-200' : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-400 focus:bg-white focus:shadow-md'
          }`}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
        />
      ))}
    </div>
  )
}

/* ── Error ─────────────────────────────────────────────────── */
function Err({ msg }: { msg: string }) {
  if (!msg) return null
  return (
    <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mt-4">
      <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.344 4.876c.866 1.5-.217 3.374-1.948 3.374H2.604c-1.73 0-2.813-1.874-1.948-3.374l7.396-12.748c.866-1.5 3.032-1.5 3.898 0l7.394 12.748zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <p className="text-sm text-red-600 leading-snug">{msg}</p>
    </div>
  )
}

/* ── Layout ─────────────────────────────────────────────────── */
function Layout({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #1a3a8a 0%, #2563eb 45%, #3b82f6 100%)' }}
    >
      {/* Top brand strip */}
      <div className="relative flex flex-col items-center justify-center pt-12 pb-20 px-6 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-12 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-6 left-6 w-24 h-24 rounded-full bg-white/[0.04]" />
        <div className="absolute bottom-10 right-10 w-16 h-16 rounded-full bg-white/[0.06]" />

        {/* Logo */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-[72px] h-[72px] rounded-3xl bg-white flex items-center justify-center shadow-2xl shadow-blue-950/50 mb-4 ring-4 ring-white/20">
            <Image src="/dochatlogo.png" alt="DO Chat" width={52} height={52} className="rounded-2xl" />
          </div>
          <span className="text-white font-extrabold text-xl tracking-tight mb-1">DO Chat</span>
          <span className="text-blue-200/80 text-sm font-medium">Tu equipo chatea. do AI trabaja.</span>
        </div>

        {/* Step indicator */}
        <div className="relative z-10 flex items-center gap-2 mt-7">
          {header}
        </div>
      </div>

      {/* White card floating on gradient */}
      <div className="flex-1 flex flex-col px-4 -mt-10 pb-8 relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl shadow-blue-950/30 flex-1 flex flex-col px-6 pt-7 pb-10 max-w-md w-full mx-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const l = t.login

  const [step, setStep] = useState<Step>('phone')
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
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const res = await fetch('/api/auth/profile')
      const d = await res.json()
      if (d.profile) { router.push(`/chat/${user.id}`); return }
      setPendingUserId(user.id)
      setStep('profile')
      setTimeout(() => nameRef.current?.focus(), 100)
    })
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  useEffect(() => {
    if (otp.join('').length === 6) verifyOtp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp])

  async function sendSMS() {
    const digits = phone.replace(/\D/g, '')
    if (!digits || digits.length < 6) { setError(l.phone.errorShort); return }
    const full = `${country.dial}${digits}`
    setFullPhone(full)
    setLoading(true); setError('')
    const res = await fetch('/api/auth/send-sms', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: full }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? l.phone.errorSMS); return }
    setStep('otp'); setCooldown(60)
  }

  async function resendSMS() {
    if (cooldown > 0) return
    setLoading(true); setError('')
    const res = await fetch('/api/auth/send-sms', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: fullPhone }),
    })
    setLoading(false)
    if (res.ok) { setCooldown(60); setOtp(['', '', '', '', '', '']) }
  }

  async function verifyOtp() {
    const code = otp.join('')
    if (code.length < 6) { setError(l.otp.errorCode); return }
    setLoading(true); setError('')
    const res = await fetch('/api/auth/verify-sms', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: fullPhone, code }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok && !data.needs_profile) {
      setError(data.error ?? l.otp.errorWrong)
      setOtp(['', '', '', '', '', '']); return
    }
    if (data.needs_profile) {
      setPendingUserId(data.user_id); setStep('profile')
      setTimeout(() => nameRef.current?.focus(), 100); return
    }
    await finishLogin(data.token_hash, data.user_id)
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function createProfile() {
    const trimmed = name.trim()
    if (trimmed.length < 2) { setError(l.profile.errorShort); return }
    if (trimmed.length > 30) { setError(l.profile.errorLong); return }
    if (!pendingUserId) { setError(l.profile.errorExpired); setStep('phone'); return }
    setLoading(true); setError('')
    let avatar_url: string | null = null
    if (avatarFile) {
      const fd = new FormData()
      fd.append('file', avatarFile); fd.append('user_id', pendingUserId)
      const upRes = await fetch('/api/auth/upload-avatar', { method: 'POST', body: fd })
      const upData = await upRes.json()
      if (upRes.ok) avatar_url = upData.url
    }
    if (!fullPhone) {
      const res = await fetch('/api/auth/profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, emoji: '😊', avatar_url }),
      })
      setLoading(false)
      if (!res.ok) { const d = await res.json(); setError(d.error ?? l.profile.errorGeneric); return }
      router.push(`/onboarding?userId=${pendingUserId}`); return
    }
    const res = await fetch('/api/auth/complete-profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: pendingUserId, name: trimmed, phone: fullPhone, avatar_url }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? l.profile.errorGeneric); return }
    await finishLogin(data.token_hash, data.user_id)
  }

  async function finishLogin(token_hash: string, user_id: string) {
    const { error: e } = await supabase.auth.verifyOtp({ token_hash, type: 'email' })
    if (e) { setError('Error al iniciar sesión'); return }
    router.push(`/onboarding?userId=${user_id}`)
  }

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.dial.includes(countrySearch) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  )

  /* ── Dots header ─────────────────────────────────────────── */
  const stepLabels = ['Teléfono', 'Código', 'Perfil']
  const StepDots = ({ active }: { active: 0 | 1 | 2 }) => (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className={`rounded-full transition-all duration-300 ${
            i === active ? 'w-8 h-2 bg-white' : i < active ? 'w-2 h-2 bg-white/70' : 'w-2 h-2 bg-white/25'
          }`} />
        ))}
      </div>
      <span className="text-blue-200/70 text-xs font-medium tracking-wide uppercase">
        {stepLabels[active]} · Paso {active + 1} de 3
      </span>
    </div>
  )

  /* ── Shared btn ──────────────────────────────────────────── */
  const Btn = ({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) => (
    <button
      onClick={onClick} disabled={disabled}
      className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-[15px] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200/60 flex items-center justify-center gap-2"
    >
      {children}
    </button>
  )

  // ── PHONE ─────────────────────────────────────────────────
  if (step === 'phone') return (
    <Layout header={<StepDots active={0} />}>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-1.5">{l.phone.title}</h1>
        <p className="text-slate-500 text-sm leading-relaxed">{l.phone.subtitle}</p>
      </div>

      {/* Phone field */}
      <div className="flex items-center bg-slate-50 border-2 border-slate-200 rounded-2xl overflow-hidden focus-within:border-blue-500 focus-within:bg-white transition-all duration-200 mb-4">
        <button
          onClick={() => { setShowCountryPicker(true); setCountrySearch('') }}
          className="flex items-center gap-1.5 pl-4 pr-3 py-4 shrink-0 hover:bg-slate-100 transition-colors"
        >
          <span className="text-xl leading-none">{country.flag}</span>
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className="w-px h-6 bg-slate-200 shrink-0" />
        <span className="text-sm font-bold text-slate-700 px-3 shrink-0 select-none">{country.dial}</span>
        <input
          ref={phoneRef} type="tel" inputMode="numeric"
          placeholder={l.phone.placeholder} value={phone}
          onChange={e => { setPhone(e.target.value.replace(/[^\d\s\-]/g, '')); setError('') }}
          onKeyDown={e => e.key === 'Enter' && sendSMS()}
          className="flex-1 py-4 pr-4 text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent"
          autoFocus autoComplete="tel"
        />
      </div>

      <Err msg={error} />

      <div className="mt-4">
        <Btn onClick={sendSMS} disabled={loading || phone.replace(/\D/g, '').length < 6}>
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{l.phone.sending}</>
          ) : <>{l.phone.continue} <span className="text-blue-200">→</span></>}
        </Btn>
      </div>


      <p className="text-slate-300 text-[11px] text-center leading-relaxed">
        {l.phone.disclaimerPrefix}{' '}
        <Link href="/terms" className="text-slate-400 underline underline-offset-2 hover:text-slate-600">{l.phone.disclaimerTerms}</Link>
        {' '}{l.phone.disclaimerAnd}{' '}
        <Link href="/privacy" className="text-slate-400 underline underline-offset-2 hover:text-slate-600">{l.phone.disclaimerPrivacy}</Link>
      </p>

      <div className="flex items-center justify-between mt-5 pt-5 border-t border-slate-100">
        <Link href="/landing" className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {l.phone.backHome}
        </Link>
        <LangToggle className="border-slate-200 text-slate-400 hover:border-slate-300" />
      </div>

      {/* Country picker */}
      {showCountryPicker && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top,0px)' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white sticky top-0">
            <div className="flex-1 flex items-center gap-2.5 bg-slate-100 rounded-2xl px-3.5 py-2.5">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.636 5.636a7.5 7.5 0 0010.728 10.728z" />
              </svg>
              <input
                type="text" placeholder={l.phone.searchPlaceholder} value={countrySearch}
                onChange={e => setCountrySearch(e.target.value)}
                className="flex-1 text-sm text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent"
                autoFocus
              />
            </div>
            <button onClick={() => setShowCountryPicker(false)} className="text-blue-600 text-sm font-bold ml-1 shrink-0">
              {l.phone.cancel}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {filteredCountries.map(c => (
              <button key={c.code + c.dial} onClick={() => { setCountry(c); setShowCountryPicker(false) }}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 active:bg-slate-100 text-left transition-colors">
                <span className="text-xl w-7 shrink-0">{c.flag}</span>
                <span className="flex-1 text-sm text-slate-800">{c.name}</span>
                <span className="text-sm text-slate-400 font-medium">{c.dial}</span>
                {c.code === country.code && (
                  <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </Layout>
  )

  // ── OTP ───────────────────────────────────────────────────
  if (step === 'otp') return (
    <Layout header={<StepDots active={1} />}>
      <button
        onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError('') }}
        className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 transition-colors mb-5 -ml-0.5 text-sm font-medium"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        {l.otp.back}
      </button>

      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-1.5">{l.otp.title}</h1>
        <p className="text-slate-500 text-sm mb-3">{l.otp.subtitle}</p>
        <div className="inline-flex items-center gap-2.5 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5">
          <span className="text-sm font-bold text-blue-700">{fullPhone}</span>
          <span className="w-px h-3.5 bg-blue-200" />
          <button onClick={() => setStep('phone')} className="text-blue-600 text-xs font-bold hover:text-blue-800 transition-colors">
            {l.otp.edit}
          </button>
        </div>
      </div>

      <OtpBoxes value={otp} onChange={v => { setOtp(v); setError('') }} disabled={loading} />

      <Err msg={error} />

      {loading && (
        <div className="flex items-center justify-center gap-2.5 mt-6">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">{l.otp.verifying}</span>
        </div>
      )}

      <div className="text-center mt-7">
        {cooldown > 0 ? (
          <p className="text-sm text-slate-400">
            {l.otp.resendIn} <span className="font-extrabold text-slate-700 tabular-nums">{cooldown}s</span>
          </p>
        ) : (
          <button onClick={resendSMS} disabled={loading}
            className="text-sm text-blue-600 font-bold hover:text-blue-800 transition-colors disabled:opacity-50">
            {l.otp.resend}
          </button>
        )}
      </div>

      <div className="mt-8 bg-slate-50 rounded-2xl px-4 py-3.5 flex items-start gap-3">
        <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-xs text-slate-400 leading-relaxed">
          {l.otp.smsHint}
        </p>
      </div>
    </Layout>
  )

  // ── PROFILE ───────────────────────────────────────────────
  return (
    <Layout header={<StepDots active={2} />}>
      {/* Avatar */}
      <div className="flex flex-col items-center mb-7">
        <button onClick={() => avatarInputRef.current?.click()}
          className="relative w-24 h-24 rounded-full mb-3 overflow-hidden group ring-4 ring-slate-100 shadow-xl hover:shadow-2xl transition-shadow">
          {avatarPreview ? (
            <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border-2 border-dashed border-blue-200">
              <svg className="w-9 h-9 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
        </button>
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        <p className="text-xs text-slate-400 font-medium">{l.profile.photoLabel} <span className="text-slate-300">{l.profile.photoOptional}</span></p>
      </div>

      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{l.profile.title}</h1>
        <p className="text-slate-500 text-sm">{l.profile.subtitle}</p>
      </div>

      <div className="relative mb-1.5">
        <input
          ref={nameRef} type="text" placeholder={l.profile.placeholder}
          value={name} maxLength={30}
          onChange={e => { setName(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && createProfile()}
          className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-4 text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200 pr-14"
          autoComplete="name"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-300 tabular-nums font-medium">{name.length}/30</span>
      </div>

      <Err msg={error} />

      <div className="mt-5">
        <Btn onClick={createProfile} disabled={loading || name.trim().length < 2}>
          {loading
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{l.profile.creating}</>
            : <>{l.profile.enter} <span className="text-blue-200">→</span></>}
        </Btn>
      </div>

      <p className="text-center text-xs text-slate-400 mt-4">{l.profile.almostDone}</p>
    </Layout>
  )
}
