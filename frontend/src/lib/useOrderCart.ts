import { newRequestId } from './requestId'
import { linesOfCart, linesOfOrder } from './orderLines'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  CONFIRM_FAILED_MESSAGE,
  confirmOrder,
  DISCARD_FAILED_MESSAGE,
  discardCart,
  SAVE_FAILED_MESSAGE,
  saveCart,
  type CartLine,
  type DraftMetadata,
  type OrderPage,
  type WriteFailure,
} from '../api/orders'

const EMPTY_METADATA: DraftMetadata = { arrival_at: '', payment_method: null }
export const SAVE_DELAY_MS = 500

type Result<T> = ({ ok: true } & T) | ({ ok: false } & WriteFailure)

function sameLines(a: CartLine[], b: CartLine[]): boolean {
  return (
    a.length === b.length &&
    a.every((line, index) => {
      const other = b[index]
      return (
        line.dishId === other.dishId &&
        line.quantity === other.quantity &&
        line.name === other.name &&
        line.unitPrice === other.unitPrice &&
        line.prepTimeMinutes === other.prepTimeMinutes
      )
    })
  )
}

/** Whether `lines` differ from the confirmed order: what the restaurant doesn't see yet. */
export function hasUnconfirmedChanges(lines: CartLine[], confirmed: CartLine[] | null): boolean {
  if (confirmed === null) return lines.length > 0
  const byDish = (list: CartLine[]) => [...list].sort((x, y) => x.dishId.localeCompare(y.dishId))
  return !sameLines(byDish(lines), byDish(confirmed))
}

type Options = {
  reservationId: string
  accountId?: string
  initialMetadata?: DraftMetadata
  confirmedMetadata?: DraftMetadata
  /** The cart or the confirmed order the page starts from. */
  initialLines: CartLine[]
  /** The confirmed order's lines, or null when the reservation has none. */
  confirmedLines: CartLine[] | null
  /** A save failed in a way the page handles (expired session, a 409). */
  onSaveFailure: (failure: WriteFailure) => void
  /** Every save or discard that settled, so other views (the home list) can refresh. */
  onSettled?: () => void
}

/**
 * The order being built (P1). The page owns the lines and they are saved to the diner's cart
 * about half a second after the last change. Saves, the confirmation and the discard run one
 * at a time in a single queue, so no save can land after a confirmation and recreate the cart.
 */
export function useOrderCart({
  reservationId,
  accountId = 'test',
  initialMetadata = EMPTY_METADATA,
  confirmedMetadata,
  initialLines,
  confirmedLines,
  onSaveFailure,
  onSettled,
}: Options) {
  const [lines, setLinesState] = useState<CartLine[]>(initialLines)
  const [saveFailed, setSaveFailed] = useState(false)
  const [metadata, setMetadataState] = useState(initialMetadata)
  const meta = useRef(metadata)
  const confirmedMeta = useRef(confirmedMetadata)
  const pendingKey = `servido-order-operation:${accountId}:${reservationId}`
  type Pending = { id: string; lines: CartLine[]; metadata: DraftMetadata }
  const [pending, setPending] = useState<Pending | null>(() => {
    try {
      for (const key of Object.keys(sessionStorage)) {
        if (
          key.startsWith('servido-order-operation:') &&
          !key.startsWith(`servido-order-operation:${accountId}:`)
        )
          sessionStorage.removeItem(key)
      }
      const raw = sessionStorage.getItem(pendingKey)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const operation = useRef<Pending | null>(pending)
  const recovering = useRef(pending !== null)
  const remember = useCallback(
    (value: Pending | null) => {
      operation.current = value
      setPending(value)
      try {
        if (value) sessionStorage.setItem(pendingKey, JSON.stringify(value))
        else sessionStorage.removeItem(pendingKey)
      } catch {
        /* The server remains authoritative if browser storage is unavailable. */
      }
    },
    [pendingKey],
  )
  const latest = useRef(lines)
  const confirmed = useRef(confirmedLines)
  const dirty = useRef(false)
  // Bumped on every change: a request only settles the lines it actually sent.
  const version = useRef(0)
  const timer = useRef<number | undefined>(undefined)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const callbacks = useRef({ onSaveFailure, onSettled })

  useEffect(() => {
    confirmed.current = confirmedLines
    confirmedMeta.current = confirmedMetadata
  }, [confirmedLines, confirmedMetadata])
  useEffect(() => {
    callbacks.current = { onSaveFailure, onSettled }
  }, [onSaveFailure, onSettled])

  const enqueue = useCallback(<T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.current.then(task, task)
    queue.current = run.catch(() => undefined)
    return run
  }, [])

  /**
   * Sends the latest lines: a cart, or a discard when they match the confirmed order. A failure
   * the page must handle goes to `onSaveFailure`, unless the caller handles it (`report: false`).
   */
  const writeLatest = useCallback(
    async ({ keepalive = false, report = true } = {}): Promise<Result<object> | null> => {
      if (!dirty.current || recovering.current) return null
      dirty.current = false
      const current = latest.current
      const unconfirmed =
        hasUnconfirmedChanges(current, confirmed.current) ||
        JSON.stringify(meta.current) !== JSON.stringify(confirmedMeta.current ?? initialMetadata)
      let result: Result<object>
      try {
        result = unconfirmed
          ? await saveCart(reservationId, current, { keepalive }, meta.current)
          : await discardCart(reservationId)
      } catch {
        result = { ok: false, kind: 'failed', message: SAVE_FAILED_MESSAGE }
      }
      if (result.ok) {
        setSaveFailed(false)
      } else if (result.kind === 'failed') {
        // Kept for the next change or the confirmation, which sends the lines anyway.
        dirty.current = true
        setSaveFailed(true)
      } else if (report) {
        callbacks.current.onSaveFailure(result)
      }
      callbacks.current.onSettled?.()
      return result
    },
    [reservationId, initialMetadata],
  )

  const setLines = useCallback(
    (update: (current: CartLine[]) => CartLine[]) => {
      if (operation.current && recovering.current) return
      const next = update(latest.current)
      latest.current = next
      version.current += 1
      setLinesState(next)
      dirty.current = true
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => void enqueue(() => writeLatest()), SAVE_DELAY_MS)
    },
    [enqueue, writeLatest],
  )

  /** Replaces the lines without saving them, e.g. after reloading the page's data. */
  const resetLines = useCallback((next: CartLine[]) => {
    window.clearTimeout(timer.current)
    dirty.current = false
    version.current += 1
    latest.current = next
    setLinesState(next)
  }, [])

  /**
   * Sends the pending save, waits for it, then confirms what the page shows. When that save is
   * refused (an expired session, a 409) the confirmation isn't sent: its failure is the answer.
   */
  const inFlightConfirmation = useRef<Promise<Result<{ page: OrderPage }>> | null>(null)
  const confirm = useCallback((): Promise<Result<{ page: OrderPage }>> => {
    if (inFlightConfirmation.current) return inFlightConfirmation.current
    window.clearTimeout(timer.current)
    const request = enqueue(async (): Promise<Result<{ page: OrderPage }>> => {
      if (!operation.current) {
        const saved = await writeLatest({ report: false })
        if (saved && !saved.ok && saved.kind !== 'failed') return saved
        remember({
          id: newRequestId(),
          lines: structuredClone(latest.current),
          metadata: { ...meta.current },
        })
      }
      const sent = version.current
      let result: Result<{ page: OrderPage }>
      try {
        const submitted = operation.current!
        result = await confirmOrder(
          reservationId,
          submitted.lines,
          submitted.metadata,
          submitted.id,
        )
      } catch {
        recovering.current = true
        return { ok: false, kind: 'failed', message: CONFIRM_FAILED_MESSAGE }
      }
      if (
        !result.ok &&
        ((result.kind === 'failed' && result.retryable !== false) || result.kind === 'session')
      )
        recovering.current = true
      if (
        result.ok ||
        (result.kind === 'failed' ? result.retryable === false : result.kind !== 'session')
      ) {
        remember(null)
        recovering.current = false
      }
      if (result.ok && version.current === sent) {
        const fresh = result.page.cart ?? result.page.order
        meta.current = {
          arrival_at: fresh?.arrival_at ?? result.page.arrival_window.starts_at,
          payment_method: fresh?.payment_method ?? null,
        }
        setMetadataState(meta.current)
        if (result.page.confirmation?.replayed) {
          dirty.current = false
          latest.current = result.page.cart
            ? linesOfCart(result.page.cart)
            : (linesOfOrder(result.page.order) ?? [])
          setLinesState(latest.current)
        }
      }
      // A change made while the confirmation was on its way is still unconfirmed: keep it.
      if (result.ok && version.current === sent) {
        dirty.current = false
        setSaveFailed(false)
      }
      return result
    })
    inFlightConfirmation.current = request
    void request.then(
      () => {
        inFlightConfirmation.current = null
      },
      () => {
        inFlightConfirmation.current = null
      },
    )
    return request
  }, [enqueue, writeLatest, reservationId, remember])

  /** «Descartar cambios»: drops the pending save and deletes the cart. */
  const discard = useCallback(async (): Promise<Result<object>> => {
    window.clearTimeout(timer.current)
    dirty.current = false
    recovering.current = false
    remember(null)
    const result = await enqueue(async (): Promise<Result<object>> => {
      try {
        return await discardCart(reservationId)
      } catch {
        return { ok: false, kind: 'failed', message: DISCARD_FAILED_MESSAGE }
      }
    })
    if (result.ok) {
      setSaveFailed(false)
      meta.current = confirmedMeta.current ?? initialMetadata
      setMetadataState(meta.current)
    }
    callbacks.current.onSettled?.()
    return result
  }, [enqueue, reservationId, remember, initialMetadata])

  const flush = useCallback(() => {
    window.clearTimeout(timer.current)
    return enqueue(() => writeLatest())
  }, [enqueue, writeLatest])

  // Leaving the page sends what is pending; closing the tab too, with `keepalive`.
  useEffect(() => {
    const flush = () => {
      if (!dirty.current) return
      window.clearTimeout(timer.current)
      void enqueue(() => writeLatest({ keepalive: true }))
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [enqueue, writeLatest])

  const setMetadata = useCallback(
    (next: DraftMetadata) => {
      if (operation.current) return
      meta.current = next
      setMetadataState(next)
      setLines((current) => current)
    },
    [setLines],
  )
  const resetMetadata = useCallback((value: DraftMetadata) => {
    meta.current = value
    setMetadataState(value)
  }, [])
  const metadataChanged =
    JSON.stringify(metadata) !== JSON.stringify(confirmedMetadata ?? initialMetadata)
  return {
    lines,
    setLines,
    resetLines,
    confirm,
    discard,
    saveFailed,
    metadata,
    setMetadata,
    resetMetadata,
    flush,
    metadataChanged,
    hasPendingOperation: pending !== null,
  }
}
