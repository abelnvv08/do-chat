import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

/** Service-role Supabase client — only for API routes (Node runtime, never Edge). */
export function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Validates the session cookie and checks ADMIN_USER_IDS.
 * Returns the admin's user ID on success, or null on failure.
 */
export async function requireAdmin(req: NextRequest): Promise<string | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const allowed = (process.env.ADMIN_USER_IDS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  if (!allowed.includes(user.id)) return null
  return user.id
}

/**
 * Returns whether the given user ID is in ADMIN_USER_IDS.
 * Used in middleware (no async Supabase call needed — user already resolved).
 */
export function isAdminId(userId: string): boolean {
  const allowed = (process.env.ADMIN_USER_IDS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  return allowed.includes(userId)
}
