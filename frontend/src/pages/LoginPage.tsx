import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import {
  ACCOUNT_ROLE_OPTIONS,
  AccessForm,
  registerPathFor,
  type AccountRole,
} from '../components/access'
import { Card, SegmentedControl } from '../components/ui'
import styles from './AuthPage.module.css'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // /ingresar?rol=restaurante opens the restaurant side, e.g. right after registering the restaurant.
  const [role, setRole] = useState<AccountRole>(
    searchParams.get('rol') === 'restaurante' ? 'restaurant' : 'diner',
  )

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <h1>Ingresá a tu cuenta</h1>
        <p>Usá tu email para continuar.</p>
        <SegmentedControl
          label="Tipo de cuenta"
          options={ACCOUNT_ROLE_OPTIONS}
          value={role}
          onChange={setRole}
          className={styles.selector}
        />
        <AccessForm
          key={role}
          role={role}
          onSignedIn={() => navigate('/')}
          onRegister={() => navigate(registerPathFor(role))}
        />
      </Card>
    </main>
  )
}