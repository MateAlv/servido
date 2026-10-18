import { useCallback, useState } from 'react'
import { Outlet } from 'react-router'

import { BrandSplash } from './components/brand'
import { ToastProvider } from './components/ui'

const SPLASH_KEY = 'servido-splash-shown'

function splashAlreadyShown(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_KEY) === '1'
  } catch {
    return true
  }
}

/** Shell shared by every page: toasts, and the brand splash once per browser session. */
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
      <Outlet />
      {showSplash && <BrandSplash onDone={handleSplashDone} />}
    </ToastProvider>
  )
}
