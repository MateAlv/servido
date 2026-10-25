/**
 * Google Identity Services, which renders the "Sign in with Google" button (spec 007, US-52).
 * The client ID is public: it identifies the "Servido! web" OAuth client (infra/README.md).
 */
export const GOOGLE_CLIENT_ID =
  '65379758997-psqucbqtjg6brottoh9bfctf9gnjag5g.apps.googleusercontent.com'

const SCRIPT_URL = 'https://accounts.google.com/gsi/client'

export type GoogleCredentialResponse = { credential: string }

export type GoogleIdentity = {
  initialize(config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    ux_mode?: 'popup' | 'redirect'
    context?: 'signin' | 'signup' | 'use'
  }): void
  renderButton(
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon'
      theme?: 'outline' | 'filled_blue' | 'filled_black'
      size?: 'large' | 'medium' | 'small'
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
      shape?: 'rectangular' | 'pill' | 'circle' | 'square'
      width?: number
      locale?: string
    },
  ): void
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdentity } }
  }
}

let loading: Promise<GoogleIdentity> | null = null

/** Loads Google's script once and resolves with its sign-in API. */
export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  const loaded = window.google?.accounts?.id
  if (loaded) return Promise.resolve(loaded)
  loading ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => {
      const identity = window.google?.accounts?.id
      if (identity) resolve(identity)
      else reject(new Error('Google Identity Services did not start'))
    }
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error('Google Identity Services did not load'))
    }
    document.head.append(script)
  })
  return loading
}
