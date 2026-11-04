import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { confirmOrder, discardCart, saveCart, type CartLine } from '../api/orders'
import { SAVE_DELAY_MS, useOrderCart } from './useOrderCart'

vi.mock('../api/orders', () => ({
  CONFIRM_FAILED_MESSAGE: 'No pudimos confirmar tu pedido.',
  DISCARD_FAILED_MESSAGE: 'No pudimos descartar los cambios.',
  SAVE_FAILED_MESSAGE: 'No pudimos guardar tus cambios.',
  confirmOrder: vi.fn(),
  discardCart: vi.fn(),
  saveCart: vi.fn(),
}))

const saveMock = vi.mocked(saveCart)
const discardMock = vi.mocked(discardCart)
const confirmMock = vi.mocked(confirmOrder)

const PROVOLETA: CartLine = {
  dishId: 'd-1',
  quantity: 1,
  name: 'Provoleta',
  unitPrice: '7500.00',
  prepTimeMinutes: 10,
}
const FLAN: CartLine = {
  dishId: 'd-3',
  quantity: 1,
  name: 'Flan',
  unitPrice: '6000.00',
  prepTimeMinutes: null,
}

function setup(confirmedLines: CartLine[] | null = null, initialLines: CartLine[] = []) {
  const onSaveFailure = vi.fn()
  const onSettled = vi.fn()
  const hook = renderHook(() =>
    useOrderCart({
      reservationId: 'res-1',
      initialLines,
      confirmedLines,
      onSaveFailure,
      onSettled,
    }),
  )
  return { ...hook, onSaveFailure, onSettled }
}

async function wait(ms = SAVE_DELAY_MS) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  saveMock.mockReset().mockResolvedValue({ ok: true })
  discardMock.mockReset().mockResolvedValue({ ok: true })
  confirmMock.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useOrderCart', () => {
  it('saves once, with the latest lines, after the changes stop', async () => {
    const { result } = setup()

    act(() => result.current.setLines(() => [PROVOLETA]))
    act(() => result.current.setLines((lines) => [...lines, FLAN]))
    await wait(SAVE_DELAY_MS - 1)
    expect(saveMock).not.toHaveBeenCalled()
    await wait(1)

    expect(saveMock).toHaveBeenCalledTimes(1)
    expect(saveMock).toHaveBeenCalledWith('res-1', [PROVOLETA, FLAN], { keepalive: false })
  })

  it('US-17 edge does not recreate the cart when a save is in flight at confirmation', async () => {
    let finishSave: (value: { ok: true }) => void = () => undefined
    saveMock.mockImplementationOnce(() => new Promise((resolve) => (finishSave = resolve)))
    confirmMock.mockResolvedValue({ ok: true, page: {} as never })
    const { result } = setup()

    act(() => result.current.setLines(() => [PROVOLETA]))
    await wait()
    expect(saveMock).toHaveBeenCalledTimes(1)

    let confirmation: Promise<unknown> = Promise.resolve()
    act(() => {
      confirmation = result.current.confirm()
    })
    await wait(0)
    expect(confirmMock).not.toHaveBeenCalled()

    await act(async () => {
      finishSave({ ok: true })
      await confirmation
    })
    expect(confirmMock).toHaveBeenCalledWith('res-1', [PROVOLETA])
    await wait(SAVE_DELAY_MS * 2)
    expect(saveMock).toHaveBeenCalledTimes(1)
  })

  it('sends the pending save before confirming, so a refused confirmation keeps it', async () => {
    confirmMock.mockResolvedValue({ ok: false, kind: 'unverified', message: 'Verificá tu email.' })
    const { result } = setup()

    act(() => result.current.setLines(() => [PROVOLETA]))
    await act(async () => {
      await result.current.confirm()
    })

    expect(saveMock).toHaveBeenCalledWith('res-1', [PROVOLETA], { keepalive: false })
    expect(saveMock.mock.invocationCallOrder[0]).toBeLessThan(
      confirmMock.mock.invocationCallOrder[0],
    )
  })

  it('drops the pending save when the diner discards', async () => {
    const { result } = setup()

    act(() => result.current.setLines(() => [PROVOLETA]))
    await act(async () => {
      await result.current.discard()
    })
    await wait()

    expect(saveMock).not.toHaveBeenCalled()
    expect(discardMock).toHaveBeenCalledWith('res-1')
  })

  it('discards instead of saving when the lines go back to the confirmed order', async () => {
    const { result } = setup([PROVOLETA], [PROVOLETA])

    act(() => result.current.setLines(() => [{ ...PROVOLETA, quantity: 2 }]))
    act(() => result.current.setLines(() => [PROVOLETA]))
    await wait()

    expect(saveMock).not.toHaveBeenCalled()
    expect(discardMock).toHaveBeenCalledTimes(1)
  })

  it('discards instead of saving an empty cart when there is no order', async () => {
    const { result } = setup(null, [PROVOLETA])

    act(() => result.current.setLines(() => []))
    await wait()

    expect(saveMock).not.toHaveBeenCalled()
    expect(discardMock).toHaveBeenCalledTimes(1)
  })

  it('saves an emptied confirmed order, which the diner still has to confirm', async () => {
    const { result } = setup([PROVOLETA], [PROVOLETA])

    act(() => result.current.setLines(() => []))
    await wait()

    expect(saveMock).toHaveBeenCalledWith('res-1', [], { keepalive: false })
  })

  it('says when a save failed and retries with the next change', async () => {
    saveMock.mockResolvedValueOnce({ ok: false, kind: 'failed', message: 'No.' })
    const { result } = setup()

    act(() => result.current.setLines(() => [PROVOLETA]))
    await wait()
    expect(result.current.saveFailed).toBe(true)

    act(() => result.current.setLines((lines) => [...lines, FLAN]))
    await wait()
    expect(result.current.saveFailed).toBe(false)
    expect(saveMock).toHaveBeenLastCalledWith('res-1', [PROVOLETA, FLAN], { keepalive: false })
  })

  it('hands a conflict or an expired session to the page', async () => {
    saveMock.mockResolvedValueOnce({ ok: false, kind: 'conflict' })
    const { result, onSaveFailure } = setup()

    act(() => result.current.setLines(() => [PROVOLETA]))
    await wait()

    expect(onSaveFailure).toHaveBeenCalledWith({ ok: false, kind: 'conflict' })
  })

  it('keeps a change made while the confirmation is on its way, and saves it', async () => {
    let finish: (value: { ok: true; page: never }) => void = () => undefined
    confirmMock.mockImplementation(() => new Promise((resolve) => (finish = resolve)))
    const { result } = setup()
    act(() => result.current.setLines(() => [PROVOLETA]))

    let confirmation: Promise<unknown> = Promise.resolve()
    act(() => {
      confirmation = result.current.confirm()
    })
    await wait(0)
    act(() => result.current.setLines((lines) => [...lines, FLAN]))
    await act(async () => {
      finish({ ok: true, page: {} as never })
      await confirmation
    })
    await wait()

    expect(saveMock).toHaveBeenLastCalledWith('res-1', [PROVOLETA, FLAN], { keepalive: false })
  })

  it('does not confirm when the save before it was refused', async () => {
    saveMock.mockResolvedValueOnce({ ok: false, kind: 'conflict' })
    const { result, onSaveFailure } = setup()
    act(() => result.current.setLines(() => [PROVOLETA]))

    let answer: unknown
    await act(async () => {
      answer = await result.current.confirm()
    })

    expect(answer).toEqual({ ok: false, kind: 'conflict' })
    expect(confirmMock).not.toHaveBeenCalled()
    // The page handles it once, from the confirmation's answer.
    expect(onSaveFailure).not.toHaveBeenCalled()
  })

  it('answers a failure when the confirmation or the discard never reach the server', async () => {
    confirmMock.mockRejectedValue(new TypeError('Failed to fetch'))
    discardMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const { result } = setup()

    let confirmed: unknown
    let discarded: unknown
    await act(async () => {
      confirmed = await result.current.confirm()
      discarded = await result.current.discard()
    })

    expect(confirmed).toMatchObject({ ok: false, kind: 'failed' })
    expect(discarded).toMatchObject({ ok: false, kind: 'failed' })
  })

  it('sends the pending save when the tab is closed', async () => {
    const { result } = setup()

    act(() => result.current.setLines(() => [PROVOLETA]))
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    await wait(0)

    expect(saveMock).toHaveBeenCalledWith('res-1', [PROVOLETA], { keepalive: true })
  })

  it('sends the pending save when the page closes', async () => {
    const { result, unmount } = setup()

    act(() => result.current.setLines(() => [PROVOLETA]))
    unmount()
    await wait(0)

    expect(saveMock).toHaveBeenCalledWith('res-1', [PROVOLETA], { keepalive: true })
  })
})
