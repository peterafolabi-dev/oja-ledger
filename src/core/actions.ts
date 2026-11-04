// Plain-language actions a trader understands, turned into balanced entries.
// "I sold ₦12,500 of rice by transfer" → Dr Bank 12,500 / Cr Sales 11,628 / Cr VAT 872.

import type { AccountCode } from './accounts'
import { type EntryDraft, compact, cr, dr } from './ledger'
import { type Kobo, kobo, splitVatInclusive, sub } from './money'
import { VAT_RATE_BP } from './tax'

export type PaidVia = 'cash' | 'bank' | 'credit'

const moneyAccount = (via: Exclude<PaidVia, 'credit'>): AccountCode => (via === 'cash' ? '1000' : '1010')

export interface SaleInput {
  date: string
  amount: Kobo // what the customer pays, VAT included if charged
  via: PaidVia // credit = customer will pay later
  chargeVat: boolean
  costOfGoods?: Kobo // what the goods cost you; moves value out of Stock
  memo?: string
}

export function sale(i: SaleInput): EntryDraft {
  const { net, vat } = i.chargeVat ? splitVatInclusive(i.amount, VAT_RATE_BP) : { net: i.amount, vat: kobo(0) }
  const receive: AccountCode = i.via === 'credit' ? '1100' : moneyAccount(i.via)
  const cogs = i.costOfGoods ?? kobo(0)
  return {
    date: i.date,
    kind: 'sale',
    memo: i.memo || 'Sale',
    lines: compact([dr(receive, i.amount), cr('4000', net), cr('2100', vat), dr('5000', cogs), cr('1200', cogs)]),
  }
}

export interface PurchaseInput {
  date: string
  amount: Kobo // total paid, VAT included if the supplier charged it
  via: PaidVia // credit = you will pay the supplier later
  vatCharged: boolean
  memo?: string
}

function purchase(i: PurchaseInput, target: AccountCode, kind: EntryDraft['kind'], fallbackMemo: string): EntryDraft {
  const { net, vat } = i.vatCharged ? splitVatInclusive(i.amount, VAT_RATE_BP) : { net: i.amount, vat: kobo(0) }
  const pay: AccountCode = i.via === 'credit' ? '2000' : moneyAccount(i.via)
  return {
    date: i.date,
    kind,
    memo: i.memo || fallbackMemo,
    lines: compact([dr(target, net), dr('1300', vat), cr(pay, i.amount)]),
  }
}

export function buyStock(i: PurchaseInput): EntryDraft {
  return purchase(i, '1200', 'stock', 'Bought stock')
}

export function expense(i: PurchaseInput & { category: AccountCode }): EntryDraft {
  if (!i.category.startsWith('5') || i.category === '5000') throw new Error('Pick an expense category')
  return purchase(i, i.category, 'expense', 'Expense')
}

export function buyEquipment(i: PurchaseInput): EntryDraft {
  return purchase(i, '1500', 'equipment', 'Bought equipment')
}

export function ownerIn(date: string, amount: Kobo, via: Exclude<PaidVia, 'credit'>, memo = ''): EntryDraft {
  return { date, kind: 'owner-in', memo: memo || 'Owner put money in', lines: [dr(moneyAccount(via), amount), cr('3000', amount)] }
}

export function ownerOut(date: string, amount: Kobo, via: Exclude<PaidVia, 'credit'>, memo = ''): EntryDraft {
  return { date, kind: 'owner-out', memo: memo || 'Owner took money out', lines: [dr('3100', amount), cr(moneyAccount(via), amount)] }
}

export function loanIn(date: string, amount: Kobo, via: Exclude<PaidVia, 'credit'>, memo = ''): EntryDraft {
  return { date, kind: 'loan-in', memo: memo || 'Loan received', lines: [dr(moneyAccount(via), amount), cr('2200', amount)] }
}

export function customerPaid(date: string, amount: Kobo, via: Exclude<PaidVia, 'credit'>, memo = ''): EntryDraft {
  return { date, kind: 'customer-paid', memo: memo || 'Customer paid what they owed', lines: [dr(moneyAccount(via), amount), cr('1100', amount)] }
}

export function supplierPaid(date: string, amount: Kobo, via: Exclude<PaidVia, 'credit'>, memo = ''): EntryDraft {
  return { date, kind: 'supplier-paid', memo: memo || 'Paid a supplier', lines: [dr('2000', amount), cr(moneyAccount(via), amount)] }
}

export function deposit(date: string, amount: Kobo, memo = ''): EntryDraft {
  return { date, kind: 'deposit', memo: memo || 'Moved cash to the bank', lines: [dr('1010', amount), cr('1000', amount)] }
}

/** Gross margin on a sale, for the receipt preview. */
export function saleProfit(i: SaleInput): Kobo {
  const { net } = i.chargeVat ? splitVatInclusive(i.amount, VAT_RATE_BP) : { net: i.amount }
  return sub(net, i.costOfGoods ?? kobo(0))
}
