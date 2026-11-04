import { useEffect, useMemo, useRef, useState } from 'react'
import * as A from '../core/actions'
import { type AccountCode, EXPENSE_CATEGORIES, account } from '../core/accounts'
import { type EntryDraft, validateDraft } from '../core/ledger'
import { type Kobo, kobo, parseNaira } from '../core/money'
import { todayIso } from '../store/useBook'
import { naira, nairaExact } from './format'
import { IconX } from './icons'

type Kind = 'sale' | 'expense' | 'stock' | 'customer-paid' | 'supplier-paid' | 'owner-in' | 'owner-out' | 'deposit' | 'equipment' | 'loan-in'

const KINDS: { id: Kind; label: string; question: string }[] = [
  { id: 'sale', label: 'Sale', question: 'How much did the customer pay?' },
  { id: 'expense', label: 'Expense', question: 'How much did you spend?' },
  { id: 'stock', label: 'Bought stock', question: 'How much did the goods cost?' },
  { id: 'customer-paid', label: 'Customer paid debt', question: 'How much did they pay you?' },
  { id: 'supplier-paid', label: 'Paid a supplier', question: 'How much did you pay?' },
  { id: 'owner-in', label: 'I put money in', question: 'How much did you add?' },
  { id: 'owner-out', label: 'I took money out', question: 'How much did you take?' },
  { id: 'deposit', label: 'Cash to bank', question: 'How much cash went to the bank?' },
  { id: 'equipment', label: 'Equipment', question: 'How much did it cost?' },
  { id: 'loan-in', label: 'Got a loan', question: 'How much was the loan?' },
]

const QUICK = [1_000, 5_000, 10_000, 50_000]

/** "1250000.5" → "1,250,000.5" while typing, without touching the decimals. */
function groupDigits(raw: string): string {
  const [whole = '', frac] = raw.split('.')
  const grouped = whole.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac === undefined ? grouped : `${grouped}.${frac.slice(0, 2)}`
}

export function RecordSheet({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (draft: EntryDraft) => Promise<void>
}) {
  const [kind, setKind] = useState<Kind>('sale')
  const [raw, setRaw] = useState('')
  const [via, setVia] = useState<A.PaidVia>('cash')
  const [vat, setVat] = useState(false)
  const [cost, setCost] = useState('')
  const [category, setCategory] = useState<AccountCode>('5100')
  const [date, setDate] = useState(todayIso())
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    amountRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const meta = KINDS.find((k) => k.id === kind)!
  const amount = parseNaira(raw)
  const costK = cost.trim() === '' ? kobo(0) : parseNaira(cost)
  const allowsCredit = kind === 'sale' || kind === 'expense' || kind === 'stock' || kind === 'equipment'
  const settledVia = via === 'credit' ? 'cash' : via

  const draft: EntryDraft | null = useMemo(() => {
    if (!amount || amount <= 0 || costK === null) return null
    const m = memo.trim()
    const p = { date, amount, via, memo: m }
    switch (kind) {
      case 'sale':
        return A.sale({ ...p, chargeVat: vat, costOfGoods: costK })
      case 'expense':
        return A.expense({ ...p, vatCharged: vat, category })
      case 'stock':
        return A.buyStock({ ...p, vatCharged: vat })
      case 'equipment':
        return A.buyEquipment({ ...p, vatCharged: vat })
      case 'customer-paid':
        return A.customerPaid(date, amount, settledVia, m)
      case 'supplier-paid':
        return A.supplierPaid(date, amount, settledVia, m)
      case 'owner-in':
        return A.ownerIn(date, amount, settledVia, m)
      case 'owner-out':
        return A.ownerOut(date, amount, settledVia, m)
      case 'loan-in':
        return A.loanIn(date, amount, settledVia, m)
      case 'deposit':
        return A.deposit(date, amount, m)
    }
  }, [amount, costK, memo, date, via, kind, vat, category, settledVia])

  let invalid = ''
  if (raw && !amount) invalid = 'Type an amount like 12500 or 12,500.50'
  else if (costK === null) invalid = 'Type the cost like 9500'
  else if (kind === 'sale' && amount && costK && costK > amount) invalid = 'The cost is higher than the sale price. Check both amounts.'
  else if (draft) {
    try {
      validateDraft(draft)
    } catch (e) {
      invalid = (e as Error).message
    }
  }

  async function save() {
    if (!draft || invalid) return
    setSaving(true)
    setError('')
    try {
      await onSave(draft)
    } catch (e) {
      setError(`Not saved: ${(e as Error).message}`)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid animate-fade place-items-end bg-forest/60 backdrop-blur-sm sm:place-items-center" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="page-card flex max-h-[100dvh] w-full max-w-xl animate-rise flex-col overflow-hidden rounded-b-none sm:max-h-[92dvh] sm:rounded-page" role="dialog" aria-modal="true" aria-labelledby="record-title">
        <div className="flex items-center justify-between px-5 pb-1 pt-5">
          <h2 id="record-title" className="font-serif text-3xl">Record</h2>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-page-2 text-on-page-mute hover:text-on-page" onClick={onClose} aria-label="Close">
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex shrink-0 gap-2 overflow-x-auto px-5 py-3 [scrollbar-width:none]" role="group" aria-label="What happened?">
          {KINDS.map((k) => (
            <button key={k.id} aria-pressed={kind === k.id} onClick={() => setKind(k.id)} className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${kind === k.id ? 'border-teal bg-teal text-cream shadow-brass' : 'border-brass/30 text-on-page-mute hover:border-brass'}`}>
              {k.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
        <label className="mx-5 block rounded-2xl border border-brass/30 bg-page-2 px-4 pb-3 pt-3 shadow-emboss focus-within:border-brass focus-within:ring-4 focus-within:ring-brass/20">
          <span className="block text-sm text-on-page-mute">{meta.question}</span>
          <input
            ref={amountRef}
            className="num block w-full bg-transparent text-[48px] leading-tight text-on-page outline-none placeholder:text-rule focus-visible:outline-none"
            inputMode="decimal"
            placeholder="₦0"
            value={raw ? `₦${groupDigits(raw)}` : ''}
            onChange={(e) => setRaw(e.target.value.replace(/[^\d.]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            aria-describedby="amount-help"
          />
          <span className="mt-1 flex flex-wrap gap-2" id="amount-help">
            {QUICK.map((q) => (
              <button
                type="button"
                key={q}
                onClick={() => setRaw(String(((amount ?? 0) + q * 100) / 100))}
                className="num rounded-full border border-brass/30 bg-page px-3 py-1 text-xs text-on-page-mute hover:border-brass"
              >
                +{naira(kobo(q * 100))}
              </button>
            ))}
          </span>
        </label>

        <div className="grid gap-4 px-5 py-4">
          {kind !== 'deposit' && (
            <div className="grid gap-2">
              <span className="label">{kind === 'sale' || kind === 'customer-paid' || kind === 'owner-in' || kind === 'loan-in' ? 'Money came in by' : 'Paid with'}</span>
              <div className="seg" role="group">
                <button aria-pressed={via === 'cash' || (!allowsCredit && via === 'credit')} onClick={() => setVia('cash')}>
                  Cash
                </button>
                <button aria-pressed={via === 'bank'} onClick={() => setVia('bank')}>
                  Transfer or POS
                </button>
                {allowsCredit && (
                  <button aria-pressed={via === 'credit'} onClick={() => setVia('credit')}>
                    {kind === 'sale' ? 'Customer will pay later' : 'Pay later'}
                  </button>
                )}
              </div>
            </div>
          )}

          {kind === 'expense' && (
            <label className="grid gap-2">
              <span className="label">What was it for?</span>
              <select className="input-emboss" value={category} onChange={(e) => setCategory(e.target.value as AccountCode)}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {kind === 'sale' && (
            <label className="grid gap-2">
              <span className="label">What did those goods cost you? (optional, for profit)</span>
              <input className="input-emboss num" inputMode="decimal" placeholder="e.g. 9,500" value={cost} onChange={(e) => setCost(e.target.value)} />
            </label>
          )}

          {(kind === 'sale' || kind === 'expense' || kind === 'stock' || kind === 'equipment') && (
            <label className="flex items-center gap-3 text-[15px]">
              <input className="h-5 w-5 accent-[#0f6b47]" type="checkbox" checked={vat} onChange={(e) => setVat(e.target.checked)} />
              {kind === 'sale' ? 'This price includes 7.5% VAT' : 'The supplier charged 7.5% VAT'}
            </label>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="label">Date</span>
              <input className="input-emboss" type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="grid gap-2">
              <span className="label">Note</span>
              <input className="input-emboss" placeholder="e.g. 2 bags of rice" value={memo} maxLength={140} onChange={(e) => setMemo(e.target.value)} />
            </label>
          </div>

          {draft && !invalid && <Preview draft={draft} profit={kind === 'sale' && costK ? A.saleProfit({ date, amount: amount!, via, chargeVat: vat, costOfGoods: costK }) : null} />}
          {invalid && raw && <p className="text-sm text-crimson">{invalid}</p>}
          {error && <p className="text-sm text-crimson">{error}</p>}
        </div>
        </div>

        <div className="shrink-0 border-t border-brass/25 bg-page px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
          <button className="btn-cta w-full py-4 text-lg" onClick={save} disabled={!draft || Boolean(invalid) || saving}>
            {saving ? 'Saving…' : amount ? `Save ${naira(amount)}` : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Preview({ draft, profit }: { draft: EntryDraft; profit: Kobo | null }) {
  return (
    <details className="border-t border-dashed border-brass/40 pt-3">
      <summary className="cursor-pointer text-sm font-medium text-on-page-mute">
        What goes in the book{profit !== null ? ` · profit on this sale ${naira(profit)}` : ''}
      </summary>
      <table className="passbook mt-2">
        <thead>
          <tr>
            <th>Account</th>
            <th className="text-right">Debit</th>
            <th className="text-right">Credit</th>
          </tr>
        </thead>
        <tbody>
          {draft.lines.map((l, i) => (
            <tr key={i}>
              <td>{account(l.account).name}</td>
              <td className="num text-right">{l.debit ? nairaExact(l.debit) : ''}</td>
              <td className="num text-right">{l.credit ? nairaExact(l.credit) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}
