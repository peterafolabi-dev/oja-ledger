// Offline storage: the journal lives in IndexedDB on the device, so the app
// works with no network at all. Entries are only ever added, never updated.

import type { Entry } from '../core/ledger'
import type { PinRecord } from '../core/pin'

const DB_NAME = 'oja-ledger'
const DB_VERSION = 1

export interface Meta {
  businessName: string
  /** Hash of the newest entry and the entry count, so deleting the latest entry is also detectable. */
  headHash: string
  count: number
  /** Optional PIN lock (hashed). */
  pin?: PinRecord
}

/** Thrown when another tab saved first. The second tab's save is rolled back whole, so the chain can never fork. */
export class BookChangedError extends Error {
  constructor() {
    super('This book was changed in another tab, so your last entry was not saved. It has been reloaded: please enter it again.')
    this.name = 'BookChangedError'
  }
}

const CHANNEL = 'oja-ledger'
const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL)

/** Tell other open tabs the book changed. */
function notifyChanged(): void {
  channel?.postMessage('changed')
}

/** Run `cb` whenever another tab changes the book. Returns an unsubscribe function. */
export function onChangedElsewhere(cb: () => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {}
  const ch = new BroadcastChannel(CHANNEL)
  ch.onmessage = () => cb()
  return () => ch.close()
}

export type Persistence = 'persisted' | 'not-persisted' | 'unsupported'

/**
 * Browsers may evict IndexedDB under storage pressure (iOS Safari can clear it after a few weeks unused).
 * Ask for persistent storage so the book is not silently deleted, and report what we got.
 */
export async function requestPersistence(): Promise<Persistence> {
  const st = typeof navigator === 'undefined' ? undefined : navigator.storage
  if (!st?.persist || !st.persisted) return 'unsupported'
  if (await st.persisted()) return 'persisted'
  return (await st.persist()) ? 'persisted' : 'not-persisted'
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('entries')) db.createObjectStore('entries', { keyPath: 'seq' })
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = (ev) => reject((ev.target as IDBRequest | null)?.error ?? tx.error ?? new Error('Could not save to this device'))
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'))
  })
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function loadAll(): Promise<{ entries: Entry[]; meta: Meta | undefined }> {
  const db = await open()
  const tx = db.transaction(['entries', 'meta'], 'readonly')
  const entries = await request(tx.objectStore('entries').getAll() as IDBRequest<Entry[]>)
  const meta = await request(tx.objectStore('meta').get('meta') as IDBRequest<Meta | undefined>)
  db.close()
  return { entries: entries.sort((a, b) => a.seq - b.seq), meta }
}

/** Adds entries and moves the head pointer in one transaction: all or nothing. */
export async function append(entries: Entry[], meta: Meta): Promise<void> {
  const db = await open()
  const tx = db.transaction(['entries', 'meta'], 'readwrite')
  const store = tx.objectStore('entries')
  for (const e of entries) store.add(e) // add (not put): fails if that seq already exists
  tx.objectStore('meta').put(meta, 'meta')
  try {
    await done(tx)
  } catch (err) {
    if ((err as { name?: string }).name === 'ConstraintError') throw new BookChangedError()
    throw err
  } finally {
    db.close()
  }
  notifyChanged()
}

export async function saveMeta(meta: Meta): Promise<void> {
  const db = await open()
  const tx = db.transaction('meta', 'readwrite')
  tx.objectStore('meta').put(meta, 'meta')
  await done(tx)
  db.close()
  notifyChanged()
}

export async function wipe(): Promise<void> {
  const db = await open()
  const tx = db.transaction(['entries', 'meta'], 'readwrite')
  tx.objectStore('entries').clear()
  tx.objectStore('meta').clear()
  await done(tx)
  db.close()
  notifyChanged()
}
