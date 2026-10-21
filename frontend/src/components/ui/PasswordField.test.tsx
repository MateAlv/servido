import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { PasswordField } from './PasswordField'

describe('PasswordField', () => {
  it('hides the password until the eye button is pressed, and hides it again', async () => {
    const user = userEvent.setup()
    render(<PasswordField label="Contraseña" />)
    const input = screen.getByLabelText('Contraseña')

    expect(input).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(input).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(input).toHaveAttribute('type', 'password')
  })
})
