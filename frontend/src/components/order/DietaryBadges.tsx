import type { ReactNode } from 'react'

import { cx } from '../../lib/cx'
import { IconLeaf, IconSprout, IconWheatOff } from '../ui/icons'
import styles from './DietaryBadges.module.css'

const BADGES: Record<string, { label: string; icon: ReactNode; tone: string }> = {
  vegano: { label: 'Vegano', icon: <IconLeaf />, tone: styles.vegan },
  vegetariano: { label: 'Vegetariano', icon: <IconSprout />, tone: styles.vegetarian },
  sin_tacc: { label: 'Sin TACC', icon: <IconWheatOff />, tone: styles.glutenFree },
}

/** The dietary restrictions a restaurant declared for a dish (risk 5: as declared, never
 * inferred). Each has its own icon, so it doesn't depend on color alone. */
export function DietaryBadges({
  restrictions,
  size = 'sm',
  inline = false,
}: {
  restrictions: string[]
  size?: 'sm' | 'md'
  /** Spans instead of a list, for use inside a button. */
  inline?: boolean
}) {
  const known = restrictions.filter((restriction) => restriction in BADGES)
  if (!known.length) return null
  const List = inline ? 'span' : 'ul'
  const Item = inline ? 'span' : 'li'
  return (
    <List
      className={cx(styles.badges, size === 'md' && styles.md)}
      aria-label={inline ? undefined : 'Restricciones'}
    >
      {known.map((restriction) => {
        const badge = BADGES[restriction]
        return (
          <Item key={restriction} className={cx(styles.badge, badge.tone)}>
            {badge.icon}
            {badge.label}
          </Item>
        )
      })}
    </List>
  )
}
