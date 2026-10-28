import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router'

import { useAccount } from '../api/session'
import { LogoSpinner } from '../components/brand'
import { OccupancyMeter } from '../components/restaurant'
import {
  Button,
  Card,
  IconArrowRight,
  IconPin,
  Reveal,
  StarRating,
  StatusPill,
} from '../components/ui'
import { fetchRestaurant } from '../api/restaurants'
import { averageRating } from '../data/restaurants.fixture'
import styles from './RestaurantDetailPage.module.css'

const DATE_FORMAT = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' })

const PRICE_FORMAT = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

/** Where "Volver" goes: the map or home the diner came from, with their filter; else the map. */
function useBackTo(): string {
  const { state } = useLocation()
  const from = (state as { from?: unknown } | null)?.from
  return typeof from === 'string' && from.startsWith('/') ? from : '/mapa'
}

export function RestaurantDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const backTo = useBackTo()
  const { data: restaurant, isPending } = useQuery({
    queryKey: ['restaurants', id],
    queryFn: () => fetchRestaurant(id),
  })
  // Only a signed-in diner can start a reservation (US-11); the API would answer 403 to a restaurant.
  const { data: account } = useAccount()

  const back = (
    <Link to={backTo} className={styles.back}>
      <IconArrowRight className={styles.backIcon} /> Volver a los restaurantes
    </Link>
  )

  if (isPending) {
    return (
      <main className={styles.loading}>
        <LogoSpinner />
      </main>
    )
  }

  if (!restaurant) {
    return (
      <main className={styles.container}>
        {back}
        <h1 className={styles.title}>Restaurante no encontrado</h1>
        <p className={styles.muted}>El restaurante no existe o no está disponible.</p>
      </main>
    )
  }

  const rating = averageRating(restaurant)

  return (
    <main className={styles.container}>
      {back}
      <img
        className={styles.cover}
        src={restaurant.photo.cover}
        alt={`Foto de ${restaurant.name}`}
        width={1200}
        height={600}
      />
      <div className={styles.layout}>
        <div className={styles.main}>
          <Reveal>
            <p className={styles.eyebrow}>
              {restaurant.cuisine} · {restaurant.location.neighborhood}
            </p>
            <h1 className={styles.title}>{restaurant.name}</h1>
          </Reveal>
          <Reveal delay={60}>
            <ul className={styles.facts} aria-label="Características">
              {restaurant.priceTier && (
                <li className={styles.fact}>
                  <span className={styles.factLabel}>Precio</span>
                  <span className={styles.tier}>{restaurant.priceTier}</span>
                  {restaurant.averageSpendPerPerson !== null && (
                    <span className={styles.factNote}>
                      {PRICE_FORMAT.format(restaurant.averageSpendPerPerson)} por persona
                    </span>
                  )}
                </li>
              )}
              {rating !== null && (
                <li className={styles.fact}>
                  <span className={styles.factLabel}>Opiniones</span>
                  <span className={styles.rating}>
                    <StarRating value={rating} size={16} />
                    {rating.toLocaleString('es-AR', { maximumFractionDigits: 1 })}
                  </span>
                  <span className={styles.factNote}>{restaurant.reviews.length} reseñas</span>
                </li>
              )}
              <li className={styles.fact}>
                <span className={styles.factLabel}>Concurrencia ahora</span>
                <OccupancyMeter level={restaurant.occupancy} />
              </li>
              {restaurant.dietaryRestrictions.length > 0 && (
                <li className={styles.fact}>
                  <span className={styles.factLabel}>Opciones declaradas por el local</span>
                  <span className={styles.tags}>
                    {restaurant.dietaryRestrictions.map((restriction) => (
                      <span key={restriction} className={styles.tag}>
                        {restriction}
                      </span>
                    ))}
                  </span>
                </li>
              )}
            </ul>
          </Reveal>
          <Reveal delay={100}>
            <p className={styles.description}>{restaurant.description}</p>
            <p className={styles.address}>
              <IconPin /> {restaurant.location.address}, {restaurant.location.neighborhood}
            </p>
          </Reveal>

          <Reveal delay={140}>
            <Card className={styles.menu}>
              <h2 className={styles.sectionTitle}>Menú</h2>
              {restaurant.menu.length === 0 ? (
                <p className={styles.muted}>Este restaurante todavía no cargó su menú.</p>
              ) : (
                restaurant.menu.map((section) => (
                  <section key={section.category} className={styles.menuSection}>
                    <h3 className={styles.category}>{section.category}</h3>
                    <ul className={styles.dishes}>
                      {section.dishes.map((dish) => (
                        <li key={dish.name} className={styles.dish}>
                          <span>
                            <span className={styles.dishName}>{dish.name}</span>
                            {dish.description && (
                              <span className={styles.dishDescription}>{dish.description}</span>
                            )}
                          </span>
                          <span className={styles.price}>{PRICE_FORMAT.format(dish.price)}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </Card>
          </Reveal>

          <Reveal delay={180}>
            <Card className={styles.reviews}>
              <h2 className={styles.sectionTitle}>Opiniones</h2>
              {restaurant.reviews.length === 0 ? (
                <p className={styles.muted}>Todavía nadie dejó su opinión.</p>
              ) : (
                <ul className={styles.reviewList}>
                  {restaurant.reviews.map((review) => (
                    <li key={`${review.author}-${review.date}`} className={styles.review}>
                      <div className={styles.reviewHead}>
                        <span className={styles.reviewAuthor}>{review.author}</span>
                        <StarRating value={review.rating} size={14} />
                      </div>
                      <p className={styles.reviewText}>{review.comment}</p>
                      <span className={styles.factNote}>
                        Visitó el {DATE_FORMAT.format(new Date(`${review.date}T12:00:00`))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </Reveal>
        </div>

        <aside className={styles.side}>
          <Card className={styles.reserve}>
            {restaurant.bookable && account?.rol === 'diner' ? (
              <>
                <StatusPill tone="ok" className={styles.soon}>
                  Reservas abiertas
                </StatusPill>
                <h2 className={styles.sectionTitle}>Reservá con tu pedido</h2>
                <p className={styles.muted}>
                  Elegí la fecha, el horario y cuántos van a ser. Después revisás los datos y
                  confirmás.
                </p>
                <Button fullWidth to={`/reservar/${restaurant.id}`}>
                  Reservar mesa
                </Button>
              </>
            ) : (
              <>
                <StatusPill tone="warn" className={styles.soon}>
                  Próximamente
                </StatusPill>
                <h2 className={styles.sectionTitle}>Reservá con tu pedido</h2>
                <p className={styles.muted}>
                  Muy pronto vas a poder reservar una mesa y elegir tus platos para que estén listos
                  cuando llegues.
                </p>
                <Button fullWidth disabled>
                  Reservar mesa
                </Button>
              </>
            )}
          </Card>
        </aside>
      </div>
    </main>
  )
}
