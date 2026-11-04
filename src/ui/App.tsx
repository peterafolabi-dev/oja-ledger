import { useCallback, useEffect, useState } from 'react'
import type { EntryDraft } from '../core/ledger'
import { entryAmount, naira } from './format'
import { useBook } from '../store/useBook'
import { IconBook, IconPlus, IconReports, IconSeal, IconToday } from './icons'
import { BookPage, ReportsPage, SealCard, TodayPage } from './pages'
import { RecordSheet } from './RecordSheet'
import { Welcome } from './Welcome'

type Page = 'today' | 'book' | 'reports' | 'seal'

const NAV: { id: Page; label: string; icon: () => JSX.Element }[] = [
  { id: 'today', label: 'Today', icon: IconToday },
  { id: 'book', label: 'Book', icon: IconBook },
  { id: 'reports', label: 'Reports', icon: IconReports },
  { id: 'seal', label: 'Seal', icon: IconSeal },
]

export default function App() {
  const book = useBook()
  const [page, setPage] = useState<Page>('today')
  const [recording, setRecording] = useState(false)
  const [stamp, setStamp] = useState<{ seq: number; amount: string; hash: string } | null>(null)
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const save = useCallback(
    async (d: EntryDraft) => {
      const [e] = await book.post([d])
      setRecording(false)
      if (e) {
        setStamp({ seq: e.seq, amount: naira(entryAmount(e)), hash: e.hash.slice(0, 8) })
        setTimeout(() => setStamp(null), 1500)
      }
    },
    [book],
  )

  if (!book.ready) return null
  if (book.error) return <main className="welcome"><p className="err">{book.error}</p></main>
  if (!book.meta) return <Welcome onStart={book.start} />

  const go = (p: Page) => {
    setPage(p)
    window.scrollTo(0, 0)
  }

  return (
    <div className="shell">
      <nav className="side" aria-label="Main">
        <div className="brand">
          <div>
            <b>Oja Ledger</b>
            <small>{book.meta.businessName}</small>
          </div>
        </div>
        <button className="record-cta" onClick={() => setRecording(true)}>
          <IconPlus /> Record
        </button>
        {NAV.map(({ id, label, icon: Icon }) => (
          <button key={id} className="nav-btn" aria-current={page === id ? 'page' : undefined} onClick={() => go(id)}>
            <Icon /> {label}
          </button>
        ))}
        <div className="side-foot">
          <span className="offline-pill">
            <span className={`dot ${online ? '' : 'off'}`} /> {online ? 'Online' : 'Offline, still saving'}
          </span>
        </div>
      </nav>

      <main className="main">
        {page === 'today' && <TodayPage book={book} onRecord={() => setRecording(true)} onOpenBook={() => go('book')} />}
        {page === 'book' && <BookPage book={book} />}
        {page === 'reports' && <ReportsPage book={book} />}
        {page === 'seal' && <SealPage book={book} />}
      </main>

      <nav className="tabbar" aria-label="Main">
        {NAV.slice(0, 2).map(({ id, label, icon: Icon }) => (
          <button key={id} className="tab" aria-current={page === id ? 'page' : undefined} onClick={() => go(id)}>
            <Icon />
            {label}
          </button>
        ))}
        <button className="tab tab-record" onClick={() => setRecording(true)} aria-label="Record">
          <span className="plus"><IconPlus /></span>
          Record
        </button>
        {NAV.slice(2).map(({ id, label, icon: Icon }) => (
          <button key={id} className="tab" aria-current={page === id ? 'page' : undefined} onClick={() => go(id)}>
            <Icon />
            {label}
          </button>
        ))}
      </nav>

      {recording && <RecordSheet onClose={() => setRecording(false)} onSave={save} />}
      {stamp && (
        <div className="stamp-wrap" role="status">
          <div className="stamp">
            <div>
              <span>Entry #{stamp.seq}</span>
              <b>{stamp.amount}</b>
              <span>sealed · {stamp.hash}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SealPage({ book }: { book: ReturnType<typeof useBook> }) {
  return (
    <>
      <header className="page-head">
        <div>
          <h1>The seal</h1>
          <p>How Oja Ledger proves your books haven’t been touched.</p>
        </div>
      </header>
      <div className="grid2">
        <div className="stack">
          <SealCard book={book} />
          <section className="sheet pad report">
            <h3>How it works</h3>
            <ol style={{ paddingLeft: 20, lineHeight: 1.6 }}>
              <li>Every entry must balance: what goes out of one account goes into another, to the kobo.</li>
              <li>When an entry is saved it gets a SHA-256 fingerprint made from its contents and the fingerprint of the entry before it.</li>
              <li>Change one naira in an old entry and its fingerprint changes, which breaks every entry after it. The check above re-computes them all.</li>
              <li>Entries are never edited or deleted. A mistake gets a reversal entry, so the history stays honest.</li>
            </ol>
            <p className="note">Write down the fingerprint at month end, or send it to your accountant. If it ever changes for that month, something was altered.</p>
          </section>
        </div>
        <section className="sheet pad report">
          <h3>Start over</h3>
          <p className="sub">Erase this device’s book and go back to the welcome screen. Export a CSV first if you need it.</p>
          <button
            className="btn btn-danger"
            style={{ marginTop: 12 }}
            onClick={() => window.confirm('Erase every entry on this device? This cannot be undone.') && book.reset()}
          >
            Erase this book
          </button>
        </section>
      </div>
    </>
  )
}
