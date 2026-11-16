import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { ACCOUNT_QUERY_KEY, signIn, signOut } from './session'

describe('signOut', () => {
  it('drops what was read with the old session, so its errors cannot sign out again', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['availability', 'r-1', '2026-11-03', 2], { slots: [] })
    queryClient.setQueryData(['reservations', '2026-11-03'], [])
    queryClient.setQueryData(ACCOUNT_QUERY_KEY, { rol: 'diner' })

    signOut(queryClient)

    expect(queryClient.getQueryData(['availability', 'r-1', '2026-11-03', 2])).toBeUndefined()
    expect(queryClient.getQueryData(['reservations', '2026-11-03'])).toBeUndefined()
    expect(queryClient.getQueryData(ACCOUNT_QUERY_KEY)).toBeNull()
  })
})

it('US-43 edge clears another account pending operation but retains the same account recovery', () => {
  sessionStorage.clear()
  sessionStorage.setItem('servido-order-operation:old:reservation', 'private old snapshot')
  sessionStorage.setItem('servido-order-operation:new:reservation', 'same account recovery')
  const queryClient = new QueryClient()
  signIn(queryClient, 'test-token', {
    id: 'new',
    rol: 'diner',
    nombre: 'Ana',
    email: 'ana@example.com',
    email_verificado: true,
  })
  expect(sessionStorage.getItem('servido-order-operation:old:reservation')).toBeNull()
  expect(sessionStorage.getItem('servido-order-operation:new:reservation')).toBe(
    'same account recovery',
  )
  signOut(queryClient)
  expect(sessionStorage.getItem('servido-order-operation:new:reservation')).toBe(
    'same account recovery',
  )
  sessionStorage.clear()
})
