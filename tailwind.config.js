/** Oja Ledger design tokens: "Warm Tactile Ledger Luxury".
 *  Colours resolve to CSS variables (see src/styles.css) so the same classes
 *  serve the dark leather shell and the light parchment theme.
 *  @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // shell (the leather binding)
        forest: v('forest'), // #051916
        teal: v('teal'), // #0B2B26
        // pages
        parchment: v('parchment'), // #FAF7F2
        vellum: v('vellum'), // #F3EDE2
        // brass
        brass: v('brass'), // #D4AF37
        'brass-soft': v('brass-soft'), // #C5A059
        // ink
        charcoal: v('charcoal'), // #1A1A1A on pages
        cream: v('cream'), // #F4F1EA on the shell
        // semantic
        emerald: v('emerald'),
        'emerald-glow': v('emerald-glow'),
        amber: v('amber'),
        crimson: v('crimson'),
        // surface aliases that flip between themes
        shell: v('shell'),
        'shell-2': v('shell-2'),
        'on-shell': v('on-shell'),
        'on-shell-mute': v('on-shell-mute'),
        page: v('page'),
        'page-2': v('page-2'),
        'on-page': v('on-page'),
        'on-page-mute': v('on-page-mute'),
        rule: v('rule'),
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans Variable"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { page: '20px', key: '16px' },
      boxShadow: {
        page: '0 1px 0 rgb(255 255 255 / .6) inset, 0 1px 2px rgb(5 25 22 / .18), 0 18px 40px -22px rgb(5 25 22 / .55)',
        lift: '0 1px 0 rgb(255 255 255 / .6) inset, 0 2px 4px rgb(5 25 22 / .2), 0 28px 50px -24px rgb(5 25 22 / .6)',
        emboss: 'inset 0 2px 4px rgb(60 45 20 / .18), inset 0 -1px 0 rgb(255 255 255 / .7)',
        brass: '0 0 0 1px rgb(var(--brass) / .55), 0 0 18px -4px rgb(var(--brass) / .45)',
        cta: 'inset 0 1px 0 rgb(255 255 255 / .25), 0 0 0 1px rgb(var(--brass) / .7), 0 10px 24px -10px rgb(4 60 40 / .9)',
        glow: '0 0 0 3px rgb(var(--emerald-glow) / .18), 0 0 14px rgb(var(--emerald-glow) / .55)',
      },
      backgroundImage: {
        'brass-sheen': 'linear-gradient(100deg, #8a6a1f 0%, #D4AF37 22%, #f5e6a8 40%, #C5A059 58%, #9c7a2b 78%, #e7cf86 100%)',
        'emerald-cta': 'linear-gradient(180deg, #1c8a5f 0%, #0f6b47 55%, #0b5638 100%)',
      },
      keyframes: {
        rise: { from: { transform: 'translateY(28px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
        stamp: {
          '0%': { transform: 'rotate(-9deg) scale(1.9)', opacity: '0' },
          '18%': { transform: 'rotate(-9deg) scale(1)', opacity: '1' },
          '78%': { opacity: '1' },
          '100%': { transform: 'rotate(-9deg) scale(1)', opacity: '0' },
        },
        sheen: { from: { backgroundPosition: '0% 50%' }, to: { backgroundPosition: '200% 50%' } },
      },
      animation: {
        rise: 'rise .28s cubic-bezier(.2,.8,.2,1)',
        fade: 'fade .18s ease-out',
        stamp: 'stamp 1.5s cubic-bezier(.2,1.4,.4,1) forwards',
        sheen: 'sheen 8s linear infinite',
      },
    },
  },
  plugins: [],
}
