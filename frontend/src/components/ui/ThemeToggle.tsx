import { useState } from 'react'

import { IconButton } from './IconButton'
import { IconTheme } from './icons'
import styles from './ThemeToggle.module.css'

/** Also read by the inline script in index.html that applies the theme before the first paint. */
const THEME_STORAGE_KEY = 'servido-theme'

function effectiveTheme(): 'light' | 'dark' {
  const chosen = document.documentElement.dataset.theme
  if (chosen === 'light' || chosen === 'dark') return chosen
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Switches between light and dark and remembers the choice in this browser. */
export function ThemeToggle() {
  const [turns, setTurns] = useState(0)

  function toggle() {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Storage can be unavailable (private mode); the theme still applies for this visit.
    }
    setTurns((current) => current + 1)
  }

  return (
    <IconButton label="Cambiar entre tema claro y oscuro" onClick={toggle}>
      <IconTheme className={styles.icon} style={{ transform: `rotate(${turns * 180}deg)` }} />
    </IconButton>
  )
}
