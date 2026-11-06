import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { StarRating } from './StarRating'

describe('StarRating', () => {
  it('lets the diner choose a rating', () => {
    const onChange = vi.fn()
    render(<StarRating value={0} onChange={onChange} />)

    fireEvent.click(screen.getByRole('radio', { name: '4 estrellas' }))

    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('moves the focus with the selection when using the arrows', () => {
    const onChange = vi.fn()
    render(<StarRating value={2} onChange={onChange} />)

    fireEvent.keyDown(screen.getByRole('radio', { name: '2 estrellas' }), { key: 'ArrowRight' })

    expect(onChange).toHaveBeenCalledWith(3)
    expect(screen.getByRole('radio', { name: '3 estrellas' })).toHaveFocus()
  })

  it('reads the average aloud when it is read-only', () => {
    render(<StarRating value={4.7} />)

    expect(screen.getByRole('img', { name: '4,7 de 5 estrellas' })).toBeInTheDocument()
  })
})
