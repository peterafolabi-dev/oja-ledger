// PIN lock for the book. The PIN is never stored: only a PBKDF2-SHA-256 hash
// with a random salt. This keeps other people who pick up the phone out of
// the app; it does not encrypt the data on the device.

export interface PinRecord {
  salt: string // hex
  hash: string // hex
  iterations: number
}

const ITERATIONS = 150_000
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
const unhex = (h: string) => new Uint8Array(h.match(/../g)!.map((x) => parseInt(x, 16)))

export const PIN_RE = /^\d{4,6}$/

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return hex(bits)
}

export async function makePin(pin: string): Promise<PinRecord> {
  if (!PIN_RE.test(pin)) throw new Error('Use 4 to 6 digits')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { salt: hex(salt), hash: await derive(pin, salt, ITERATIONS), iterations: ITERATIONS }
}

/** Constant-time comparison of the derived hash. */
export async function checkPin(pin: string, rec: PinRecord): Promise<boolean> {
  if (!PIN_RE.test(pin)) return false
  const got = await derive(pin, unhex(rec.salt), rec.iterations)
  let diff = got.length ^ rec.hash.length
  for (let i = 0; i < Math.min(got.length, rec.hash.length); i++) diff |= got.charCodeAt(i) ^ rec.hash.charCodeAt(i)
  return diff === 0
}
