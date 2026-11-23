import { useEffect, useId, useRef, useState } from 'react'

import type { CardFormData } from '../../api/orders'
import { mountCardPayment, type BrickController } from '../../lib/mercadopago'
import { Button, Skeleton, Spinner } from '../ui'
import styles from './CardPaymentForm.module.css'

type CardPaymentFormProps = {
  /** Mercado Pago's public key, from `GET /api/payments/config`. */
  publicKey: string
  amount: number
  /** Gets the tokenized card; the form stays busy until the promise settles. */
  onSubmit: (card: CardFormData) => Promise<void>
}

/** Mercado Pago's card form (spec 032, US-56): credit or debit card, one payment. */
export function CardPaymentForm({ publicKey, amount, onSubmit }: CardPaymentFormProps) {
  const containerId = `card-payment-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [attempt, setAttempt] = useState(0)
  const submit = useRef(onSubmit)
  // Mercado Pago allows one form per container: a new mount waits until the previous one ended.
  const previousMount = useRef<Promise<unknown>>(Promise.resolve())

  useEffect(() => {
    submit.current = onSubmit
  }, [onSubmit])

  useEffect(() => {
    let cancelled = false
    let controller: BrickController | undefined
    const mounting = previousMount.current
      .then(() =>
        cancelled
          ? undefined
          : mountCardPayment(containerId, {
              publicKey,
              amount,
              onReady: () => {
                if (!cancelled) setState('ready')
              },
              onSubmit: (card) => submit.current(card),
            }),
      )
      .then((mounted) => {
        if (cancelled) mounted?.unmount()
        else controller = mounted
      })
      .catch(() => {
        if (!cancelled) setState('failed')
      })
    previousMount.current = mounting
    return () => {
      cancelled = true
      controller?.unmount()
    }
  }, [containerId, publicKey, amount, attempt])

  function retry() {
    setState('loading')
    setAttempt((current) => current + 1)
  }

  return (
    <section className={styles.form} aria-labelledby={`${containerId}-title`}>
      <div className={styles.heading}>
        <h3 id={`${containerId}-title`} className={styles.title}>
          Tarjeta de crédito o débito
        </h3>
        <span className={styles.brands} aria-label="Visa, Mastercard, American Express y otras">
          <span aria-hidden="true">VISA</span>
          <span aria-hidden="true">MASTER</span>
          <span aria-hidden="true">AMEX</span>
        </span>
      </div>
      {state === 'loading' && (
        <div className={styles.loading}>
          <p className={styles.loadingText} role="status">
            <Spinner /> Cargando el formulario de pago…
          </p>
          <Skeleton height={48} radius={14} />
          <span className={styles.pair}>
            <Skeleton height={48} radius={14} />
            <Skeleton height={48} radius={14} />
          </span>
          <Skeleton height={48} radius={14} />
          <Skeleton height={48} radius={14} />
          <Skeleton height={56} radius={999} />
        </div>
      )}
      {state === 'failed' && (
        <div className={styles.failed} role="alert">
          <svg className={styles.failedIcon} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0M12 19.5v.5M3 3l18 18" />
          </svg>
          <strong className={styles.failedTitle}>No pudimos cargar el formulario de pago</strong>
          <span>Revisá tu conexión y volvé a intentar. No se cobró nada.</span>
          <Button onClick={retry}>Reintentar</Button>
        </div>
      )}
      <div
        id={containerId}
        className={styles.brick}
        data-state={state}
        hidden={state === 'failed'}
      />
    </section>
  )
}
