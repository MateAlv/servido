import { cx } from '../../lib/cx'
import styles from './LogoSpinner.module.css'
import { LogoMark } from './LogoMark'

type LogoSpinnerProps = {
  /** `orbit` for general loading, `hop` while searching places (map, nearby restaurants). */
  kind?: 'orbit' | 'hop'
  size?: 'sm' | 'md' | 'lg'
  label?: string
  /** Shows the label under the pin; otherwise it is only announced to screen readers. */
  showLabel?: boolean
  className?: string
}

export function LogoSpinner({
  kind = 'orbit',
  size = 'md',
  label = 'Cargando…',
  showLabel = false,
  className,
}: LogoSpinnerProps) {
  return (
    <span role="status" className={cx(styles.spinner, styles[kind], styles[size], className)}>
      <LogoMark
        orbit={kind === 'orbit'}
        classes={{
          root: styles.mark,
          shadow: styles.shadow,
          body: styles.body,
          lid: styles.lid,
          rays: styles.rays,
          ray: styles.ray,
          orbitTrack: styles.track,
          orbitComet: styles.comet,
        }}
      />
      <span className={showLabel ? styles.label : 'visually-hidden'}>{label}</span>
    </span>
  )
}
