import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function rateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  try {
    const supabase = db()
    const now = Date.now()
    const windowStart = new Date(now - windowMs).toISOString()

    // Get current entry for this key within the current window
    const { data: existing } = await supabase
      .from('rate_limits')
      .select('count, window_start')
      .eq('key', key)
      .maybeSingle()

    const inWindow = existing && new Date(existing.window_start).getTime() >= now - windowMs

    if (!inWindow) {
      // No entry or window expired — start fresh
      await supabase
        .from('rate_limits')
        .upsert({ key, count: 1, window_start: new Date().toISOString() })
      return { allowed: true, remaining: max - 1, retryAfter: 0 }
    }

    if (existing.count >= max) {
      const windowEnd = new Date(existing.window_start).getTime() + windowMs
      const retryAfter = Math.ceil((windowEnd - now) / 1000)
      return { allowed: false, remaining: 0, retryAfter: Math.max(0, retryAfter) }
    }

    // Increment within the current window
    await supabase
      .from('rate_limits')
      .update({ count: existing.count + 1 })
      .eq('key', key)

    return { allowed: true, remaining: max - (existing.count + 1), retryAfter: 0 }
  } catch {
    // Fail-open: if DB is unavailable, allow the request (Twilio still rate-limits SMS)
    return { allowed: true, remaining: max, retryAfter: 0 }
  }
}
