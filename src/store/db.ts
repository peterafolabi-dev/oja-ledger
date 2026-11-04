// Offline storage: the journal lives in IndexedDB on the device, so the app
// works with no network at all. Entries are only ever added, never updated.

import type { Entry } from '../core/ledger'

const DB_NAME = 'oja-ledger'
const DB_VERSION = 1

export interface Meta {
  businessName: string
  /** Hash of the newest entry and the entry count, so deleting the latest entry is also detectable. */
  headHash: string
  count: number
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
    tx.onerror = () => reject(tx.error ?? new Error('Could not save to this device'))
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
  await done(tx)
  db.close()
}

export async function saveMeta(meta: Meta): Promise<void> {
  const db = await open()
  const tx = db.transaction('meta', 'readwrite')
  tx.objectStore('meta').put(meta, 'meta')
  await done(tx)
  db.close()
}

export async function wipe(): Promise<void> {
  const db = await open()
  const tx = db.transaction(['entries', 'meta'], 'readwrite')
  tx.objectStore('entries').clear()
  tx.objectStore('meta').clear()
  await done(tx)
  db.close()
}
