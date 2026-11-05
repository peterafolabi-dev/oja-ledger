import { type ReactNode, useMemo, useState } from 'react'
import { account } from '../core/accounts'
import type { Entry } from '../core/ledger'
import { type Kobo, kobo, sum } from '../core/money'
import { balanceSheet, profitAndLoss, smallCompanyCheck, today, trialBalance, vatReturn } from '../core/reports'
import { SMALL_CO_TURNOVER_LIMIT } from '../core/tax'
import { type Book, todayIso } from '../store/useBook'
import { direction, entryAmount, fingerprint, naira, nairaExact, prettyDate, prettyMonth } from './format'
import { IconCheck, IconLock, IconWarn } from './icons'

const monthRange = (y: number, m: number) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  const end = `${y}-${pad(m)}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`
  return { from: `${y}-${pad(m)}-01`, to: end < todayIso() ? end : todayIso() }
}
const thisMonth = () => {
  const [y, m] = todayIso().split('-').map(Number) as [number, number]
  return { y, m, ...monthRange(y, m) }
}

function PageHead({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-[40px] leading-none text-on-shell sm:text-5xl">{title}</h1>
        {sub && <p className="mt-2 text-on-shell-mute">{sub}</p>}
      </div>
      {action}
    </header>
  )
}

// ---------------------------------------------------------------- Today

function Metric({ label, value, badge, hint }: { label: string; value: ReactNode; badge: ReactNode; hint: string }) {
  return (
    <div className="page-card page-card-hover flex flex-col p-4 sm:p-5">
      <div className="flex flex-col-reverse items-start justify-between gap-2 sm:flex-row sm:gap-3">
        <span className="text-[13px] font-medium text-on-page-mute sm:text-sm">{label}</span>
        {badge}
      </div>
      <div className="num mt-2 truncate text-[19px] leading-none text-on-page sm:mt-3 sm:text-[28px]">{value}</div>
      <p className="mt-2 text-[11px] leading-snug text-on-page-mute sm:text-xs">{hint}</p>
    </div>
  )
}

export function TodayPage({ book, onQuickSale, onOpenBook }: { book: Book; onQuickSale: () => void; onOpenBook: () => void }) {
  const tm = thisMonth()
  const t = useMemo(() => today(book.entries, todayIso()), [book.entries])
  const pl = useMemo(() => profitAndLoss(book.entries, tm), [book.entries, tm.from, tm.to])
  const vat = useMemo(() => vatReturn(book.entries, tm.y, tm.m), [book.entries, tm.y, tm.m])
  const small = useMemo(() => smallCompanyCheck(book.entries, tm.y), [book.entries, tm.y])
  const recent = book.entries.slice(-8).reverse()
  const reversed = new Set(book.entries.filter((e) => e.reverses).map((e) => e.reverses))

  return (
    <>
      <PageHead
        title="Today"
        sub={prettyDate(todayIso())}
        action={
          <button className="btn-cta no-print hidden sm:inline-flex" onClick={onQuickSale}>
            Record a sale
          </button>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Summary">
        <Metric label="Daily sales" value={naira(t.sales)} badge={<span className="badge-green">Today</span>} hint={`Spent today ${naira(t.spent)}`} />
        <Metric
          label="Net profit"
          value={naira(pl.profit)}
          badge={pl.profit >= 0 ? <span className="badge-green"><span className="pill-dot !h-1.5 !w-1.5" />Profit</span> : <span className="badge-red">Loss</span>}
          hint={`${prettyMonth(tm.y, tm.m)} so far`}
        />
        <Metric
          label="VAT owed (7.5%)"
          value={naira(vat.payable > 0 ? vat.payable : vat.refundable)}
          badge={vat.payable > 0 ? <span className="badge-amber">Pending</span> : <span className="badge-green">To claim back</span>}
          hint={`Return due ${prettyDate(vat.dueDate)}`}
        />
        <Metric
          label="Small company tax check"
          value={small.qualifies ? '0% CIT' : '30% CIT'}
          badge={small.qualifies ? <span className="badge-green">Exempt</span> : <span className="badge-amber">Above limit</span>}
          hint={`Turnover ${naira(small.turnover)} of ₦50m · Nigeria Tax Act 2025`}
        />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="grid content-start gap-4">
          <section className="leather p-5" aria-label="Money right now">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-cream/60">Cash in hand</div>
                <div className="num mt-1 text-2xl text-cream">{naira(t.cash)}</div>
              </div>
              <div>
                <div className="text-sm text-cream/60">Bank and POS</div>
                <div className="num mt-1 text-2xl text-cream">{naira(t.bank)}</div>
              </div>
            </div>
            <div className="brass-rule my-4" />
            <dl className="grid gap-2 text-sm">
              {(
                [
                  ['Customers owe you', t.owedToYou],
                  ['You owe suppliers', t.youOwe],
                  ['Stock at cost', t.stock],
                ] as [string, Kobo][]
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-cream/65">{k}</dt>
                  <dd className="num text-cream">{naira(v)}</dd>
                </div>
              ))}
            </dl>
          </section>
          <SealCard book={book} />
        </div>

        <section className="page-card overflow-hidden" aria-labelledby="recent-h">
          <div className="flex items-baseline justify-between px-5 pb-3 pt-5">
            <h2 id="recent-h" className="font-serif text-2xl">
              Latest in the book
            </h2>
            <span className="text-xs text-on-page-mute">{book.entries.length} entries</span>
          </div>
          {recent.length === 0 ? (
            <div className="px-5 pb-8 pt-4 text-center text-on-page-mute">
              <p>Nothing recorded yet. Your first sale goes here.</p>
              <button className="btn-cta mt-4" onClick={onQuickSale}>
                Record your first sale
              </button>
            </div>
          ) : (
            <>
              <Passbook entries={recent} reversed={reversed} compact />
              <div className="px-5 py-4">
                <button className="font-semibold text-emerald underline decoration-brass/60 underline-offset-4 hover:decoration-brass" onClick={onOpenBook}>
                  Open the full journal
                </button>
              </div>
            </>
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

  return (
    <section className="page-card flex items-center gap-4 p-5" aria-live="polite">
      <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${ok ? 'bg-brass-sheen text-forest shadow-brass' : 'bg-crimson text-white'}`} aria-hidden="true">
        {ok ? <IconCheck className="h-7 w-7" /> : <IconWarn className="h-7 w-7" />}
      </div>
      <div className="min-w-0 flex-1">
        {ok ? (
          <>
            <b className="block">Books balanced and sealed</b>
            <span className="text-sm text-on-page-mute">
              {book.entries.length} entries, none changed since recorded. Fingerprint{' '}
              <span className="num font-semibold text-on-page">{fingerprint(book.entries.at(-1)?.hash)}</span>
            </span>
          </>
        ) : (
          <>
            <b className="block text-crimson">The book has been altered</b>
            <span className="text-sm text-on-page-mute">
              {c?.reason ?? 'Debits and credits do not match'}
              {c?.brokenAt ? ` (entry #${c.brokenAt})` : ''}. Restore from your last export.
            </span>
          </>
        )}
        <div className="mt-1">
          <button
            className="text-sm font-semibold text-emerald underline decoration-brass/60 underline-offset-4"
            disabled={checking}
            onClick={async () => {
              setChecking(true)
              await book.recheck()
              setChecking(false)
            }}
          >
            {checking ? 'Checking every entry…' : 'Check again'}
          </button>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- Passbook

function stamp(e: Entry) {
  const t = new Date(e.createdAt)
  return { day: prettyDate(e.date), time: t.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) }
}

/** The journal as a passbook: date stamp, details with each double-entry line, amount, and the seal. */
function Passbook({ entries, reversed, onReverse, compact = false }: { entries: Entry[]; reversed: Set<string | undefined>; onReverse?: (e: Entry) => void; compact?: boolean }) {
  const [open, setOpen] = useState<string | null>(null)
  const cols = 'md:grid-cols-[100px_minmax(0,1fr)_104px_104px_92px]'
  return (
    <div className="text-sm">
      <div className={`hidden gap-3 border-y border-brass/40 bg-page-2/70 px-5 py-2 text-xs font-semibold text-on-page-mute md:grid ${cols}`} aria-hidden="true">
        <span>Date</span>
        <span>Details</span>
        <span className="text-right">Debit</span>
        <span className="text-right">Credit</span>
        <span className="text-right">Seal</span>
      </div>
      <ol>
        {entries.map((e, i) => {
          const s = stamp(e)
          const dir = direction(e)
          const isRev = reversed.has(e.id)
          const expanded = open === e.id
          const showLines = expanded || !compact
          return (
            <li key={e.id} className={`border-b border-rule/70 ${i % 2 ? 'bg-page-2/55' : ''}`}>
              <div className={`grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-5 py-3 md:items-baseline ${cols}`}>
                <span className="order-2 text-xs text-on-page-mute md:order-none">
                  <span className="num">#{e.seq}</span> · {s.day}
                  <span className="num hidden md:block">{s.time}</span>
                </span>
                <span className={`min-w-0 font-medium ${isRev ? 'text-on-page-mute line-through' : ''}`}>
                  {e.memo}
                  {isRev && <span className="badge-red ml-2 !py-0.5 align-middle">reversed</span>}
                </span>
                {/* passbook style: money in under Debit, money out under Credit */}
                {dir === 'out' && <span className="hidden md:block" />}
                <span className={`num text-right ${dir === 'in' ? 'text-emerald' : dir === 'out' ? 'text-crimson' : ''} ${isRev ? 'line-through opacity-60' : ''}`}>
                  {dir === 'in' ? '+' : dir === 'out' ? '−' : ''}
                  {naira(entryAmount(e))}
                </span>
                {dir !== 'out' && <span className="hidden md:block" />}
                <button
                  onClick={() => setOpen(expanded ? null : e.id)}
                  aria-expanded={expanded}
                  className="order-3 inline-flex items-center gap-1.5 justify-self-end rounded-md text-xs text-brass-soft hover:text-amber md:order-none"
                  title="Show this entry's SHA-256 seal"
                >
                  <IconLock className="h-3.5 w-3.5" />
                  <span className="num">{e.hash.slice(0, 8)}</span>
                </button>
              </div>
              {showLines && (
                <div className={`px-5 pb-3 ${expanded ? '' : 'hidden md:block'}`}>
                  {e.lines.map((l, k) => (
                    <div key={k} className={`grid grid-cols-[1fr_88px_88px] gap-3 py-0.5 text-[13px] text-on-page-mute ${cols}`}>
                      <span className="hidden md:block" />
                      <span className={l.credit ? 'pl-6' : ''}>{account(l.account).name}</span>
                      <span className="num text-right">{l.debit ? nairaExact(l.debit) : ''}</span>
                      <span className="num text-right">{l.credit ? nairaExact(l.credit) : ''}</span>
                      <span className="hidden md:block" />
                    </div>
                  ))}
                  {expanded && (
                    <div className="mt-2 rounded-xl border border-brass/30 bg-page p-3 text-xs text-on-page-mute">
                      <div className="flex items-center gap-1.5 font-semibold text-on-page">
                        <IconLock className="h-3.5 w-3.5 text-brass-soft" /> Sealed {new Date(e.createdAt).toLocaleString('en-NG')}
                      </div>
                      <div className="num mt-1 break-all">hash {e.hash}</div>
                      <div className="num break-all">follows {e.prevHash}</div>
                      {onReverse && !isRev && e.kind !== 'reversal' && (
                        <button className="btn-danger mt-3 px-3 py-2 text-xs" onClick={() => onReverse(e)}>
                          Reverse this entry
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// ---------------------------------------------------------------- Journal

export function BookPage({ book }: { book: Book }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const reversed = new Set(book.entries.filter((e) => e.reverses).map((e) => e.reverses))
  const shown = book.entries
    .filter((e) => !q || e.memo.toLowerCase().includes(q.toLowerCase()) || String(e.seq) === q.replace('#', ''))
    .slice()
    .reverse()

  async function onReverse(e: Entry) {
    const reason = window.prompt(`Reverse #${e.seq} "${e.memo}"? The original stays in the book and a mirror entry cancels it.\n\nReason (optional):`, '')
    if (reason === null) return
    setBusy(true)
    await book.reverse(e, reason)
    setBusy(false)
  }

  return (
    <>
      <PageHead title="Journal" sub="Every entry, newest first. Nothing can be edited or deleted; mistakes are reversed." />
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <input className="input-emboss max-w-xs" type="search" placeholder="Search notes or #number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search entries" />
        <button className="btn-ghost text-on-shell" onClick={() => downloadCsv(book.entries, book.meta?.businessName ?? 'oja-ledger')}>
          Export for my accountant (CSV)
        </button>
        {busy && <span className="text-sm text-on-shell-mute">Reversing…</span>}
      </div>
      <section className="page-card overflow-hidden">
        {shown.length === 0 ? (
          <div className="p-10 text-center text-on-page-mute">{q ? `No entries match "${q}".` : 'The book is empty.'}</div>
        ) : (
          <Passbook entries={shown} reversed={reversed} onReverse={onReverse} />
        )}
      </section>
    </>
  )
}

function downloadCsv(entries: Entry[], name: string) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
  const rows = [['entry', 'date', 'recorded_at', 'note', 'account_code', 'account', 'debit_naira', 'credit_naira', 'hash'].join(',')]
  for (const e of entries)
    for (const l of e.lines)
      rows.push([e.seq, e.date, e.createdAt, esc(e.memo), l.account, esc(account(l.account).name), (l.debit / 100).toFixed(2), (l.credit / 100).toFixed(2), e.hash].join(','))
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
  a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-journal-${todayIso()}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

// ---------------------------------------------------------------- Tax & VAT

type Range = 'this-month' | 'last-month' | 'this-year'

function rangeOf(r: Range) {
  const [y, m] = todayIso().split('-').map(Number) as [number, number]
  if (r === 'this-year') return { from: `${y}-01-01`, to: todayIso(), label: `${y} so far`, year: y, month: m }
  const yy = r === 'last-month' && m === 1 ? y - 1 : y
  const mm = r === 'last-month' ? (m === 1 ? 12 : m - 1) : m
  return { ...monthRange(yy, mm), label: prettyMonth(yy, mm), year: yy, month: mm }
}

function Rows({ rows, total }: { rows: [string, Kobo][]; total?: [string, Kobo, string?] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="border-b border-rule/70">
            <td className="py-2 pr-3">{k}</td>
            <td className="num py-2 text-right">{naira(v)}</td>
          </tr>
        ))}
        {total && (
          <tr className="border-b-[3px] border-double border-on-page/70 font-semibold">
            <td className="border-t border-on-page/70 py-2.5 pr-3">{total[0]}</td>
            <td className={`num border-t border-on-page/70 py-2.5 text-right ${total[2] ?? ''}`}>{naira(total[1])}</td>
          </tr>
        )}
      </tbody>
    </table>
  )
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
  const sales = pl.income.find((l) => l.code === '4000')?.amount ?? kobo(0)
  const expenses = sum(pl.expenses.map((l) => l.amount))

  return (
    <>
      <PageHead
        title="Tax & VAT"
        sub="Built fresh from the journal every time, so the numbers always agree."
        action={
          <div className="no-print flex flex-wrap items-center gap-2">
            <div className="seg" role="group" aria-label="Period">
              {(['this-month', 'last-month', 'this-year'] as Range[]).map((k) => (
                <button key={k} aria-pressed={range === k} onClick={() => setRange(k)}>
                  {k === 'this-month' ? 'This month' : k === 'last-month' ? 'Last month' : 'This year'}
                </button>
              ))}
            </div>
            <button className="btn-ghost text-on-shell" onClick={() => window.print()}>
              Print
            </button>
          </div>
        }
      />

      <section className="leather p-6 sm:p-7" aria-labelledby="comp-h">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="comp-h" className="font-serif text-3xl text-cream">
              Compliance summary
            </h2>
            <p className="text-sm text-cream/60">
              {r.label} · VAT for {prettyMonth(r.year, r.month)} · Nigeria Tax Act 2025
            </p>
          </div>
          {vat.payable > 0 ? (
            <span className="badge !bg-amber/25 text-[#f6c86b] ring-1 ring-amber/50">VAT due {prettyDate(vat.dueDate)}</span>
          ) : (
            <span className="badge !bg-emerald/30 text-[#7ee2b4] ring-1 ring-emerald-glow/40">Nothing to pay this month</span>
          )}
        </div>
        <div className="brass-rule my-5" />
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <div className="text-sm text-cream/60">Sales (without VAT)</div>
            <div className="num mt-1 text-2xl text-cream">{naira(sales)}</div>
            <div className="mt-3 text-sm text-cream/60">Business expenses (incl. cost of goods)</div>
            <div className="num mt-1 text-2xl text-cream">{naira(expenses)}</div>
          </div>
          <dl className="grid content-start gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-cream/65">Output VAT collected</dt>
              <dd className="num text-cream">{nairaExact(vat.output)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-cream/65">Input VAT paid</dt>
              <dd className="num text-cream">−{nairaExact(vat.input)}</dd>
            </div>
            <div className="brass-rule my-1" />
            <div className="flex justify-between gap-3 font-semibold">
              <dt className="text-cream">{vat.payable > 0 ? 'VAT to pay' : 'VAT to claim back'}</dt>
              <dd className="num text-brass">{nairaExact(vat.payable > 0 ? vat.payable : vat.refundable)}</dd>
            </div>
            <div className="text-xs text-cream/50">Monthly return, due by the 21st of the next month.</div>
          </dl>
          <div>
            <div className="text-sm text-cream/60">Small company check, {small.year}</div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-cream/10" role="img" aria-label={`${used}% of the ₦50m turnover limit used`}>
              <i className="block h-full rounded-full bg-brass-sheen" style={{ width: `${Math.max(used, 2)}%` }} />
            </div>
            <p className="num mt-2 text-xs text-cream/60">{naira(small.turnover)} of ₦50,000,000 turnover</p>
            <p className="mt-2 text-sm text-cream/85">
              {small.qualifies ? `Qualifies for 0% company income tax. Room left: ${naira(small.turnoverHeadroom)}.` : `Above the limit. Estimated tax at 30% of profit: ${naira(small.estimatedCit)}.`}
            </p>
          </div>
        </div>
        <p className="mt-5 text-xs text-cream/45">A planning aid, not tax advice. Confirm with a tax professional before filing.</p>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="page-card p-6">
          <h3 className="font-serif text-2xl">Profit and loss</h3>
          <p className="mb-3 text-sm text-on-page-mute">{r.label}</p>
          <Rows
            rows={[...pl.income.map((l) => [l.name, l.amount] as [string, Kobo]), ...pl.expenses.map((l) => [l.name, kobo(-l.amount)] as [string, Kobo])]}
            total={[pl.profit >= 0 ? 'Profit' : 'Loss', pl.profit, pl.profit >= 0 ? 'text-emerald' : 'text-crimson']}
          />
          <p className="mt-3 text-xs text-on-page-mute">Gross profit (sales minus cost of goods): {naira(pl.grossProfit)}.</p>
        </section>

        <section className="page-card p-6">
          <h3 className="font-serif text-2xl">Balance sheet</h3>
          <p className="mb-3 text-sm text-on-page-mute">At {prettyDate(r.to)}</p>
          <Rows rows={bs.assets.map((l) => [l.name, l.amount])} total={['What the business owns', bs.totalAssets]} />
          <div className="mt-4" />
          <Rows
            rows={[...bs.liabilities.map((l) => [l.name, l.amount] as [string, Kobo]), ["Owner's money in", bs.equity.capital], ['Owner took out', bs.equity.drawings], ['Profit kept in the business', bs.equity.retained]]}
            total={['What it owes + owner’s share', kobo(bs.totalLiabilities + bs.totalEquity)]}
          />
          <p className={`mt-3 text-sm ${bs.balanced ? 'text-emerald' : 'text-crimson'}`}>{bs.balanced ? 'Both sides match to the kobo.' : 'The two sides do not match.'}</p>
        </section>

        <section className="page-card p-6 lg:col-span-2">
          <h3 className="font-serif text-2xl">Trial balance</h3>
          <p className="mb-3 text-sm text-on-page-mute">For your accountant. Debits must equal credits.</p>
          <div className="overflow-x-auto">
            <table className="passbook min-w-[480px]">
              <thead>
                <tr>
                  <th>Account</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {tb.rows.map((row) => (
                  <tr key={row.code}>
                    <td>{row.name}</td>
                    <td className="num text-right">{row.debit ? naira(row.debit) : ''}</td>
                    <td className="num text-right">{row.credit ? naira(row.credit) : ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="border-t border-on-page/70 px-3 py-2.5">Totals</td>
                  <td className="num border-t border-on-page/70 px-3 py-2.5 text-right">{naira(tb.totalDebit)}</td>
                  <td className="num border-t border-on-page/70 px-3 py-2.5 text-right">{naira(tb.totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>
    </>
  )
}
