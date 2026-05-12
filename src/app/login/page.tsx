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
    <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
      {value.map((d, i) => (
        <input key={i} ref={el => { refs.current[i] = el }}
          type="tel" inputMode="numeric" maxLength={1} value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          disabled={disabled}
          className={`w-12 h-14 rounded-2xl text-center text-2xl font-bold border-2 focus:outline-none transition-all disabled:opacity-40 ${
            d ? 'border-[#2563EB] bg-[#eff6ff] text-[#2563EB]' : 'border-gray-200 bg-gray-50 text-gray-900'
          } focus:border-[#2563EB] focus:bg-[#eff6ff]`}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
        />
      ))}
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
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  useEffect(() => {
    if (otp.join('').length === 6) verifyOtp()
  }, [otp])

  async function sendSMS() {
    const digits = phone.replace(/\D/g, '')
    if (!digits || digits.length < 6) { setError(l.phone.errorShort); return }
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
    if (!res.ok) { setError(data.error ?? l.phone.errorSMS); return }
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
    if (code.length < 6) { setError(l.otp.errorCode); return }
    setLoading(true); setError('')
    const res = await fetch('/api/auth/verify-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: fullPhone, code }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok && !data.needs_profile) {
      setError(data.error ?? l.otp.errorWrong)
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
      fd.append('file', avatarFile)
      fd.append('user_id', pendingUserId)
      const upRes = await fetch('/api/auth/upload-avatar', { method: 'POST', body: fd })
      const upData = await upRes.json()
      if (upRes.ok) avatar_url = upData.url
    }

    if (!fullPhone) {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, emoji: '😊', avatar_url }),
      })
      setLoading(false)
      if (!res.ok) { const d = await res.json(); setError(d.error ?? l.profile.errorGeneric); return }
      router.push(`/chat/${pendingUserId}`)
      return
    }

    const res = await fetch('/api/auth/complete-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: pendingUserId, name: trimmed, phone: fullPhone, avatar_url }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? l.profile.errorGeneric); return }
    await finishLogin(data.token_hash, data.user_id)
  }

  async function finishLogin(token_hash: string, user_id: string) {
    const { error: sessionErr } = await supabase.auth.verifyOtp({ token_hash, type: 'email' })
    if (sessionErr) { setError('Error'); return }
    router.push(`/chat/${user_id}`)
  }

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.dial.includes(countrySearch) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  )

  // ── Phone ────────────────────────────────────────────────────
  if (step === 'phone') return (
    <div className="min-h-screen bg-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex justify-end px-6 pt-4">
        <LangToggle className="border-gray-200 text-gray-500 hover:border-gray-400" />
      </div>
      <div className="flex flex-col items-center pt-10 pb-10 px-6">
        <div className="w-16 h-16 rounded-2xl bg-[#2563EB] flex items-center justify-center mb-5 shadow-lg shadow-blue-200">
          <Image src="/icon-192.png" alt="DO Chat" width={40} height={40} className="rounded-xl" />
        </div>
        <h1 className="text-[22px] font-bold text-gray-900 mb-1">{l.phone.title}</h1>
        <p className="text-gray-400 text-sm text-center max-w-xs">{l.phone.subtitle}</p>
      </div>

      <div className="flex-1 px-6">
        <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden mb-4 focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <div className="flex items-center px-4 py-4 gap-3">
            <button
              onClick={() => { setShowCountryPicker(true); setCountrySearch('') }}
              className="flex items-center gap-1.5 shrink-0 hover:opacity-70 active:opacity-50 transition-opacity"
            >
              <span className="text-xl leading-none">{country.flag}</span>
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            <span className="text-[15px] font-semibold text-gray-900 shrink-0 select-none">{country.dial}</span>
            <div className="w-px h-5 bg-gray-200 shrink-0" />
            <input
              ref={phoneRef}
              type="tel"
              inputMode="numeric"
              placeholder={l.phone.placeholder}
              value={phone}
              onChange={e => { setPhone(e.target.value.replace(/[^\d\s\-]/g, '')); setError('') }}
              onKeyDown={e => e.key === 'Enter' && sendSMS()}
              className="flex-1 text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
              autoFocus
              autoComplete="tel"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={sendSMS}
          disabled={loading || phone.replace(/\D/g, '').length < 6}
          className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white font-semibold py-4 rounded-2xl text-[15px] disabled:opacity-40 transition-all active:scale-[0.98] shadow-sm shadow-blue-200"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {l.phone.sending}
            </span>
          ) : l.phone.continue}
        </button>

        <p className="text-gray-400 text-[11px] text-center mt-5 px-4">
          {l.phone.disclaimerPrefix}{' '}
          <Link href="/terms" className="underline hover:text-gray-600 transition-colors">{l.phone.disclaimerTerms}</Link>
          {' '}{l.phone.disclaimerAnd}{' '}
          <Link href="/privacy" className="underline hover:text-gray-600 transition-colors">{l.phone.disclaimerPrivacy}</Link>
        </p>
      </div>

      {showCountryPicker && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white sticky top-0" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
            <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
              <input
                type="text"
                placeholder={l.phone.searchPlaceholder}
                value={countrySearch}
                onChange={e => setCountrySearch(e.target.value)}
                className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
                autoFocus
              />
            </div>
            <button onClick={() => setShowCountryPicker(false)} className="text-[#2563EB] text-sm font-medium shrink-0">
              {l.phone.cancel}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredCountries.map(c => (
              <button key={c.code + c.dial} onClick={() => { setCountry(c); setShowCountryPicker(false) }}
                className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50 active:bg-gray-100 text-left transition-colors">
                <span className="text-xl w-7 shrink-0">{c.flag}</span>
                <span className="flex-1 text-[15px] text-gray-800">{c.name}</span>
                <span className="text-sm text-gray-400 font-medium">{c.dial}</span>
                {c.code === country.code && (
                  <svg className="w-4 h-4 text-[#2563EB] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // ── OTP ──────────────────────────────────────────────────────
  if (step === 'otp') return (
    <div className="min-h-screen bg-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError('') }}
          className="p-2 -ml-2 text-gray-400 hover:text-gray-600 active:scale-95 transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <LangToggle className="border-gray-200 text-gray-500 hover:border-gray-400" />
      </div>

      <div className="flex flex-col items-center pt-8 pb-10 px-6">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>
        </div>
        <h1 className="text-[22px] font-bold text-gray-900 mb-2">{l.otp.title}</h1>
        <p className="text-gray-400 text-sm text-center mb-1">{l.otp.subtitle}</p>
        <div className="flex items-center gap-2 mb-8">
          <span className="text-[15px] font-semibold text-gray-800">{fullPhone}</span>
          <button onClick={() => setStep('phone')} className="text-[#2563EB] text-sm font-medium">{l.otp.edit}</button>
        </div>

        <OtpBoxes value={otp} onChange={v => { setOtp(v); setError('') }} disabled={loading} />

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mt-5 w-full">
            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">{l.otp.verifying}</span>
          </div>
        )}

        <div className="text-center mt-8">
          {cooldown > 0 ? (
            <p className="text-sm text-gray-400">{l.otp.resendIn} <span className="font-semibold text-gray-700">{cooldown}s</span></p>
          ) : (
            <button onClick={resendSMS} disabled={loading}
              className="text-sm text-[#2563EB] font-semibold active:opacity-60 transition-opacity">
              {l.otp.resend}
            </button>
          )}
        </div>
      </div>
    </div>
  )

  // ── Profile setup ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="w-8" />
        <LangToggle className="border-gray-200 text-gray-500 hover:border-gray-400" />
      </div>

      <div className="flex-1 flex flex-col justify-center px-6">
        <div className="flex flex-col items-center mb-8">
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full mb-4 overflow-hidden group shadow-sm"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <svg className="w-11 h-11 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12Zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8Z"/>
                </svg>
              </div>
            )}
            <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
            </div>
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <p className="text-xs text-gray-400 mb-6">{l.profile.photoLabel} <span className="text-gray-300">{l.profile.photoOptional}</span></p>

          <h1 className="text-[22px] font-bold text-gray-900 mb-1">{l.profile.title}</h1>
          <p className="text-gray-400 text-sm text-center">{l.profile.subtitle}</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 mb-2 focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <input
            ref={nameRef}
            type="text"
            placeholder={l.profile.placeholder}
            value={name}
            maxLength={30}
            onChange={e => { setName(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && createProfile()}
            className="w-full text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
            autoComplete="name"
          />
        </div>
        <p className="text-[11px] text-gray-400 text-right mb-6">{name.length}/30</p>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>

      <div className="px-6 pb-12">
        <button
          onClick={createProfile}
          disabled={loading || name.trim().length < 2}
          className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white font-semibold py-4 rounded-2xl text-[15px] disabled:opacity-40 transition-all active:scale-[0.98] shadow-sm shadow-blue-200"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {l.profile.creating}
            </span>
          ) : l.profile.enter}
        </button>
      </div>
    </div>
  )
}
