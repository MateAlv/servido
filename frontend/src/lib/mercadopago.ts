import type { CardFormData } from '../api/orders'

/**
 * Mercado Pago's card form (Card Payment Brick, spec 032, US-56). The SDK has to load from
 * Mercado Pago itself: the card fields live in its iframes, so the card number and security code
 * never reach Servido! (FR-014); the form hands back a one-time token.
 */
const SDK_URL = 'https://sdk.mercadopago.com/js/v2'

type BrickFormData = {
  token: string
  payment_method_id: string
  issuer_id?: string | number | null
  payer: { email: string; identification?: { type: string; number: string } }
}

type CardPaymentSettings = {
  initialization: { amount: number }
  customization: {
    paymentMethods: { minInstallments: number; maxInstallments: number }
    visual: {
      hideFormTitle: boolean
      style: { theme: 'default' | 'dark'; customVariables: Record<string, string> }
    }
  }
  callbacks: {
    onReady: () => void
    onSubmit: (formData: BrickFormData) => Promise<void>
    onError: (error: unknown) => void
  }
}

export type BrickController = { unmount: () => void }

type MercadoPagoInstance = {
  bricks: () => {
    create: (
      brick: 'cardPayment',
      containerId: string,
      settings: CardPaymentSettings,
    ) => Promise<BrickController>
  }
}

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options: { locale: string }) => MercadoPagoInstance
  }
}

let loading: Promise<void> | null = null

function loadSdk(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve()
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error('Mercado Pago SDK did not load'))
    }
    document.head.append(script)
  })
  return loading
}

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** Mercado Pago's form dressed in the current theme's tokens. */
function brickStyle(): { theme: 'default' | 'dark'; customVariables: Record<string, string> } {
  const chosen = document.documentElement.dataset.theme
  const dark = chosen
    ? chosen === 'dark'
    : window.matchMedia?.('(prefers-color-scheme: dark)').matches === true
  const colors: Record<string, string> = {
    baseColor: token('--color-primary'),
    baseColorFirstVariant: token('--color-primary-dark'),
    baseColorSecondVariant: token('--color-accent'),
    textPrimaryColor: token('--color-text'),
    textSecondaryColor: token('--color-text-muted'),
    formBackgroundColor: token('--color-surface'),
    inputBackgroundColor: token('--color-surface'),
    outlinePrimaryColor: token('--color-line'),
    outlineSecondaryColor: token('--color-line'),
    buttonTextColor: token('--color-on-primary'),
    errorColor: token('--color-error'),
    successColor: token('--color-ok'),
  }
  return {
    theme: dark ? 'dark' : 'default',
    customVariables: {
      ...Object.fromEntries(Object.entries(colors).filter(([, value]) => value)),
      borderRadiusSmall: token('--radius-small') || '10px',
      borderRadiusMedium: token('--radius-field') || '14px',
      borderRadiusLarge: token('--radius-card') || '26px',
      inputBorderWidth: '2px',
      inputFocusedBorderWidth: '2px',
      formPadding: '0px',
      fontWeightSemiBold: '800',
    },
  }
}

export type CardPaymentOptions = {
  publicKey: string
  amount: number
  onReady: () => void
  onSubmit: (card: CardFormData) => Promise<void>
}

export async function mountCardPayment(
  containerId: string,
  { publicKey, amount, onReady, onSubmit }: CardPaymentOptions,
): Promise<BrickController> {
  await loadSdk()
  const mercadoPago = new window.MercadoPago!(publicKey, { locale: 'es-AR' })
  return mercadoPago.bricks().create('cardPayment', containerId, {
    // No payer email: the form asks for it, since Mercado Pago refuses some (like the demo's).
    initialization: { amount },
    customization: {
      paymentMethods: { minInstallments: 1, maxInstallments: 1 },
      // The page shows its own title and card brands.
      visual: { hideFormTitle: true, style: brickStyle() },
    },
    callbacks: {
      onReady,
      onSubmit: (formData) =>
        onSubmit({
          token: formData.token,
          payment_method_id: formData.payment_method_id,
          issuer_id: formData.issuer_id ? String(formData.issuer_id) : null,
          payer: {
            email: formData.payer.email,
            identification: formData.payer.identification ?? null,
          },
        }),
      // The form shows its own field errors; a failure to load is caught by the caller.
      onError: () => {},
    },
  })
}
