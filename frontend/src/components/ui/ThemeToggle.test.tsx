import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle', () => {
  it('switches the theme and remembers it', () => {
    render(<ThemeToggle />)
    const toggle = screen.getByRole('button', { name: 'Cambiar entre tema claro y oscuro' })

    fireEvent.click(toggle)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('servido-theme')).toBe('dark')

    fireEvent.click(toggle)
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
