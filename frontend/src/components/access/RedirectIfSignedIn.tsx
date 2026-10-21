import type { ReactNode } from 'react'
import { Navigate } from 'react-router'

import { useAccount } from '../../api/session'

/** Sign-in and sign-up pages make no sense with an open session: go home instead. */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const { data: account } = useAccount()
  return account ? <Navigate to="/" replace /> : children
}
