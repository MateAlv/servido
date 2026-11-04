import { formatPrice } from '../../lib/orderSummary'
import { IconCloche, IconClock } from '../ui/icons'
import { DietaryBadges } from './DietaryBadges'
import styles from './DishDetails.module.css'

export type DishDetailsDish = {
  name: string
  description: string | null
  category: string
  price: string
  photo_url: string | null
  dietary_restrictions: string[]
  prep_time_minutes: number | null
}

const CATEGORY_LABELS: Record<string, string> = {
  entrada: 'Entrada',
  plato_principal: 'Plato principal',
  postre: 'Postre',
  bebida: 'Bebida',
}

/** A dish up close (US-17): its photo, price, preparation time (US-19), restrictions and
 * description. The order page shows it in a Modal. */
export function DishDetails({ dish }: { dish: DishDetailsDish }) {
  return (
    <div className={styles.details}>
      <figure className={styles.figure}>
        {dish.photo_url ? (
          <img src={dish.photo_url} alt={`Foto de ${dish.name}`} className={styles.photo} />
        ) : (
          <div className={styles.noPhoto}>
            <IconCloche className={styles.noPhotoIcon} />
            <span>El restaurante todavía no cargó una foto</span>
          </div>
        )}
        <span className={styles.category}>{CATEGORY_LABELS[dish.category] ?? dish.category}</span>
      </figure>

      <div className={styles.facts}>
        <span className={styles.price}>{formatPrice(dish.price)}</span>
        {dish.prep_time_minutes !== null && (
          <span className={styles.time}>
            <IconClock />
            Se prepara en {dish.prep_time_minutes} min
          </span>
        )}
      </div>

      {dish.description && <p className={styles.description}>{dish.description}</p>}

      {dish.dietary_restrictions.length > 0 && (
        <div className={styles.diet}>
          <DietaryBadges restrictions={dish.dietary_restrictions} size="md" />
          <p className={styles.declared}>Según lo que declara el restaurante.</p>
        </div>
      )}
    </div>
  )
}
