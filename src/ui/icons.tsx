// A handful of stroke icons, inline so the app needs nothing from the network.
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const IconToday = () => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
)
export const IconBook = () => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v16H5.5A1.5 1.5 0 0 0 4 20.5zM4 20.5A1.5 1.5 0 0 0 5.5 22H20M8 7h8M8 11h8M8 15h5" /></svg>
)
export const IconReports = () => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
)
export const IconSeal = () => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M12 3l2.4 1.8 3-.1.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.1L12 21l-2.4-1.8-3 .1-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .1z" /><path d="M8.5 12l2.4 2.4 4.6-4.8" /></svg>
)
export const IconPlus = () => (
  <svg viewBox="0 0 24 24" {...P} strokeWidth={2.2} aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
)
export const IconX = () => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" /></svg>
)
export const IconWarn = () => (
  <svg viewBox="0 0 24 24" {...P} aria-hidden="true" width="26" height="26"><path d="M12 3l10 18H2zM12 10v5M12 18v.5" /></svg>
)
export const IconCheck = () => (
  <svg viewBox="0 0 24 24" {...P} strokeWidth={2.4} aria-hidden="true" width="26" height="26"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)
