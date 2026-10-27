import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router'

import {
  fetchAvailability,
  fetchAvailableTables,
  isUsingMockData,
  type DayAvailability,
  type SeatingArea,
  type TablesAvailability,
} from '../api/availability'
import { useAccount } from '../api/session'
import { LogoSpinner } from '../components/brand'
import {
  Button,
  Card,
  Chip,
  QuantityStepper,
  Skeleton,
  StatusPill,
  useToast,
} from '../components/ui'
import { fetchRestaurant } from '../data/restaurants.fixture'
import { cx } from '../lib/cx'
import { todayInBuenosAires } from '../lib/date'
import styles from './ReservationPage.module.css'

const SEATING_AREAS: { value: SeatingArea; label: string }[] = [
  { value: 'indoor', label: 'Adentro' },
  { value: 'outdoor', label: 'Afuera' },
  { value: 'terrace', label: 'Terraza' },
]

const AREA_LABEL: Record<SeatingArea, string> = {
  indoor: 'Adentro',
  outdoor: 'Afuera',
  terrace: 'Terraza',
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

type Selection = { fecha: string; hora: string; personas: number; tipo: SeatingArea | null }

/** Ignores what is missing or invalid, so a hand-edited link never selects it. */
function selectionFromParams(params: URLSearchParams): Selection {
  const today = todayInBuenosAires()
  const fecha = params.get('fecha') ?? ''
  const validFecha = DATE_PATTERN.test(fecha) && fecha >= today ? fecha : ''
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
 * Create a reservation (US-11, spec 005): date, time, party size and seating preference.
 * The selection lives in the URL, so reloading or going back keeps it (nothing is written).
 * The reservation itself is created in US-13, after the explicit confirmation.
 */
export function ReservationPage() {
  const { restauranteId = '' } = useParams<{ restauranteId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const { data: account, isPending: accountPending } = useAccount()
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
  })
  const tablesForStart: TablesAvailability | undefined = tables.data

  // Each response is handled once: FR-013 clamps the party size and S4 clears a time that
  // is no longer available, without repeating the notice on a re-render (StrictMode).
  const handledDay = useRef<DayAvailability | undefined>(undefined)
  useEffect(() => {
    if (!day || day === handledDay.current) return
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
  }, [day, hora, personas, toast, update])

  // S6/S7: when the tables change, a preference with no table left goes back to «Sin preferencia».
  // Changing the preference alone never resets it: that is what the empty state of S7 is for.
  const tipoRef = useRef(tipo)
  useEffect(() => {
    tipoRef.current = tipo
  }, [tipo])
  const handledTables = useRef<TablesAvailability | undefined>(undefined)
  useEffect(() => {
    if (!tablesForStart || tablesForStart === handledTables.current) return
    handledTables.current = tablesForStart
    const preferred = tipoRef.current
    if (!preferred) return
    if (tablesForStart.tables.some((table) => table.seating_area === preferred)) return
    toast(
      `No quedan mesas en ${AREA_LABEL[preferred].toLowerCase()} para ese horario. Volvimos a «Sin preferencia».`,
    )
    update({ tipo: null })
  }, [tablesForStart, toast, update])

  if (accountPending || restaurantPending) {
    return (
      <main className={styles.loading}>
        <LogoSpinner />
      </main>
    )
  }
  // The page (and the API behind it) is diner-only: a visitor signs in, a restaurant goes home.
  if (account?.rol !== 'diner') return <Navigate to={account ? '/' : '/ingresar'} replace />

  if (!restaurant) {
    return (
      <main className={styles.container}>
        <h1 className={styles.title}>Restaurante no encontrado</h1>
        <p className={styles.muted}>El restaurante no existe o no está disponible.</p>
      </main>
    )
  }

  const changeDate = (value: string) => {
    if (value && value < todayInBuenosAires()) {
      setPastDateError('No podés reservar en una fecha pasada.')
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

  // «Siguiente» (US-11 → US-13, following prototipo-us11.html): it only lights up with a
  // complete selection that has a free table. It does not navigate yet: the review step of
  // US-13 is built in Sprint 3.
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

  return (
    <main className={styles.container}>
      <Link to={`/restaurantes/${restauranteId}`} className={styles.back}>
        ← Volver al restaurante
      </Link>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Reservar mesa</p>
          <h1 className={styles.title}>{restaurant.name}</h1>
          <p className={styles.muted}>
            {restaurant.cuisine} · {restaurant.location.neighborhood}
          </p>
        </div>
        {isUsingMockData && (
          <StatusPill tone="warn" className={styles.mockPill}>
            Datos de prueba
          </StatusPill>
        )}
      </header>

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
          <Button disabled={!canContinue}>Siguiente</Button>
        </div>
      </div>
    </main>
  )
}
