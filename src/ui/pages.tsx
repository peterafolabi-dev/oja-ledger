import { useMemo, useState } from 'react'
import { account } from '../core/accounts'
import type { Entry } from '../core/ledger'
import { kobo } from '../core/money'
import { balanceSheet, profitAndLoss, smallCompanyCheck, today, trialBalance, vatReturn } from '../core/reports'
import { SMALL_CO_TURNOVER_LIMIT } from '../core/tax'
import { type Book, todayIso } from '../store/useBook'
import { direction, entryAmount, fingerprint, naira, nairaExact, prettyDate, prettyMonth } from './format'
import { IconCheck, IconWarn } from './icons'

// ---------------------------------------------------------------- Today

export function TodayPage({ book, onRecord, onOpenBook }: { book: Book; onRecord: () => void; onOpenBook: () => void }) {
  const t = useMemo(() => today(book.entries, todayIso()), [book.entries])
  const recent = book.entries.slice(-6).reverse()
  const reversed = new Set(book.entries.filter((e) => e.reverses).map((e) => e.reverses))
  const net = kobo(t.sales - t.spent)

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{book.meta?.businessName ?? 'Today'}</h1>
          <p>{prettyDate(todayIso())}</p>
        </div>
        <button className="btn btn-primary no-print" onClick={onRecord}>
          Record a sale or expense
        </button>
      </header>

      <div className="grid2">
        <div className="stack">
          <section className="sheet drawer" aria-label="Money right now">
            <div className="drawer-top">
              <div className="drawer-cell">
                <div className="k">Cash in hand</div>
                <div className="big">{naira(t.cash)}</div>
              </div>
              <div className="drawer-cell">
                <div className="k">Bank and POS</div>
                <div className="big">{naira(t.bank)}</div>
              </div>
            </div>
            <div className="drawer-rows">
              <div className="row">
                <span className="k">Sold today</span>
                <span className="v in">{naira(t.sales)}</span>
              </div>
              <div className="row">
                <span className="k">Spent today</span>
                <span className="v out">{naira(t.spent)}</span>
              </div>
              <div className="row">
                <span className="k">Today, sales minus spending</span>
                <span className={`v ${net >= 0 ? 'in' : 'out'}`}>{naira(net)}</span>
              </div>
              <div className="row">
                <span className="k">Customers owe you</span>
                <span className="v">{naira(t.owedToYou)}</span>
              </div>
              <div className="row">
                <span className="k">You owe suppliers</span>
                <span className="v">{naira(t.youOwe)}</span>
              </div>
              <div className="row">
                <span className="k">Stock at cost</span>
                <span className="v">{naira(t.stock)}</span>
              </div>
            </div>
          </section>
          <SealCard book={book} />
        </div>

        <section className="sheet" aria-labelledby="recent-h">
          <div className="pad" style={{ paddingBottom: 8 }}>
            <h2 className="h2" id="recent-h">
              Latest entries
            </h2>
            <p className="sub">{book.entries.length} entries in the book</p>
          </div>
          {recent.length === 0 ? (
            <div className="empty">
              <p>Nothing recorded yet. Your first sale goes here.</p>
              <button className="btn btn-primary" onClick={onRecord}>
                Record your first sale
              </button>
            </div>
          ) : (
            <ul className="entries">
              {recent.map((e) => (
                <EntryRow key={e.id} e={e} reversed={reversed.has(e.id)} />
              ))}
            </ul>
          )}
          {recent.length > 0 && (
            <div className="pad" style={{ paddingTop: 10 }}>
              <button className="link-btn" onClick={onOpenBook}>
                Open the full book
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  )
}

export function SealCard({ book }: { book: Book }) {
  const [checking, setChecking] = useState(false)
  const c = book.check
  const tb = useMemo(() => trialBalance(book.entries), [book.entries])
  const ok = Boolean(c?.ok) && tb.balanced

  async function recheck() {
    setChecking(true)
    await book.recheck()
    setChecking(false)
  }

  return (
    <section className="sheet seal" aria-live="polite">
      <div className={`seal-mark ${ok ? '' : 'bad'}`}>{ok ? <IconCheck /> : <IconWarn />}</div>
      <div style={{ flex: 1 }}>
        {ok ? (
          <>
            <b>Books balanced and sealed</b>
            <span className="sub">
              {book.entries.length} entries, none changed since recorded. Fingerprint <span className="fp">{fingerprint(book.entries.at(-1)?.hash)}</span>
            </span>
          </>
        ) : (
          <>
            <b className="out">The book has been altered</b>
            <span className="sub">
              {c?.reason ?? 'Debits and credits do not match'}
              {c?.brokenAt ? ` (entry #${c.brokenAt})` : ''}. Restore from your last export.
            </span>
          </>
        )}
        <div style={{ marginTop: 6 }}>
          <button className="link-btn" onClick={recheck} disabled={checking}>
            {checking ? 'Checking every entry…' : 'Check again'}
          </button>
        </div>
      </div>
    </section>
  )
}

function EntryRow({ e, reversed, onReverse }: { e: Entry; reversed: boolean; onReverse?: (e: Entry) => void }) {
  const [open, setOpen] = useState(false)
  const dir = direction(e)
  const amt = entryAmount(e)
  return (
    <li className={`entry ${reversed ? 'reversed' : ''}`}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="memo">{e.memo}</span>
        <span className={`amt ${dir === 'in' ? 'in' : dir === 'out' ? 'out' : ''}`}>
          {dir === 'in' ? '+' : dir === 'out' ? '−' : ''}
          {naira(amt)}
        </span>
        <span className="meta">
          #{e.seq} · {prettyDate(e.date)}
          {reversed ? ' · reversed' : ''}
        </span>
      </button>
      {open && (
        <div className="detail">
          <table className="dbl">
            <thead>
              <tr>
                <th>Account</th>
                <th className="num">Debit</th>
                <th className="num">Credit</th>
              </tr>
            </thead>
            <tbody>
              {e.lines.map((l, i) => (
                <tr key={i}>
                  <td>{account(l.account).name}</td>
                  <td className="num">{l.debit ? nairaExact(l.debit) : ''}</td>
                  <td className="num">{l.credit ? nairaExact(l.credit) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hash">
            Sealed {new Date(e.createdAt).toLocaleString('en-NG')} · hash {e.hash.slice(0, 16)}… · follows {e.prevHash.slice(0, 8)}…
          </p>
          {onReverse && !reversed && e.kind !== 'reversal' && (
            <button className="btn btn-danger" onClick={() => onReverse(e)} style={{ marginTop: 8 }}>
              Reverse this entry
            </button>
          )}
        </div>
      )}
    </li>
  )
}

// ---------------------------------------------------------------- Book

export function BookPage({ book }: { book: Book }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const reversed = new Set(book.entries.filter((e) => e.reverses).map((e) => e.reverses))
  const shown = book.entries
    .filter((e) => !q || e.memo.toLowerCase().includes(q.toLowerCase()) || String(e.seq) === q.replace('#', ''))
    .slice()
    .reverse()
  const byDay = new Map<string, Entry[]>()
  for (const e of shown) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e])

  async function onReverse(e: Entry) {
    const reason = window.prompt(`Reverse #${e.seq} "${e.memo}"? The original stays in the book and a mirror entry cancels it.\n\nReason (optional):`, '')
    if (reason === null) return
    setBusy(e.id)
    await book.reverse(e, reason)
    setBusy(null)
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>The book</h1>
          <p>Every entry, newest first. Nothing can be edited or deleted; mistakes are reversed.</p>
        </div>
      </header>
      <div className="toolbar">
        <input className="input" type="search" placeholder="Search notes or #number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search entries" />
        <button className="btn" onClick={() => downloadCsv(book.entries, book.meta?.businessName ?? 'oja-ledger')}>
          Export for my accountant (CSV)
        </button>
        {busy && <span className="sub">Reversing…</span>}
      </div>
      <section className="sheet">
        {shown.length === 0 ? (
          <div className="empty">{q ? `No entries match "${q}".` : 'The book is empty.'}</div>
        ) : (
          [...byDay].map(([day, list]) => (
            <div key={day}>
              <div className="day-head">{prettyDate(day)}</div>
              <ul className="entries">
                {list.map((e) => (
                  <EntryRow key={e.id} e={e} reversed={reversed.has(e.id)} onReverse={onReverse} />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </>
  )
}

function downloadCsv(entries: Entry[], name: string) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
  const rows = [['entry', 'date', 'note', 'account_code', 'account', 'debit_naira', 'credit_naira', 'hash'].join(',')]
  for (const e of entries)
    for (const l of e.lines)
      rows.push([e.seq, e.date, esc(e.memo), l.account, esc(account(l.account).name), (l.debit / 100).toFixed(2), (l.credit / 100).toFixed(2), e.hash].join(','))
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-journal-${todayIso()}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

// ---------------------------------------------------------------- Reports

type Range = 'this-month' | 'last-month' | 'this-year'

function rangeOf(r: Range): { from: string; to: string; label: string; year: number; month: number } {
  const [y, m] = todayIso().split('-').map(Number) as [number, number]
  const pad = (n: number) => String(n).padStart(2, '0')
  const lastDay = (yy: number, mm: number) => new Date(Date.UTC(yy, mm, 0)).getUTCDate()
  if (r === 'this-year') return { from: `${y}-01-01`, to: todayIso(), label: `${y} so far`, year: y, month: m }
  const yy = r === 'last-month' && m === 1 ? y - 1 : y
  const mm = r === 'last-month' ? (m === 1 ? 12 : m - 1) : m
  const end = `${yy}-${pad(mm)}-${pad(lastDay(yy, mm))}`
  // never report "as at" a date that hasn't happened yet
  return { from: `${yy}-${pad(mm)}-01`, to: end < todayIso() ? end : todayIso(), label: prettyMonth(yy, mm), year: yy, month: mm }
}

export function ReportsPage({ book }: { book: Book }) {
  const [range, setRange] = useState<Range>('this-month')
  const r = rangeOf(range)
  const pl = useMemo(() => profitAndLoss(book.entries, r), [book.entries, r.from, r.to])
  const bs = useMemo(() => balanceSheet(book.entries, r.to), [book.entries, r.to])
  const vat = useMemo(() => vatReturn(book.entries, r.year, r.month), [book.entries, r.year, r.month])
  const small = useMemo(() => smallCompanyCheck(book.entries, r.year), [book.entries, r.year])
  const tb = useMemo(() => trialBalance(book.entries, r.to), [book.entries, r.to])
  const used = Math.min(100, Math.round((small.turnover / SMALL_CO_TURNOVER_LIMIT) * 100))

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Reports</h1>
          <p>Built fresh from the book every time, so they always agree with it.</p>
        </div>
        <div className="toolbar" style={{ margin: 0 }}>
          <div className="seg" role="group" aria-label="Period">
            {(['this-month', 'last-month', 'this-year'] as Range[]).map((k) => (
              <button key={k} aria-pressed={range === k} onClick={() => setRange(k)}>
                {k === 'this-month' ? 'This month' : k === 'last-month' ? 'Last month' : 'This year'}
              </button>
            ))}
          </div>
          <button className="btn" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </header>

      <div className="grid2">
        <div className="stack">
          <section className="sheet pad report">
            <h3>Profit and loss</h3>
            <p className="sub">{r.label}</p>
            <table>
              <tbody>
                <tr className="group"><td colSpan={2}>Money earned</td></tr>
                {pl.income.map((l) => (
                  <tr key={l.code}><td>{l.name}</td><td className="num">{naira(l.amount)}</td></tr>
                ))}
                <tr className="group"><td colSpan={2}>Costs</td></tr>
                {pl.expenses.map((l) => (
                  <tr key={l.code}><td>{l.name}</td><td className="num">{naira(l.amount)}</td></tr>
                ))}
                <tr className="total">
                  <td>{pl.profit >= 0 ? 'Profit' : 'Loss'}</td>
                  <td className={`num ${pl.profit >= 0 ? 'in' : 'out'}`}>{naira(kobo(Math.abs(pl.profit)))}</td>
                </tr>
              </tbody>
            </table>
            <p className="note">Gross profit (sales minus what the goods cost): {naira(pl.grossProfit)}. Sales are shown without VAT.</p>
          </section>

          <section className="sheet pad report">
            <h3>Balance sheet</h3>
            <p className="sub">At {prettyDate(r.to)}</p>
            <table>
              <tbody>
                <tr className="group"><td colSpan={2}>What the business owns</td></tr>
                {bs.assets.map((l) => (
                  <tr key={l.code}><td>{l.name}</td><td className="num">{naira(l.amount)}</td></tr>
                ))}
                <tr className="total"><td>Total</td><td className="num">{naira(bs.totalAssets)}</td></tr>
                <tr className="group"><td colSpan={2}>What it owes</td></tr>
                {bs.liabilities.map((l) => (
                  <tr key={l.code}><td>{l.name}</td><td className="num">{naira(l.amount)}</td></tr>
                ))}
                <tr className="group"><td colSpan={2}>What belongs to the owner</td></tr>
                <tr><td>Money put in</td><td className="num">{naira(bs.equity.capital)}</td></tr>
                <tr><td>Money taken out</td><td className="num">{naira(bs.equity.drawings)}</td></tr>
                <tr><td>Profit kept in the business</td><td className="num">{naira(bs.equity.retained)}</td></tr>
                <tr className="total"><td>Total owed plus owner's share</td><td className="num">{naira(kobo(bs.totalLiabilities + bs.totalEquity))}</td></tr>
              </tbody>
            </table>
            <p className={`verdict ${bs.balanced ? '' : 'out'}`}>
              {bs.balanced ? 'Both sides match to the kobo.' : 'The two sides do not match. Check the book’s seal.'}
            </p>
          </section>
        </div>

        <div className="stack">
          <section className="sheet pad report">
            <h3>VAT for {prettyMonth(r.year, r.month)}</h3>
            <p className="sub">Monthly return, due by {prettyDate(vat.dueDate)}</p>
            <table>
              <tbody>
                <tr><td>VAT you collected on sales</td><td className="num">{nairaExact(vat.output)}</td></tr>
                <tr><td>VAT you paid on purchases</td><td className="num">−{nairaExact(vat.input)}</td></tr>
                <tr className="total">
                  <td>{vat.payable > 0 ? 'To pay' : 'To claim back'}</td>
                  <td className="num">{nairaExact(vat.payable > 0 ? vat.payable : vat.refundable)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="sheet pad report">
            <h3>Small company check, {small.year}</h3>
            <p className="sub">Companies with turnover up to ₦50m and fixed assets up to ₦250m pay 0% company income tax.</p>
            <div className="meter" role="img" aria-label={`${used}% of the ₦50m turnover limit used`}>
              <i style={{ width: `${used}%` }} />
            </div>
            <p className="sub">
              Turnover {naira(small.turnover)} of ₦50,000,000 · fixed assets {naira(small.fixedAssets)}
            </p>
            <p className="verdict">
              {small.qualifies
                ? `On track for 0% company income tax. Room before the limit: ${naira(small.turnoverHeadroom)}.`
                : `Above the small-company limits. Estimated company income tax at 30% of profit: ${naira(small.estimatedCit)}.`}
            </p>
            <p className="note">A planning aid based on the Nigeria Tax Act 2025, not tax advice. Confirm with a tax professional before filing.</p>
          </section>

          <section className="sheet pad report">
            <h3>Trial balance</h3>
            <p className="sub">For your accountant. Debits must equal credits.</p>
            <table>
              <tbody>
                {tb.rows.map((row) => (
                  <tr key={row.code}>
                    <td>{row.name}</td>
                    <td className="num">{row.debit ? naira(row.debit) : ''}</td>
                    <td className="num">{row.credit ? naira(row.credit) : ''}</td>
                  </tr>
                ))}
                <tr className="total">
                  <td>Totals</td>
                  <td className="num">{naira(tb.totalDebit)}</td>
                  <td className="num">{naira(tb.totalCredit)}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </>
  )
}
