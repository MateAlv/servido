import { vi } from 'vitest'

import type { GoogleCredentialResponse, GoogleIdentity } from '../lib/google'

/** Stands in for Google's script: its button hands back a credential when clicked. */
export const fakeGoogle: GoogleIdentity = {
  initialize: vi.fn(),
  renderButton: vi.fn(),
}

const BUTTON_TEXT = { signin_with: 'Acceder con Google', signup_with: 'Registrarse con Google' }

/** Makes every Google button hand back this credential. */
export function googleReturns(credential: string) {
  let callback: (response: GoogleCredentialResponse) => void = () => {}
  vi.mocked(fakeGoogle.initialize).mockImplementation((config) => {
    callback = config.callback
  })
  vi.mocked(fakeGoogle.renderButton).mockImplementation((parent, options) => {
    const button = document.createElement('button')
    button.textContent = BUTTON_TEXT[options.text as keyof typeof BUTTON_TEXT]
    button.onclick = () => callback({ credential })
    parent.append(button)
  })
}
