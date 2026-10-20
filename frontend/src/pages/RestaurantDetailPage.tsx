import { Link, useParams } from 'react-router'

import { Button, Card, Reveal } from '../components/ui'
import { RESTAURANTS_FIXTURE, type RestaurantPublic } from '../data/restaurants.fixture'
import styles from './RestaurantDetailPage.module.css'

function getRestaurant(id: string | undefined): RestaurantPublic | undefined {
  if (!id) return undefined
  return RESTAURANTS_FIXTURE.find((restaurant) => restaurant.id === id)
}

export function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const restaurant = getRestaurant(id)

  if (!restaurant) {
    return (
      <main className={styles.container}>
        <Link to="/mapa" className={styles.back}>
          ← Volver al mapa
        </Link>
        <h1 className={styles.title}>Restaurante no encontrado</h1>
        <p className={styles.muted}>El restaurante no existe o no está disponible.</p>
      </main>
    )
  }

  return (
    <main className={styles.container}>
      <Link to="/mapa" className={styles.back}>
        ← Volver al mapa
      </Link>
      <Reveal>
        <h1 className={styles.title}>{restaurant.name}</h1>
      </Reveal>
      <Reveal delay={60}>
        <p className={styles.meta}>
          {restaurant.cuisine} · {restaurant.priceTier} · {restaurant.location.neighborhood}
        </p>
      </Reveal>
      <Reveal delay={120}>
        <Card>
          <h2 className={styles.sectionTitle}>Características</h2>
          <p className={styles.description}>{restaurant.description}</p>
          <div className={styles.restrictions}>
            {restaurant.dietaryRestrictions.map((restriction) => (
              <span key={restriction}>• {restriction}</span>
            ))}
          </div>
          <p className={styles.address}>Dirección: {restaurant.location.address}</p>
        </Card>
      </Reveal>
      <Reveal delay={180}>
        <Card className={styles.menuCard}>
          <h2 className={styles.sectionTitle}>Menú</h2>
          <p className={styles.muted}>
            Este restaurante todavía no tiene platos cargados. El menú se implementa en la spec 006.
          </p>
        </Card>
      </Reveal>
      <div className={styles.footer}>
        <Button to="/mapa" variant="secondary">
          Volver al mapa
        </Button>
      </div>
    </main>
  )
}
