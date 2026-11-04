import { useState } from 'react'

export function Welcome({ onStart }: { onStart: (name: string, sample: boolean) => Promise<void> }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState<'empty' | 'sample' | null>(null)

  async function go(sample: boolean) {
    setBusy(sample ? 'sample' : 'empty')
    await onStart(name.trim() || (sample ? "Mama Ada's Provisions" : 'My shop'), sample)
  }

  return (
    <main className="welcome">
      <div className="sheet welcome-card">
        <section className="welcome-left">
          <span className="offline-pill">
            <span className={`dot ${navigator.onLine ? '' : 'off'}`} />
            {navigator.onLine ? 'Works offline once opened' : 'You are offline. That is fine.'}
          </span>
          <h1>Oja Ledger</h1>
          <p>
            Proper books for your shop, kept on your phone. Record a sale in two taps, and see your profit, VAT and tax
            position whenever you need them.
          </p>
          <label className="field">
            <span>Business name</span>
            <input className="input" placeholder="e.g. Mama Ada's Provisions" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </label>
          <div className="actions">
            <button className="btn btn-primary" onClick={() => go(false)} disabled={busy !== null}>
              {busy === 'empty' ? 'Opening…' : 'Start my book'}
            </button>
            <button className="btn" onClick={() => go(true)} disabled={busy !== null}>
              {busy === 'sample' ? 'Filling in a month…' : 'Explore a sample shop'}
            </button>
          </div>
        </section>
        <aside className="welcome-right" aria-label="What you get">
          <ul className="promise">
            <li><b>No internet needed</b><span>Everything is saved on this device. Install it from your browser menu like an app.</span></li>
            <li><b>Books that cannot go wrong</b><span>Every entry is double-entry. Debits always equal credits, checked by over 800 random test histories.</span></li>
            <li><b>Nothing can be secretly changed</b><span>Each entry is sealed with a SHA-256 fingerprint of the one before it.</span></li>
            <li><b>Ready for the 2026 tax rules</b><span>7.5% VAT returns and the 0% small-company check, under the Nigeria Tax Act 2025.</span></li>
          </ul>
        </aside>
      </div>
    </main>
  )
}
