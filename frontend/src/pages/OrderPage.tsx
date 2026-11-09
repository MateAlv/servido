import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router'

import { retryUnlessSessionExpired, SessionExpiredError } from '../api/errors'
import {
  fetchOrder,
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
import { Button, Card, Modal, QuantityStepper, RollingNumber, StatusPill } from '../components/ui'
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
  return <OrderEditor reservationId={reservaId} initialPage={order.data} account={account} />
}

function OrderEditor({
  reservationId,
  initialPage,
  account,
}: {
  reservationId: string
  initialPage: OrderPageData
  account: Account
}) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(initialPage)
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
  const [billOpen, setBillOpen] = useState(false)
  const [billPrints, setBillPrints] = useState(0)
  // The dish shown up close, by id.
  const [viewing, setViewing] = useState<string | null>(null)
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
    return hasUnconfirmedChanges(lines, confirmedLines)
  }

  const refreshLists = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['reservations'] })
  }, [queryClient])

  const reload = useRef<(failure: WriteFailure) => void>(() => undefined)
  const cart = useOrderCart({
    reservationId,
    initialLines: initial.lines,
    confirmedLines,
    onSaveFailure: (failure) => reload.current(failure),
    onSettled: refreshLists,
  })
  const { lines, setLines, resetLines } = cart

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
  const barShown = page.reservation.order_open && (lines.length > 0 || unconfirmedNow())
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
    refreshLists()
    if (result.page.order) setConfirmedBanner(true)
    else setInfo('Quitaste tu pedido. Tu reserva sigue en pie.')
  }

  async function discard() {
    clearMessages()
    const result = await cart.discard()
    if (!result.ok) {
      if (result.kind === 'failed') setError(result.message)
      else await handleFailure(result)
      return
    }
    resetLines(withoutDeletedDishes(confirmedLines ?? []).lines)
    setInfo(
      confirmedLines ? 'Volviste al pedido confirmado.' : 'Descartaste el pedido sin confirmar.',
    )
  }

  const reservationLine = `${longDate(reservation.date)} · ${reservation.start_time} · ${
    reservation.party_size === 1 ? '1 persona' : `${reservation.party_size} personas`
  }`
  // The bill of what the page shows: the order being built, or the closed order.
  const receipt: {
    lines: ReceiptLine[]
    total: number
    estimate: number | null
    confirmed: boolean
  } | null = reservation.order_open
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
        arrival={reservation.start_time}
        confirmed={receipt.confirmed}
      />
    </Modal>
  )

  const summary = (
    <p className={styles.muted}>
      {longDate(reservation.date)} · {reservation.start_time} ·{' '}
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

  if (!reservation.order_open) {
    return (
      <main className={styles.container}>
        {header}
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
              {page.menu.length === 0 ? (
                'Tu pedido confirmado conserva sus datos.'
              ) : (
                <>Tu pedido ya está cerrado. Se podía cambiar hasta las {deadline}.</>
              )}
            </p>
            <Card className={styles.section}>
              <h2 className={styles.sectionTitle}>Tu pedido</h2>
              <ul className={styles.orderList}>
                {page.order.items.map((item) => (
                  <li key={`${item.dish_id}-${item.name}`} className={styles.orderRow}>
                    <span className={styles.orderName}>{item.name}</span>
                    <span className={styles.muted}>
                      {item.quantity} × {formatPrice(item.unit_price)}
                    </span>
                    <span className={styles.price}>{formatPrice(item.subtotal)}</span>
                  </li>
                ))}
              </ul>
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
          <Button to="/">Ir al inicio</Button>
        </div>
        {billModal}
      </main>
    )
  }

  const viewedDish = page.menu.find((dish) => dish.id === viewing)
  const viewedLine = viewedDish && lines.find((line) => line.dishId === viewedDish.id)

  const primaryLabel =
    lines.length === 0 ? 'Quitar pedido' : confirmedLines ? 'Confirmar cambios' : 'Confirmar pedido'
  const showPrimary = unconfirmed

  return (
    <main ref={mainRef} className={cx(styles.container, styles.withBar)}>
      {header}
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

      <div className={styles.layout}>
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
                            disabled={confirming || (inOrder?.quantity ?? 0) >= MAX_UNITS}
                            onAdd={() => setQuantity(dish, (inOrder?.quantity ?? 0) + 1)}
                          />
                          {inOrder && (
                            <span className={styles.inOrder}>{inOrder.quantity} en tu pedido</span>
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
                  <li key={line.dishId} data-dish={line.dishId} className={styles.orderRow}>
                    <span className={styles.orderName}>{line.name}</span>
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
                      disabled={confirming}
                      onChange={(quantity) => setQuantity(line, quantity)}
                    />
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
                    La cocina lo prepara para tu llegada a las {reservation.start_time}
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
            {unconfirmed && (
              <Button
                variant="ghost"
                size="sm"
                disabled={confirming}
                onClick={() => void discard()}
              >
                Descartar cambios
              </Button>
            )}
            {showPrimary && (
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
                  disabled={confirming}
                  onChange={(quantity) => setQuantity(viewedLine, quantity)}
                />
              )}
              <AddToOrderButton
                label={viewedLine ? 'Agregar otro' : 'Agregar al pedido'}
                itemName={viewedDish.name}
                disabled={confirming || (viewedLine?.quantity ?? 0) >= MAX_UNITS}
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
