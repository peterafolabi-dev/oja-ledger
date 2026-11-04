import { describe, expect, it } from 'vitest'
import * as A from './actions'
import { type Entry, type EntryDraft, seal } from './ledger'
import { balanceSheet, profitAndLoss, smallCompanyCheck, today, vatReturn } from './reports'
import { kobo } from './money'

const N = (naira: number) => kobo(naira * 100)

async function post(drafts: EntryDraft[]): Promise<Entry[]> {
  const j: Entry[] = []
  for (const d of drafts) j.push(await seal(j, d))
  return j
}

describe('a month at a provisions shop', async () => {
  const j = await post([
    A.ownerIn('2026-03-01', N(200_000), 'bank'),
    A.buyStock({ date: '2026-03-02', amount: N(107_500), via: 'bank', vatCharged: true }),
    A.sale({ date: '2026-03-05', amount: N(21_500), via: 'cash', chargeVat: true, costOfGoods: N(15_000) }),
    A.sale({ date: '2026-03-05', amount: N(5_000), via: 'credit', chargeVat: false, costOfGoods: N(3_500) }),
    A.expense({ date: '2026-03-06', amount: N(30_000), via: 'cash', vatCharged: false, category: '5100' }),
    A.customerPaid('2026-03-10', N(5_000), 'bank'),
    A.ownerOut('2026-03-12', N(10_000), 'bank'),
    A.sale({ date: '2026-04-02', amount: N(10_750), via: 'bank', chargeVat: true }),
  ])

  it('computes profit for March', () => {
    const pl = profitAndLoss(j, { from: '2026-03-01', to: '2026-03-31' })
    expect(pl.totalIncome).toBe(N(25_000)) // ₦20,000 net of VAT + ₦5,000
    expect(pl.grossProfit).toBe(N(6_500)) // 25,000 − 18,500 cost of goods
    expect(pl.profit).toBe(N(-23_500)) // after ₦30,000 rent
  })

  it("works out March's VAT return", () => {
    const v = vatReturn(j, 2026, 3)
    expect(v.output).toBe(N(1_500))
    expect(v.input).toBe(N(7_500))
    expect(v.refundable).toBe(N(6_000))
    expect(v.payable).toBe(0)
    expect(v.dueDate).toBe('2026-04-21')
    expect(vatReturn(j, 2026, 12).dueDate).toBe('2027-01-21')
  })

  it('balances the balance sheet and shows drawings as a reduction', () => {
    const bs = balanceSheet(j, '2026-03-31')
    expect(bs.balanced).toBe(true)
    expect(bs.equity.capital).toBe(N(200_000))
    expect(bs.equity.drawings).toBe(N(-10_000))
  })

  it('passes the small-company test with a small turnover', () => {
    const s = smallCompanyCheck(j, 2026)
    expect(s.qualifies).toBe(true)
    expect(s.estimatedCit).toBe(0)
  })

  it("shows today's figures", () => {
    const t = today(j, '2026-03-05')
    expect(t.sales).toBe(N(25_000))
    expect(t.cash).toBe(N(21_500 - 30_000))
  })
})

describe('small-company limit', () => {
  it('fails above ₦50m turnover and estimates 30% CIT on profit', async () => {
    const j = await post([A.sale({ date: '2026-06-01', amount: N(60_000_000), via: 'bank', chargeVat: false })])
    const s = smallCompanyCheck(j, 2026)
    expect(s.qualifies).toBe(false)
    expect(s.estimatedCit).toBe(N(18_000_000))
  })
})

describe('sample shop', async () => {
  const { sampleShop } = await import('./sample')
  it('posts cleanly and balances', async () => {
    const j = await post(sampleShop('2026-11-04'))
    expect(j.length).toBeGreaterThan(80)
    expect(balanceSheet(j).balanced).toBe(true)
    const t = today(j, '2026-11-04')
    const pl = profitAndLoss(j, {})
    expect(t.cash).toBeGreaterThan(0)
    expect(t.bank).toBeGreaterThan(0)
    expect(t.stock).toBeGreaterThan(0) // never sells goods it didn't buy
    expect(pl.profit).toBeGreaterThan(0)
    expect(t.owedToYou).toBeLessThan(pl.totalIncome / 5)
  })
})
