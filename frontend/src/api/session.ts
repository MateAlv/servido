import { useQuery, type QueryClient } from '@tanstack/react-query'

import { api } from './client'
import type { components } from './schema'

export type Account = components['schemas']['AccountResponse']

/** The account of a restaurant, from the `restaurante` that its login endpoints return. */
export function restaurantAccount(
  restaurante: components['schemas']['RestaurantResponse'],
): Account {
  return {
    rol: 'restaurant',
    id: restaurante.id,
    nombre: restaurante.nombre,
    email: restaurante.email,
    email_verificado: true,
  }
}

/** The account of a diner, from the `comensal` that the login and sign-up endpoints return. */
export function dinerAccount(comensal: components['schemas']['DinerResponse']): Account {
  return {
    rol: 'diner',
    id: comensal.id,
    nombre: comensal.nombre ?? null,
    email: comensal.email,
    email_verificado: comensal.email_verificado,
  }
}

const TOKEN_KEY = 'servido-access-token'
export const ACCOUNT_QUERY_KEY = ['account'] as const

export function accessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

async function loadAccount(): Promise<Account | null> {
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (!token) return null
  const { data, error } = await api.GET('/api/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (error || !data) {
    // The token expired or was altered: forget it so the app shows the login buttons again.
    sessionStorage.removeItem(TOKEN_KEY)
    return null
  }
  return data
}

/** The Authorization header of the open session, for endpoints that need one. */
export function sessionHeaders(): Record<string, string> {
  const token = sessionStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** The signed-in account, or `null` when nobody is signed in. */
export function useAccount() {
  return useQuery({ queryKey: ACCOUNT_QUERY_KEY, queryFn: loadAccount, staleTime: Infinity })
}

/** Keeps the token of a successful login and makes the account known to the whole app. */
export function signIn(queryClient: QueryClient, token: string, account: Account) {
  sessionStorage.setItem(TOKEN_KEY, token)
  queryClient.setQueryData<Account | null>(ACCOUNT_QUERY_KEY, account)
}

/**
 * Closes the session in this browser: forgets the token and the account. The API keeps no
 * session (FR-008a), so nothing is sent to the server; the token would only work until it expires.
 */
export function signOut(queryClient: QueryClient) {
  sessionStorage.removeItem(TOKEN_KEY)
  queryClient.setQueryData<Account | null>(ACCOUNT_QUERY_KEY, null)
}
