// Money is always an integer number of kobo (₦1 = 100 kobo).
// Floats never touch a balance: 0.1 + 0.2 !== 0.3 is not a bug you want in a ledger.

export type Kobo = number & { readonly __brand: 'kobo' }

export const MAX_KOBO = Number.MAX_SAFE_INTEGER // ~₦90 trillion; anything above is rejected

export function kobo(n: number): Kobo {
  if (!Number.isSafeInteger(n)) throw new RangeError(`Not a whole number of kobo: ${n}`)
  return n as Kobo
}

export const ZERO = 0 as Kobo

export function add(a: Kobo, b: Kobo): Kobo {
  return kobo(a + b)
}

export function sub(a: Kobo, b: Kobo): Kobo {
  return kobo(a - b)
}

export function sum(values: Iterable<Kobo>): Kobo {
  let total = 0
  for (const v of values) total += v
  return kobo(total)
}

/**
 * Parses what a person types ("12,500", "₦1,250.50", "800") into kobo.
 * Returns null for anything that isn't a valid non-negative amount with at most 2 decimals.
 */
export function parseNaira(input: string): Kobo | null {
  const cleaned = input.replace(/[₦,\s]/g, '').replace(/^NGN/i, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const [whole = '0', frac = ''] = cleaned.split('.')
  const k = Number(whole) * 100 + Number(frac.padEnd(2, '0'))
  return Number.isSafeInteger(k) ? (k as Kobo) : null
}

/** Formats kobo as naira with grouping: 125050 → "₦1,250.50"; whole naira drop the ".00" when `compact`. */
export function formatNaira(k: Kobo, opts: { compact?: boolean; sign?: boolean } = {}): string {
  const negative = k < 0
  const abs = Math.abs(k)
  const whole = Math.floor(abs / 100)
  const frac = abs % 100
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const fracPart = opts.compact && frac === 0 ? '' : `.${frac.toString().padStart(2, '0')}`
  const sign = negative ? '−' : opts.sign && k > 0 ? '+' : ''
  return `${sign}₦${grouped}${fracPart}`
}

/** Splits a VAT-inclusive amount into net + VAT. net + vat === gross, always, to the kobo. */
export function splitVatInclusive(gross: Kobo, rateBasisPoints: number): { net: Kobo; vat: Kobo } {
  if (gross < 0) throw new RangeError('Gross must be non-negative')
  const net = Math.round((gross * 10_000) / (10_000 + rateBasisPoints))
  return { net: kobo(net), vat: kobo(gross - net) }
}

/** VAT on top of a net amount, rounded half-up to the kobo. */
export function vatOn(net: Kobo, rateBasisPoints: number): Kobo {
  return kobo(Math.round((net * rateBasisPoints) / 10_000))
}
