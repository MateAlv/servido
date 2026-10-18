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
}

/**
 * Dialog built on the native <dialog> element (focus trap and Escape for free).
 * On phones it becomes a bottom sheet. It animates both in and out.
 */
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

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
      }
      const onAnimationEnd = (event: AnimationEvent) => {
        if (event.target === dialog) finish()
      }
      if (prefersReducedMotion()) {
        dialog.close()
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
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
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
