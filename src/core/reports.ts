// Reports computed straight from the journal. Nothing is cached, so a report
// can never disagree with the entries it was built from.

import { ACCOUNTS, type AccountCode, account, isDebitNormal } from './accounts'
import type { Entry } from './ledger'
import { type Kobo, kobo, sum } from './money'
import {
  SMALL_CO_FIXED_ASSETS_LIMIT,
  SMALL_CO_TURNOVER_LIMIT,
  STANDARD_CIT_RATE_BP,
  vatDueDate,
} from './tax'

export interface Period {
  from?: string // inclusive, YYYY-MM-DD
  to?: string // inclusive
}

const inPeriod = (date: string, p: Period) => (!p.from || date >= p.from) && (!p.to || date <= p.to)

/** Net debit (positive) or credit (negative) movement per account in a period. */
export function netMovements(journal: readonly Entry[], p: Period = {}): Map<AccountCode, Kobo> {
  const m = new Map<AccountCode, number>()
  for (const e of journal) {
    if (!inPeriod(e.date, p)) continue
    for (const l of e.lines) m.set(l.account, (m.get(l.account) ?? 0) + l.debit - l.credit)
  }
  return new Map([...m].map(([k, v]) => [k, kobo(v)]))
}

/** Balance shown the way a person reads it: positive on the account's normal side. */
export function balance(net: Map<AccountCode, Kobo>, code: AccountCode): Kobo {
  const n = net.get(code) ?? 0
  return kobo(isDebitNormal(code) ? n : -n)
}

export interface TrialBalanceRow {
  code: AccountCode
  name: string
  debit: Kobo
  credit: Kobo
}

export function trialBalance(journal: readonly Entry[], asOf?: string) {
  const net = netMovements(journal, asOf ? { to: asOf } : {})
  const rows: TrialBalanceRow[] = ACCOUNTS.filter((a) => (net.get(a.code) ?? 0) !== 0).map((a) => {
    const n = net.get(a.code)!
    return { code: a.code, name: a.name, debit: kobo(Math.max(n, 0)), credit: kobo(Math.max(-n, 0)) }
  })
  const totalDebit = sum(rows.map((r) => r.debit))
  const totalCredit = sum(rows.map((r) => r.credit))
  return { rows, totalDebit, totalCredit, balanced: totalDebit === totalCredit }
}

export interface Line2 {
  code: AccountCode
  name: string
  amount: Kobo
}

function linesOf(net: Map<AccountCode, Kobo>, type: string): Line2[] {
  return ACCOUNTS.filter((a) => a.type === type)
    .map((a) => ({ code: a.code, name: a.name, amount: balance(net, a.code) }))
    .filter((l) => l.amount !== 0)
}

export function profitAndLoss(journal: readonly Entry[], p: Period) {
  const net = netMovements(journal, p)
  const income = linesOf(net, 'income')
  const expenses = linesOf(net, 'expense')
  const totalIncome = sum(income.map((l) => l.amount))
  const totalExpenses = sum(expenses.map((l) => l.amount))
  const sales = balance(net, '4000')
  const cogs = balance(net, '5000')
  return {
    income,
    expenses,
    totalIncome,
    totalExpenses,
    grossProfit: kobo(sales - cogs),
    profit: kobo(totalIncome - totalExpenses),
  }
}

export function balanceSheet(journal: readonly Entry[], asOf?: string) {
  const net = netMovements(journal, asOf ? { to: asOf } : {})
  const assets = linesOf(net, 'asset')
  const liabilities = linesOf(net, 'liability')
  const capital = balance(net, '3000')
  const drawings = kobo(-balance(net, '3100')) // contra: shown as a reduction
  const retained = kobo(
    sum(ACCOUNTS.filter((a) => a.type === 'income').map((a) => balance(net, a.code))) -
      sum(ACCOUNTS.filter((a) => a.type === 'expense').map((a) => balance(net, a.code))),
  )
  const totalAssets = sum(assets.map((l) => l.amount))
  const totalLiabilities = sum(liabilities.map((l) => l.amount))
  const totalEquity = kobo(capital + drawings + retained)
  return {
    assets,
    liabilities,
    equity: { capital, drawings, retained },
    totalAssets,
    totalLiabilities,
    totalEquity,
    balanced: totalAssets === totalLiabilities + totalEquity,
  }
}

const monthRange = (year: number, month: number): Required<Period> => {
  const mm = String(month).padStart(2, '0')
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(last).padStart(2, '0')}` }
}

/** Monthly VAT position: VAT collected on sales minus VAT paid on purchases. */
export function vatReturn(journal: readonly Entry[], year: number, month: number) {
  const p = monthRange(year, month)
  let output = 0
  let input = 0
  for (const e of journal) {
    if (!inPeriod(e.date, p)) continue
    for (const l of e.lines) {
      if (l.account === '2100') output += l.credit - l.debit
      if (l.account === '1300') input += l.debit - l.credit
    }
  }
  const netVat = output - input
  return {
    period: p,
    output: kobo(output),
    input: kobo(input),
    payable: kobo(Math.max(netVat, 0)),
    refundable: kobo(Math.max(-netVat, 0)),
    dueDate: vatDueDate(year, month),
  }
}

/** Small-company test for the year: 0% companies income tax if both limits are met. */
export function smallCompanyCheck(journal: readonly Entry[], year: number) {
  const p = { from: `${year}-01-01`, to: `${year}-12-31` }
  const turnover = balance(netMovements(journal, p), '4000')
  const endNet = netMovements(journal, { to: p.to })
  const fixedAssets = sum(ACCOUNTS.filter((a) => 'fixed' in a && a.fixed).map((a) => balance(endNet, a.code)))
  const profit = profitAndLoss(journal, p).profit
  const qualifies = turnover <= SMALL_CO_TURNOVER_LIMIT && fixedAssets <= SMALL_CO_FIXED_ASSETS_LIMIT
  const estimatedCit = qualifies || profit <= 0 ? kobo(0) : kobo(Math.round((profit * STANDARD_CIT_RATE_BP) / 10_000))
  return {
    year,
    turnover,
    fixedAssets,
    profit,
    qualifies,
    turnoverHeadroom: kobo(SMALL_CO_TURNOVER_LIMIT - turnover),
    estimatedCit,
  }
}

/** Figures for the home screen. */
export function today(journal: readonly Entry[], date: string) {
  const dayNet = netMovements(journal, { from: date, to: date })
  const allNet = netMovements(journal)
  return {
    sales: balance(dayNet, '4000'),
    spent: sum(ACCOUNTS.filter((a) => a.type === 'expense' && a.code !== '5000').map((a) => balance(dayNet, a.code))),
    cash: balance(allNet, '1000'),
    bank: balance(allNet, '1010'),
    owedToYou: balance(allNet, '1100'),
    youOwe: balance(allNet, '2000'),
    stock: balance(allNet, '1200'),
  }
}

export function accountName(code: AccountCode): string {
  return account(code).name
}
