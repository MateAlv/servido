import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ChoiceChips } from './ChoiceChips'

const OPTIONS = [
  { value: 'todas', label: 'Todas' },
  { value: '4', label: '4 o más ★', ariaLabel: '4 o más estrellas' },
  { value: '4.5', label: '4,5 o más ★', ariaLabel: '4,5 o más estrellas' },
]

describe('ChoiceChips', () => {
  it('is a radio group with one Tab stop on the chosen option', async () => {
    const user = userEvent.setup()
    render(<ChoiceChips label="Calificación" options={OPTIONS} value="4" onChange={vi.fn()} />)

    expect(screen.getByRole('radiogroup', { name: 'Calificación' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '4 o más estrellas' })).toBeChecked()
    await user.tab()
    expect(screen.getByRole('radio', { name: '4 o más estrellas' })).toHaveFocus()
    await user.tab()
    expect(document.body).toHaveFocus()
  })

  it('chooses with a click or the arrow keys, wrapping around', () => {
    const onChange = vi.fn()
    render(<ChoiceChips label="Calificación" options={OPTIONS} value="todas" onChange={onChange} />)

    fireEvent.click(screen.getByRole('radio', { name: '4,5 o más estrellas' }))
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowLeft' })

    expect(onChange.mock.calls).toEqual([['4.5'], ['4.5']])
  })
})
