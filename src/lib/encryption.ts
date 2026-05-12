// AES-256-GCM encryption at rest. Works in Edge + Node.js runtimes.
// Set ENCRYPTION_KEY env var to a base64-encoded 32-byte key.
// If key is missing, functions are no-ops (plaintext passthrough).

let _keyPromise: Promise<CryptoKey | null> | null = null

function getKey(): Promise<CryptoKey | null> {
  if (_keyPromise) return _keyPromise
  _keyPromise = (async () => {
    const raw = process.env.ENCRYPTION_KEY
    if (!raw) return null
    try {
      const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0))
      return await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
    } catch { return null }
  })()
  return _keyPromise
}

export async function encrypt(text: string): Promise<string> {
  const key = await getKey()
  if (!key) return text
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text))
  return JSON.stringify({
    v: 1,
    iv: btoa(String.fromCharCode(...iv)),
    ct: btoa(String.fromCharCode(...new Uint8Array(ct))),
  })
}

export async function decrypt(content: string): Promise<string> {
  try {
    const p = JSON.parse(content)
    if (p?.v !== 1 || !p.iv || !p.ct) return content
    const key = await getKey()
    if (!key) return content
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: Uint8Array.from(atob(p.iv), c => c.charCodeAt(0)) },
      key,
      Uint8Array.from(atob(p.ct), c => c.charCodeAt(0)),
    )
    return new TextDecoder().decode(plain)
  } catch { return content }
}

export function isEncrypted(content: string): boolean {
  try { const p = JSON.parse(content); return p?.v === 1 && !!p?.iv && !!p?.ct } catch { return false }
}
