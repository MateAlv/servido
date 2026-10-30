import { useCallback, useEffect, useRef, useState } from 'react'

import {
  confirmOrder,
  discardCart,
  saveCart,
  type CartLine,
  type OrderPage,
  type WriteFailure,
} from '../api/orders'

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
  initialLines,
  confirmedLines,
  onSaveFailure,
  onSettled,
}: Options) {
  const [lines, setLinesState] = useState<CartLine[]>(initialLines)
  const [saveFailed, setSaveFailed] = useState(false)
  const latest = useRef(lines)
  const confirmed = useRef(confirmedLines)
  const dirty = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const callbacks = useRef({ onSaveFailure, onSettled })

  useEffect(() => {
    confirmed.current = confirmedLines
  }, [confirmedLines])
  useEffect(() => {
    callbacks.current = { onSaveFailure, onSettled }
  }, [onSaveFailure, onSettled])

  const enqueue = useCallback(<T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.current.then(task, task)
    queue.current = run.catch(() => undefined)
    return run
  }, [])

  /** Sends the latest lines: a cart, or nothing when they match the confirmed order. */
  const writeLatest = useCallback(
    async (keepalive = false) => {
      if (!dirty.current) return
      dirty.current = false
      const current = latest.current
      const unconfirmed = hasUnconfirmedChanges(current, confirmed.current)
      let result: Result<object>
      try {
        result = unconfirmed
          ? await saveCart(reservationId, current, { keepalive })
          : await discardCart(reservationId)
      } catch {
        result = { ok: false, kind: 'failed', message: '' }
      }
      if (result.ok) {
        setSaveFailed(false)
      } else if (result.kind === 'failed') {
        // Kept for the next change or the confirmation, which sends the lines anyway.
        dirty.current = true
        setSaveFailed(true)
      } else {
        callbacks.current.onSaveFailure(result)
      }
      callbacks.current.onSettled?.()
    },
    [reservationId],
  )

  const setLines = useCallback(
    (update: (current: CartLine[]) => CartLine[]) => {
      const next = update(latest.current)
      latest.current = next
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
    latest.current = next
    setLinesState(next)
  }, [])

  /** Sends the pending save, waits for it, then confirms what the page shows. */
  const confirm = useCallback(async (): Promise<Result<{ page: OrderPage }>> => {
    window.clearTimeout(timer.current)
    void enqueue(() => writeLatest())
    return enqueue(async () => {
      const result = await confirmOrder(reservationId, latest.current)
      if (result.ok) dirty.current = false
      return result
    })
  }, [enqueue, writeLatest, reservationId])

  /** «Descartar cambios»: drops the pending save and deletes the cart. */
  const discard = useCallback(async (): Promise<Result<object>> => {
    window.clearTimeout(timer.current)
    dirty.current = false
    const result = await enqueue(() => discardCart(reservationId))
    callbacks.current.onSettled?.()
    return result
  }, [enqueue, reservationId])

  // Leaving the page sends what is pending; closing the tab too, with `keepalive`.
  useEffect(() => {
    const flush = () => {
      if (!dirty.current) return
      window.clearTimeout(timer.current)
      void enqueue(() => writeLatest(true))
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [enqueue, writeLatest])

  return { lines, setLines, resetLines, confirm, discard, saveFailed }
}
