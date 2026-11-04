import { useCallback, useEffect, useState } from 'react'
import { type ChainCheck, type Entry, type EntryDraft, reversalOf, seal, verifyChain } from '../core/ledger'
import { type PinRecord, checkPin, makePin } from '../core/pin'
import { sampleShop } from '../core/sample'
import * as db from './db'

export interface BookState {
  ready: boolean
  entries: Entry[]
  meta: db.Meta | undefined
  check: ChainCheck | null
  error: string | null
}

export function todayIso(): string {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

async function fullCheck(entries: Entry[], meta: db.Meta | undefined): Promise<ChainCheck> {
  const c = await verifyChain(entries)
  if (!c.ok || !meta) return c
  const head = entries.at(-1)?.hash ?? '0'.repeat(64)
  if (meta.count !== entries.length || meta.headHash !== head) {
    return { ok: false, checked: entries.length, brokenAt: entries.length, reason: 'The newest entries are missing' }
  }
  return c
}

export function useBook() {
  const [s, set] = useState<BookState>({ ready: false, entries: [], meta: undefined, check: null, error: null })

  useEffect(() => {
    let live = true
    db.loadAll()
      .then(async ({ entries, meta }) => {
        const check = await fullCheck(entries, meta)
        if (live) set({ ready: true, entries, meta, check, error: null })
      })
      .catch((e: Error) => live && set((p) => ({ ...p, ready: true, error: `Could not open the book on this device: ${e.message}` })))
    return () => {
      live = false
    }
  }, [])

  /** Seals drafts onto the chain and saves them atomically. Returns the new entries. */
  const post = useCallback(
    async (drafts: EntryDraft[], businessName?: string): Promise<Entry[]> => {
      const journal = [...s.entries]
      const added: Entry[] = []
      for (const d of drafts) {
        const e = await seal(journal, d)
        journal.push(e)
        added.push(e)
      }
      const meta: db.Meta = {
        ...s.meta,
        businessName: businessName ?? s.meta?.businessName ?? 'My shop',
        headHash: journal.at(-1)?.hash ?? '0'.repeat(64),
        count: journal.length,
      }
      await db.append(added, meta)
      set((p) => ({ ...p, entries: journal, meta, check: { ok: true, checked: journal.length } }))
      return added
    },
    [s.entries, s.meta],
  )

  const start = useCallback(async (businessName: string, withSample: boolean, pinCode?: string) => {
    await db.wipe()
    const pin: PinRecord | undefined = pinCode ? await makePin(pinCode) : undefined
    const meta: db.Meta = { businessName, headHash: '0'.repeat(64), count: 0, ...(pin ? { pin } : {}) }
    await db.saveMeta(meta)
    set({ ready: true, entries: [], meta, check: { ok: true, checked: 0 }, error: null })
    if (withSample) {
      const journal: Entry[] = []
      for (const d of sampleShop(todayIso())) journal.push(await seal(journal, d))
      const m: db.Meta = { ...meta, headHash: journal.at(-1)!.hash, count: journal.length }
      await db.append(journal, m)
      set({ ready: true, entries: journal, meta: m, check: { ok: true, checked: journal.length }, error: null })
    }
  }, [])

  const reverse = useCallback(
    async (entry: Entry, reason: string) => post([reversalOf(entry, todayIso(), reason)]),
    [post],
  )

  const recheck = useCallback(async () => {
    const check = await fullCheck(s.entries, s.meta)
    set((p) => ({ ...p, check }))
    return check
  }, [s.entries, s.meta])

  const reset = useCallback(async () => {
    await db.wipe()
    set({ ready: true, entries: [], meta: undefined, check: null, error: null })
  }, [])

  /** Sets, changes or (with null) removes the PIN. */
  const setPin = useCallback(
    async (pinCode: string | null) => {
      if (!s.meta) return
      const { pin: _old, ...rest } = s.meta
      void _old
      const meta: db.Meta = pinCode ? { ...rest, pin: await makePin(pinCode) } : rest
      await db.saveMeta(meta)
      set((p) => ({ ...p, meta }))
    },
    [s.meta],
  )

  const unlock = useCallback(async (pinCode: string) => (s.meta?.pin ? checkPin(pinCode, s.meta.pin) : true), [s.meta])

  return { ...s, post, start, reverse, recheck, reset, setPin, unlock }
}

export type Book = ReturnType<typeof useBook>
