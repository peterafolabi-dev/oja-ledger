import { useEffect, useState } from 'react'
import { BadgeAbacus, BadgeFingerprint, BadgeScales, BadgeTaxSeal, Guilloche } from './icons'

const FEATURES = [
  { title: 'No internet needed', body: 'Everything is saved on this device. Install it from your browser menu like an app.', Badge: BadgeAbacus },
  { title: 'Books that cannot go wrong', body: 'Every entry is double-entry. Debits always equal credits, checked by 800 random test histories.', Badge: BadgeScales },
  { title: 'Nothing can be secretly changed', body: 'Each entry is sealed with a SHA-256 fingerprint of the one before it.', Badge: BadgeFingerprint },
  { title: 'Ready for the 2026 tax rules', body: '7.5% VAT returns and the 0% small-company check, under the Nigeria Tax Act 2025.', Badge: BadgeTaxSeal },
]

export function Welcome({ onStart }: { onStart: (name: string, sample: boolean, pin?: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const pinOk = pin === '' || /^\d{4,6}$/.test(pin)
  const [busy, setBusy] = useState<'empty' | 'sample' | null>(null)
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

  async function go(sample: boolean) {
    if (!pinOk) return
    setBusy(sample ? 'sample' : 'empty')
    await onStart(name.trim() || (sample ? "Mama Ada's Provisions" : 'My shop'), sample, pin || undefined)
  }

  return (
    <main className="mx-auto flex min-h-full max-w-6xl flex-col justify-center px-4 py-10 sm:px-8 sm:py-16">
      <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        {/* hero */}
        <section className="animate-rise">
          <span className="pill-status">
            <span className={`pill-dot ${online ? '' : '!bg-amber !shadow-none'}`} />
            {online ? 'Works offline once opened' : 'You are offline. That is fine.'}
          </span>

          <h1 className="brass-text mt-6 animate-sheen pb-2 font-serif text-[64px] leading-[0.95] tracking-tight sm:text-[96px]">
            Oja Ledger
          </h1>

          <div className="leather mt-6 p-6 sm:p-7">
            <Guilloche className="pointer-events-none absolute -right-24 -top-24 h-[340px] w-[340px] text-brass/[0.13]" />
            <p className="relative max-w-[46ch] text-[17px] leading-relaxed text-cream/90">
              Proper books for your shop, kept on your phone. Record a sale in two taps, and see your profit, VAT and tax
              position whenever you need them.
            </p>
            <div className="brass-rule relative my-5" />
            <p className="relative text-sm text-cream/60">
              “Oja” is Yoruba for market. Built for the person at the stall, not the accountant’s office.
            </p>
          </div>
        </section>

        {/* the opening page of the book */}
        <section className="page-card animate-rise p-6 sm:p-8" aria-labelledby="start-h">
          <h2 id="start-h" className="font-serif text-3xl text-on-page">
            Open your book
          </h2>
          <p className="mt-1 text-on-page-mute">It takes ten seconds. No account needed: add a PIN and it becomes your login.</p>

          <label className="mt-6 block">
            <span className="label">Business name</span>
            <input
              className="input-emboss mt-2 text-lg"
              placeholder="e.g. Mama Ada's Provisions"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && go(false)}
              maxLength={60}
            />
          </label>

          <label className="mt-4 block">
            <span className="label">PIN to log in (optional, 4 to 6 digits)</span>
            <input
              className="input-emboss num mt-2 tracking-[.4em]"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              placeholder="••••"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              aria-invalid={!pinOk}
            />
            {!pinOk && <span className="mt-1 block text-sm text-crimson">Use 4 to 6 digits, or leave it empty.</span>}
          </label>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button className="btn-cta flex-1 py-3.5 text-[17px]" onClick={() => go(false)} disabled={busy !== null}>
              {busy === 'empty' ? 'Opening…' : 'Start my book'}
            </button>
            <button className="btn-ghost flex-1 py-3.5 text-on-page" onClick={() => go(true)} disabled={busy !== null}>
              {busy === 'sample' ? 'Filling in a month…' : 'Explore a sample shop'}
            </button>
          </div>
          <p className="mt-4 text-xs text-on-page-mute">Your books stay on this device. Export them for your accountant any time.</p>
        </section>
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4" aria-label="What you get">
        {FEATURES.map(({ title, body, Badge }, i) => (
          <li key={title} className="page-card page-card-hover animate-rise p-5" style={{ animationDelay: `${120 + i * 60}ms`, animationFillMode: 'both' }}>
            <div className="text-brass-soft">
              <Badge />
            </div>
            <h3 className="mt-3 font-serif text-[22px] leading-tight text-on-page">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-on-page-mute">{body}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}
