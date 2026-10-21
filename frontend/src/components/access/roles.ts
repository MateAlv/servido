export type AccountRole = 'diner' | 'restaurant'

export const ACCOUNT_ROLE_OPTIONS: { value: AccountRole; label: string }[] = [
  { value: 'diner', label: 'Comensal' },
  { value: 'restaurant', label: 'Restaurante' },
]

/** Where "Registrarme" leads for each kind of account. */
export function registerPathFor(role: AccountRole) {
  return role === 'diner' ? '/registrarme' : '/suma-tu-local'
}
