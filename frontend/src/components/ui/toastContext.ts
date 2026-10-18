import { createContext } from 'react'

export type ToastTone = 'neutral' | 'ok' | 'error'

export type ToastOptions = {
  tone?: ToastTone
  /** Milliseconds on screen before leaving. */
  duration?: number
}

export type ShowToast = (message: string, options?: ToastOptions) => void

export const ToastContext = createContext<ShowToast | null>(null)
