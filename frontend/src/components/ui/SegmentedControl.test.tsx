import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SegmentedControl } from './SegmentedControl'

const OPTIONS = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
]

describe('SegmentedControl', () => {
  it('marks the selected option and selects another on click', () => {
    const onChange = vi.fn()
    render(<SegmentedControl label="Nivel" options={OPTIONS} value="low" onChange={onChange} />)

    expect(screen.getByRole('radio', { name: 'Baja' })).toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: 'Alta' }))

    expect(onChange).toHaveBeenCalledWith('high')
  })

  it('moves with the arrow keys and wraps around', () => {
    const onChange = vi.fn()
    render(<SegmentedControl label="Nivel" options={OPTIONS} value="low" onChange={onChange} />)
    const group = screen.getByRole('radiogroup', { name: 'Nivel' })

    fireEvent.keyDown(group, { key: 'ArrowRight' })
    fireEvent.keyDown(group, { key: 'ArrowLeft' })

    expect(onChange.mock.calls).toEqual([['medium'], ['high']])
  })
})
