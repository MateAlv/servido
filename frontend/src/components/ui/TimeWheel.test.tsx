import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TimeWheel } from './TimeWheel'

const HOURS = ['19:00', '19:30', '20:00', '20:30', '21:00']
const SELECTABLE = ['19:30', '20:00', '20:30', '21:00']

function renderWheel(value = '20:00') {
  const onChange = vi.fn()
  const onPick = vi.fn()
  render(
    <TimeWheel
      label="Llegar a las"
      hours={HOURS}
      value={value}
      selectable={SELECTABLE}
      onChange={onChange}
      onPick={onPick}
    />,
  )
  const wheel = screen.getByRole('group', { name: 'Llegar a las' })
  return {
    onChange,
    onPick,
    wheel,
    hour: (name: string) => within(wheel).getByRole('button', { name }),
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('TimeWheel', () => {
  it('chooses a tapped hour and opens the clock when the chosen one is tapped', () => {
    const { onChange, onPick, hour } = renderWheel()

    fireEvent.click(hour('21:00'))
    fireEvent.click(hour('20:00'))

    expect(onChange).toHaveBeenCalledWith('21:00')
    expect(onPick).toHaveBeenCalledOnce()
  })

  it('crosses out the hours that cannot be chosen', () => {
    const { hour } = renderWheel()

    expect(hour('19:00')).toBeDisabled()
    expect(hour('19:30')).toBeEnabled()
    expect(hour('20:00')).toHaveAttribute('aria-pressed', 'true')
  })

  it('is one Tab stop and moves with the arrows, skipping what cannot be chosen', () => {
    const { onChange, hour } = renderWheel('19:30')

    expect(hour('19:30')).toHaveAttribute('tabindex', '0')
    expect(hour('20:00')).toHaveAttribute('tabindex', '-1')
    fireEvent.keyDown(hour('19:30'), { key: 'ArrowUp' })
    fireEvent.keyDown(hour('19:30'), { key: 'ArrowDown' })
    fireEvent.keyDown(hour('19:30'), { key: 'End' })

    expect(onChange).toHaveBeenNthCalledWith(1, '20:00')
    expect(onChange).toHaveBeenNthCalledWith(2, '21:00')
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('settles on the hour under the band once it stops, or on the next one that can be chosen', () => {
    vi.useFakeTimers()
    const { onChange, wheel } = renderWheel()

    wheel.scrollTop = 4 * 44
    fireEvent.scroll(wheel)
    expect(onChange).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(200))
    expect(onChange).toHaveBeenLastCalledWith('21:00')

    wheel.scrollTop = 0
    fireEvent.scroll(wheel)
    act(() => vi.advanceTimersByTime(200))
    expect(onChange).toHaveBeenLastCalledWith('19:30')
  })
})
