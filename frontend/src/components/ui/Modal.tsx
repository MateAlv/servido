import { useEffect, useId, useRef, type ReactNode } from 'react'

import { prefersReducedMotion } from '../../lib/motion'
import { IconButton } from './IconButton'
import { IconClose } from './icons'
import styles from './Modal.module.css'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  /** Runs once the dialog is closed and its animation ended: from then on the page behind it can
   * take the focus again. */
  onClosed?: () => void
}

/**
 * Dialog built on the native <dialog> element (focus trap and Escape for free).
 * On phones it becomes a bottom sheet. It animates both in and out.
 */
export function Modal({ open, onClose, title, children, footer, onClosed }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const onClosedRef = useRef(onClosed)
  // A press that starts inside (selecting text, dragging a field) and ends on the backdrop makes
  // the browser report a click on the dialog itself; that is not a click outside.
  const pressedInside = useRef(false)

  useEffect(() => {
    onClosedRef.current = onClosed
  }, [onClosed])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (open && !dialog.open) {
      delete dialog.dataset.closing
      dialog.showModal()
      return
    }

    if (!open && dialog.open) {
      const finish = () => {
        window.clearTimeout(fallback)
        dialog.removeEventListener('animationend', onAnimationEnd)
        delete dialog.dataset.closing
        dialog.close()
        onClosedRef.current?.()
      }
      const onAnimationEnd = (event: AnimationEvent) => {
        if (event.target === dialog) finish()
      }
      if (prefersReducedMotion()) {
        dialog.close()
        onClosedRef.current?.()
        return
      }
      dialog.dataset.closing = ''
      dialog.addEventListener('animationend', onAnimationEnd)
      const fallback = window.setTimeout(finish, 500)
      return () => {
        window.clearTimeout(fallback)
        dialog.removeEventListener('animationend', onAnimationEnd)
      }
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
      onMouseDown={(event) => {
        pressedInside.current = event.target !== event.currentTarget
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !pressedInside.current) onClose()
        pressedInside.current = false
      }}
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <IconButton label="Cerrar" variant="ghost" onClick={onClose}>
            <IconClose />
          </IconButton>
        </header>
        {children}
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </dialog>
  )
}
