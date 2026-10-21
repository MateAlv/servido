import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router'

import { BrandSplash } from './components/brand'
import { SiteFooter, SiteHeader } from './components/layout'
import { ToastProvider } from './components/ui'
import styles from './AppLayout.module.css'

const SPLASH_KEY = 'servido-splash-shown'

function splashAlreadyShown(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_KEY) === '1'
  } catch {
    return true
  }
}

/** A new page starts at the top, or at the section its link points to (/#como). */
function ScrollOnNavigate() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
      return
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])

  return null
}

/** Shell shared by every page: header, footer, toasts, and the brand splash once per session. */
export function AppLayout() {
  const [showSplash, setShowSplash] = useState(() => !splashAlreadyShown())

  const handleSplashDone = useCallback(() => {
    try {
      sessionStorage.setItem(SPLASH_KEY, '1')
    } catch {
      // Without storage the splash may show again on the next visit; nothing else breaks.
    }
    setShowSplash(false)
  }, [])

  return (
    <ToastProvider>
      <ScrollOnNavigate />
      <div className={styles.shell}>
        <SiteHeader />
        <div className={styles.content}>
          <Outlet />
        </div>
        <SiteFooter />
      </div>
      {showSplash && <BrandSplash onDone={handleSplashDone} />}
    </ToastProvider>
  )
}
