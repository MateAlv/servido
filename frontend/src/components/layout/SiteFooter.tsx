import { Link } from 'react-router'

import { ApiStatus } from '../dev/ApiStatus'
import styles from './SiteFooter.module.css'

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span>© 2026 Servido! · Reservá. Pedí. Disfrutá.</span>
        <nav className={styles.links} aria-label="Legales">
          <Link to="/privacidad">Privacidad</Link>
          <Link to="/terminos">Términos</Link>
        </nav>
        {import.meta.env.DEV && (
          <span className={styles.devTools}>
            <ApiStatus />
            <Link to="/diseno">Sistema de diseño</Link>
          </span>
        )}
      </div>
    </footer>
  )
}
