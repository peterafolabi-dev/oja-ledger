// Nigerian tax figures used by the reports, under the Nigeria Tax Act 2025
// (in force from 1 January 2026). These are simplified checks to help a small
// business prepare, not tax advice; the numbers are kept in one place so they
// are easy to update when the rules change.

import type { Kobo } from './money'

/** VAT is 7.5%, written in basis points so no floats are involved. */
export const VAT_RATE_BP = 750

/** Small company: turnover ≤ ₦50m and fixed assets ≤ ₦250m → 0% companies income tax. */
export const SMALL_CO_TURNOVER_LIMIT = (50_000_000 * 100) as Kobo
export const SMALL_CO_FIXED_ASSETS_LIMIT = (250_000_000 * 100) as Kobo
export const STANDARD_CIT_RATE_BP = 3000 // 30%

/** VAT returns are monthly, due by the 21st of the following month. */
export const VAT_DUE_DAY = 21

export function vatDueDate(year: number, month: number): string {
  // month is 1–12; the return for that month is due on the 21st of the next one
  const y = month === 12 ? year + 1 : year
  const m = month === 12 ? 1 : month + 1
  return `${y}-${String(m).padStart(2, '0')}-${String(VAT_DUE_DAY).padStart(2, '0')}`
}
