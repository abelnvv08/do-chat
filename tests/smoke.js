/**
 * DO Chat — Smoke tests
 * Run: node tests/smoke.js [base_url]
 * Default base_url: http://localhost:3000
 *
 * Tests the critical paths:
 *   1. Landing page loads
 *   2. Auth routes respond correctly
 *   3. Chat list API works
 *   4. Messages API works
 *   5. Payments checkout rejects unauthenticated users
 *   6. Admin panel is protected
 */

const BASE = process.argv[2] ?? 'http://localhost:3000'
let passed = 0
let failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (e) {
    console.error(`  ❌ ${name}`)
    console.error(`     ${e.message}`)
    failed++
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function get(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts)
  return res
}

async function post(path, body, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    body: JSON.stringify(body),
    ...opts,
  })
  return res
}

console.log(`\n🧪 DO Chat Smoke Tests`)
console.log(`   Target: ${BASE}\n`);

(async () => {

// ── 1. Public pages ──────────────────────────────────────────────
console.log('Public pages')

await test('Landing page returns 200', async () => {
  const res = await get('/landing')
  assert(res.status === 200, `Expected 200, got ${res.status}`)
})

await test('Pricing page returns 200', async () => {
  const res = await get('/pricing')
  assert(res.status === 200, `Expected 200, got ${res.status}`)
})

await test('Privacy page returns 200', async () => {
  const res = await get('/privacy')
  assert(res.status === 200, `Expected 200, got ${res.status}`)
})

await test('Terms page returns 200', async () => {
  const res = await get('/terms')
  assert(res.status === 200, `Expected 200, got ${res.status}`)
})

await test('Login page returns 200', async () => {
  const res = await get('/login')
  assert(res.status === 200, `Expected 200, got ${res.status}`)
})

await test('Manifest.json is valid', async () => {
  const res = await get('/manifest.json')
  assert(res.status === 200, `Expected 200, got ${res.status}`)
  const json = await res.json()
  assert(json.name === 'DO Chat', `Expected name "DO Chat", got "${json.name}"`)
  assert(Array.isArray(json.icons) && json.icons.length >= 2, 'Manifest missing icons')
})

await test('Service worker is served', async () => {
  const res = await get('/sw.js')
  assert(res.status === 200, `Expected 200, got ${res.status}`)
  const text = await res.text()
  assert(text.includes('push'), 'Service worker missing push handler')
})

// ── 2. Auth API ──────────────────────────────────────────────────
console.log('\nAuth API')

await test('send-sms rejects missing phone', async () => {
  const res = await post('/api/auth/send-sms', {})
  assert(res.status === 400, `Expected 400, got ${res.status}`)
})

await test('send-sms rate limits after 5 requests to same phone', async () => {
  const phone = '+10000000001'
  let lastStatus = 0
  for (let i = 0; i < 6; i++) {
    const res = await post('/api/auth/send-sms', { phone })
    lastStatus = res.status
  }
  assert(lastStatus === 429, `Expected 429 on 6th attempt, got ${lastStatus}`)
})

await test('verify-sms rejects missing fields', async () => {
  const res = await post('/api/auth/verify-sms', {})
  assert(res.status === 400, `Expected 400, got ${res.status}`)
})

// ── 3. Demo API (unauthenticated) ────────────────────────────────
console.log('\nDemo API (unauthenticated)')

await test('chat-list requires user_id param', async () => {
  const res = await get('/api/demo/chat-list')
  assert(res.status === 200, `Expected 200, got ${res.status}`)
  const json = await res.json()
  assert(Array.isArray(json.rooms) && json.rooms.length === 0, 'Expected empty rooms array')
})

await test('messages GET with no room returns empty', async () => {
  const res = await get('/api/demo/messages?room=nonexistent-room-xyz')
  assert(res.status === 200, `Expected 200, got ${res.status}`)
  const json = await res.json()
  assert(Array.isArray(json.messages), 'Expected messages array')
})

await test('messages POST rejects missing fields', async () => {
  const res = await post('/api/demo/messages', {})
  assert(res.status === 400, `Expected 400, got ${res.status}`)
})

// ── 4. Payments ──────────────────────────────────────────────────
console.log('\nPayments')

await test('checkout rejects unauthenticated users with 401', async () => {
  const res = await post('/api/payments/checkout', { plan: 'pro' })
  assert(res.status === 401, `Expected 401, got ${res.status}`)
})

await test('checkout rejects invalid plan', async () => {
  // Even unauthenticated — should get 401 before plan validation
  const res = await post('/api/payments/checkout', { plan: 'hacker' })
  assert(res.status === 401 || res.status === 400, `Expected 401 or 400, got ${res.status}`)
})

await test('webhook rejects invalid signature', async () => {
  const res = await fetch(`${BASE}/api/payments/webhook`, {
    method: 'POST',
    headers: { 'stripe-signature': 'invalid', 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'test' }),
  })
  assert(res.status === 400, `Expected 400, got ${res.status}`)
})

// ── 5. Admin ─────────────────────────────────────────────────────
console.log('\nAdmin')

await test('admin panel redirects unauthenticated users', async () => {
  const res = await get('/admin', { redirect: 'manual' })
  assert(res.status === 307 || res.status === 302 || res.status === 303 || res.status === 401,
    `Expected redirect or 401, got ${res.status}`)
})

await test('admin users API rejects unauthenticated', async () => {
  const res = await get('/api/admin/users')
  assert(res.status === 401 || res.status === 403 || res.status === 307,
    `Expected 401/403/307, got ${res.status}`)
})

// ── Results ──────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`)
console.log(`  Passed: ${passed}`)
console.log(`  Failed: ${failed}`)
console.log(`  Total:  ${passed + failed}`)
console.log(`${'─'.repeat(40)}\n`)

if (failed > 0) process.exit(1)
})()
