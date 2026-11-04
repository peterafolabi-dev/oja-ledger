import { type Entry } from '../core/ledger'
import { type Kobo, formatNaira, kobo } from '../core/money'

export const naira = (k: Kobo) => formatNaira(k, { compact: true })
export const nairaExact = (k: Kobo) => formatNaira(k)

const dateFmt = new Intl.DateTimeFormat('en-NG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const monthFmt = new Intl.DateTimeFormat('en-NG', { month: 'long', year: 'numeric', timeZone: 'UTC' })
export const prettyDate = (iso: string) => dateFmt.format(new Date(`${iso}T00:00:00Z`))
export const prettyMonth = (y: number, m: number) => monthFmt.format(new Date(Date.UTC(y, m - 1, 1)))

/** The amount a person thinks of for an entry: the money that changed hands, i.e. its largest line.
 *  (Total debits would double-count a sale's cost-of-goods lines.) */
export const entryAmount = (e: Entry) => kobo(Math.max(...e.lines.map((l) => Math.max(l.debit, l.credit))))

/** A short, readable fingerprint of the whole book: the newest hash, grouped. */
export const fingerprint = (hash: string | undefined) => (hash ? `${hash.slice(0, 4)} ${hash.slice(4, 8)} ${hash.slice(8, 12)}` : '— — —')

/** Money-in kinds read green, money-out kinds read red. */
export function direction(e: Entry): 'in' | 'out' | 'neutral' {
  if (['sale', 'owner-in', 'customer-paid', 'loan-in'].includes(e.kind)) return 'in'
  if (['expense', 'stock', 'owner-out', 'supplier-paid', 'equipment'].includes(e.kind)) return 'out'
  return 'neutral'
}
