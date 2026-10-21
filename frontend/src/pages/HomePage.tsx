import { useAccount } from '../api/session'
import { LogoSpinner } from '../components/brand'
import { DinerHome } from './home/DinerHome'
import { LandingPage } from './home/LandingPage'
import { RestaurantHome } from './home/RestaurantHome'
import styles from './HomePage.module.css'

/** The first page: the landing for visitors, and each role's own home once signed in. */
export function HomePage() {
  const { data: account, isPending } = useAccount()

  if (isPending) {
    return (
      <main className={styles.loading}>
        <LogoSpinner />
      </main>
    )
  }
  if (account?.rol === 'diner') return <DinerHome account={account} />
  if (account?.rol === 'restaurant') return <RestaurantHome account={account} />
  return <LandingPage />
}
