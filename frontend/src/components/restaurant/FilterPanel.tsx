import { useEffect, useId, useRef, type ReactNode } from 'react'

import { DIETARY_RESTRICTIONS, type DietaryRestriction } from '../../lib/dietary'
import {
  addDays,
  currentTimeInBuenosAires,
  latestBookableDate,
  todayInBuenosAires,
} from '../../lib/date'
import {
  Button,
  Chip,
  ChoiceChips,
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
  DAY_OUT_OF_RANGE,
  HALF_HOURS,
  INVERTED_RANGE,
  longDayLabel,
  MAX_PARTY_SIZE,
  MIN_RATINGS,
  minRatingLabel,
  switchTimeMode,
  timeDraftFrom,
  timeFilterLabel,
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

const ANY_RATING = 'todas'

/** A party of two is where most searches start. */
const FIRST_PARTY_SIZE = 2

type FilterPanelProps = {
  filters: SearchFilters
  /** Called on every change: the filters apply as the diner chooses them. */
  onChange: (filters: SearchFilters) => void
  /**
   * What the day and time controls hold, kept by the caller so a day still waiting for its
   * hour survives closing and opening the panel. Start it with `timeDraftFrom(filters.time)`.
   */
  timeDraft: TimeDraft
  onTimeDraftChange: (draft: TimeDraft) => void
}

function sameTime(first: TimeFilter | null, second: TimeFilter | null): boolean {
  return (
    first?.day === second?.day &&
    first?.mode === second?.mode &&
    first?.from === second?.from &&
    first?.to === second?.to
  )
}

/** An hour or a range needs a day to filter: says so, or `undefined` when nothing is missing. */
function pendingMessage(draft: TimeDraft): string | undefined {
  if (!draft.day && (draft.hour || draft.from || draft.to)) {
    return 'Falta el día: elegí Hoy, Mañana u otro día para aplicar este filtro.'
  }
  return undefined
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
 * restrictions, day and time, and party size. Shown inside a `Drawer`.
 */
export function FilterPanel({ filters, onChange, timeDraft, onTimeDraftChange }: FilterPanelProps) {
  const today = todayInBuenosAires()
  const tomorrow = addDays(today, 1)
  const now = currentTimeInBuenosAires()
  const draft = timeDraft
  const { time: draftTime, error: timeError } = timeFromDraft(draft)
  const pending = timeError ? undefined : pendingMessage(draft)
  const hourId = useId()
  // Buttons that disappear when used hand the focus to what takes their place.
  const todayChip = useRef<HTMLButtonElement>(null)
  const partyStart = useRef<HTMLButtonElement>(null)
  const partyStepper = useRef<HTMLDivElement>(null)
  const focusAfterParty = useRef<'start' | 'stepper' | null>(null)

  useEffect(() => {
    if (focusAfterParty.current === 'start') partyStart.current?.focus()
    if (focusAfterParty.current === 'stepper') {
      partyStepper.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    }
    focusAfterParty.current = null
  }, [filters.partySize])

  function changeDraft(next: TimeDraft) {
    // An hour of today that already started can't be chosen (spec 027, «Hoy»).
    const fixed = next.day === today && next.hour && next.hour <= now ? { ...next, hour: '' } : next
    onTimeDraftChange(fixed)
    // Only a complete, valid day and time is applied. While the controls are incomplete (a
    // time typed digit by digit passes through empty) or invalid (an inverted range, a day out
    // of the window), the last valid filter stays (spec 027, «Rango invertido»).
    const { time } = timeFromDraft(fixed)
    if (time && !sameTime(time, filters.time)) onChange({ ...filters, time })
  }

  function clearTime() {
    onTimeDraftChange(timeDraftFrom(null))
    if (filters.time) onChange({ ...filters, time: null })
    todayChip.current?.focus()
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

  function changeParty(partySize: number | null) {
    focusAfterParty.current =
      partySize === null ? 'start' : filters.partySize === null ? 'stepper' : null
    onChange({ ...filters, partySize })
  }

  const draftStarted = Boolean(draft.day || draft.hour || draft.from || draft.to)
  const dayIsValid = /^\d{4}-\d{2}-\d{2}$/.test(draft.day)

  return (
    <div className={styles.panel}>
      <PriceFilter
        selectedTiers={filters.priceTiers}
        onChange={(priceTiers) => onChange({ ...filters, priceTiers })}
      />

      <Section title="Calificación">
        <ChoiceChips
          label="Calificación mínima"
          options={[
            { value: ANY_RATING, label: 'Todas' },
            ...MIN_RATINGS.map((rating) => ({
              value: String(rating),
              label: (
                <>
                  {minRatingLabel(rating)}
                  <IconStar className={styles.star} />
                </>
              ),
              ariaLabel: `${minRatingLabel(rating)} estrellas`,
            })),
          ]}
          value={filters.minRating === null ? ANY_RATING : String(filters.minRating)}
          onChange={(value) =>
            onChange({
              ...filters,
              minRating: value === ANY_RATING ? null : (Number(value) as MinRating),
            })
          }
        />
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
          <Chip
            ref={todayChip}
            selected={draft.day === today}
            onClick={() => changeDraft({ ...draft, day: today })}
          >
            Hoy
          </Chip>
          <Chip
            selected={draft.day === tomorrow}
            onClick={() => changeDraft({ ...draft, day: tomorrow })}
          >
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
          hint={dayIsValid ? longDayLabel(draft.day) : undefined}
          error={timeError === DAY_OUT_OF_RANGE ? timeError : undefined}
          onChange={(event) => changeDraft({ ...draft, day: event.target.value })}
        />
        <SegmentedControl
          label="Tipo de horario"
          options={[
            { value: 'hora', label: 'Hora' },
            { value: 'rango', label: 'Rango' },
          ]}
          value={draft.mode}
          onChange={(mode) => changeDraft(switchTimeMode(draft, mode))}
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
              onChange={(event) => changeDraft({ ...draft, hour: event.target.value })}
            >
              <option value="">Cualquier hora</option>
              {HALF_HOURS.map((hour) => (
                <option key={hour} value={hour} disabled={draft.day === today && hour <= now}>
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
              onChange={(event) => changeDraft({ ...draft, from: event.target.value })}
            />
            <TextField
              label="Hasta"
              type="time"
              value={draft.to}
              error={timeError === INVERTED_RANGE ? timeError : undefined}
              onChange={(event) => changeDraft({ ...draft, to: event.target.value })}
            />
          </div>
        )}
        {pending ? (
          <p className={styles.pending} role="status">
            {pending}
          </p>
        ) : filters.time && !sameTime(draftTime, filters.time) ? (
          <p className={styles.note}>
            Mientras tanto sigue aplicado {timeFilterLabel(filters.time)}.
          </p>
        ) : (
          <p className={styles.note}>
            Con solo el día, aparecen los restaurantes en los que ese día se puede empezar alguna
            reserva; una hora o un rango lo acotan. Solo aparecen los que ya toman reservas.
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={styles.flush}
          disabled={!draftStarted}
          onClick={clearTime}
        >
          Quitar día y horario
        </Button>
      </Section>

      <Section title="Personas">
        {filters.partySize === null ? (
          <Button
            ref={partyStart}
            variant="secondary"
            size="sm"
            onClick={() => changeParty(FIRST_PARTY_SIZE)}
          >
            Indicar cuántos van
          </Button>
        ) : (
          <>
            <div ref={partyStepper}>
              <QuantityStepper
                label="Cantidad de personas"
                size="lg"
                value={filters.partySize}
                min={1}
                max={MAX_PARTY_SIZE}
                decreaseLabel="Una persona menos"
                increaseLabel="Una persona más"
                maxHint={`Máximo ${MAX_PARTY_SIZE} personas`}
                onChange={changeParty}
              />
            </div>
            {filters.partySize === MAX_PARTY_SIZE && (
              <p className={styles.note}>Máximo {MAX_PARTY_SIZE} personas.</p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={styles.flush}
              onClick={() => changeParty(null)}
            >
              Quitar cantidad de personas
            </Button>
          </>
        )}
        <p className={styles.note}>
          Solo aparecen los restaurantes que ya toman reservas y tienen una mesa para todo el grupo.
        </p>
      </Section>
    </div>
  )
}
