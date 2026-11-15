import { useEffect, useRef } from 'react'

import { Button, IconClose } from '../ui'
import { filterTags, NO_FILTERS, type SearchFilters } from './searchFilters'
import styles from './ActiveFilters.module.css'

type ActiveFiltersProps = {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  /** Takes the focus when the last tag goes, e.g. to the «Filtros» button. */
  onEmpty: () => void
}

/** Each active filter as a tag that removes it, plus «Quitar todos» (spec 027, F7). */
export function ActiveFilters({ filters, onChange, onEmpty }: ActiveFiltersProps) {
  const tags = filterTags(filters)
  const list = useRef<HTMLUListElement>(null)
  // After a removal the focus goes to the tag now in that place, or out when none remain.
  const focusIndex = useRef<number | null>(null)
  const latestOnEmpty = useRef(onEmpty)
  useEffect(() => {
    latestOnEmpty.current = onEmpty
  })

  // Runs only when the number of tags changes, that is, once the removal took effect.
  useEffect(() => {
    const index = focusIndex.current
    if (index === null) return
    focusIndex.current = null
    const remaining = list.current?.querySelectorAll('button') ?? []
    if (remaining.length > 0) remaining[Math.min(index, remaining.length - 1)].focus()
    else latestOnEmpty.current()
  }, [tags.length])

  if (tags.length === 0) return null

  return (
    <div className={styles.bar}>
      <ul ref={list} className={styles.tags} aria-label="Filtros activos">
        {tags.map((tag, index) => (
          <li key={tag.key}>
            <button
              type="button"
              className={styles.tag}
              data-entrance
              aria-label={`Quitar filtro ${tag.spokenLabel}`}
              onClick={() => {
                focusIndex.current = index
                onChange(tag.without(filters))
              }}
            >
              {tag.label}
              <IconClose className={styles.remove} />
            </button>
          </li>
        ))}
      </ul>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          focusIndex.current = 0
          onChange(NO_FILTERS)
        }}
      >
        Quitar todos
      </Button>
    </div>
  )
}
