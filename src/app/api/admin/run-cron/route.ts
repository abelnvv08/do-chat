import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

/** Paths that admins are allowed to trigger manually. */
const ALLOWED_PATHS = ['/api/cron/proactive']

/**
 * POST /api/admin/run-cron
 * Body: { path: '/api/cron/proactive' }
 *
 * Validates admin session, then calls the cron endpoint server-side
 * with the CRON_SECRET header so it's never exposed to the browser.
 */
export async function POST(req: NextRequest) {
  const adminId = await requireAdmin(req)
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { path } = await req.json()
  if (!path || !ALLOWED_PATHS.includes(path)) {
    return NextResponse.json({ error: 'Invalid cron path' }, { status: 400 })
  }

  const origin = req.nextUrl.origin
  const secret = process.env.CRON_SECRET
  const headers: Record<string, string> = {}
  if (secret) headers['Authorization'] = `Bearer ${secret}`

  try {
    const res = await fetch(`${origin}${path}`, { headers })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
