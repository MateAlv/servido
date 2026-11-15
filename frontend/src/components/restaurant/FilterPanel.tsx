import { useId, useState, type ReactNode } from 'react'

import { DIETARY_RESTRICTIONS, type DietaryRestriction } from '../../lib/dietary'
import { addDays, latestBookableDate, todayInBuenosAires } from '../../lib/date'
import {
  Button,
  Chip,
  IconLeaf,
  IconSprout,
  IconStar,
  IconWheatOff,
  QuantityStepper,
  SegmentedControl,
  TextField,
} from '../ui'
import { PriceFilter } from './PriceFilter'
import {
  HALF_HOURS,
  MAX_PARTY_SIZE,
  MIN_RATINGS,
  minRatingLabel,
  timeDraftFrom,
  timeFromDraft,
  type MinRating,
  type SearchFilters,
  type TimeDraft,
  type TimeFilter,
} from './searchFilters'
import styles from './FilterPanel.module.css'

const RESTRICTION_ICONS: Record<DietaryRestriction, ReactNode> = {
  sin_tacc: <IconWheatOff />,
  vegetariano: <IconLeaf />,
  vegano: <IconSprout />,
}

/** A party of two is where most searches start. */
const FIRST_PARTY_SIZE = 2

type FilterPanelProps = {
  filters: SearchFilters
  /** Called on every change: the filters apply as the diner chooses them. */
  onChange: (filters: SearchFilters) => void
}

function sameTime(first: TimeFilter | null, second: TimeFilter | null): boolean {
  return first?.day === second?.day && first?.from === second?.from && first?.to === second?.to
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>{title}</legend>
      {children}
    </fieldset>
  )
}

/**
 * Every search filter of the map and the list (spec 027, F7): price, minimum rating, dietary
 * restrictions, day and time, and party size. Shown inside a `Drawer`; mount it again (a new
 * `key`) whenever the filters change from outside, so the day and time controls start over.
 */
export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const today = todayInBuenosAires()
  const tomorrow = addDays(today, 1)
  const [draft, setDraft] = useState<TimeDraft>(() => timeDraftFrom(filters.time))
  const { error: timeError } = timeFromDraft(draft)
  const hourId = useId()

  function changeDraft(changes: Partial<TimeDraft>) {
    const next = { ...draft, ...changes }
    setDraft(next)
    // An incomplete or invalid day and time is not applied (spec 027, «Rango invertido»).
    const { time } = timeFromDraft(next)
    if (!sameTime(time, filters.time)) onChange({ ...filters, time })
  }

  function clearTime() {
    setDraft(timeDraftFrom(null))
    if (filters.time) onChange({ ...filters, time: null })
  }

  function toggleRating(rating: MinRating) {
    onChange({ ...filters, minRating: filters.minRating === rating ? null : rating })
  }

  function toggleRestriction(code: DietaryRestriction) {
    const chosen = filters.restrictions.includes(code)
      ? filters.restrictions.filter((restriction) => restriction !== code)
      : [...filters.restrictions, code]
    onChange({
      ...filters,
      restrictions: DIETARY_RESTRICTIONS.map((restriction) => restriction.code).filter((c) =>
        chosen.includes(c),
      ),
    })
  }

  const draftStarted = Boolean(draft.day || draft.hour || draft.from || draft.to)
  const timeHint = timeError
    ? undefined
    : !draft.day && draftStarted
      ? 'Elegí un día para aplicar este filtro.'
      : draft.day && !filters.time
        ? draft.mode === 'hora'
          ? 'Elegí una hora para aplicar este filtro.'
          : 'Elegí desde y hasta qué hora para aplicar este filtro.'
        : undefined

  return (
    <div className={styles.panel}>
      <PriceFilter
        selectedTiers={filters.priceTiers}
        onChange={(priceTiers) => onChange({ ...filters, priceTiers })}
      />

      <Section title="Calificación">
        <div className={styles.options}>
          {MIN_RATINGS.map((rating) => (
            <Chip
              key={rating}
              selected={filters.minRating === rating}
              onClick={() => toggleRating(rating)}
            >
              {minRatingLabel(rating)}
              <IconStar className={styles.star} />
            </Chip>
          ))}
        </div>
        <p className={styles.note}>Según el promedio de las reseñas de otros comensales.</p>
      </Section>

      <Section title="Restricciones alimenticias">
        <div className={styles.options}>
          {DIETARY_RESTRICTIONS.map((restriction) => (
            <Chip
              key={restriction.code}
              selected={filters.restrictions.includes(restriction.code)}
              onClick={() => toggleRestriction(restriction.code)}
            >
              {RESTRICTION_ICONS[restriction.code]}
              {restriction.label}
            </Chip>
          ))}
        </div>
        <p className={styles.note}>
          Buscamos en los platos del menú. Con más de una, un mismo plato tiene que cumplirlas
          todas.
        </p>
      </Section>

      <Section title="Día y horario">
        <div className={styles.options}>
          <Chip selected={draft.day === today} onClick={() => changeDraft({ day: today })}>
            Hoy
          </Chip>
          <Chip selected={draft.day === tomorrow} onClick={() => changeDraft({ day: tomorrow })}>
            Mañana
          </Chip>
        </div>
        <TextField
          className={styles.wide}
          label="Otro día"
          type="date"
          min={today}
          max={latestBookableDate()}
          value={draft.day}
          onChange={(event) => changeDraft({ day: event.target.value })}
        />
        <SegmentedControl
          label="Tipo de horario"
          options={[
            { value: 'hora', label: 'Hora' },
            { value: 'rango', label: 'Rango' },
          ]}
          value={draft.mode}
          onChange={(mode) => changeDraft({ mode })}
        />
        {draft.mode === 'hora' ? (
          <div className={styles.field}>
            <label className={styles.label} htmlFor={hourId}>
              Hora
            </label>
            <select
              id={hourId}
              className={styles.select}
              value={draft.hour}
              onChange={(event) => changeDraft({ hour: event.target.value })}
            >
              <option value="">Elegí una hora</option>
              {HALF_HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className={styles.range}>
            <TextField
              label="Desde"
              type="time"
              value={draft.from}
              onChange={(event) => changeDraft({ from: event.target.value })}
            />
            <TextField
              label="Hasta"
              type="time"
              value={draft.to}
              onChange={(event) => changeDraft({ to: event.target.value })}
            />
          </div>
        )}
        {timeError && (
          <p key={timeError} className={styles.error} role="alert">
            {timeError}
          </p>
        )}
        <p className={styles.note}>
          {timeHint ?? 'Solo aparecen los restaurantes que ya toman reservas por Servido!.'}
        </p>
        <Button variant="ghost" size="sm" disabled={!draftStarted} onClick={clearTime}>
          Quitar día y horario
        </Button>
      </Section>

      <Section title="Personas">
        {filters.partySize === null ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onChange({ ...filters, partySize: FIRST_PARTY_SIZE })}
          >
            Indicar cuántos van
          </Button>
        ) : (
          <div className={styles.party}>
            <QuantityStepper
              label="Cantidad de personas"
              value={filters.partySize}
              min={1}
              max={MAX_PARTY_SIZE}
              decreaseLabel="Una persona menos"
              maxHint={`Máximo ${MAX_PARTY_SIZE} personas`}
              onChange={(partySize) => onChange({ ...filters, partySize })}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange({ ...filters, partySize: null })}
            >
              Quitar cantidad de personas
            </Button>
          </div>
        )}
        <p className={styles.note}>
          Solo aparecen los restaurantes que ya toman reservas y tienen una mesa para todo el grupo.
        </p>
      </Section>
    </div>
  )
}
