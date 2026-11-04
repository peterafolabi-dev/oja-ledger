import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { history, isoDate } from './arbitraries'
import { type Entry, type EntryDraft, LedgerError, cr, dr, reversalOf, seal, verifyChain } from './ledger'
import { balanceSheet, netMovements, trialBalance } from './reports'
import { kobo } from './money'

async function post(drafts: EntryDraft[]): Promise<Entry[]> {
  const journal: Entry[] = []
  for (const d of drafts) journal.push(await seal(journal, d))
  return journal
}

const RUNS = { numRuns: 200 }

describe('ledger invariants (property-based)', () => {
  it('the trial balance always balances, whatever happens', async () => {
    await fc.assert(
      fc.asyncProperty(history, async (drafts) => {
        const tb = trialBalance(await post(drafts))
        expect(tb.balanced).toBe(true)
      }),
      RUNS,
    )
  })

  it('assets always equal liabilities plus equity, on every date', async () => {
    await fc.assert(
      fc.asyncProperty(history, isoDate, async (drafts, asOf) => {
        const journal = await post(drafts)
        expect(balanceSheet(journal).balanced).toBe(true)
        expect(balanceSheet(journal, asOf).balanced).toBe(true)
      }),
      RUNS,
    )
  })

  it('reversing an entry puts every account back exactly where it was', async () => {
    await fc.assert(
      fc.asyncProperty(history, fc.nat(), async (drafts, pick) => {
        const journal = await post(drafts)
        const before = netMovements(journal)
        const target = journal[pick % journal.length]!
        journal.push(await seal(journal, reversalOf(target, target.date)))
        const after = netMovements(journal)
        for (const [code, n] of after) expect(n - (before.get(code) ?? 0) + 0).toBe(0 - (netMovements([target]).get(code) ?? 0))
        const withoutTarget = netMovements(journal.filter((e) => e.id !== target.id && e.reverses !== target.id))
        for (const [code, n] of after) expect(n).toBe(withoutTarget.get(code) ?? 0)
      }),
      RUNS,
    )
  })

  it('any change to any past entry is detected by the hash chain', async () => {
    const tamper = fc.constantFrom('amount', 'account', 'date', 'memo', 'drop', 'swap')
    await fc.assert(
      fc.asyncProperty(history, fc.nat(), tamper, async (drafts, pick, how) => {
        const journal = await post(drafts)
        expect((await verifyChain(journal)).ok).toBe(true)
        const i = pick % journal.length
        const forged = structuredClone(journal)
        const e = forged[i]!
        switch (how) {
          case 'amount': {
            // move the same amount on both sides so the entry still balances: only the hash can catch it
            const l0 = e.lines[0]!
            const l1 = e.lines.find((l) => (l.debit > 0) !== (l0.debit > 0))!
            if (l0.debit > 0) { l0.debit = kobo(l0.debit + 100); l1.credit = kobo(l1.credit + 100) }
            else { l0.credit = kobo(l0.credit + 100); l1.debit = kobo(l1.debit + 100) }
            break
          }
          case 'account': e.lines[0]!.account = e.lines[0]!.account === '1000' ? '1010' : '1000'; break
          case 'date': e.date = e.date === '2026-01-01' ? '2026-01-02' : '2026-01-01'; break
          case 'memo': e.memo += ' (edited)'; break
          case 'drop': forged.splice(i, 1); break
          case 'swap': if (forged.length < 2) return; [forged[0], forged[forged.length - 1]] = [forged[forged.length - 1]!, forged[0]!]; break
        }
        if (how === 'drop' && i === forged.length) {
          // dropping the newest entry leaves a valid shorter chain; that case is caught by the stored count instead
          expect((await verifyChain(forged)).ok).toBe(true)
          return
        }
        expect((await verifyChain(forged)).ok).toBe(false)
      }),
      RUNS,
    )
  })
})

describe('ledger rules', () => {
  const d = '2026-03-14'

  it('rejects an unbalanced entry', async () => {
    await expect(seal([], { date: d, memo: '', kind: 'sale', lines: [dr('1000', kobo(500)), cr('4000', kobo(400))] })).rejects.toThrow(LedgerError)
  })

  it('rejects a line that is both debit and credit, or neither', async () => {
    const both = { account: '1000' as const, debit: kobo(1), credit: kobo(1) }
    await expect(seal([], { date: d, memo: '', kind: 'sale', lines: [both, cr('4000', kobo(0))] })).rejects.toThrow(LedgerError)
  })

  it('rejects fractions of a kobo, negative amounts and bad dates', async () => {
    const lines = (n: number) => [{ account: '1000' as const, debit: n as never, credit: kobo(0) }, { account: '4000' as const, debit: kobo(0), credit: n as never }]
    await expect(seal([], { date: d, memo: '', kind: 'sale', lines: lines(1.5) })).rejects.toThrow(LedgerError)
    await expect(seal([], { date: d, memo: '', kind: 'sale', lines: lines(-5) })).rejects.toThrow(LedgerError)
    await expect(seal([], { date: '2026-02-30x', memo: '', kind: 'sale', lines: lines(5) })).rejects.toThrow(LedgerError)
  })

  it('will not reverse the same entry twice, or reverse a reversal', async () => {
    const j = await post([{ date: d, memo: 'x', kind: 'owner-in', lines: [dr('1000', kobo(100)), cr('3000', kobo(100))] }])
    j.push(await seal(j, reversalOf(j[0]!, d)))
    await expect(seal(j, reversalOf(j[0]!, d))).rejects.toThrow(/already reversed/)
    await expect(seal(j, reversalOf(j[1]!, d))).rejects.toThrow(/cannot itself be reversed/)
  })

  it('links each entry to the one before it', async () => {
    const j = await post([
      { date: d, memo: 'a', kind: 'owner-in', lines: [dr('1000', kobo(100)), cr('3000', kobo(100))] },
      { date: d, memo: 'b', kind: 'deposit', lines: [dr('1010', kobo(50)), cr('1000', kobo(50))] },
    ])
    expect(j[1]!.prevHash).toBe(j[0]!.hash)
    expect(j.map((e) => e.seq)).toEqual([1, 2])
  })
})
