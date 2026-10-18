import { cx } from '../../lib/cx'
import styles from './Skeleton.module.css'

type SkeletonProps = {
  width?: number | string
  height?: number | string
  radius?: number | string
  className?: string
}

/** Placeholder with a shimmer while content loads. Decorative: announce loading elsewhere. */
export function Skeleton({ width = '100%', height = 16, radius, className }: SkeletonProps) {
  return (
    <span
      className={cx(styles.skeleton, className)}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  )
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <span className={styles.text} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} height={14} />
      ))}
    </span>
  )
}
