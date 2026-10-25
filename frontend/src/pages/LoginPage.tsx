import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'

import {
  ACCOUNT_ROLE_OPTIONS,
  AccessForm,
  GoogleSignInButton,
  RedirectIfSignedIn,
  registerPathFor,
  type AccountRole,
} from '../components/access'
import type { Account } from '../api/session'
import { Card, SegmentedControl, useToast } from '../components/ui'
import styles from './AuthPage.module.css'

export function LoginPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { state } = useLocation()
  const [searchParams] = useSearchParams()
  // /ingresar?rol=restaurante opens the restaurant side, e.g. right after registering the restaurant.
  const [role, setRole] = useState<AccountRole>(
    searchParams.get('rol') === 'restaurante' ? 'restaurant' : 'diner',
  )
  const createdEmail = (state as { email?: unknown } | null)?.email

  function welcome(account: Account) {
    toast(`¡Hola, ${account.nombre ?? account.email}!`, { tone: 'ok' })
    navigate('/')
  }

  return (
    <RedirectIfSignedIn>
      <main className={styles.page}>
        <Card className={styles.card}>
          <div className={styles.head}>
            <h1 className={styles.title}>Ingresá a tu cuenta</h1>
            <p className={styles.lead}>Elegí tu tipo de cuenta y usá tu email.</p>
          </div>
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
            initialEmail={typeof createdEmail === 'string' ? createdEmail : ''}
            onSignedIn={welcome}
            onRegister={() => navigate(registerPathFor(role))}
          />
          {role === 'diner' && (
            <>
              <p className={styles.divider}>o</p>
              <GoogleSignInButton onSignedIn={welcome} />
            </>
          )}
          <p className={styles.footer}>
            <Link to="/">Volver al inicio</Link>
          </p>
        </Card>
      </main>
    </RedirectIfSignedIn>
  )
}
