import { RestaurantExplorer } from '../components/restaurant'
import { Reveal } from '../components/ui'
import styles from './MapPage.module.css'

/** Public map: anyone can look for a restaurant, with or without an account. */
export function MapPage() {
  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <Reveal>
          <h1 className={styles.title}>Restaurantes</h1>
        </Reveal>
        <Reveal delay={60}>
          <p className={styles.subtitle}>
            Filtrá por precio, mirá qué tan lleno está cada lugar y entrá al detalle para ver su
            menú.
          </p>
        </Reveal>
      </header>
      <RestaurantExplorer />
    </main>
  )
}
