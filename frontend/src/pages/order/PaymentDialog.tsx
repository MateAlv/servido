import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ComponentProps } from 'react'

import { SessionExpiredError } from '../../api/errors'
import {
  fetchOrder,
  fetchPaymentConfig,
  payOrder,
  paymentCard,
  type CardFormData,
  type ConfirmedOrder,
  type OrderPage,
  type OrderPayment,
} from '../../api/orders'
import { CardPaymentForm, Receipt } from '../../components/order'
import { ConfirmationStamp } from '../../components/reservation'
import { Button, Modal, Skeleton } from '../../components/ui'
import { cx } from '../../lib/cx'
import { dateTimeInBuenosAires } from '../../lib/date'
import { formatPrice, toCents } from '../../lib/orderSummary'
import { newRequestId } from '../../lib/requestId'
import styles from './PaymentDialog.module.css'
import { TestCards } from './TestCards'

type PaymentDialogProps = {
  open: boolean
  onClose: () => void
  /** After the closing animation: the page unmounts the dialog then. */
  onClosed?: () => void
  reservationId: string
  order: ConfirmedOrder
  /** The bill as the order page prints it; an approved payment turns it into the receipt. */
  bill: Omit<ComponentProps<typeof Receipt>, 'payment'>
  /** The account's email: the receipt mail goes there, not to the email typed in the card form. */
  receiptEmail: string
  onPage: (page: OrderPage) => void
  onSessionExpired: () => void
  /** The order changed elsewhere (already paid, a payment in review, the reservation ended). */
  onConflict: (message: string) => void
  onPayInCash: () => void
}

type Failure = { kind: 'rejected' | 'failed'; message: string }

class PaymentNotDone extends Error {}

/** Paying the order with a card through Mercado Pago (spec 032, US-56), from the bill to the
 * receipt. */
export function PaymentDialog({
  open,
  onClose,
  onClosed,
  reservationId,
  order,
  bill,
  receiptEmail,
  onPage,
  onSessionExpired,
  onConflict,
  onPayInCash,
}: PaymentDialogProps) {
  const config = useQuery({
    queryKey: ['payment-config'],
    queryFn: fetchPaymentConfig,
    enabled: open,
    staleTime: Infinity,
  })
  const [view, setView] = useState<'pay' | 'approved' | 'review'>('pay')
  const [paying, setPaying] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [failures, setFailures] = useState(0)
  const [payment, setPayment] = useState<OrderPayment | null>(null)
  const resultTitle = useRef<HTMLHeadingElement>(null)

  // The result replaces the form, which may have been scrolled down: start it from the stamp.
  useEffect(() => {
    if (view === 'pay') return
    resultTitle.current?.parentElement?.scrollIntoView?.({ block: 'start' })
    resultTitle.current?.focus({ preventScroll: true })
  }, [view])

  function fail(next: Failure): never {
    setFailure(next)
    setFailures((count) => count + 1)
    throw new PaymentNotDone(next.message)
  }

  /** Mercado Pago's form waits on this promise: it rejects when the payment did not go through,
   * which unlocks the form for another try. */
  async function submitCard(card: CardFormData) {
    setFailure(null)
    setPaying(true)
    try {
      const result = await payOrder(reservationId, card, newRequestId())
      if (!result.ok) {
        if (result.kind === 'session') return onSessionExpired()
        if (result.kind === 'conflict') {
          onPage(await fetchOrder(reservationId))
          return onConflict(result.message)
        }
        fail({ kind: 'failed', message: result.message })
      }
      const { payment: answer, page } = result.result
      onPage(page)
      if (answer.status === 'rejected') fail({ kind: 'rejected', message: answer.message })
      setPayment(answer)
      setView(answer.status === 'approved' ? 'approved' : 'review')
    } catch (error) {
      if (error instanceof SessionExpiredError) return onSessionExpired()
      if (error instanceof PaymentNotDone) throw error
      fail({ kind: 'failed', message: 'No pudimos procesar el pago. Probá de nuevo.' })
    } finally {
      setPaying(false)
    }
  }

  const title =
    view === 'approved'
      ? 'Pago aprobado'
      : view === 'review'
        ? 'Pago en revisión'
        : 'Pagar el pedido'
  const discount = order.discount && toCents(order.discount) > 0 ? order.discount : null
  // Mercado Pago's test credentials start with TEST-: no real money moves.
  const testMode = config.data?.startsWith('TEST-') ?? false

  const footer =
    view === 'pay' ? (
      <Button variant="secondary" disabled={paying} onClick={onClose}>
        Cancelar
      </Button>
    ) : (
      <Button onClick={onClose}>{view === 'approved' ? 'Listo' : 'Volver al pedido'}</Button>
    )

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!paying) onClose()
      }}
      title={title}
      footer={<div className={styles.footer}>{footer}</div>}
      onClosed={onClosed}
    >
      {view === 'pay' && (
        <div className={styles.pay}>
          <div key={failures} className={cx(styles.ticket, failures > 0 && styles.compact)}>
            {failures === 0 && (
              <ul className={styles.lines}>
                {order.items.map((item) => (
                  <li key={`${item.dish_id}-${item.name}`} className={styles.line}>
                    <span>
                      {item.quantity} × {item.name}
                    </span>
                    <span>{formatPrice(item.subtotal)}</span>
                  </li>
                ))}
                {order.promotions?.map((promotion) => (
                  <li key={promotion.name} className={cx(styles.line, styles.promotion)}>
                    <span>{promotion.name}</span>
                    <span>−{formatPrice(promotion.amount)}</span>
                  </li>
                ))}
                {discount && !order.promotions?.length && (
                  <li className={cx(styles.line, styles.promotion)}>
                    <span>Promociones</span>
                    <span>−{formatPrice(discount)}</span>
                  </li>
                )}
              </ul>
            )}
            <p className={styles.total}>
              <span>Total a pagar</span>
              <strong>{formatPrice(order.total)}</strong>
            </p>
            <p className={styles.deposit}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v6M12 7.5v.5" />
              </svg>
              Incluye la seña de tu reserva
            </p>
          </div>

          {paying && (
            <div className={styles.processing} role="status">
              <strong className={styles.dots}>
                Confirmando el pago<span>.</span>
                <span>.</span>
                <span>.</span>
              </strong>
              <span>No cierres esta pantalla: suele tardar unos segundos.</span>
              <span className={styles.bar} aria-hidden="true">
                <span />
              </span>
            </div>
          )}

          {failure && !paying && (
            <div key={failures} className={styles.rejected} role="alert">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9.5" />
                <path d="M9 9l6 6M15 9l-6 6" />
              </svg>
              <div className={styles.rejectedText}>
                <strong>
                  {failure.kind === 'rejected'
                    ? 'No se aprobó el pago'
                    : 'No pudimos procesar el pago'}
                </strong>
                <span>{failure.message}</span>
                <span className={styles.notCharged}>
                  No se te cobró nada. Revisá los datos o probá con otra tarjeta.
                </span>
              </div>
            </div>
          )}

          {config.isPending && (
            <div className={styles.preparing}>
              <p role="status">Preparando el pago…</p>
              <Skeleton height={48} radius={14} />
              <Skeleton height={48} radius={14} />
            </div>
          )}
          {config.isError && (
            <div className={styles.unavailable} role="alert">
              <strong>No pudimos preparar el pago</strong>
              <span>Revisá tu conexión y volvé a intentar.</span>
              <Button onClick={() => void config.refetch()}>Reintentar</Button>
            </div>
          )}
          {config.isSuccess && config.data === null && (
            <div className={styles.unavailable} role="status">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5" />
              </svg>
              <strong>El pago electrónico no está disponible ahora</strong>
              <span>
                Tu pedido sigue confirmado. Podés pagarlo en efectivo en el local o volver a
                intentar más tarde.
              </span>
              <Button onClick={onPayInCash}>Pagar en efectivo en el local</Button>
            </div>
          )}
          {testMode && <TestCards />}
          {config.data && (
            <CardPaymentForm
              publicKey={config.data}
              amount={toCents(order.total) / 100}
              onSubmit={submitCard}
            />
          )}
          {failure && !paying && (
            <p className={styles.cash}>
              ¿Preferís pagar en el local?{' '}
              <button type="button" className={styles.link} onClick={onPayInCash}>
                Cambiar a efectivo
              </button>
            </p>
          )}

          <p className={styles.trust}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <span>
              Pago seguro: Servido! nunca ve ni guarda los datos de tu tarjeta.{' '}
              {testMode && (
                <span className={styles.testMode}>Modo de prueba · no se cobra dinero real</span>
              )}
            </span>
          </p>
        </div>
      )}

      {view === 'approved' && payment && (
        <div className={styles.result}>
          <ConfirmationStamp label="Pagado" />
          <h3 ref={resultTitle} tabIndex={-1} className={styles.resultTitle}>
            ¡Listo! Pagaste tu pedido
          </h3>
          <div className={styles.receipt}>
            <Receipt
              {...bill}
              payment={{
                operationNumber: payment.operation_number,
                card: paymentCard(payment),
                paidAt: dateTimeInBuenosAires(payment.approved_at ?? payment.created_at),
              }}
            />
          </div>
          <p className={styles.copy}>Te mandamos el comprobante a {receiptEmail}</p>
        </div>
      )}

      {view === 'review' && (
        <div className={styles.result}>
          <ConfirmationStamp label="En revisión" tone="warn" icon="clock" />
          <h3 ref={resultTitle} tabIndex={-1} className={styles.resultTitle}>
            Tu pago está en revisión
          </h3>
          <p className={styles.reviewText}>
            Tu pedido sigue confirmado. No pagues de nuevo: si se rechaza, vas a poder pagar otra
            vez.
          </p>
          <ol className={styles.steps}>
            <li className={styles.stepDone}>Enviaste el pago de {formatPrice(order.total)}</li>
            <li className={styles.stepNow}>Se está revisando</li>
            <li>Al abrir tu pedido, ves si se aprobó</li>
          </ol>
        </div>
      )}
    </Modal>
  )
}
