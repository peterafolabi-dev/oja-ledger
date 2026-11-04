// fast-check generators that produce random but realistic trading histories.
import fc from 'fast-check'
import * as A from './actions'
import { EXPENSE_CATEGORIES, type AccountCode } from './accounts'
import type { EntryDraft } from './ledger'
import { kobo } from './money'

const naira = fc.integer({ min: 1, max: 500_000_000 }).map(kobo) // ₦0.01 – ₦5m
const via = fc.constantFrom<A.PaidVia>('cash', 'bank', 'credit')
const settled = fc.constantFrom<'cash' | 'bank'>('cash', 'bank')
export const isoDate = fc
  .integer({ min: 0, max: 364 })
  .map((d) => new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10))

export const action: fc.Arbitrary<EntryDraft> = fc.oneof(
  fc
    .record({ date: isoDate, amount: naira, via, chargeVat: fc.boolean(), cogsPct: fc.integer({ min: 0, max: 100 }) })
    .map(({ cogsPct, ...r }) => A.sale({ ...r, costOfGoods: kobo(Math.floor((r.amount * cogsPct) / 100)) })),
  fc.record({ date: isoDate, amount: naira, via, vatCharged: fc.boolean() }).map(A.buyStock),
  fc
    .record({
      date: isoDate,
      amount: naira,
      via,
      vatCharged: fc.boolean(),
      category: fc.constantFrom(...EXPENSE_CATEGORIES.map((c) => c.code as AccountCode)),
    })
    .map(A.expense),
  fc.record({ date: isoDate, amount: naira, via, vatCharged: fc.boolean() }).map(A.buyEquipment),
  fc.tuple(isoDate, naira, settled).map(([d, a, v]) => A.ownerIn(d, a, v)),
  fc.tuple(isoDate, naira, settled).map(([d, a, v]) => A.ownerOut(d, a, v)),
  fc.tuple(isoDate, naira, settled).map(([d, a, v]) => A.loanIn(d, a, v)),
  fc.tuple(isoDate, naira, settled).map(([d, a, v]) => A.customerPaid(d, a, v)),
  fc.tuple(isoDate, naira, settled).map(([d, a, v]) => A.supplierPaid(d, a, v)),
  fc.tuple(isoDate, naira).map(([d, a]) => A.deposit(d, a)),
)

export const history = fc.array(action, { minLength: 1, maxLength: 40 })
