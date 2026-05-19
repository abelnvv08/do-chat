import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// In-memory sliding window rate limiter (per-instance, good enough for Vercel)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/api/chat/ai-chat': { max: 20, windowMs: 60_000 },  // 20 consultas IA/min (cuesta dinero)
  '/api/chat/upload':  { max: 10, windowMs: 60_000 },  // 10 uploads/min (evita abuso storage)
  '/api/auth':         { max: 10, windowMs: 60_000 },  // 10 intentos login/min (anti brute force)
}

function getIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

function checkRateLimit(ip: string, path: string): boolean {
  const rule = Object.entries(RATE_LIMITS).find(([prefix]) => path.startsWith(prefix))
  if (!rule) return true

  const [, { max, windowMs }] = rule
  const key = `${ip}:${rule[0]}`
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= max) return false
  entry.count++
  return true
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rate limiting check
  if (pathname.startsWith('/api/')) {
    const ip = getIP(req)
    if (!checkRateLimit(ip, pathname)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }
  }

  const res = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = req.nextUrl

  const isPublic =
    pathname === '/' ||
    pathname === '/landing' ||
    pathname === '/login' ||
    pathname === '/verify' ||
    pathname === '/pricing' ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/robots.txt' ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/api/')

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Root page handles its own redirect client-side (splash screen)

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
