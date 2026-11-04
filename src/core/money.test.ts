import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { formatNaira, kobo, parseNaira, splitVatInclusive, vatOn } from './money'

const amount = fc.integer({ min: 0, max: 10_000_000_000_000 }) // up to ₦100bn

describe('money', () => {
  it('parses what people type', () => {
    expect(parseNaira('12,500')).toBe(1_250_000)
    expect(parseNaira('₦1,250.5')).toBe(125_050)
    expect(parseNaira(' 800 ')).toBe(80_000)
    expect(parseNaira('0.07')).toBe(7)
    for (const bad of ['', '-5', '1.234', 'abc', '1e5', '12..5', '₦']) expect(parseNaira(bad)).toBeNull()
  })

  it('formats with grouping and kobo', () => {
    expect(formatNaira(kobo(125_050))).toBe('₦1,250.50')
    expect(formatNaira(kobo(1_250_000), { compact: true })).toBe('₦12,500')
    expect(formatNaira(kobo(-5))).toBe('−₦0.05')
  })

  it('format → parse round-trips for every amount', () => {
    fc.assert(fc.property(amount, (k) => parseNaira(formatNaira(kobo(k))) === k))
  })

  it('splitting VAT never creates or loses a kobo', () => {
    fc.assert(
      fc.property(amount, (gross) => {
        const { net, vat } = splitVatInclusive(kobo(gross), 750)
        return net + vat === gross && net >= 0 && vat >= 0 && vat <= gross
      }),
    )
  })

  it('VAT split agrees with VAT-on-net to within one kobo', () => {
    fc.assert(
      fc.property(amount, (gross) => {
        const { net, vat } = splitVatInclusive(kobo(gross), 750)
        return Math.abs(vatOn(net, 750) - vat) <= 1
      }),
    )
  })

  it('splits a real receipt correctly', () => {
    expect(splitVatInclusive(kobo(1_075_000), 750)).toEqual({ net: 1_000_000, vat: 75_000 }) // ₦10,750 → ₦10,000 + ₦750
  })
})
