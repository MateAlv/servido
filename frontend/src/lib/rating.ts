const RATING_FORMAT = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const PESOS_FORMAT = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

/** Always with one decimal: «4,0». */
export function formatRating(rating: number): string {
  return RATING_FORMAT.format(rating)
}

/** «1 reseña», «3 reseñas». */
export function formatReviewCount(count: number): string {
  return count === 1 ? '1 reseña' : `${count} reseñas`
}

export function formatPesos(amount: number): string {
  return PESOS_FORMAT.format(amount)
}
