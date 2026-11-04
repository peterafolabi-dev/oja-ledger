// Inline line-art, so the app needs nothing from the network.
import type { SVGProps } from 'react'

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
type I = SVGProps<SVGSVGElement>

export const IconToday = (p: I) => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true" {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
)
export const IconBook = (p: I) => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true" {...p}><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v16H5.5A1.5 1.5 0 0 0 4 20.5zM4 20.5A1.5 1.5 0 0 0 5.5 22H20M8 7h8M8 11h8M8 15h5" /></svg>
)
export const IconReports = (p: I) => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true" {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
)
export const IconSeal = (p: I) => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true" {...p}><path d="M12 3l2.4 1.8 3-.1.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.1L12 21l-2.4-1.8-3 .1-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .1z" /><path d="M8.5 12l2.4 2.4 4.6-4.8" /></svg>
)
export const IconPlus = (p: I) => (
  <svg viewBox="0 0 24 24" {...P} strokeWidth={2.2} aria-hidden="true" {...p}><path d="M12 5v14M5 12h14" /></svg>
)
export const IconX = (p: I) => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true" {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
)
export const IconWarn = (p: I) => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true" {...p}><path d="M12 3l10 18H2zM12 10v5M12 18v.5" /></svg>
)
export const IconCheck = (p: I) => (
  <svg viewBox="0 0 24 24" {...P} strokeWidth={2.4} aria-hidden="true" {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)
export const IconLock = (p: I) => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true" {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2" /></svg>
)
export const IconGear = (p: I) => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true" {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
)
export const IconChevron = (p: I) => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true" {...p}><path d="M6 9l6 6 6-6" /></svg>
)
export const IconBack = (p: I) => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true" {...p}><path d="M14 7l-5 5 5 5M20 12H9" /></svg>
)
export const IconBolt = (p: I) => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true" {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>
)

/* ---------- feature badges: hand-drawn feel, brass line on parchment ---------- */
const B = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const BadgeAbacus = () => (
  <svg viewBox="0 0 64 64" {...B} aria-hidden="true" className="h-14 w-14">
    <rect x="8" y="10" width="48" height="44" rx="4" />
    <path d="M8 22h48M8 34h48M8 46h48" strokeOpacity=".55" />
    {[[16, 22], [22, 22], [38, 22], [44, 34], [50, 34], [16, 34], [28, 46], [34, 46], [40, 46], [46, 46]].map(([x, y], i) => (
      <ellipse key={i} cx={x} cy={y} rx="3.4" ry="4.2" fill="currentColor" fillOpacity={i % 3 === 0 ? 0.35 : 0.12} />
    ))}
    <path d="M14 54v4M50 54v4" />
  </svg>
)

export const BadgeScales = () => (
  <svg viewBox="0 0 64 64" {...B} aria-hidden="true" className="h-14 w-14">
    <path d="M32 8v44M20 56h24M32 14l-18 4 18-4 18 4" />
    <circle cx="32" cy="10" r="2.2" fill="currentColor" fillOpacity=".4" />
    <path d="M14 18L7 34h14zM50 18l-7 16h14z" />
    <path d="M7 34a7 4 0 0 0 14 0M43 34a7 4 0 0 0 14 0" fill="currentColor" fillOpacity=".14" />
    <text x="14" y="31" fontSize="6" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="JetBrains Mono, monospace">Dr</text>
    <text x="50" y="31" fontSize="6" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="JetBrains Mono, monospace">Cr</text>
  </svg>
)

export const BadgeFingerprint = () => (
  <svg viewBox="0 0 64 64" {...B} aria-hidden="true" className="h-14 w-14">
    <rect x="14" y="28" width="36" height="28" rx="5" />
    <path d="M21 28v-7a11 11 0 0 1 22 0v7" />
    <path d="M32 36c-4 0-6 3-6 6M32 40c-1.6 0-2.4 1.4-2.4 3v5M38 42c0-3.4-2.6-6-6-6M34.6 43v6M24 46c0-5 3.6-9 8-9s8 4 8 9" strokeOpacity=".8" />
  </svg>
)

export const BadgeTaxSeal = () => (
  <svg viewBox="0 0 64 64" {...B} aria-hidden="true" className="h-14 w-14">
    <path d="M14 6h26l10 10v40H14z" />
    <path d="M40 6v10h10M20 22h16M20 28h22M20 34h12" strokeOpacity=".6" />
    <circle cx="40" cy="46" r="9" fill="currentColor" fillOpacity=".14" />
    <circle cx="40" cy="46" r="6" />
    <text x="40" y="48.4" fontSize="6.5" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="JetBrains Mono, monospace">7.5</text>
    <path d="M35 54l-2 6 4-2 3 3 1-6M45 54l2 6-4-2" strokeOpacity=".7" />
  </svg>
)

/** Engraved banknote-style rosette, drawn as many rotated ellipses. */
export function Guilloche({ className = '' }: { className?: string }) {
  const rings = Array.from({ length: 36 }, (_, i) => i * 5)
  return (
    <svg viewBox="-200 -200 400 400" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth=".6">
        {rings.map((r) => (
          <ellipse key={`a${r}`} rx="190" ry="62" transform={`rotate(${r})`} />
        ))}
        {rings.map((r) => (
          <ellipse key={`b${r}`} rx="120" ry="38" transform={`rotate(${r + 2.5})`} strokeOpacity=".7" />
        ))}
        <circle r="196" strokeOpacity=".6" />
        <circle r="186" strokeOpacity=".4" />
      </g>
    </svg>
  )
}
