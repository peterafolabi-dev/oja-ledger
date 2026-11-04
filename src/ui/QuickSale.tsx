import { useEffect, useState } from 'react'
import * as A from '../core/actions'
import type { EntryDraft } from '../core/ledger'
import { parseNaira } from '../core/money'
import { todayIso } from '../store/useBook'
import { naira } from './format'
import { IconBack, IconX } from './icons'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'] as const

/** The two-tap sale: amount on big keys, how they paid, done. */
export function QuickSale({
  onClose,
  onSave,
  onMore,
}: {
  onClose: () => void
  onSave: (d: EntryDraft) => Promise<void>
  onMore: () => void
}) {
  const [digits, setDigits] = useState('') // whole naira, typed on the keypad
  const [item, setItem] = useState('')
  const [via, setVia] = useState<'cash' | 'bank'>('cash')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const amount = digits ? parseNaira(digits) : null

  function press(k: (typeof KEYS)[number]) {
    if (k === '⌫') return setDigits((d) => d.slice(0, -1))
    setDigits((d) => {
      const next = (d + k).replace(/^0+/, '')
      return next.length > 11 ? d : next
    })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'Escape') onClose()
      else if (/^\d$/.test(e.key)) press(e.key as (typeof KEYS)[number])
      else if (e.key === 'Backspace') press('⌫')
      else if (e.key === 'Enter') void save()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  async function save() {
    if (!amount || saving) return
    setSaving(true)
    setError('')
    try {
      await onSave(A.sale({ date: todayIso(), amount, via, chargeVat: false, memo: item.trim() || 'Sale' }))
    } catch (e) {
      setError(`Not saved: ${(e as Error).message}`)
      setSaving(false)
    }
  }

  const grouped = digits ? Number(digits).toLocaleString('en-NG') : '0'

  return (
    <div className="fixed inset-0 z-40 grid animate-fade place-items-end bg-forest/60 backdrop-blur-sm sm:place-items-center" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="qs-title" className="page-card w-full max-w-md animate-rise rounded-b-none p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-page">
        <div className="flex items-center justify-between">
          <h2 id="qs-title" className="font-serif text-3xl">
            Quick sale
          </h2>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-page-2 text-on-page-mute hover:text-on-page" onClick={onClose} aria-label="Close">
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* the amount, on a ruled strip */}
        <div className="mt-4 rounded-2xl border border-brass/30 bg-page-2 px-4 py-3 shadow-emboss">
          <div className="text-xs font-medium text-on-page-mute">Customer paid</div>
          <output className="num block truncate text-[44px] leading-tight text-on-page" aria-live="polite">
            ₦{grouped}
          </output>
        </div>

        <input
          className="input-emboss mt-3"
          placeholder="What was sold? (optional)"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          maxLength={80}
          aria-label="Item description"
        />

        <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="How they paid">
          {(['cash', 'bank'] as const).map((v) => (
            <button
              key={v}
              aria-pressed={via === v}
              onClick={() => setVia(v)}
              className={`btn py-3 ${via === v ? 'bg-teal text-cream shadow-brass' : 'border border-brass/30 bg-page text-on-page-mute'}`}
            >
              {v === 'cash' ? 'Cash' : 'Transfer / POS'}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Keypad">
          {KEYS.map((k) => (
            <button key={k} className="key" onClick={() => press(k)} aria-label={k === '⌫' ? 'Delete last digit' : k}>
              {k === '⌫' ? <IconBack className="h-6 w-6" /> : k}
            </button>
          ))}
        </div>

        {error && <p className="mt-2 text-sm text-crimson">{error}</p>}

        <button className="btn-cta mt-4 w-full py-4 text-lg" onClick={save} disabled={!amount || saving}>
          {saving ? 'Sealing…' : amount ? `Record ${naira(amount)} sale` : 'Type the amount'}
        </button>
        <button className="btn-quiet mt-1 w-full" onClick={onMore}>
          Expense, stock, VAT or credit sale instead
        </button>
      </div>
    </div>
  )
}

