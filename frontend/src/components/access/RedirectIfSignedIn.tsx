import type { ReactNode } from 'react'
import { Navigate, useSearchParams } from 'react-router'

import { useAccount } from '../../api/session'
import { returnPath } from '../../lib/returnPath'

/** Sign-in and sign-up pages make no sense with an open session: go back where the person was
 * (`?volver=`), or home. */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const { data: account } = useAccount()
  const [searchParams] = useSearchParams()
  return account ? <Navigate to={returnPath(searchParams)} replace /> : children
}
