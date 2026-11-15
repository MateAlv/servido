import { useEffect, useId, useRef, type ReactNode } from 'react'

import { prefersReducedMotion } from '../../lib/motion'
import { IconButton } from './IconButton'
import { IconClose } from './icons'
import styles from './Drawer.module.css'

type DrawerProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Stays at the bottom while the content scrolls, e.g. «Ver 4 restaurantes». */
  footer?: ReactNode
}

/**
 * Side panel on the native <dialog> element, like `Modal` (focus trap and Escape for free).
 * On phones it rises from the bottom as a sheet; on wide screens it slides in from the right.
 * It animates both in and out.
 */
export function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  // The page behind doesn't scroll while the panel is open.
  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = previous
    }
  }, [open])

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
      const fallback = window.setTimeout(finish, 600)
      return () => {
        window.clearTimeout(fallback)
        dialog.removeEventListener('animationend', onAnimationEnd)
      }
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className={styles.drawer}
      aria-labelledby={titleId}
      data-entrance
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <header className={styles.header}>
        <span className={styles.handle} aria-hidden="true" />
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <IconButton label="Cerrar" variant="ghost" onClick={onClose}>
          <IconClose />
        </IconButton>
      </header>
      <div className={styles.body}>{children}</div>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </dialog>
  )
}
