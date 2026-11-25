import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'

import { useAccount } from '../api/session'
import { LogoSpinner } from '../components/brand'
import {
  OccupancyMeter,
  prefillLabel,
  readSearchFilters,
  reservationSearch,
} from '../components/restaurant'
import type { RestaurantPublic } from '../data/restaurants.fixture'
import type { RestaurantPromotion } from '../data/restaurants.fixture'
import {
  Button,
  Card,
  IconArrowRight,
  IconPin,
  Modal,
  Reveal,
  StarRating,
  StatusPill,
} from '../components/ui'
import { fetchRestaurant } from '../api/restaurants'
import { OpinionList } from '../components/review'
import { averageRating, reviewCountLabel } from '../data/restaurants.fixture'
import { formatRating } from '../lib/rating'
import styles from './RestaurantDetailPage.module.css'

const PRICE_FORMAT = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

const WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const DISCOUNT_FORMAT = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})
const PERCENT_FORMAT = new Intl.NumberFormat('es-AR', {
  style: 'percent',
  maximumFractionDigits: 2,
})

function promotionBenefit(promotion: RestaurantPromotion): string {
  if (promotion.discountType === 'percentage') {
    return `${PERCENT_FORMAT.format(Number(promotion.discountValue) / 100)} de descuento`
  }
  return `${DISCOUNT_FORMAT.format(Number(promotion.discountValue))} de descuento${
    promotion.minimumAmount
      ? ` en pedidos desde ${DISCOUNT_FORMAT.format(Number(promotion.minimumAmount))}`
      : ''
  }`
}

function promotionValidity(promotion: RestaurantPromotion): string[] {
  const conditions: string[] = []
  if (promotion.startsOn && promotion.endsOn) {
    conditions.push(`del ${promotion.startsOn} al ${promotion.endsOn}`)
  }
  if (promotion.weekdays?.length) {
    conditions.push(`los ${promotion.weekdays.map((day) => WEEKDAYS[day - 1]).join(', ')}`)
  }
  if (promotion.startTime && promotion.endTime) {
    conditions.push(`de ${promotion.startTime.slice(0, 5)} a ${promotion.endTime.slice(0, 5)}`)
  }
  return conditions
}

/** Where "Volver" goes: the map or home the diner came from, with their filter; else the map. */
function useBackTo(): string {
  const { state } = useLocation()
  const from = (state as { from?: unknown } | null)?.from
  return typeof from === 'string' && from.startsWith('/') ? from : '/mapa'
}

export function RestaurantDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const backTo = useBackTo()
  // The day, point hour and party size filtered on the map start the reservation (spec 027, F9).
  const [searchParams] = useSearchParams()
  const { filters } = readSearchFilters(searchParams)
  const reservePath = `/reservar/${id}${reservationSearch(filters)}`
  const prefill = prefillLabel(filters)
  const { data: restaurant, isPending } = useQuery({
    queryKey: ['restaurants', id],
    queryFn: () => fetchRestaurant(id),
  })
  // Only a signed-in diner can start a reservation (US-11); the API would answer 403 to a restaurant.
  const { data: account } = useAccount()
  const [selectedDish, setSelectedDish] = useState<
    RestaurantPublic['menu'][number]['dishes'][number] | null
  >(null)
  const [dishPhotoFailed, setDishPhotoFailed] = useState(false)

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
      {restaurant.photo && (
        <img
          className={styles.cover}
          src={restaurant.photo.cover}
          alt={`Foto de ${restaurant.name}`}
          width={1200}
          height={600}
        />
      )}
      <div className={styles.layout}>
        <div className={styles.main}>
          <Reveal>
            {(restaurant.cuisine || restaurant.location.neighborhood) && (
              <p className={styles.eyebrow}>
                {[restaurant.cuisine, restaurant.location.neighborhood].filter(Boolean).join(' · ')}
              </p>
            )}
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
                      {restaurant.spendPeople ? `, según ${restaurant.spendPeople} comensales` : ''}
                    </span>
                  )}
                </li>
              )}
              {rating !== null && (
                <li className={styles.fact}>
                  <span className={styles.factLabel}>Calificación</span>
                  <span className={styles.rating}>
                    <StarRating value={rating} size={16} />
                    <span aria-hidden="true">{formatRating(rating)}</span>
                  </span>
                  <span className={styles.factNote}>{reviewCountLabel(restaurant)}</span>
                </li>
              )}
              {restaurant.occupancy && (
                <li className={styles.fact}>
                  <span className={styles.factLabel}>Concurrencia ahora</span>
                  <OccupancyMeter level={restaurant.occupancy} />
                </li>
              )}
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
            {restaurant.description && (
              <p className={styles.description}>{restaurant.description}</p>
            )}
            {restaurant.location.address && (
              <p className={styles.address}>
                <IconPin /> {restaurant.location.address}
              </p>
            )}
          </Reveal>

          {/* Sections without content are left out instead of announcing they are empty. */}
          {restaurant.menu.length > 0 && (
            <Reveal delay={140}>
              <Card className={styles.menu}>
                <h2 className={styles.sectionTitle}>Menú</h2>
                {restaurant.menu.map((section) => (
                  <section key={section.category} className={styles.menuSection}>
                    <h3 className={styles.category}>{section.category}</h3>
                    <ul className={styles.dishes}>
                      {section.dishes.map((dish) => (
                        <li key={dish.id ?? dish.name} className={styles.dish}>
                          <button
                            type="button"
                            className={styles.dishButton}
                            onClick={() => {
                              setSelectedDish(dish)
                              setDishPhotoFailed(false)
                            }}
                          >
                            <span>
                              <span className={styles.dishName}>{dish.name}</span>
                              {dish.description && (
                                <span className={styles.dishDescription}>{dish.description}</span>
                              )}
                            </span>
                            <span className={styles.price}>{PRICE_FORMAT.format(dish.price)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </Card>
            </Reveal>
          )}

          {restaurant.promotions && restaurant.promotions.length > 0 && (
            <Reveal delay={160}>
              <Card className={styles.promotions}>
                <h2 className={styles.sectionTitle}>Promociones</h2>
                <ul className={styles.promotionList}>
                  {restaurant.promotions.map((promotion) => (
                    <li key={promotion.name} className={styles.promotion}>
                      <strong>{promotion.name}</strong>
                      <span className={styles.promotionBenefit}>{promotionBenefit(promotion)}</span>
                      {promotion.description && <span>{promotion.description}</span>}
                      {promotionValidity(promotion).length > 0 && (
                        <span className={styles.promotionConditions}>
                          {promotionValidity(promotion).join(' · ')}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          )}

          {restaurant.reviews.length > 0 && (
            <Reveal delay={180}>
              <Card className={styles.reviews}>
                <h2 className={styles.sectionTitle}>Opiniones</h2>
                <OpinionList opinions={restaurant.reviews} restaurantName={restaurant.name} />
              </Card>
            </Reveal>
          )}
        </div>

        <aside className={styles.side}>
          <Card className={styles.reserve}>
            {restaurant.bookable ? (
              <>
                <StatusPill tone="ok" className={styles.soon}>
                  Reservas abiertas
                </StatusPill>
                <h2 className={styles.sectionTitle}>Reservá tu mesa</h2>
                {prefill && account?.rol !== 'restaurant' && (
                  <p className={styles.prefill}>
                    <span className={styles.factLabel}>Con tu búsqueda</span>
                    {prefill}
                  </p>
                )}
                {account === null ? (
                  <>
                    <p className={styles.muted}>Ingresá con tu cuenta de comensal para reservar.</p>
                    <Button
                      fullWidth
                      to={`/ingresar?rol=comensal&volver=${encodeURIComponent(reservePath)}`}
                    >
                      Ingresá para reservar
                    </Button>
                  </>
                ) : account?.rol === 'restaurant' ? (
                  <p className={styles.muted}>Los comensales reservan desde acá.</p>
                ) : (
                  <>
                    <p className={styles.muted}>
                      {prefill
                        ? 'La reserva empieza con los datos de tu búsqueda y los podés cambiar. Después revisás todo y confirmás.'
                        : 'Elegí la fecha, el horario y cuántos van a ser. Después revisás los datos y confirmás.'}
                    </p>
                    <Button fullWidth to={reservePath}>
                      Reservar mesa
                    </Button>
                  </>
                )}
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
      {selectedDish && (
        <Modal open title={selectedDish.name} onClose={() => setSelectedDish(null)}>
          <div className={styles.dishModal}>
            {selectedDish.photo && !dishPhotoFailed ? (
              <img
                className={styles.dishPhoto}
                src={selectedDish.photo}
                alt={`Foto de ${selectedDish.name}`}
                width={640}
                height={400}
                onError={() => setDishPhotoFailed(true)}
              />
            ) : (
              <div className={styles.noDishPhoto}>Sin foto</div>
            )}
            {selectedDish.description && (
              <p className={styles.modalDescription}>{selectedDish.description}</p>
            )}
            <p className={styles.modalPrice}>{PRICE_FORMAT.format(selectedDish.price)}</p>
            {selectedDish.dietaryRestrictions && selectedDish.dietaryRestrictions.length > 0 && (
              <div className={styles.modalRestrictions}>
                {selectedDish.dietaryRestrictions.map((restriction) => (
                  <span key={restriction} className={styles.tag}>
                    {restriction}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </main>
  )
}
