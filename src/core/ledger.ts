// The journal: an append-only list of balanced entries, chained by SHA-256.
//
// Rules the code enforces (and the property tests in ledger.test.ts check):
//  1. Every entry balances: total debits === total credits > 0.
//  2. Entries are never edited or deleted. A mistake is fixed by posting a
//     reversal, so the history of what happened stays intact.
//  3. Each entry stores the hash of the one before it. Changing any past entry
//     breaks every hash after it, so tampering is detectable.

import { type AccountCode, isAccountCode } from './accounts'
import { type Kobo, kobo, sum } from './money'

export interface Line {
  account: AccountCode
  debit: Kobo
  credit: Kobo
}

export type EntryKind =
  | 'sale'
  | 'expense'
  | 'stock'
  | 'owner-in'
  | 'owner-out'
  | 'customer-paid'
  | 'supplier-paid'
  | 'deposit'
  | 'equipment'
  | 'loan-in'
  | 'reversal'

export interface EntryDraft {
  date: string // YYYY-MM-DD, the day it happened (not the day it was typed)
  memo: string
  kind: EntryKind
  lines: Line[]
  reverses?: string
}

export interface Entry extends EntryDraft {
  id: string
  seq: number
  createdAt: string
  prevHash: string
  hash: string
}

export const GENESIS_HASH = '0'.repeat(64)

export class LedgerError extends Error {}

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

export function validateDraft(d: EntryDraft): void {
  if (!DATE_RE.test(d.date) || Number.isNaN(Date.parse(`${d.date}T00:00:00Z`))) {
    throw new LedgerError(`Invalid date "${d.date}"`)
  }
  if (d.lines.length < 2) throw new LedgerError('An entry needs at least two lines')
  for (const l of d.lines) {
    if (!isAccountCode(l.account)) throw new LedgerError(`Unknown account ${String(l.account)}`)
    if (!Number.isSafeInteger(l.debit) || !Number.isSafeInteger(l.credit)) {
      throw new LedgerError('Amounts must be whole kobo')
    }
    if (l.debit < 0 || l.credit < 0) throw new LedgerError('Amounts cannot be negative')
    if ((l.debit > 0) === (l.credit > 0)) {
      throw new LedgerError('Each line is either a debit or a credit, not both or neither')
    }
  }
  const debits = sum(d.lines.map((l) => l.debit))
  const credits = sum(d.lines.map((l) => l.credit))
  if (debits !== credits) {
    throw new LedgerError(`Entry does not balance: debits ${debits} ≠ credits ${credits}`)
  }
}

/** Builds lines, dropping zero amounts (e.g. a sale with no VAT). */
export function dr(account: AccountCode, amount: Kobo): Line {
  return { account, debit: amount, credit: kobo(0) }
}
export function cr(account: AccountCode, amount: Kobo): Line {
  return { account, debit: kobo(0), credit: amount }
}
export function compact(lines: Line[]): Line[] {
  return lines.filter((l) => l.debit > 0 || l.credit > 0)
}

// ---- hashing -------------------------------------------------------------

/** JSON with sorted keys, so the same entry always hashes the same way. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return `{${Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function hashInput(e: Omit<Entry, 'hash'>): string {
  const { id, seq, createdAt, prevHash, date, memo, kind, lines, reverses } = e
  return canonicalJson({ id, seq, createdAt, prevHash, date, memo, kind, lines, reverses })
}

export async function computeHash(e: Omit<Entry, 'hash'>): Promise<string> {
  return sha256Hex(hashInput(e))
}

// ---- posting -------------------------------------------------------------

export interface PostOptions {
  id?: string
  now?: Date
}

/** Validates a draft and seals it onto the end of the chain. Pure: returns the new entry. */
export async function seal(journal: readonly Entry[], draft: EntryDraft, opts: PostOptions = {}): Promise<Entry> {
  validateDraft(draft)
  if (draft.reverses) {
    const original = journal.find((e) => e.id === draft.reverses)
    if (!original) throw new LedgerError('Cannot reverse an entry that does not exist')
    if (original.kind === 'reversal') throw new LedgerError('A reversal cannot itself be reversed')
    if (journal.some((e) => e.reverses === draft.reverses)) throw new LedgerError('This entry is already reversed')
  }
  const last = journal.at(-1)
  const base: Omit<Entry, 'hash'> = {
    id: opts.id ?? crypto.randomUUID(),
    seq: (last?.seq ?? 0) + 1,
    createdAt: (opts.now ?? new Date()).toISOString(),
    prevHash: last?.hash ?? GENESIS_HASH,
    date: draft.date,
    memo: draft.memo.trim().slice(0, 140),
    kind: draft.kind,
    lines: draft.lines.map((l) => ({ account: l.account, debit: l.debit, credit: l.credit })),
    ...(draft.reverses ? { reverses: draft.reverses } : {}),
  }
  return { ...base, hash: await computeHash(base) }
}

/** The mirror image of an entry: every debit becomes a credit and vice versa. */
export function reversalOf(original: Entry, date: string, reason = ''): EntryDraft {
  return {
    date,
    kind: 'reversal',
    memo: `Reversal of #${original.seq}${reason ? `: ${reason}` : ''}`,
    reverses: original.id,
    lines: original.lines.map((l) => ({ account: l.account, debit: l.credit, credit: l.debit })),
  }
}

export interface ChainCheck {
  ok: boolean
  checked: number
  /** seq of the first entry that fails, if any */
  brokenAt?: number
  reason?: string
}

/** Re-computes every hash and link. Any edit to any past entry shows up here. */
export async function verifyChain(journal: readonly Entry[]): Promise<ChainCheck> {
  let prev = GENESIS_HASH
  for (let i = 0; i < journal.length; i++) {
    const e = journal[i]!
    if (e.seq !== i + 1) return { ok: false, checked: i, brokenAt: e.seq, reason: 'Entry numbers are out of order' }
    if (e.prevHash !== prev) return { ok: false, checked: i, brokenAt: e.seq, reason: 'Link to the previous entry is broken' }
    try {
      validateDraft(e)
    } catch (err) {
      return { ok: false, checked: i, brokenAt: e.seq, reason: (err as Error).message }
    }
    const { hash, ...rest } = e
    if ((await computeHash(rest)) !== hash) {
      return { ok: false, checked: i, brokenAt: e.seq, reason: 'Entry was changed after it was recorded' }
    }
    prev = hash
  }
  return { ok: true, checked: journal.length }
}
