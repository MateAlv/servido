import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router'

import { retryUnlessSessionExpired, SessionExpiredError } from '../api/errors'
import {
  fetchOrder,
  changePaymentMethod,
  type PaymentMethod,
  ReservationNotFoundError,
  SAVE_FAILED_MESSAGE,
  type CartLine,
  type MenuDish,
  type OrderPage as OrderPageData,
  type WriteFailure,
} from '../api/orders'
import { signOut, useAccount, type Account } from '../api/session'
import { UnverifiedNotice } from '../components/access'
import { LogoSpinner } from '../components/brand'
import {
  AddToOrderButton,
  DietaryBadges,
  DishDetails,
  Receipt,
  type ReceiptLine,
} from '../components/order'
import {
  Button,
  Card,
  Modal,
  QuantityStepper,
  RollingNumber,
  StatusPill,
  Chip,
} from '../components/ui'
import { IconCloche, IconClock, IconEye } from '../components/ui/icons'
import { cx } from '../lib/cx'
import { longDate, timeInBuenosAires } from '../lib/date'
import { formatCents, formatPrice, orderSummary, subtotalCents, toCents } from '../lib/orderSummary'
import {
  lineOf,
  linesOfCart,
  linesOfOrder,
  reconcile,
  withoutDeletedDishes,
} from '../lib/orderLines'
import { hasUnconfirmedChanges, useOrderCart } from '../lib/useOrderCart'
import fieldStyles from '../components/ui/TextField.module.css'
import styles from './OrderPage.module.css'

const MAX_UNITS = 20
const ANNOUNCE_DELAY_MS = 600

const CATEGORIES: [string, string][] = [
  ['entrada', 'Entradas'],
  ['plato_principal', 'Platos principales'],
  ['postre', 'Postres'],
  ['bebida', 'Bebidas'],
]

function dishCount(lines: CartLine[]): string {
  const count = lines.reduce((total, line) => total + line.quantity, 0)
  return count === 1 ? '1 plato' : `${count} platos`
}

/**
 * The pre-order of a reservation (US-17, spec 009-pedido-anticipado), with its estimated preparation time (US-19)
 * and the bill (US-21). What the diner builds is saved as their cart; the restaurant only sees
 * it once they confirm (P1).
 */
export function OrderPage() {
  const { reservaId = '' } = useParams<{ reservaId: string }>()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { data: account, isPending: accountPending } = useAccount()
  const isDiner = account?.rol === 'diner'
  const order = useQuery({
    queryKey: ['order', reservaId],
    queryFn: () => fetchOrder(reservaId),
    enabled: isDiner,
    // The page owns the cart while it is open: a refetch would overwrite what the diner sees.
    refetchOnWindowFocus: false,
    // Coming back must load the cart and order again, never a copy from the last visit.
    gcTime: 0,
    retry: (count, error) =>
      !(error instanceof ReservationNotFoundError) && retryUnlessSessionExpired(count, error),
  })

  useEffect(() => {
    document.title = 'Tu pedido · Servido!'
  }, [])
  useEffect(() => {
    if (order.error instanceof SessionExpiredError) signOut(queryClient)
  }, [order.error, queryClient])

  if (accountPending || (isDiner && order.isPending)) {
    return (
      <main className={styles.loading}>
        <LogoSpinner />
      </main>
    )
  }
  // The page (and the API behind it) is diner-only: a visitor signs in and comes back here, a
  // restaurant goes home.
  const backHere = `/ingresar?volver=${encodeURIComponent(location.pathname + location.search)}`
  if (!isDiner) return <Navigate to={account ? '/' : backHere} replace />

  if (order.error instanceof ReservationNotFoundError) {
    return (
      <main className={styles.container}>
        <h1 className={styles.title}>No encontramos esa reserva.</h1>
        <div className={styles.actions}>
          <Button to="/">Ir al inicio</Button>
        </div>
      </main>
    )
  }
  if (!order.data) {
    return (
      <main className={styles.container}>
        <p className={styles.notice} role="alert">
          No pudimos cargar tu pedido.
        </p>
        <div className={styles.actions}>
          <Button onClick={() => void order.refetch()}>Reintentar</Button>
        </div>
      </main>
    )
  }
  return (
    <OrderEditor
      reservationId={reservaId}
      initialPage={order.data}
      account={account}
      readOnly={new URLSearchParams(location.search).get('modo') === 'lectura'}
    />
  )
}

function OrderEditor({
  reservationId,
  initialPage,
  account,
  readOnly,
}: {
  reservationId: string
  initialPage: OrderPageData
  account: Account
  readOnly: boolean
}) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(initialPage)
  const [stage, setStage] = useState<'build' | 'review' | 'confirmed'>(
    initialPage.order ? 'confirmed' : 'build',
  )
  const [arrivalInput, setArrivalInput] = useState<string | null>(null)
  const confirmedLines = useMemo(() => linesOfOrder(page.order), [page.order])
  const [initial] = useState(() => {
    if (initialPage.cart) return reconcile(linesOfCart(initialPage.cart), initialPage.menu)
    if (!initialPage.reservation.order_open) return { lines: [], changes: [] }
    return withoutDeletedDishes(linesOfOrder(initialPage.order) ?? [])
  })
  const [changes, setChanges] = useState<string[]>(initial.changes)
  const [confirmedBanner, setConfirmedBanner] = useState(false)
  const [unverified, setUnverified] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [removed, setRemoved] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentSelection, setPaymentSelection] = useState<PaymentMethod | null>(null)
  const [paymentError, setPaymentError] = useState('')
  const [billOpen, setBillOpen] = useState(false)
  const [billPrints, setBillPrints] = useState(0)
  // The dish shown up close, by id.
  const [viewing, setViewing] = useState<string | null>(null)
  const arrivalFieldRef = useRef<HTMLSelectElement>(null)
  const stageTitleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    stageTitleRef.current?.focus()
  }, [stage])
  const changesRef = useRef<HTMLDivElement>(null)
  const bannerRef = useRef<HTMLHeadingElement>(null)
  const closedRef = useRef<HTMLParagraphElement>(null)
  const orderListRef = useRef<HTMLUListElement>(null)
  const orderTitleRef = useRef<HTMLHeadingElement>(null)
  const menuRef = useRef<HTMLElement>(null)
  const infoRef = useRef<HTMLParagraphElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  // Where focus goes once the next render is on screen (a removed dish, a disabled button).
  const afterRender = useRef<(() => void) | null>(null)

  function unconfirmedNow() {
    return (
      hasUnconfirmedChanges(lines, confirmedLines) ||
      cart.metadataChanged ||
      cart.hasPendingOperation
    )
  }

  const refreshLists = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['reservations'] })
  }, [queryClient])

  const initialMetadata = useMemo(
    () => ({
      arrival_at:
        initialPage.cart?.arrival_at ??
        initialPage.order?.arrival_at ??
        initialPage.arrival_window.starts_at,
      payment_method: initialPage.cart
        ? initialPage.cart.payment_method
        : (initialPage.order?.payment_method ?? null),
    }),
    [initialPage],
  )
  const confirmedMetadata = useMemo(
    () => ({
      arrival_at: page.order?.arrival_at ?? page.arrival_window.starts_at,
      payment_method: page.order?.payment_method ?? null,
    }),
    [page.order, page.arrival_window],
  )
  const reload = useRef<(failure: WriteFailure) => void>(() => undefined)
  const cart = useOrderCart({
    reservationId,
    accountId: account.id,
    initialMetadata,
    confirmedMetadata,
    initialLines: initial.lines,
    confirmedLines,
    onSaveFailure: (failure) => reload.current(failure),
    onSettled: refreshLists,
  })
  const { lines, setLines, resetLines } = cart
  useEffect(() => {
    const end = new Date(`${page.reservation.date}T${page.reservation.end_time}:00-03:00`).getTime()
    const deadline = new Date(page.reservation.order_deadline).getTime()
    const next = Math.min(...[deadline, end].filter((time) => time > Date.now()))
    if (!Number.isFinite(next)) return
    const timer = window.setTimeout(
      () => {
        void fetchOrder(reservationId)
          .then(setPage)
          .catch(() => undefined)
      },
      Math.min(next - Date.now() + 10, 2_147_483_647),
    )
    return () => window.clearTimeout(timer)
  }, [page.reservation, reservationId])

  /** A write failed: sign in again, or reload and say why (data-model.md rules 6 and 7). */
  async function handleFailure(failure: WriteFailure) {
    if (failure.kind === 'session') {
      signOut(queryClient)
      return
    }
    if (failure.kind === 'unverified') {
      setUnverified(true)
      return
    }
    if (failure.kind === 'failed') {
      setError(failure.message)
      return
    }
    let fresh: OrderPageData
    try {
      fresh = await fetchOrder(reservationId)
    } catch (reloadError) {
      if (reloadError instanceof SessionExpiredError) signOut(queryClient)
      else setError('No pudimos cargar tu pedido.')
      return
    }
    setPage(fresh)
    if (!fresh.reservation.order_open) {
      const updated =
        fresh.menu.length === 0 && fresh.reservation.status === 'confirmed'
          ? reconcile(lines, fresh.menu)
          : { lines: [], changes: [] }
      resetLines(updated.lines)
      setChanges(updated.changes)
      return
    }
    // The diner may have changed something while the reload was on its way: reconcile what the
    // page has now, not what it had when the request left.
    let found: string[] = []
    setLines((current) => {
      const updated = reconcile(current, fresh.menu)
      found = updated.changes
      return updated.lines
    })
    setChanges(found)
  }
  useEffect(() => {
    reload.current = handleFailure
  })

  // A saved cart whose dishes changed is brought up to date and saved again.
  useEffect(() => {
    if (initial.changes.length && page.reservation.order_open) setLines(() => initial.lines)
  }, [initial, setLines, page.reservation.order_open])

  useEffect(() => {
    if (changes.length) changesRef.current?.focus()
  }, [changes])
  useEffect(() => {
    if (confirmedBanner) bannerRef.current?.focus()
  }, [confirmedBanner])
  useEffect(() => {
    if (!page.reservation.order_open) closedRef.current?.focus()
  }, [page.reservation.order_open])

  useEffect(() => {
    if (info) infoRef.current?.focus()
  }, [info])
  useEffect(() => {
    const move = afterRender.current
    afterRender.current = null
    move?.()
  }, [lines])

  const { totalCents, prepTimeMinutes } = orderSummary(lines)
  const announcement = lines.length
    ? `Total ${formatCents(totalCents)}.${prepTimeMinutes ? ` Preparación: unos ${prepTimeMinutes} min.` : ''}`
    : ''
  // Starts at the current summary, so opening the page announces nothing.
  const [announced, setAnnounced] = useState(announcement)
  useEffect(() => {
    const timer = window.setTimeout(() => setAnnounced(announcement), ANNOUNCE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [announcement])

  // The page keeps room for the bottom bar, and toasts rise above it, whatever its height (its
  // actions wrap at 360 px).
  const barShown = stage !== 'confirmed' && page.reservation.order_open
  useEffect(() => {
    const bar = barRef.current
    const root = document.documentElement
    if (!bar) return
    const update = () => {
      mainRef.current?.style.setProperty('--order-bar-height', `${bar.offsetHeight}px`)
      root.style.setProperty('--toast-bottom', `${bar.offsetHeight + 16}px`)
    }
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(bar)
    return () => {
      observer?.disconnect()
      root.style.removeProperty('--toast-bottom')
    }
  }, [barShown])

  const reservation = page.reservation
  const deadline = timeInBuenosAires(reservation.order_deadline)
  const unconfirmed = unconfirmedNow()

  function clearMessages() {
    setChanges([])
    setConfirmedBanner(false)
    setError('')
    setInfo('')
    setRemoved('')
  }

  function setQuantity(dish: { dishId: string } | MenuDish, quantity: number) {
    clearMessages()
    const dishId = 'dishId' in dish ? dish.dishId : dish.id
    if (quantity <= 0) {
      const index = lines.findIndex((line) => line.dishId === dishId)
      const next = lines[index + 1] ?? lines[index - 1]
      setRemoved(`${lines[index]?.name}: lo sacaste del pedido.`)
      // Focus goes to the next dish of «Tu pedido», or back to this dish in the menu.
      afterRender.current = () =>
        (next
          ? orderListRef.current?.querySelector<HTMLElement>(`[data-dish="${next.dishId}"] button`)
          : menuRef.current?.querySelector<HTMLElement>(`[data-dish="${dishId}"] [data-add] button`)
        )?.focus()
    } else if (quantity >= MAX_UNITS) {
      // The "+" just pressed is disabled at the maximum: focus stays on this dish's "−".
      afterRender.current = () =>
        orderListRef.current?.querySelector<HTMLElement>(`[data-dish="${dishId}"] button`)?.focus()
    }
    setLines((current) => {
      if (quantity <= 0) return current.filter((line) => line.dishId !== dishId)
      if (current.some((line) => line.dishId === dishId)) {
        return current.map((line) => (line.dishId === dishId ? { ...line, quantity } : line))
      }
      return 'dishId' in dish ? current : [...current, lineOf(dish, quantity)]
    })
  }

  async function confirm() {
    if (!cart.hasPendingOperation && lines.length > 0 && arrivalError) {
      arrivalFieldRef.current?.focus()
      return
    }
    if (!cart.hasPendingOperation && lines.length > 0 && cart.metadata.payment_method === null) {
      setError('Seleccioná un medio de pago para confirmar tu pedido.')
      return
    }
    clearMessages()
    setUnverified(false)
    setConfirming(true)
    const result = await cart.confirm()
    setConfirming(false)
    setRemoving(false)
    if (!result.ok) {
      if (result.kind === 'failed') setError(result.message)
      else await handleFailure(result)
      return
    }
    setPage(result.page)
    setArrivalInput(null)
    refreshLists()
    if (result.page.order) {
      setConfirmedBanner(true)
      setStage('confirmed')
    } else setStage('build')
    if (!result.page.order) setInfo('Quitaste tu pedido. Tu reserva sigue en pie.')
  }

  async function discard() {
    clearMessages()
    setArrivalInput(null)
    const result = await cart.discard()
    if (!result.ok) {
      if (result.kind === 'failed') setError(result.message)
      else await handleFailure(result)
      return
    }
    resetLines(withoutDeletedDishes(confirmedLines ?? []).lines)
    if (page.order) {
      setPage((current) => ({
        ...current,
        cart: null,
        reservation: { ...current.reservation, has_cart: false },
      }))
      setStage('confirmed')
    }
    setInfo(
      confirmedLines ? 'Volviste al pedido confirmado.' : 'Descartaste el pedido sin confirmar.',
    )
  }

  const reservationLine = `${longDate(reservation.date)} · ${reservation.start_time}–${reservation.end_time} · ${
    reservation.party_size === 1 ? '1 persona' : `${reservation.party_size} personas`
  }`
  // The bill of what the page shows: the order being built, or the closed order.
  const receipt: {
    lines: ReceiptLine[]
    total: number
    estimate: number | null
    confirmed: boolean
  } | null =
    reservation.order_open && stage !== 'confirmed'
      ? {
          lines: lines.map((line) => ({
            name: line.name,
            quantity: line.quantity,
            unitPriceCents: toCents(line.unitPrice),
            subtotalCents: subtotalCents(line),
          })),
          total: totalCents,
          estimate: prepTimeMinutes,
          confirmed: !unconfirmed,
        }
      : page.order
        ? {
            lines: page.order.items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              unitPriceCents: toCents(item.unit_price),
              subtotalCents: toCents(item.subtotal),
            })),
            total: toCents(page.order.total),
            estimate: page.order.prep_time_minutes,
            confirmed: true,
          }
        : null
  const billButton = (
    <Button
      variant="secondary"
      size="sm"
      aria-haspopup="dialog"
      className={styles.billButton}
      onClick={() => {
        setBillPrints((count) => count + 1)
        setBillOpen(true)
      }}
    >
      Ver detalle de la cuenta
    </Button>
  )
  // Outside «Tu pedido», so the closed dialog doesn't repeat its text there. The key prints the
  // receipt again every time it opens.
  const billModal = receipt && (
    <Modal open={billOpen} onClose={() => setBillOpen(false)} title="Detalle de la cuenta">
      <Receipt
        key={billPrints}
        restaurant={reservation.restaurant.nombre}
        reservation={reservationLine}
        lines={receipt.lines}
        totalCents={receipt.total}
        prepTimeMinutes={receipt.estimate}
        arrival={timeInBuenosAires(
          reservation.order_open && stage !== 'confirmed'
            ? cart.metadata.arrival_at
            : page.order!.arrival_at,
        )}
        confirmed={receipt.confirmed}
      />
    </Modal>
  )

  const selectedArrival = arrivalInput ?? timeInBuenosAires(cart.metadata.arrival_at)
  const earliestArrival = timeInBuenosAires(page.arrival_window.starts_at)
  const latestArrival = timeInBuenosAires(page.arrival_window.latest_at)
  const arrivalOptions: { time: string; instant: string }[] = []
  for (
    let instant = new Date(page.arrival_window.starts_at).getTime();
    instant <= new Date(page.arrival_window.latest_at).getTime();
    instant += 60_000
  ) {
    const iso = new Date(instant).toISOString()
    arrivalOptions.push({ time: timeInBuenosAires(iso), instant: iso })
  }
  function arrivalWithinWindow(value: string) {
    return arrivalOptions.some((option) => option.time === value)
  }
  const arrivalError = !arrivalWithinWindow(selectedArrival)
    ? `Elegí una hora entre las ${earliestArrival} y las ${latestArrival}, inclusive. El horario de fin de la reserva no cambia.`
    : ''
  const paymentChoices = (
    selected: PaymentMethod | null,
    choose: (method: PaymentMethod) => void,
    disabled: boolean,
  ) => (
    <div className={styles.paymentChoices} role="group" aria-label="Medio de pago">
      {(['cash', 'online'] as const).map((method) => (
        <Chip
          key={method}
          selected={selected === method}
          disabled={disabled}
          onClick={() => choose(method)}
        >
          {method === 'cash' ? 'Efectivo' : 'Pago electrónico'}
        </Chip>
      ))}
    </div>
  )
  const draftControls = reservation.order_open && (
    <Card className={styles.section}>
      <div className={cx(fieldStyles.field, arrivalError && fieldStyles.invalid)}>
        <label className={fieldStyles.label} htmlFor="order-arrival">
          Hora de llegada
        </label>
        <select
          ref={arrivalFieldRef}
          id="order-arrival"
          className={fieldStyles.input}
          value={selectedArrival}
          aria-invalid={arrivalError ? true : undefined}
          aria-describedby={
            arrivalError ? 'order-arrival-hint order-arrival-error' : 'order-arrival-hint'
          }
          disabled={confirming || cart.hasPendingOperation}
          onChange={(event) => {
            const value = event.target.value
            setArrivalInput(value)
            setError('')
            const option = arrivalOptions.find((candidate) => candidate.time === value)
            if (option) cart.setMetadata({ ...cart.metadata, arrival_at: option.instant })
          }}
        >
          {arrivalError && (
            <option value="" disabled>
              Elegí una hora válida
            </option>
          )}
          {arrivalOptions.map((option) => (
            <option key={option.instant} value={option.time}>
              {option.time}
            </option>
          ))}
        </select>
        <p id="order-arrival-hint" className={fieldStyles.hint}>
          Elegí desde el inicio de la reserva hasta 30 minutos después. El horario de fin no cambia.
        </p>
        {arrivalError && (
          <p id="order-arrival-error" role="alert" className={fieldStyles.error}>
            {arrivalError}
          </p>
        )}
      </div>
      <h2 className={styles.sectionTitle}>Medio de pago</h2>
      {paymentChoices(
        cart.metadata.payment_method,
        (method) => cart.setMetadata({ ...cart.metadata, payment_method: method }),
        confirming || cart.hasPendingOperation,
      )}
      {cart.metadata.payment_method === null && <p>Medio de pago no seleccionado</p>}
      <p className={styles.hint}>
        {cart.metadata.payment_method === null ? 'Seleccioná un medio para confirmar. ' : ''}
        Elegir pago electrónico no inicia un cobro.
      </p>
    </Card>
  )
  const paymentRestriction =
    page.order?.payment_status === 'paid'
      ? 'El pedido ya está pagado. No se puede cambiar el medio de pago.'
      : page.reservation.status === 'cancelled'
        ? 'La reserva está cancelada. No se puede cambiar el medio de pago.'
        : 'El medio de pago solo se puede cambiar antes de que finalice la reserva y mientras el pedido siga vigente e impago.'

  async function savePayment() {
    if (!page.order?.payment_method_editable || paymentSelection === null || confirming) return
    setPaymentError('')
    setConfirming(true)
    try {
      const result = await changePaymentMethod(reservationId, paymentSelection)
      if (result.ok) {
        if (!unconfirmedNow())
          cart.resetMetadata({
            arrival_at: result.page.order!.arrival_at,
            payment_method: result.page.order!.payment_method,
          })
        setPage(result.page)
        refreshLists()
        setPaymentOpen(false)
        setInfo('Guardaste el cambio del medio de pago.')
      } else if (result.kind === 'session') {
        signOut(queryClient)
      } else if (result.kind === 'conflict') {
        // Refresh confirmed eligibility without reconciling or discarding the private cart.
        const fresh = await fetchOrder(reservationId)
        setPage(fresh)
        setPaymentError(
          'No se pudo guardar el cambio. El pedido o la reserva cambió; revisá si todavía se permite modificar el medio de pago.',
        )
      } else setPaymentError(result.message)
    } catch (failure) {
      if (failure instanceof SessionExpiredError) signOut(queryClient)
      else setPaymentError('No pudimos guardar el medio de pago. Probá de nuevo.')
    } finally {
      setConfirming(false)
    }
  }

  const confirmedPayment = page.order && (
    <section className={styles.paymentSummary} aria-labelledby="confirmed-payment-title">
      <h3 id="confirmed-payment-title" className={styles.paymentTitle}>
        Medio de pago
      </h3>
      <p>
        {page.order.payment_method === 'cash'
          ? 'Efectivo'
          : page.order.payment_method === 'online'
            ? 'Pago electrónico'
            : 'Medio de pago no seleccionado'}
      </p>
      <p>{page.order.payment_status === 'paid' ? 'Pagado' : 'Pendiente de pago'}</p>
      {!page.order.payment_method_editable && <p className={styles.hint}>{paymentRestriction}</p>}
      <p className={styles.hint}>La selección no implica que el pedido esté pagado.</p>
    </section>
  )
  const paymentModal = (
    <Modal
      open={paymentOpen}
      onClose={() => {
        if (!confirming) setPaymentOpen(false)
      }}
      title="Modificar medio de pago"
      footer={
        <div className={styles.barActions}>
          <Button variant="secondary" disabled={confirming} onClick={() => setPaymentOpen(false)}>
            Cancelar
          </Button>
          <Button
            loading={confirming}
            disabled={
              !page.order?.payment_method_editable ||
              paymentSelection === null ||
              paymentSelection === page.order.payment_method
            }
            onClick={() => void savePayment()}
          >
            Guardar cambio
          </Button>
        </div>
      }
    >
      {paymentChoices(
        paymentSelection,
        setPaymentSelection,
        confirming || !page.order?.payment_method_editable,
      )}
      <p className={styles.hint}>
        Solo cambia el medio de pago. Elegir pago electrónico no inicia un cobro.
      </p>
      {paymentOpen && !page.order?.payment_method_editable && (
        <p role="status">{paymentRestriction}</p>
      )}
      {paymentError && (
        <p className={styles.error} role="alert">
          {paymentError}
        </p>
      )}
    </Modal>
  )
  const retryControl = cart.hasPendingOperation && (
    <Button loading={confirming} onClick={() => void confirm()}>
      Reintentar confirmación
    </Button>
  )
  const summary = (
    <p className={styles.muted}>
      {longDate(reservation.date)} · {reservation.start_time}–{reservation.end_time} ·{' '}
      {reservation.party_size === 1 ? '1 persona' : `${reservation.party_size} personas`}
    </p>
  )
  const header = (
    <>
      <Link to="/" className={styles.back}>
        ← Ir al inicio
      </Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Tu pedido</p>
        <h1 className={styles.title}>{reservation.restaurant.nombre}</h1>
        {summary}
      </header>
    </>
  )

  if (!reservation.order_open || stage === 'confirmed') {
    return (
      <main className={styles.container}>
        {header}
        {confirmedBanner && (
          <h2 ref={bannerRef} tabIndex={-1} className={styles.bannerTitle}>
            ¡Pedido confirmado!
          </h2>
        )}
        {retryControl}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {info && (
          <p ref={infoRef} tabIndex={-1} className={styles.notice} role="status">
            {info}
          </p>
        )}
        {changes.length > 0 && (
          <div ref={changesRef} tabIndex={-1} role="alert" className={styles.warn}>
            {changes.map((change) => (
              <p key={change}>{change}</p>
            ))}
          </div>
        )}
        {page.menu.length === 0 && reservation.status === 'confirmed' && (
          <p role="status">El restaurante no tiene platos disponibles por ahora.</p>
        )}
        {page.order ? (
          <>
            <p ref={closedRef} tabIndex={-1} className={styles.notice} role="status">
              {reservation.order_open ? (
                <>Pedido confirmado. Podés cambiar los platos hasta las {deadline}.</>
              ) : page.menu.length === 0 ? (
                'Tu pedido confirmado conserva sus datos.'
              ) : (
                <>Tu pedido ya está cerrado. Se podía cambiar hasta las {deadline}.</>
              )}
            </p>
            <Card className={styles.section}>
              <h2 ref={stageTitleRef} tabIndex={-1} className={styles.sectionTitle}>
                Tu pedido
              </h2>
              <StatusPill tone="ok">Pedido confirmado</StatusPill>
              <ul className={styles.orderList}>
                {page.order.items.map((item) => (
                  <li
                    key={`${item.dish_id}-${item.name}`}
                    className={cx(styles.orderRow, styles.confirmedRow)}
                  >
                    <span className={styles.orderName}>{item.name}</span>
                    <span className={styles.muted}>
                      {item.quantity} × {formatPrice(item.unit_price)}
                    </span>
                    <span className={styles.price}>{formatPrice(item.subtotal)}</span>
                  </li>
                ))}
              </ul>
              <p>Llegada confirmada: {timeInBuenosAires(page.order.arrival_at)}</p>
              {page.order.prep_time_minutes !== null && (
                <p className={styles.estimate}>
                  Preparación: unos {page.order.prep_time_minutes} min
                </p>
              )}
              <p className={styles.total}>
                <span>Total del pedido</span>
                <strong>{formatPrice(page.order.total)}</strong>
              </p>
              <p className={styles.hint}>Impuestos incluidos</p>
              {confirmedPayment}
              {billButton}
            </Card>
          </>
        ) : (
          <p ref={closedRef} tabIndex={-1} className={styles.notice} role="status">
            Ya no se pueden hacer pedidos para esta reserva. Igual te esperamos a las{' '}
            {reservation.start_time}.
          </p>
        )}
        <div className={styles.actions}>
          {reservation.order_open && !readOnly && (
            <Button
              onClick={() => {
                setConfirmedBanner(false)
                setStage('build')
              }}
              disabled={confirming || cart.hasPendingOperation}
            >
              Modificar platos
            </Button>
          )}
          {page.order?.payment_method_editable && !readOnly && (
            <Button
              variant="secondary"
              disabled={confirming || cart.hasPendingOperation}
              onClick={() => {
                setPaymentSelection(page.order!.payment_method)
                setPaymentError('')
                setInfo('')
                setPaymentOpen(true)
              }}
            >
              Modificar medio de pago
            </Button>
          )}
          <Button to="/" variant="secondary">
            Ir al inicio
          </Button>
        </div>
        {billModal}
        {paymentModal}
      </main>
    )
  }

  const viewedDish = page.menu.find((dish) => dish.id === viewing)
  const viewedLine = viewedDish && lines.find((line) => line.dishId === viewedDish.id)

  const primaryLabel =
    lines.length === 0 ? 'Quitar pedido' : confirmedLines ? 'Confirmar cambios' : 'Confirmar pedido'
  const showPrimary = unconfirmed && (lines.length > 0 || confirmedLines !== null)

  return (
    <main ref={mainRef} className={cx(styles.container, styles.withBar)}>
      {header}
      <h2 className={styles.sectionTitle} tabIndex={-1} ref={stageTitleRef}>
        {stage === 'build' ? '1. Armar pedido' : '2. Revisar y confirmar'}
      </h2>
      {retryControl}
      <p className={styles.deadline}>Podés cambiarlo hasta las {deadline}.</p>

      {confirmedBanner && (
        <div className={cx(styles.notice, styles.ok)}>
          <h2 ref={bannerRef} tabIndex={-1} className={styles.bannerTitle}>
            ¡Pedido confirmado!
          </h2>
          <p>El restaurante ya lo tiene. Podés cambiarlo hasta las {deadline}.</p>
          <Button to="/" variant="secondary" size="sm">
            Ir al inicio
          </Button>
        </div>
      )}
      {changes.length > 0 && (
        <div ref={changesRef} tabIndex={-1} className={styles.warn} role="alert">
          <p>El menú cambió. Revisá tu pedido antes de confirmarlo.</p>
          <ul>
            {changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </div>
      )}
      {unverified && (
        <div className={styles.warn} role="alert">
          <p>Para confirmar, verificá tu email. Tus platos quedan guardados.</p>
          <UnverifiedNotice account={{ ...account, email_verificado: false }} />
        </div>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {cart.saveFailed && !error && (
        <p className={styles.notice} role="status">
          {SAVE_FAILED_MESSAGE}
        </p>
      )}
      {info && (
        <p ref={infoRef} tabIndex={-1} className={styles.notice} role="status">
          {info}
        </p>
      )}

      <div className={stage === 'build' ? styles.layout : styles.reviewLayout}>
        {stage === 'build' && (
          <section ref={menuRef} aria-labelledby="menu-title" className={styles.menu}>
            <h2 id="menu-title" className={styles.sectionTitle}>
              Menú
            </h2>
            {CATEGORIES.map(([category, label]) => {
              const dishes = page.menu.filter((dish) => dish.category === category)
              if (!dishes.length) return null
              return (
                <section key={category} className={styles.category}>
                  <h3 className={styles.categoryTitle}>{label}</h3>
                  <ul className={styles.dishes}>
                    {dishes.map((dish) => {
                      const inOrder = lines.find((line) => line.dishId === dish.id)
                      return (
                        <li key={dish.id} data-dish={dish.id} className={styles.dish}>
                          <button
                            type="button"
                            className={styles.dishOpen}
                            aria-haspopup="dialog"
                            onClick={() => setViewing(dish.id)}
                          >
                            <span className={styles.thumb}>
                              {dish.photo_url ? (
                                <img src={dish.photo_url} alt="" className={styles.photo} />
                              ) : (
                                <IconCloche className={styles.thumbIcon} />
                              )}
                              <span className={styles.peek} aria-hidden="true">
                                <IconEye />
                                Ver
                              </span>
                            </span>
                            <span className={styles.dishInfo}>
                              <span className={styles.dishName}>{dish.name}</span>
                              {dish.description && (
                                <span className={styles.dishDescription}>{dish.description}</span>
                              )}
                              <span className={styles.dishMeta}>
                                <span className={styles.price}>{formatPrice(dish.price)}</span>
                                {dish.prep_time_minutes !== null && (
                                  <span className={styles.dishTime}>
                                    <IconClock aria-hidden="true" />
                                    <span aria-hidden="true">{dish.prep_time_minutes} min</span>
                                    <span className="visually-hidden">
                                      Se prepara en {dish.prep_time_minutes} min
                                    </span>
                                  </span>
                                )}
                              </span>
                              <DietaryBadges restrictions={dish.dietary_restrictions} inline />
                            </span>
                          </button>
                          <div className={styles.dishAction} data-add="">
                            <AddToOrderButton
                              size="sm"
                              label={inOrder ? 'Agregar otro' : 'Agregar al pedido'}
                              itemName={dish.name}
                              disabled={
                                confirming ||
                                cart.hasPendingOperation ||
                                (inOrder?.quantity ?? 0) >= MAX_UNITS
                              }
                              onAdd={() => setQuantity(dish, (inOrder?.quantity ?? 0) + 1)}
                            />
                            {inOrder && (
                              <span className={styles.inOrder}>
                                {inOrder.quantity} en tu pedido
                              </span>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })}
          </section>
        )}

        <aside aria-labelledby="order-title" className={styles.side}>
          <Card className={styles.section}>
            <h2 id="order-title" ref={orderTitleRef} tabIndex={-1} className={styles.sectionTitle}>
              Tu pedido
            </h2>
            {lines.length === 0 ? (
              <p className={styles.muted}>
                {confirmedLines
                  ? 'Sacaste todos los platos. Confirmá para quitar el pedido, o descartá los cambios.'
                  : 'Agregá platos del menú para armar tu pedido.'}
              </p>
            ) : (
              <ul ref={orderListRef} className={styles.orderList}>
                {lines.map((line) => (
                  <li
                    key={line.dishId}
                    data-dish={line.dishId}
                    className={cx(styles.orderRow, stage === 'review' && styles.confirmedRow)}
                  >
                    <span className={styles.orderName}>{line.name}</span>
                    {stage === 'review' ? (
                      <span className={styles.muted}>
                        {line.quantity} × {formatPrice(line.unitPrice)}
                      </span>
                    ) : (
                      <QuantityStepper
                        label={`Cantidad de ${line.name}`}
                        value={line.quantity}
                        min={0}
                        max={MAX_UNITS}
                        decreaseLabel={
                          line.quantity === 1 ? `Sacar ${line.name} del pedido` : 'Quitar uno'
                        }
                        maxHint={`Máximo ${MAX_UNITS} por plato`}
                        announce={false}
                        disabled={confirming || cart.hasPendingOperation}
                        onChange={(quantity) => setQuantity(line, quantity)}
                      />
                    )}
                    <span className={styles.price}>{formatCents(subtotalCents(line))}</span>
                  </li>
                ))}
              </ul>
            )}

            {prepTimeMinutes !== null && (
              <div className={styles.estimate}>
                <IconClock className={styles.estimateIcon} aria-hidden="true" />
                <div>
                  <p className={styles.estimateValue}>Preparación: unos {prepTimeMinutes} min</p>
                  <p className={styles.hint}>
                    La cocina lo prepara para tu llegada a las{' '}
                    {timeInBuenosAires(cart.metadata.arrival_at)}
                  </p>
                </div>
              </div>
            )}

            {lines.length > 0 && (
              <>
                <p className={styles.total}>
                  <span>Total del pedido</span>
                  <strong>
                    <RollingNumber value={totalCents} format={formatCents} />
                  </strong>
                </p>
                <p className={styles.hint}>Impuestos incluidos</p>
                {billButton}
              </>
            )}
          </Card>
        </aside>
      </div>

      {stage === 'review' && draftControls}

      <span className="visually-hidden" aria-live="polite">
        {removed} {announced}
      </span>

      {barShown && (
        <div ref={barRef} className={styles.bar}>
          <div className={styles.barSummary}>
            <button
              type="button"
              className={styles.barCount}
              onClick={() => orderTitleRef.current?.focus()}
            >
              {dishCount(lines)} · {formatCents(totalCents)}
            </button>
            <span className={styles.hint}>
              Impuestos incluidos
              {prepTimeMinutes !== null && ` · Preparación: unos ${prepTimeMinutes} min`}
            </span>
            {unconfirmed && (
              <span className={styles.unconfirmed}>
                Sin confirmar: el restaurante todavía no lo ve
              </span>
            )}
            {!unconfirmed && confirmedLines && <StatusPill tone="ok">Pedido confirmado</StatusPill>}
          </div>
          <div className={styles.barActions}>
            {page.order && (
              <Button
                variant="secondary"
                disabled={confirming || cart.hasPendingOperation}
                onClick={() => setStage('confirmed')}
              >
                Volver al pedido confirmado
              </Button>
            )}
            {unconfirmed && (
              <Button
                variant="ghost"
                size="sm"
                disabled={confirming || cart.hasPendingOperation}
                onClick={() => void discard()}
              >
                Descartar cambios
              </Button>
            )}
            {stage === 'review' && (
              <Button
                variant="secondary"
                disabled={confirming || cart.hasPendingOperation}
                onClick={() => setStage('build')}
              >
                Volver a editar platos
              </Button>
            )}
            {stage === 'build' && (
              <Button
                disabled={confirming || cart.hasPendingOperation}
                onClick={() => setStage('review')}
              >
                Continuar
              </Button>
            )}
            {showPrimary && (stage === 'review' || lines.length === 0) && (
              <Button
                loading={confirming}
                onClick={() => (lines.length === 0 ? setRemoving(true) : void confirm())}
              >
                {primaryLabel}
              </Button>
            )}
          </div>
        </div>
      )}

      {billModal}

      <Modal
        open={viewedDish !== undefined}
        onClose={() => setViewing(null)}
        title={viewedDish?.name ?? ''}
        footer={
          viewedDish && (
            <div className={styles.dishModalActions}>
              {viewedLine && (
                <QuantityStepper
                  label={`Cantidad de ${viewedDish.name}`}
                  value={viewedLine.quantity}
                  min={0}
                  max={MAX_UNITS}
                  decreaseLabel={
                    viewedLine.quantity === 1 ? `Sacar ${viewedDish.name} del pedido` : 'Quitar uno'
                  }
                  maxHint={`Máximo ${MAX_UNITS} por plato`}
                  announce={false}
                  disabled={confirming || cart.hasPendingOperation}
                  onChange={(quantity) => setQuantity(viewedLine, quantity)}
                />
              )}
              <AddToOrderButton
                label={viewedLine ? 'Agregar otro' : 'Agregar al pedido'}
                itemName={viewedDish.name}
                disabled={
                  confirming || cart.hasPendingOperation || (viewedLine?.quantity ?? 0) >= MAX_UNITS
                }
                onAdd={() => setQuantity(viewedDish, (viewedLine?.quantity ?? 0) + 1)}
              />
            </div>
          )
        }
      >
        {viewedDish && <DishDetails dish={viewedDish} />}
      </Modal>

      <Modal
        open={removing}
        onClose={() => {
          if (!confirming) setRemoving(false)
        }}
        title="¿Quitás tu pedido?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(false)}>
              Volver
            </Button>
            <Button loading={confirming} onClick={() => void confirm()}>
              Quitar pedido
            </Button>
          </>
        }
      >
        <p>
          Tu reserva sigue en pie, pero el restaurante no va a tener platos preparados para tu
          llegada.
        </p>
      </Modal>
    </main>
  )
}
