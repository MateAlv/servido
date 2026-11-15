import { useEffect, useRef, useState, type ReactNode } from 'react'

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
  ClockDialog,
  IconClock,
  IconLeaf,
  IconSprout,
  IconStar,
  IconWheatOff,
  QuantityStepper,
  SegmentedControl,
  TextField,
  TimeWheel,
} from '../ui'
import { PriceFilter } from './PriceFilter'
import {
  DAY_OUT_OF_RANGE,
  defaultHour,
  draftRangeEnd,
  fitTimeDraft,
  HALF_HOURS,
  longDayLabel,
  MAX_PARTY_SIZE,
  MIN_RATINGS,
  minRatingLabel,
  selectableHours,
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
  if (!draft.day && draft.mode !== 'dia') {
    return 'Falta el día: elegí Hoy, Mañana u otro día para aplicar este filtro.'
  }
  return undefined
}

/** What the day and time filter shows, in words. */
function timeSummary(draft: TimeDraft, hoursLeft: boolean): string {
  if (draft.mode === 'dia') {
    return 'Aparecen los restaurantes en los que ese día se puede empezar alguna reserva. Solo aparecen los que ya toman reservas.'
  }
  if (!hoursLeft) return 'Hoy ya no quedan horarios para empezar una reserva: elegí otro día.'
  const when =
    draft.mode === 'hora'
      ? `a las ${draft.hour}`
      : `entre las ${draft.from} y las ${draftRangeEnd(draft)}`
  return `Aparecen los restaurantes donde podés empezar una reserva ${when}. Cada reserva dura 1 h 30.`
}

const WHEEL_LABELS = { hora: 'Llegar a las', from: 'Llegar desde', to: 'Llegar hasta' } as const

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
  const hours = selectableHours(draft.day, today, now)
  const firstHour = defaultHour(draft.day, today, now)
  // Which end of the range the wheel edits.
  const [rangeEnd, setRangeEnd] = useState<'from' | 'to'>('from')
  const [clockOpen, setClockOpen] = useState(false)
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
    const fixed = fitTimeDraft(
      next,
      selectableHours(next.day, today, now),
      defaultHour(next.day, today, now),
    )
    onTimeDraftChange(fixed)
    // Only a complete, valid day and time is applied. Without a day, or with a day out of the
    // window, the last valid filter stays.
    const { time } = timeFromDraft(fixed)
    if (time && !sameTime(time, filters.time)) onChange({ ...filters, time })
  }

  const wheelEnd = draft.mode === 'hora' ? 'hora' : rangeEnd
  const wheelValue =
    wheelEnd === 'hora' ? draft.hour : wheelEnd === 'from' ? draft.from : draftRangeEnd(draft)
  const wheelHours = wheelEnd === 'to' ? hours.filter((hour) => hour >= draft.from) : hours

  function changeWheel(hour: string) {
    if (wheelEnd === 'hora') changeDraft({ ...draft, hour })
    else if (wheelEnd === 'from') changeDraft({ ...draft, from: hour })
    else changeDraft({ ...draft, to: hour })
  }

  function clearTime() {
    setRangeEnd('from')
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

  const draftStarted = Boolean(draft.day || draft.mode !== 'dia')
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
          label="Horario"
          className={styles.wide}
          options={[
            { value: 'dia', label: 'Todo el día' },
            { value: 'hora', label: 'Una hora' },
            { value: 'rango', label: 'Entre horas' },
          ]}
          value={draft.mode}
          onChange={(mode) => {
            setRangeEnd('from')
            changeDraft(switchTimeMode(draft, mode, firstHour))
          }}
        />
        {draft.mode !== 'dia' && hours.length > 0 && (
          <div className={styles.time}>
            {draft.mode === 'rango' && (
              <div className={styles.ends}>
                {(['from', 'to'] as const).map((end) => (
                  <button
                    key={end}
                    type="button"
                    className={styles.end}
                    aria-pressed={rangeEnd === end}
                    onClick={() => setRangeEnd(end)}
                  >
                    <span className={styles.endLabel}>{WHEEL_LABELS[end]}</span>
                    <span
                      key={end === 'from' ? draft.from : draftRangeEnd(draft)}
                      className={styles.endValue}
                    >
                      {end === 'from' ? draft.from : draftRangeEnd(draft)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className={styles.wheelHead}>
              <span className={styles.label}>{WHEEL_LABELS[wheelEnd]}</span>
              <Button
                variant="secondary"
                size="sm"
                icon={<IconClock />}
                aria-label={`Elegir «${WHEEL_LABELS[wheelEnd].toLowerCase()}» en el reloj`}
                onClick={() => setClockOpen(true)}
              >
                Reloj
              </Button>
            </div>
            <TimeWheel
              label={WHEEL_LABELS[wheelEnd]}
              hours={HALF_HOURS}
              value={wheelValue}
              selectable={wheelHours}
              onChange={changeWheel}
              onPick={() => setClockOpen(true)}
            />
            <ClockDialog
              open={clockOpen}
              title={WHEEL_LABELS[wheelEnd]}
              value={wheelValue}
              selectable={wheelHours}
              onConfirm={(hour) => {
                changeWheel(hour)
                setClockOpen(false)
              }}
              onClose={() => setClockOpen(false)}
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
          <p className={styles.note}>{timeSummary(draft, hours.length > 0)}</p>
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
