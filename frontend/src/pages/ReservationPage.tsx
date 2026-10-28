import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'

import {
  fetchAvailability,
  fetchAvailableTables,
  type DayAvailability,
  type SeatingArea,
  type TablesAvailability,
} from '../api/availability'
import type { Reservation } from '../api/reservations'
import { retryUnlessSessionExpired, SessionExpiredError } from '../api/errors'
import { signOut, useAccount } from '../api/session'
import { LogoSpinner } from '../components/brand'
import { Button, Card, Chip, QuantityStepper, Skeleton, useToast } from '../components/ui'
import { fetchRestaurant } from '../api/restaurants'
import { cx } from '../lib/cx'
import { SEATING_AREA_LABELS, SEATING_AREA_OPTIONS } from '../lib/seating'
import {
  latestBookableDate,
  MAX_DAYS_AHEAD,
  timeInBuenosAires,
  todayInBuenosAires,
} from '../lib/date'
import styles from './ReservationPage.module.css'
import { ConfirmedStep } from './reservation/ConfirmedStep'
import { ReviewStep } from './reservation/ReviewStep'

const SEATING_AREAS = SEATING_AREA_OPTIONS
const AREA_LABEL = SEATING_AREA_LABELS

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

type Selection = { fecha: string; hora: string; personas: number; tipo: SeatingArea | null }

/** Ignores what is missing or invalid, so a hand-edited link never selects it. */
function selectionFromParams(params: URLSearchParams): Selection {
  const today = todayInBuenosAires()
  const fecha = params.get('fecha') ?? ''
  const validFecha =
    DATE_PATTERN.test(fecha) && fecha >= today && fecha <= latestBookableDate() ? fecha : ''
  const hora = params.get('hora') ?? ''
  const personas = Number(params.get('personas') ?? '1')
  const tipo = params.get('tipo')
  return {
    fecha: validFecha,
    hora: validFecha && TIME_PATTERN.test(hora) ? hora : '',
    personas: Number.isInteger(personas) && personas >= 1 ? personas : 1,
    tipo: SEATING_AREAS.some((area) => area.value === tipo) ? (tipo as SeatingArea) : null,
  }
}

/** Writes only valid values: the URL never holds a selection the API would not offer. */
function paramsFromSelection(selection: Selection): URLSearchParams {
  const params = new URLSearchParams()
  if (selection.fecha) params.set('fecha', selection.fecha)
  if (selection.hora) params.set('hora', selection.hora)
  if (selection.personas > 1) params.set('personas', String(selection.personas))
  if (selection.tipo) params.set('tipo', selection.tipo)
  return params
}

/**
 * Create a reservation (US-11, spec 005): date, time, party size and seating preference, then
 * the review and the explicit confirmation (US-13, `?paso=revision`). The selection lives in the
 * URL, so reloading or going back keeps it; nothing is written until the diner confirms.
 */
export function ReservationPage() {
  const { restauranteId = '' } = useParams<{ restauranteId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { data: account, isPending: accountPending } = useAccount()
  const [confirmed, setConfirmed] = useState<Reservation | null>(null)
  // Shown only while the URL names it: going back from the confirmation leaves it.
  const showConfirmed = confirmed && searchParams.get('confirmada') === confirmed.id
  const reviewing = searchParams.get('paso') === 'revision'
  // True when «Siguiente» added the review to the history, so «Volver» can go back to it.
  const reviewPushed = useRef(false)
  const { data: restaurant, isPending: restaurantPending } = useQuery({
    queryKey: ['restaurants', restauranteId],
    queryFn: () => fetchRestaurant(restauranteId),
  })

  const selection = selectionFromParams(searchParams)
  const { fecha, hora, personas, tipo } = selection
  const [pastDateError, setPastDateError] = useState('')

  const update = useCallback(
    (patch: Partial<Selection>) => {
      const current = selectionFromParams(searchParams)
      setSearchParams(paramsFromSelection({ ...current, ...patch }), { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const availability = useQuery({
    queryKey: ['availability', restauranteId, fecha, personas],
    queryFn: () => fetchAvailability(restauranteId, fecha, personas),
    enabled: fecha !== '',
    retry: retryUnlessSessionExpired,
  })
  const day: DayAvailability | undefined = availability.data
  const maxPartySize = day?.max_party_size

  const tables = useQuery({
    queryKey: ['availability-tables', restauranteId, fecha, hora, personas],
    queryFn: () => fetchAvailableTables(restauranteId, fecha, hora, personas),
    enabled:
      fecha !== '' &&
      hora !== '' &&
      (maxPartySize === undefined || (maxPartySize > 0 && personas <= maxPartySize)),
    retry: retryUnlessSessionExpired,
  })
  const tablesForStart: TablesAvailability | undefined = tables.data
  // The review proposes the smallest group of the chosen area that seats the party (D2): the
  // API lists the groups smallest first.
  const assignedTable = tablesForStart?.tables.find((table) => !tipo || table.seating_area === tipo)

  const leaveReview = useCallback(() => {
    setSearchParams(paramsFromSelection(selectionFromParams(searchParams)), { replace: true })
  }, [searchParams, setSearchParams])

  // An expired session (the token lasts an hour) sends the diner to sign in again; the
  // redirect below brings them back here with the selection.
  const sessionExpired = [availability.error, tables.error].some(
    (error) => error instanceof SessionExpiredError,
  )
  useEffect(() => {
    if (sessionExpired) signOut(queryClient)
  }, [sessionExpired, queryClient])

  // A reloaded or stale review whose time or table is gone goes back to the selection, with
  // one notice. The selection's own notices below wait until then.
  const reviewIsStale =
    reviewing &&
    ((day !== undefined && !day.slots.some((slot) => slot.start_time === hora && slot.available)) ||
      (tablesForStart !== undefined && !tables.isFetching && !assignedTable))
  const handledStaleReview = useRef(false)
  const handledDay = useRef<DayAvailability | undefined>(undefined)
  const handledTables = useRef<TablesAvailability | undefined>(undefined)
  useEffect(() => {
    if (!reviewIsStale || handledStaleReview.current) return
    handledStaleReview.current = true
    // These responses are answered here: the selection's own notices must not repeat them.
    handledDay.current = day
    handledTables.current = tablesForStart
    toast('La mesa que elegiste ya no está disponible. Elegí otro horario o tipo de mesa.')
    leaveReview()
  }, [reviewIsStale, day, tablesForStart, toast, leaveReview])
  useEffect(() => {
    if (!reviewing) handledStaleReview.current = false
  }, [reviewing])

  // Each response is handled once: FR-013 clamps the party size and S4 clears a time that
  // is no longer available, without repeating the notice on a re-render (StrictMode).
  useEffect(() => {
    if (reviewing || !day || day === handledDay.current) return
    handledDay.current = day
    if (day.max_party_size > 0 && personas > day.max_party_size) {
      toast(`La capacidad máxima de este restaurante es de ${day.max_party_size} personas.`)
      update({ personas: day.max_party_size })
      return
    }
    if (hora && !day.slots.some((slot) => slot.start_time === hora && slot.available)) {
      toast(`El horario de las ${hora} ya no está disponible. Elegí otro.`)
      update({ hora: '' })
    }
  }, [day, hora, personas, reviewing, toast, update])

  // S6/S7: when the tables change, a preference with no table left goes back to «Sin preferencia».
  // Changing the preference alone never resets it: that is what the empty state of S7 is for.
  const tipoRef = useRef(tipo)
  useEffect(() => {
    tipoRef.current = tipo
  }, [tipo])
  useEffect(() => {
    if (reviewing || !tablesForStart || tablesForStart === handledTables.current) return
    handledTables.current = tablesForStart
    const preferred = tipoRef.current
    if (!preferred) return
    if (tablesForStart.tables.some((table) => table.seating_area === preferred)) return
    toast(
      `No quedan mesas en ${AREA_LABEL[preferred].toLowerCase()} para ese horario. Volvimos a «Sin preferencia».`,
    )
    update({ tipo: null })
  }, [reviewing, tablesForStart, toast, update])

  if (
    accountPending ||
    restaurantPending ||
    (reviewing && hora && (availability.isLoading || tables.isLoading))
  ) {
    return (
      <main className={styles.loading}>
        <LogoSpinner />
      </main>
    )
  }
  // The page (and the API behind it) is diner-only: a visitor signs in and comes back here, a
  // restaurant goes home.
  const backHere = `/ingresar?volver=${encodeURIComponent(location.pathname + location.search)}`
  if (account?.rol !== 'diner') return <Navigate to={account ? '/' : backHere} replace />

  if (!restaurant) {
    return (
      <main className={styles.container}>
        <h1 className={styles.title}>Restaurante no encontrado</h1>
        <p className={styles.muted}>El restaurante no existe o no está disponible.</p>
      </main>
    )
  }

  // The test restaurants of spec 002 aren't in the database: only real ones take reservations.
  if (!restaurant.bookable) {
    return (
      <main className={styles.container}>
        <h1 className={styles.title}>{restaurant.name}</h1>
        <p className={styles.muted}>Este restaurante todavía no toma reservas.</p>
        <Link to={`/restaurantes/${restaurant.id}`}>Volver al restaurante</Link>
      </main>
    )
  }

  const changeDate = (value: string) => {
    if (value && value < todayInBuenosAires()) {
      setPastDateError('No podés reservar en una fecha pasada.')
      return
    }
    if (value && value > latestBookableDate()) {
      setPastDateError(`Podés reservar hasta ${MAX_DAYS_AHEAD} días antes.`)
      return
    }
    setPastDateError('')
    update({ fecha: value })
  }

  // Until the first response gives the cap, the stepper stays at 1 and its "+" is disabled.
  const noTablesYet = maxPartySize === 0
  const shownParty = fecha === '' ? 1 : personas
  const stepperMax =
    fecha === '' || maxPartySize === undefined || maxPartySize === 0 ? shownParty : maxPartySize
  const aboveCap = maxPartySize !== undefined && personas > maxPartySize

  const areaIsFull = (area: SeatingArea) =>
    Boolean(
      hora &&
      tablesForStart &&
      !tables.isPending &&
      !tablesForStart.tables.some((table) => table.seating_area === area),
    )

  // «Siguiente» (US-11 → US-13, following prototipo-us11.html) opens the review; it only
  // lights up with a complete selection that has a free table.
  const freeTables = tablesForStart
    ? tablesForStart.tables.filter((table) => !tipo || table.seating_area === tipo).length
    : 0
  const canContinue =
    fecha !== '' &&
    hora !== '' &&
    !aboveCap &&
    !noTablesYet &&
    !tables.isPending &&
    Boolean(tablesForStart) &&
    freeTables > 0

  const slots = (
    <>
      {!fecha && <p className={styles.muted}>Elegí una fecha para ver los horarios.</p>}
      {fecha && availability.isPending && (
        <div className={styles.chips} aria-busy="true">
          <span className={styles.srOnly} role="status">
            Cargando horarios…
          </span>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} width={92} height={40} radius="var(--radius-pill)" />
          ))}
        </div>
      )}
      {fecha && !availability.isPending && !day && (
        <p className={styles.notice} role="alert">
          No pudimos cargar los horarios.
        </p>
      )}
      {day && !aboveCap && !noTablesYet && !day.open && (
        <p className={styles.notice} role="status">
          Ese día el restaurante no atiende.
        </p>
      )}
      {day && !aboveCap && !noTablesYet && day.open && day.slots.length === 0 && (
        <p className={styles.notice} role="status">
          Ya no quedan horarios para este día.
        </p>
      )}
      {day && !aboveCap && !noTablesYet && day.slots.length > 0 && (
        <div className={styles.slotList} aria-busy={availability.isFetching || undefined}>
          <div className={styles.chips} role="group" aria-label="Horarios disponibles">
            {day.slots.map((slot) => (
              <Chip
                key={slot.start_time}
                selected={hora === slot.start_time}
                disabled={!slot.available}
                className={styles.slotChip}
                onClick={() => update({ hora: slot.start_time })}
              >
                {slot.start_time}{' '}
                {!slot.available && <small className={styles.chipNote}>Ocupado</small>}
              </Chip>
            ))}
          </div>
          {day.slots.every((slot) => !slot.available) && (
            <p className={styles.notice} role="status">
              No quedan horarios con mesa libre para este día. Probá con otra fecha o con menos
              personas.
            </p>
          )}
        </div>
      )}
    </>
  )

  const tablesList = (
    <>
      {!aboveCap && !noTablesYet && !hora && (
        <p className={styles.muted}>Elegí un horario para ver las mesas.</p>
      )}
      {!aboveCap && !noTablesYet && hora && tables.isPending && (
        <div className={styles.tableList} aria-busy="true">
          <span className={styles.srOnly} role="status">
            Cargando mesas…
          </span>
          <Skeleton height={64} radius={18} />
          <Skeleton height={64} radius={18} />
        </div>
      )}
      {!aboveCap && !noTablesYet && hora && !tables.isPending && !tablesForStart && (
        <p className={styles.notice} role="alert">
          No pudimos cargar las mesas.
        </p>
      )}
      {!aboveCap && !noTablesYet && tablesForStart && (
        <>
          {tablesForStart.tables.filter((table) => !tipo || table.seating_area === tipo).length ===
          0 ? (
            <p className={styles.notice} role="status">
              No hay mesas disponibles para esta fecha y horario
              {tipo ? ' con esa preferencia' : ''}. Podés cambiar la fecha, el horario o la
              preferencia.
            </p>
          ) : (
            <p className={cx(styles.notice, styles.ok)} role="status">
              Hay mesa disponible{tipo ? ` en ${AREA_LABEL[tipo].toLowerCase()}` : ''} para ese día
              y horario. Te asignamos una automáticamente.
            </p>
          )}
        </>
      )}
    </>
  )

  // «Siguiente» adds a history entry, so the phone's back button returns to the selection.
  function openReview() {
    const params = paramsFromSelection(selection)
    params.set('paso', 'revision')
    reviewPushed.current = true
    setSearchParams(params)
  }

  function backToSelection() {
    if (reviewPushed.current) {
      reviewPushed.current = false
      navigate(-1)
      return
    }
    leaveReview()
  }

  function refreshAvailability() {
    void queryClient.invalidateQueries({ queryKey: ['availability'] })
    void queryClient.invalidateQueries({ queryKey: ['availability-tables'] })
    void queryClient.invalidateQueries({ queryKey: ['reservations'] })
  }

  const header = (
    <>
      <Link to={`/restaurantes/${restauranteId}`} className={styles.back}>
        ← Volver al restaurante
      </Link>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Reservar mesa</p>
          <h1 className={styles.title}>{restaurant.name}</h1>
          {(restaurant.cuisine || restaurant.location.neighborhood) && (
            <p className={styles.muted}>
              {[restaurant.cuisine, restaurant.location.neighborhood].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </header>
    </>
  )

  if (showConfirmed) {
    return (
      <main className={styles.container}>
        {header}
        <ConfirmedStep reservation={confirmed} />
      </main>
    )
  }

  if (reviewing && hora && tablesForStart && assignedTable) {
    return (
      <main className={styles.container}>
        {header}
        <ReviewStep
          restaurant={{ id: restaurant.id, name: restaurant.name }}
          fecha={fecha}
          hora={hora}
          endTime={timeInBuenosAires(tablesForStart.ends_at)}
          personas={personas}
          table={assignedTable}
          onBack={backToSelection}
          onConfirmed={(reservation) => {
            setConfirmed(reservation)
            // The review leaves the history: going back can't confirm the same review again.
            reviewPushed.current = false
            setSearchParams({ confirmada: reservation.id }, { replace: true })
            refreshAvailability()
          }}
          onConflict={(message) => {
            toast(message)
            refreshAvailability()
            leaveReview()
          }}
          // Signing out is enough: the redirect for visitors sends the diner to sign in and back.
          onSessionExpired={() => signOut(queryClient)}
        />
      </main>
    )
  }

  return (
    <main className={styles.container}>
      {header}

      <div className={styles.steps}>
        <Card className={styles.step}>
          <h2 className={styles.stepTitle}>
            <span className={styles.num} aria-hidden="true">
              1
            </span>
            ¿Cuándo y cuántos?
          </h2>
          <div className={styles.fields}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="fecha">
                Fecha
              </label>
              <input
                id="fecha"
                type="date"
                min={todayInBuenosAires()}
                max={latestBookableDate()}
                value={fecha}
                aria-invalid={pastDateError ? true : undefined}
                className={cx(styles.date, pastDateError && styles.dateInvalid)}
                onChange={(event) => changeDate(event.target.value)}
              />
              {pastDateError && (
                <p className={styles.error} role="alert">
                  {pastDateError}
                </p>
              )}
            </div>
            {noTablesYet ? (
              <p className={styles.notice} role="status">
                El restaurante todavía no tiene mesas disponibles.
              </p>
            ) : (
              <div className={styles.field}>
                <span className={styles.label}>Personas</span>
                <QuantityStepper
                  label="Cantidad de personas"
                  value={shownParty}
                  min={1}
                  max={stepperMax}
                  onChange={(value) => update({ personas: value })}
                />
                <p className={styles.hint}>
                  {maxPartySize !== undefined && maxPartySize > 0
                    ? `Máximo ${maxPartySize} personas`
                    : 'Elegí una fecha para ver el máximo.'}
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className={styles.step}>
          <h2 className={styles.stepTitle}>
            <span className={styles.num} aria-hidden="true">
              2
            </span>
            Horario
          </h2>
          {slots}
        </Card>

        <Card className={styles.step}>
          <h2 className={styles.stepTitle}>
            <span className={styles.num} aria-hidden="true">
              3
            </span>
            ¿Dónde querés sentarte?
          </h2>
          <div className={styles.chips} role="group" aria-label="Preferencia de tipo de mesa">
            <Chip selected={tipo === null} onClick={() => update({ tipo: null })}>
              Sin preferencia
            </Chip>
            {SEATING_AREAS.map((area) => {
              const full = areaIsFull(area.value)
              return (
                <Chip
                  key={area.value}
                  selected={tipo === area.value}
                  disabled={full}
                  className={styles.slotChip}
                  onClick={() => update({ tipo: area.value })}
                >
                  {area.label} {full && <small className={styles.chipNote}>Sin mesas</small>}
                </Chip>
              )
            })}
          </div>
          {tablesList}
        </Card>

        <div className={styles.actions}>
          <Button disabled={!canContinue} onClick={openReview}>
            Siguiente
          </Button>
        </div>
      </div>
    </main>
  )
}
