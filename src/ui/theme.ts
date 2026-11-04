// Theme choice: the brand default is the dark leather shell; light is opt-in.
export type Theme = 'dark' | 'light'
const KEY = 'oja-theme'

export function getTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#ece5d6' : '#051916')
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* private mode: the choice just won't be remembered */
  }
}
