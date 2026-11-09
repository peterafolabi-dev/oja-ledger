import { useCallback, useEffect, useRef, useState } from 'react'
import type { EntryDraft } from '../core/ledger'
import { type Book, useBook } from '../store/useBook'
import { entryAmount, naira } from './format'
import { IconBolt, IconBook, IconChevron, IconGear, IconLock, IconReports, IconSeal, IconToday } from './icons'
import { LockScreen } from './LockScreen'
import { PIN_RE } from '../core/pin'
import { BookPage, ReportsPage, SealCard, TodayPage } from './pages'
import { QuickSale } from './QuickSale'
import { RecordSheet } from './RecordSheet'
import { type Theme, getTheme, setTheme } from './theme'
import { Welcome } from './Welcome'

type Page = 'today' | 'book' | 'reports' | 'settings'

const NAV: { id: Page; label: string; icon: typeof IconToday }[] = [
  { id: 'today', label: 'Today', icon: IconToday },
  { id: 'book', label: 'Journal', icon: IconBook },
  { id: 'reports', label: 'Tax & VAT', icon: IconReports },
  { id: 'settings', label: 'Seal', icon: IconSeal },
]

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const u = () => setOnline(navigator.onLine)
    window.addEventListener('online', u)
    window.addEventListener('offline', u)
    return () => {
      window.removeEventListener('online', u)
      window.removeEventListener('offline', u)
    }
  }, [])
  return online
}

const SESSION_KEY = 'oja-unlocked'
const AUTO_LOCK_MS = 5 * 60_000 // lock again after 5 minutes away from the app

function sessionUnlocked(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}
function rememberUnlocked(on: boolean) {
  try {
    if (on) sessionStorage.setItem(SESSION_KEY, '1')
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* storage blocked: the lock just won't survive a reload */
  }
}

export default function App() {
  const book = useBook()
  const online = useOnline()
  const [unlocked, setUnlocked] = useState(sessionUnlocked)
  const [notice, setNotice] = useState('')
  const [page, setPage] = useState<Page>('today')
  const [sheet, setSheet] = useState<'quick' | 'full' | null>(null)
  const [stamp, setStamp] = useState<{ seq: number; amount: string; hash: string } | null>(null)

  const save = useCallback(
    async (d: EntryDraft) => {
      const [e] = await book.post([d])
      setSheet(null)
      if (e) {
        setStamp({ seq: e.seq, amount: naira(entryAmount(e)), hash: e.hash.slice(0, 8) })
        setTimeout(() => setStamp(null), 1500)
      }
    },
    [book],
  )

  const hasPin = Boolean(book.meta?.pin)
  const lock = useCallback(() => {
    rememberUnlocked(false)
    setUnlocked(false)
    setSheet(null)
  }, [])

  // auto-lock: if the app was in the background for a while, ask for the PIN again
  useEffect(() => {
    if (!hasPin) return
    let hiddenAt = 0
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now()
      else if (hiddenAt && Date.now() - hiddenAt > AUTO_LOCK_MS) lock()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [hasPin, lock])

  if (!book.ready) return null
  if (book.error)
    return (
      <main className="grid min-h-full place-items-center p-6">
        <p className="page-card p-6 text-crimson">{book.error}</p>
      </main>
    )
  if (!book.meta)
    return (
      <Welcome
        onStart={async (name, sample, pin) => {
          await book.start(name, sample, pin)
          rememberUnlocked(true)
          setUnlocked(true)
          setPage('today')
        }}
      />
    )
  if (hasPin && !unlocked)
    return (
      <LockScreen
        businessName={book.meta.businessName}
        onUnlock={async (pin) => {
          const ok = await book.unlock(pin)
          if (ok) {
            rememberUnlocked(true)
            setUnlocked(true)
          }
          return ok
        }}
        onForgot={() => {
          if (window.confirm('The PIN cannot be recovered: it is never stored, only a scrambled check of it.\n\nErase this book on this device and start again? Everything recorded on this device will be lost.')) void book.reset()
        }}
      />
    )

  const go = (p: Page) => {
    setPage(p)
    window.scrollTo(0, 0)
  }

  return (
    <div className="min-h-full pb-28 md:pb-12">
      <header className="no-print sticky top-0 z-30 border-b border-brass/20 bg-shell/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <span className="brass-text hidden font-serif text-2xl sm:inline">Oja</span>
          <span className="hidden h-6 w-px bg-brass/30 sm:block" />
          <ShopSwitcher book={book} />
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map(({ id, label }) => (
              <button
                key={id}
                aria-current={page === id ? 'page' : undefined}
                onClick={() => go(id)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${page === id ? 'bg-brass/15 text-on-shell ring-1 ring-brass/40' : 'text-on-shell-mute hover:text-on-shell'}`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="pill-status hidden sm:inline-flex" title={online ? 'Online. Your book is saved on this device either way.' : 'Offline. Still saving on this device.'}>
              <span className={`pill-dot ${online ? '' : '!bg-amber !shadow-none'}`} />
              {online ? 'Online · saved on device' : 'Offline · still saving'}
            </span>
            <span className={`pill-dot sm:hidden ${online ? '' : '!bg-amber !shadow-none'}`} aria-label={online ? 'Online' : 'Offline'} />
            <button
              onClick={() => go('settings')}
              className="grid h-10 w-10 place-items-center rounded-full border border-brass/30 text-on-shell-mute transition hover:border-brass hover:text-on-shell"
              aria-label="Settings and seal"
            >
              <IconGear className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                if (hasPin) lock()
                else {
                  setNotice('Set a PIN first. Then “Lock” logs you out and the PIN logs you back in.')
                  go('settings')
                }
              }}
              className="flex h-10 items-center gap-2 rounded-full border border-brass/50 bg-brass/10 px-3.5 text-sm font-semibold text-on-shell transition hover:bg-brass/20 active:scale-95"
              aria-label={hasPin ? 'Lock the book (log out)' : 'Set a PIN to lock the book'}
            >
              <IconLock className="h-4 w-4 text-brass" />
              <span className="hidden sm:inline">{hasPin ? 'Lock' : 'Set PIN'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
        {page === 'today' && <TodayPage book={book} onQuickSale={() => setSheet('quick')} onOpenBook={() => go('book')} />}
        {page === 'book' && <BookPage book={book} />}
        {page === 'reports' && <ReportsPage book={book} />}
        {page === 'settings' && <SettingsPage book={book} notice={notice} onDone={() => setNotice('')} />}
      </main>

      {/* floating quick-sale bar */}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 md:bottom-6 md:justify-end md:px-8">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-brass/50 bg-teal/95 p-1.5 shadow-cta backdrop-blur">
          <button className="btn-cta rounded-full px-6 py-3" onClick={() => setSheet('quick')}>
            <IconBolt className="h-5 w-5" /> Quick sale
          </button>
          <button className="rounded-full px-4 py-3 text-sm font-semibold text-cream/80 transition hover:text-cream active:scale-95" onClick={() => setSheet('full')}>
            More
          </button>
        </div>
      </div>

      {/* mobile tabs */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-brass/25 bg-shell/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Main">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-current={page === id ? 'page' : undefined}
            onClick={() => go(id)}
            className={`grid justify-items-center gap-1 py-2.5 text-[11px] font-semibold transition active:scale-95 ${page === id ? 'text-brass' : 'text-on-shell-mute'}`}
          >
            <Icon className="h-6 w-6" />
            {label}
          </button>
        ))}
      </nav>

      {sheet === 'quick' && <QuickSale onClose={() => setSheet(null)} onSave={save} onMore={() => setSheet('full')} />}
      {sheet === 'full' && <RecordSheet onClose={() => setSheet(null)} onSave={save} />}

      {stamp && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center" role="status">
          <div className="grid h-[220px] w-[220px] animate-stamp place-items-center rounded-full border-[5px] border-double border-brass bg-teal/95 text-center text-cream shadow-brass">
            <div>
              <span className="block text-xs tracking-wide text-brass">Entry #{stamp.seq}</span>
              <b className="num mt-1 block text-3xl font-medium">{stamp.amount}</b>
              <span className="num mt-1 block text-xs text-cream/70">sealed · {stamp.hash}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ShopSwitcher({ book }: { book: Book }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const startOver = async (sample: boolean) => {
    if (!window.confirm(sample ? 'Replace this book with the sample shop? Entries on this device will be erased.' : 'Start a new, empty book? Entries on this device will be erased.')) return
    setOpen(false)
    if (sample) await book.start("Mama Ada's Provisions", true)
    else await book.reset()
    rememberUnlocked(false)
  }

  return (
    <div className="relative min-w-0" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-brass/10">
        <span className="truncate font-serif text-[22px] leading-none text-on-shell sm:text-2xl">{book.meta?.businessName}</span>
        <IconChevron className="h-4 w-4 shrink-0 text-brass-soft" />
      </button>
      {open && (
        <div role="menu" className="page-card absolute left-0 top-full z-40 mt-2 w-72 animate-rise p-2">
          <div className="px-3 py-2 text-xs text-on-page-mute">This device’s book</div>
          <div className="flex items-center justify-between rounded-lg bg-page-2 px-3 py-2.5">
            <span className="truncate font-medium">{book.meta?.businessName}</span>
            <span className="badge-green">Open</span>
          </div>
          <div className="brass-rule my-2" />
          <button role="menuitem" className="btn-quiet w-full justify-start" onClick={() => startOver(false)}>
            Start a new book
          </button>
          <button role="menuitem" className="btn-quiet w-full justify-start" onClick={() => startOver(true)}>
            Switch to the sample shop
          </button>
        </div>
      )}
    </div>
  )
}

function PinCard({ book, notice, onDone }: { book: Book; notice: string; onDone: () => void }) {
  const has = Boolean(book.meta?.pin)
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!PIN_RE.test(a)) return setMsg({ ok: false, text: 'Use 4 to 6 digits.' })
    if (a !== b) return setMsg({ ok: false, text: 'The two PINs don’t match.' })
    setBusy(true)
    await book.setPin(a)
    rememberUnlocked(true)
    setBusy(false)
    setA('')
    setB('')
    onDone()
    setMsg({ ok: true, text: has ? 'PIN changed.' : 'PIN set. Use “Lock” in the top bar to log out.' })
  }

  return (
    <section className="page-card p-6" id="pin">
      <h2 className="font-serif text-2xl">Log in with a PIN</h2>
      <p className="mt-1 text-sm text-on-page-mute">
        {has ? 'Your book asks for a PIN when you open it. “Lock” in the top bar logs you out, and it locks itself after 5 minutes away.' : 'Add a 4 to 6 digit PIN so only you can open this book. “Lock” in the top bar then logs you out.'}
      </p>
      {notice && <p className="mt-3 rounded-xl bg-amber/10 px-3 py-2 text-sm text-amber ring-1 ring-amber/30">{notice}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="label">{has ? 'New PIN' : 'PIN'}</span>
          <input className="input-emboss num tracking-[.4em]" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, ''))} />
        </label>
        <label className="grid gap-2">
          <span className="label">Type it again</span>
          <input className="input-emboss num tracking-[.4em]" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={b} onChange={(e) => setB(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && save()} />
        </label>
      </div>
      {msg && <p className={`mt-3 text-sm ${msg.ok ? 'text-emerald' : 'text-crimson'}`}>{msg.text}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-cta" onClick={save} disabled={busy || !a}>
          {has ? 'Change PIN' : 'Set PIN'}
        </button>
        {has && (
          <button
            className="btn-danger"
            onClick={async () => {
              if (!window.confirm('Remove the PIN? Anyone with this phone will be able to open the book.')) return
              await book.setPin(null)
              setMsg({ ok: true, text: 'PIN removed.' })
            }}
          >
            Remove PIN
          </button>
        )}
      </div>
      <p className="mt-3 text-xs text-on-page-mute">The PIN is never stored, only a salted PBKDF2 hash of it. It keeps others out of the app; the data itself stays on this device.</p>
    </section>
  )
}

function SettingsPage({ book, notice, onDone }: { book: Book; notice: string; onDone: () => void }) {
  const [theme, setT] = useState<Theme>(getTheme())
  const choose = (t: Theme) => {
    setTheme(t)
    setT(t)
  }
  return (
    <>
      <header className="mb-6">
        <h1 className="font-serif text-[40px] leading-none text-on-shell sm:text-5xl">The seal</h1>
        <p className="mt-2 text-on-shell-mute">How Oja Ledger proves your books haven’t been touched, and your settings.</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid content-start gap-4">
          <SealCard book={book} />
          <section className="page-card p-6">
            <h2 className="font-serif text-2xl">How it works</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-on-page-mute">
              <li>Every entry must balance: what goes out of one account goes into another, to the kobo.</li>
              <li>When an entry is saved it gets a SHA-256 fingerprint made from its contents and the fingerprint of the entry before it.</li>
              <li>Change one naira in an old entry and its fingerprint changes, which breaks every entry after it. The check above re-computes them all.</li>
              <li>Entries are never edited or deleted. A mistake gets a reversal entry, so the history stays honest.</li>
            </ol>
          </section>
        </div>
        <div className="grid content-start gap-4">
          <PinCard book={book} notice={notice} onDone={onDone} />
          <section className="page-card p-6">
            <h2 className="font-serif text-2xl">Appearance</h2>
            <p className="mt-1 text-sm text-on-page-mute">Leather is the classic look. Parchment is easier in bright sunlight.</p>
            <div className="seg mt-4" role="group" aria-label="Theme">
              <button aria-pressed={theme === 'dark'} onClick={() => choose('dark')}>
                Leather (dark)
              </button>
              <button aria-pressed={theme === 'light'} onClick={() => choose('light')}>
                Parchment (light)
              </button>
            </div>
          </section>
          <section className="page-card p-6">
            <h2 className="font-serif text-2xl">Your book on this device</h2>
            <p className="mt-1 text-sm text-on-page-mute">
              {book.storage === 'persisted'
                ? 'Protected: this browser has agreed not to clear your book to free up space.'
                : book.storage === 'not-persisted'
                  ? 'Not protected: this browser may clear your book if the phone runs low on space or the app goes unused for weeks.'
                  : 'This browser cannot guarantee the book stays on the device.'}{' '}
              Either way, export a CSV from the journal now and then as a backup.
            </p>
          </section>
          <section className="page-card p-6">
            <h2 className="font-serif text-2xl">Start over</h2>
            <p className="mt-1 text-sm text-on-page-mute">Erase this device’s book and go back to the welcome screen. Export a CSV from the journal first if you need it.</p>
            <button className="btn-danger mt-4" onClick={() => window.confirm('Erase every entry on this device? This cannot be undone.') && book.reset()}>
              Erase this book
            </button>
          </section>
        </div>
      </div>
    </>
  )
}
