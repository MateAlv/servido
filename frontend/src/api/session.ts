import { useQuery, type QueryClient } from '@tanstack/react-query'

import { api } from './client'
import type { components } from './schema'

export type Account = components['schemas']['AccountResponse']

const TOKEN_KEY = 'servido-access-token'
export const ACCOUNT_QUERY_KEY = ['account'] as const

function getSessionStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

async function loadAccount(): Promise<Account | null> {
  const storage = getSessionStorage()
  const token = storage?.getItem(TOKEN_KEY)
  if (!token) return null
  const { data, error } = await api.GET('/api/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (error || !data) {
    // The token expired or was altered: forget it so the app shows the login buttons again.
    storage?.removeItem(TOKEN_KEY)
    return null
  }
  return data
}

/** The signed-in account, or `null` when nobody is signed in. */
export function useAccount() {
  return useQuery({ queryKey: ACCOUNT_QUERY_KEY, queryFn: loadAccount, staleTime: Infinity })
}

/** Keeps the token of a successful login and makes the account known to the whole app. */
export function signIn(queryClient: QueryClient, token: string, account: Account) {
  getSessionStorage()?.setItem(TOKEN_KEY, token)
  queryClient.setQueryData<Account | null>(ACCOUNT_QUERY_KEY, account)
}

/**
 * Closes the session in this browser: forgets the token and the account. The API keeps no
 * session (FR-008a), so nothing is sent to the server; the token would only work until it expires.
 */
export function signOut(queryClient: QueryClient) {
  getSessionStorage()?.removeItem(TOKEN_KEY)
  queryClient.setQueryData<Account | null>(ACCOUNT_QUERY_KEY, null)
}
