'use client'

const b64 = (buf: Uint8Array): string => btoa(String.fromCharCode(...Array.from(buf)))
const unb64 = (s: string): Uint8Array<ArrayBuffer> => {
  const arr = Uint8Array.from(atob(s), c => c.charCodeAt(0))
  return new Uint8Array(arr.buffer.slice(0) as ArrayBuffer)
}

const PRIV = (uid: string) => `e2ee_priv_${uid}`
const PUB  = (uid: string) => `e2ee_pub_${uid}`

export async function initKeyPair(userId: string): Promise<string> {
  if (typeof window === 'undefined') return ''
  const existingPub = localStorage.getItem(PUB(userId))
  const existingPriv = localStorage.getItem(PRIV(userId))
  if (existingPub && existingPriv) return existingPub

  const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey'])
  const pubRaw = await crypto.subtle.exportKey('raw', kp.publicKey)
  const privJwk = await crypto.subtle.exportKey('jwk', kp.privateKey)
  const pubB64 = b64(new Uint8Array(pubRaw))
  localStorage.setItem(PRIV(userId), JSON.stringify(privJwk))
  localStorage.setItem(PUB(userId), pubB64)
  return pubB64
}

export function getLocalPublicKey(userId: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(PUB(userId))
}

async function loadPrivateKey(userId: string): Promise<CryptoKey | null> {
  const stored = localStorage.getItem(PRIV(userId))
  if (!stored) return null
  return crypto.subtle.importKey('jwk', JSON.parse(stored), { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey'])
}

async function importPublicKey(pubB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', unb64(pubB64), { name: 'ECDH', namedCurve: 'P-256' }, false, [])
}

export async function deriveSharedKey(myUserId: string, theirPublicKeyB64: string): Promise<CryptoKey | null> {
  const priv = await loadPrivateKey(myUserId)
  if (!priv) return null
  const pub = await importPublicKey(theirPublicKeyB64)
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: pub },
    priv,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// For group chats: derive a shared deterministic key from the room ID alone.
// All members know the roomId, so they all derive the SAME key.
// Note: this is shared-secret encryption (not true E2EE — the server knows roomId too),
// but it's consistent and correct. DMs use ECDH (true E2EE) via deriveSharedKey.
export async function deriveRoomKey(_myUserId: string, roomId: string): Promise<CryptoKey | null> {
  try {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(roomId),
      'PBKDF2',
      false,
      ['deriveKey']
    )
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('dochat-group-v1'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  } catch {
    return null
  }
}

export async function encryptMsg(text: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text))
  return JSON.stringify({ v: 1, iv: b64(iv), ct: b64(new Uint8Array(ct)) })
}

export async function decryptMsg(ciphertext: string, key: CryptoKey): Promise<string> {
  try {
    const { iv, ct } = JSON.parse(ciphertext)
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(ct))
    return new TextDecoder().decode(plain)
  } catch {
    return ciphertext
  }
}

export function isEncrypted(content: string): boolean {
  try { const p = JSON.parse(content); return p?.v === 1 && !!p?.iv && !!p?.ct } catch { return false }
}
