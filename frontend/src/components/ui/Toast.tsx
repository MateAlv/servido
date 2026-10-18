import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { cx } from '../../lib/cx'
import styles from './Toast.module.css'
import { ToastContext, type ShowToast, type ToastTone } from './toastContext'

const EXIT_MS = 240
const MAX_VISIBLE = 3

type ToastItem = { id: number; message: string; tone: ToastTone; leaving: boolean }

/** Provides `useToast()` and renders the toasts, announced politely to screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Set<number>())

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timers.current.delete(timer)
      callback()
    }, delay)
    timers.current.add(timer)
  }, [])

  const show = useCallback<ShowToast>(
    (message, { tone = 'neutral', duration = 2800 } = {}) => {
      const id = ++nextId.current
      setToasts((current) => [
        ...current.slice(-(MAX_VISIBLE - 1)),
        { id, message, tone, leaving: false },
      ])
      schedule(() => {
        setToasts((current) =>
          current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)),
        )
      }, duration)
      schedule(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id))
      }, duration + EXIT_MS)
    },
    [schedule],
  )

  return (
    <ToastContext value={show}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cx(styles.toast, styles[toast.tone], toast.leaving && styles.leaving)}
          >
            {toast.tone !== 'neutral' && <span className={styles.dot} aria-hidden="true" />}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext>
  )
}
