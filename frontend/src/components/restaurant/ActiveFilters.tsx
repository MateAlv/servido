import { Button, IconClose } from '../ui'
import { filterTags, NO_FILTERS, type SearchFilters } from './searchFilters'
import styles from './ActiveFilters.module.css'

type ActiveFiltersProps = {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
}

/** Each active filter as a tag that removes it, plus «Quitar todos» (spec 027, F7). */
export function ActiveFilters({ filters, onChange }: ActiveFiltersProps) {
  const tags = filterTags(filters)
  if (tags.length === 0) return null

  return (
    <div className={styles.bar}>
      <ul className={styles.tags} aria-label="Filtros activos">
        {tags.map((tag) => (
          <li key={tag.key}>
            <button
              type="button"
              className={styles.tag}
              data-entrance
              aria-label={`Quitar filtro ${tag.label}`}
              onClick={() => onChange(tag.without(filters))}
            >
              {tag.label}
              <IconClose className={styles.remove} />
            </button>
          </li>
        ))}
      </ul>
      <Button variant="ghost" size="sm" onClick={() => onChange(NO_FILTERS)}>
        Quitar todos
      </Button>
    </div>
  )
}
