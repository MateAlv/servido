import { useQueryClient } from '@tanstack/react-query'
import { Link, NavLink, useNavigate } from 'react-router'

import { signOut, useAccount } from '../../api/session'
import { Logo } from '../brand'
import { Button, ThemeToggle, useToast } from '../ui'
import styles from './SiteHeader.module.css'

const ROLE_LABELS = { diner: 'Comensal', restaurant: 'Restaurante' } as const

/** Top bar of every page: who is signed in, or the way in for someone who is not. */
export function SiteHeader() {
  const { data: account, isPending } = useAccount()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const toast = useToast()

  function handleSignOut() {
    signOut(queryClient)
    toast('Cerraste tu sesión.')
    navigate('/')
  }

  const name = account ? (account.nombre ?? account.email) : ''

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Principal">
        <Link to="/" className={styles.brand} aria-label="Servido!, ir al inicio">
          <Logo size="sm" animation="intro" />
        </Link>

        {!isPending && !account && (
          <div className={styles.links}>
            <NavLink to="/mapa">Restaurantes</NavLink>
            <Link to="/#como">Cómo funciona</Link>
          </div>
        )}

        <div className={styles.actions}>
          <span className={styles.theme}>
            <ThemeToggle />
          </span>
          {isPending ? null : account ? (
            <>
              <span className={styles.who}>
                <span className={styles.avatar} aria-hidden="true">
                  {name.charAt(0).toUpperCase()}
                </span>
                <span className={styles.whoText}>
                  <b>{name}</b>
                  <small>{ROLE_LABELS[account.rol]}</small>
                </span>
              </span>
              <Button variant="secondary" size="sm" onClick={handleSignOut}>
                Cerrar sesión
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" to="/ingresar">
                Ingresar
              </Button>
              <Button size="sm" to="/registrarme" className={styles.signUp}>
                Crear cuenta
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
