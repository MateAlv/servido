import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { ACCOUNT_QUERY_KEY, signOut } from './session'

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
