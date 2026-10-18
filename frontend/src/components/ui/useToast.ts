import { useContext } from 'react'

import { ToastContext, type ShowToast } from './toastContext'

/** Returns `toast(message, { tone, duration })`. Requires a <ToastProvider> above. */
export function useToast(): ShowToast {
  const toast = useContext(ToastContext)
  if (!toast) throw new Error('useToast must be used inside <ToastProvider>')
  return toast
}
