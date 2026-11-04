// A small chart of accounts in plain language. A trader never sees the codes or
// the words "debit" and "credit"; the app picks the right accounts for them.

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'

export interface Account {
  code: string
  name: string
  type: AccountType
  /** Contra accounts sit on the opposite side of their type (e.g. owner drawings reduce equity). */
  contra?: boolean
  /** Counts as a fixed asset for the small-company test. */
  fixed?: boolean
}

export const ACCOUNTS = [
  { code: '1000', name: 'Cash in hand', type: 'asset' },
  { code: '1010', name: 'Bank and POS', type: 'asset' },
  { code: '1100', name: 'Customers owe you', type: 'asset' },
  { code: '1200', name: 'Stock (goods for sale)', type: 'asset' },
  { code: '1300', name: 'VAT you can claim back', type: 'asset' },
  { code: '1500', name: 'Equipment', type: 'asset', fixed: true },
  { code: '2000', name: 'You owe suppliers', type: 'liability' },
  { code: '2100', name: 'VAT collected', type: 'liability' },
  { code: '2200', name: 'Loans', type: 'liability' },
  { code: '3000', name: "Owner's money in", type: 'equity' },
  { code: '3100', name: 'Owner took out', type: 'equity', contra: true },
  { code: '4000', name: 'Sales', type: 'income' },
  { code: '4100', name: 'Other income', type: 'income' },
  { code: '5000', name: 'Cost of goods sold', type: 'expense' },
  { code: '5100', name: 'Shop rent', type: 'expense' },
  { code: '5200', name: 'Transport and delivery', type: 'expense' },
  { code: '5300', name: 'Staff pay', type: 'expense' },
  { code: '5400', name: 'Power and fuel', type: 'expense' },
  { code: '5500', name: 'Data and airtime', type: 'expense' },
  { code: '5600', name: 'Market levies and fees', type: 'expense' },
  { code: '5900', name: 'Other expenses', type: 'expense' },
] as const satisfies readonly Account[]

export type AccountCode = (typeof ACCOUNTS)[number]['code']

const byCode = new Map<string, Account>(ACCOUNTS.map((a) => [a.code, a]))

export function account(code: string): Account {
  const a = byCode.get(code)
  if (!a) throw new Error(`Unknown account ${code}`)
  return a
}

export function isAccountCode(code: string): code is AccountCode {
  return byCode.has(code)
}

/** Assets and expenses grow with debits; the rest grow with credits (flipped for contra accounts). */
export function isDebitNormal(code: AccountCode): boolean {
  const a = account(code)
  const debitType = a.type === 'asset' || a.type === 'expense'
  return a.contra ? !debitType : debitType
}

export const EXPENSE_CATEGORIES = ACCOUNTS.filter((a) => a.type === 'expense' && a.code !== '5000')
