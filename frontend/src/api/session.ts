import { useQuery, type QueryClient } from '@tanstack/react-query'

import { api } from './client'
import type { components } from './schema'

export type Account = components['schemas']['AccountResponse']

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

function getSessionStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

export function accessToken(): string | null {
  return getSessionStorage()?.getItem(TOKEN_KEY) ?? null
}

async function loadAccount(): Promise<Account | null> {
  const storage = getSessionStorage()
  const token = storage?.getItem(TOKEN_KEY)
  if (!token) return null
  const { data, error } = await api.GET('/api/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (error || !data) {
    storage?.removeItem(TOKEN_KEY)
    return null
  }
  return data
}

export function useAccount() {
  return useQuery({ queryKey: ACCOUNT_QUERY_KEY, queryFn: loadAccount, staleTime: Infinity })
}

export function sessionHeaders(): Record<string, string> {
  const token = accessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function signIn(queryClient: QueryClient, token: string, account: Account) {
  getSessionStorage()?.setItem(TOKEN_KEY, token)
  queryClient.setQueryData<Account | null>(ACCOUNT_QUERY_KEY, account)
}

export function signOut(queryClient: QueryClient) {
  getSessionStorage()?.removeItem(TOKEN_KEY)
  queryClient.setQueryData<Account | null>(ACCOUNT_QUERY_KEY, null)
}
