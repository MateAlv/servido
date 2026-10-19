import { Button, Chip } from '../ui'
import { PRICE_TIERS, type PriceTier } from './priceFilter'
import styles from './PriceFilter.module.css'

type PriceFilterProps = {
  selectedTiers: readonly PriceTier[]
  onChange: (tiers: PriceTier[]) => void
  /** Pass only after the restaurant query succeeds, never during loading or errors. */
  resultCount?: number
}

export function PriceFilter({ selectedTiers, onChange, resultCount }: PriceFilterProps) {
  function toggle(tier: PriceTier) {
    onChange(
      selectedTiers.includes(tier)
        ? selectedTiers.filter((selected) => selected !== tier)
        : [...selectedTiers, tier],
    )
  }

  return (
    <section className={styles.filter} aria-label="Filtro de precio">
      <fieldset className={styles.fieldset}>
        <legend>Precio</legend>
        <div className={styles.options}>
          {PRICE_TIERS.map((tier) => (
            <Chip key={tier} selected={selectedTiers.includes(tier)} onClick={() => toggle(tier)}>
              {tier}
            </Chip>
          ))}
        </div>
      </fieldset>
      <Button
        variant="ghost"
        size="sm"
        disabled={selectedTiers.length === 0}
        onClick={() => onChange([])}
      >
        Quitar filtro de precio
      </Button>
      <div role="status">
        {resultCount === 0 && (
          <p className={styles.empty}>
            {selectedTiers.length > 0
              ? 'No hay restaurantes que coincidan con los precios elegidos. Probá quitar el filtro de precio.'
              : 'No hay restaurantes para mostrar.'}
          </p>
        )}
      </div>
    </section>
  )
}
