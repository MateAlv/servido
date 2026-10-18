import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TextField } from './TextField'

describe('TextField', () => {
  it('links its hint and error to the input', () => {
    render(
      <TextField label="Email" hint="Lo usás para ingresar." error="Ingresá un email válido." />,
    )
    const input = screen.getByLabelText('Email')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Lo usás para ingresar. Ingresá un email válido.')
  })
})
