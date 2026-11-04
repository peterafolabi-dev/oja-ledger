// A realistic first month for a provisions shop, so a visitor can explore the
// app with real-looking books in one tap.

import * as A from './actions'
import type { EntryDraft } from './ledger'
import { kobo } from './money'

const N = (naira: number) => kobo(naira * 100)

function day(base: Date, offset: number): string {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() - offset))
  return d.toISOString().slice(0, 10)
}

/** Builds ~5 weeks of activity ending today. */
export function sampleShop(todayIso: string): EntryDraft[] {
  const t = new Date(`${todayIso}T00:00:00Z`)
  const d = (n: number) => day(t, n)
  const out: EntryDraft[] = [
    A.ownerIn(d(35), N(800_000), 'bank', 'Starting capital from savings'),
    A.loanIn(d(34), N(500_000), 'bank', 'Cooperative loan'),
    A.buyEquipment({ date: d(34), amount: N(185_000), via: 'bank', vatCharged: false, memo: 'Chest freezer' }),
    A.buyStock({ date: d(33), amount: N(322_500), via: 'bank', vatCharged: true, memo: 'Rice, oil, noodles from Dangote depot' }),
    A.buyStock({ date: d(33), amount: N(96_000), via: 'credit', vatCharged: false, memo: 'Drinks from Alhaji Musa (pay later)' }),
    A.expense({ date: d(32), amount: N(60_000), via: 'bank', vatCharged: false, category: '5100', memo: 'Shop rent, this month' }),
    A.expense({ date: d(31), amount: N(4_500), via: 'cash', vatCharged: false, category: '5600', memo: 'Market union levy' }),
  ]
  const goods = [
    ['50kg bag of rice', 78_000, 66_000],
    ['Carton of noodles', 9_800, 8_100],
    ['5L vegetable oil', 12_500, 10_400],
    ['Crate of malt drinks', 7_200, 5_600],
    ['Sachet water, 10 bags', 3_000, 2_100],
    ['Tin tomatoes, carton', 21_000, 17_800],
    ['Sugar and milk', 6_400, 5_100],
  ] as const
  for (let n = 30; n >= 0; n--) {
    const count = 2 + ((n * 7) % 3)
    for (let k = 0; k < count; k++) {
      const [name, price, cost] = goods[(n * 3 + k * 5) % goods.length]!
      const via = (['cash', 'bank', 'bank', 'cash', 'bank', 'cash', 'bank', 'cash', 'bank', 'credit'] as const)[(n * 2 + k) % 10]!
      const qty = 1 + ((n + k) % 2)
      out.push(
        A.sale({
          date: d(n),
          amount: N(price * qty),
          via,
          chargeVat: name === '5L vegetable oil' || name === 'Tin tomatoes, carton',
          costOfGoods: N(cost * qty),
          memo: `${qty} × ${name}${via === 'credit' ? ' (customer pays later)' : ''}`,
        }),
      )
    }
    if (n % 7 === 3) out.push(A.expense({ date: d(n), amount: N(8_000), via: 'cash', vatCharged: false, category: '5400', memo: 'Diesel for generator' }))
    if (n % 6 === 1) out.push(A.expense({ date: d(n), amount: N(3_500), via: 'cash', vatCharged: false, category: '5200', memo: 'Keke to the depot' }))
    if (n % 10 === 5) out.push(A.expense({ date: d(n), amount: N(2_000), via: 'bank', vatCharged: false, category: '5500', memo: 'Data for POS and WhatsApp' }))
    if (n === 20) out.push(A.supplierPaid(d(n), N(96_000), 'bank', 'Paid Alhaji Musa for drinks'))
    if (n % 7 === 0 && n < 30) out.push(A.buyStock({ date: d(n), amount: N(430_000), via: 'bank', vatCharged: true, memo: 'Weekly restock from the depot' }))
    if (n % 7 === 4) out.push(A.deposit(d(n), N(120_000), 'Took cash to the bank'))
    if (n === 12) out.push(A.customerPaid(d(n), N(25_000), 'cash', 'Mama Bisi cleared her balance'))
    if (n === 7) out.push(A.expense({ date: d(n), amount: N(40_000), via: 'bank', vatCharged: false, category: '5300', memo: 'Sales girl, weekly pay' }))
    if (n === 2) out.push(A.ownerOut(d(n), N(30_000), 'bank', 'School fees'))
  }
  return out
}
