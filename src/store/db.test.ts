import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import * as A from '../core/actions'
import { type Entry, seal, verifyChain } from '../core/ledger'
import { kobo } from '../core/money'
import { append, loadAll, wipe } from './db'

const N = (n: number) => kobo(n * 100)

async function chain(n: number): Promise<Entry[]> {
  const j: Entry[] = []
  for (let i = 0; i < n; i++) j.push(await seal(j, A.ownerIn('2026-05-01', N(1000 + i), 'cash')))
  return j
}

describe('offline storage (IndexedDB)', () => {
  beforeEach(wipe)

  it('saves and reloads the book with the chain intact', async () => {
    const j = await chain(5)
    await append(j, { businessName: 'Test', headHash: j.at(-1)!.hash, count: 5 })
    const { entries, meta } = await loadAll()
    expect(entries.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5])
    expect(meta?.headHash).toBe(j.at(-1)!.hash)
    expect((await verifyChain(entries)).ok).toBe(true)
  })

  it('is all-or-nothing: a failed save leaves no half-written entries', async () => {
    const j = await chain(3)
    await append(j.slice(0, 2), { businessName: 'Test', headHash: j[1]!.hash, count: 2 })
    // entry #2 again (duplicate seq) plus #3: the whole transaction must roll back
    await expect(append([j[1]!, j[2]!], { businessName: 'Test', headHash: j[2]!.hash, count: 3 })).rejects.toBeTruthy()
    const { entries, meta } = await loadAll()
    expect(entries).toHaveLength(2)
    expect(meta?.count).toBe(2)
  })
})
