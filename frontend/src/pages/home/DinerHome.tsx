import type { Account } from '../../api/session'
import { RestaurantExplorer } from '../../components/restaurant'
import { Reveal } from '../../components/ui'
import styles from './DinerHome.module.css'

function firstName(account: Account): string {
  return (account.nombre ?? '').trim().split(/\s+/)[0] || account.email
}

/** A signed-in diner lands right on choosing a restaurant. */
export function DinerHome({ account }: { account: Account }) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Reveal>
          <p className={styles.eyebrow}>Hola, {firstName(account)}</p>
        </Reveal>
        <Reveal delay={60}>
          <h1 className={styles.title}>¿Dónde comés hoy?</h1>
        </Reveal>
        <Reveal delay={120}>
          <p className={styles.lead}>
            Elegí un restaurante: filtrá por precio, mirá cuánta gente hay ahora y entrá a su menú.
          </p>
        </Reveal>
      </header>
      <RestaurantExplorer />
    </main>
  )
}
