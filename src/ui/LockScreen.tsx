import { useEffect, useState } from 'react'
import { PIN_RE } from '../core/pin'
import { Guilloche, IconBack, IconLock } from './icons'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'] as const
const MAX_TRIES = 5
const COOLDOWN = 30

/** The "log in" screen: shown when the book has a PIN and this session is locked. */
export function LockScreen({
  businessName,
  onUnlock,
  onForgot,
}: {
  businessName: string
  onUnlock: (pin: string) => Promise<boolean>
  onForgot: () => void
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(false)
  const [tries, setTries] = useState(0)
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  async function submit(p = pin) {
    if (!PIN_RE.test(p) || busy || wait > 0) return
    setBusy(true)
    const ok = await onUnlock(p)
    setBusy(false)
    if (ok) return
    const n = tries + 1
    setTries(n)
    setPin('')
    setShake(true)
    setTimeout(() => setShake(false), 450)
    if (n >= MAX_TRIES) {
      setTries(0)
      setWait(COOLDOWN)
      setError(`Too many wrong PINs. Try again in ${COOLDOWN} seconds.`)
    } else setError(`Wrong PIN. ${MAX_TRIES - n} ${MAX_TRIES - n === 1 ? 'try' : 'tries'} left before a short pause.`)
  }

  function press(k: (typeof KEYS)[number]) {
    if (wait > 0 || busy) return
    if (k === '⌫') return setPin((p) => p.slice(0, -1))
    if (!k) return
    setError('')
    setPin((p) => (p.length >= 6 ? p : p + k))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key as (typeof KEYS)[number])
      else if (e.key === 'Backspace') press('⌫')
      else if (e.key === 'Enter') void submit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <main className="relative grid min-h-full place-items-center overflow-hidden px-4 py-10">
      <Guilloche className="pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 text-brass/[0.07]" />
      <section className="page-card relative w-full max-w-sm animate-rise p-6 text-center sm:p-8" aria-labelledby="lock-h">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal text-brass shadow-brass">
          <IconLock className="h-7 w-7" />
        </div>
        <p className="brass-text mt-4 font-serif text-xl">Oja Ledger</p>
        <h1 id="lock-h" className="mt-1 font-serif text-3xl leading-tight">
          {businessName}
        </h1>
        <p className="mt-1 text-sm text-on-page-mute">Enter your PIN to open the book</p>

        <div className={`mt-6 flex justify-center gap-3 ${shake ? 'animate-[shake_.4s]' : ''}`} aria-live="polite" aria-label={`${pin.length} digits entered`}>
          {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
            <span key={i} className={`h-3.5 w-3.5 rounded-full border-2 transition ${i < pin.length ? 'border-teal bg-teal' : 'border-brass-soft/70'}`} />
          ))}
        </div>
        <p className={`mt-3 min-h-[20px] text-sm ${error ? 'text-crimson' : 'text-on-page-mute'}`}>{wait > 0 ? `Try again in ${wait}s` : error}</p>

        <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Keypad">
          {KEYS.map((k, i) =>
            k ? (
              <button key={i} className="key" onClick={() => press(k)} aria-label={k === '⌫' ? 'Delete last digit' : k} disabled={wait > 0}>
                {k === '⌫' ? <IconBack className="h-6 w-6" /> : k}
              </button>
            ) : (
              <span key={i} />
            ),
          )}
        </div>

        <button className="btn-cta mt-4 w-full py-4 text-lg" onClick={() => submit()} disabled={!PIN_RE.test(pin) || busy || wait > 0}>
          {busy ? 'Checking…' : 'Open my book'}
        </button>
        <button className="btn-quiet mt-2 w-full" onClick={onForgot}>
          Forgot your PIN?
        </button>
      </section>
    </main>
  )
}
