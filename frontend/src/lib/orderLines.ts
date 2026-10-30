/** The lines of an order being built, from the confirmed order, the saved cart or the menu
 * (spec 009). */
import type { CartLine, ConfirmedOrder, MenuDish, SavedCart } from '../api/orders'
import { formatPrice, toCents } from './orderSummary'

export function lineOf(dish: MenuDish, quantity: number): CartLine {
  return {
    dishId: dish.id,
    quantity,
    name: dish.name,
    unitPrice: dish.price,
    prepTimeMinutes: dish.prep_time_minutes,
  }
}

export function linesOfOrder(order: ConfirmedOrder | null | undefined): CartLine[] | null {
  if (!order) return null
  return order.items.flatMap((item) =>
    item.dish_id === null
      ? []
      : [
          {
            dishId: item.dish_id,
            quantity: item.quantity,
            name: item.name,
            unitPrice: item.unit_price,
            prepTimeMinutes: item.prep_time_minutes,
          },
        ],
  )
}

export function linesOfCart(cart: SavedCart): CartLine[] {
  return cart.items.map((item) => ({
    dishId: item.dish_id ?? '',
    quantity: item.quantity,
    name: item.name,
    unitPrice: item.unit_price,
    prepTimeMinutes: item.prep_time_minutes,
  }))
}

/** Brings the lines up to date with the menu and says what changed (P9). */
export function reconcile(
  lines: CartLine[],
  menu: MenuDish[],
): { lines: CartLine[]; changes: string[] } {
  const changes: string[] = []
  const updated = lines.flatMap((line) => {
    const dish = menu.find((candidate) => candidate.id === line.dishId)
    if (!dish) {
      changes.push(`${line.name} ya no está en el menú, lo sacamos.`)
      return []
    }
    if (dish.name !== line.name) changes.push(`${line.name} ahora se llama ${dish.name}.`)
    if (toCents(dish.price) !== toCents(line.unitPrice)) {
      changes.push(
        `Cambió el precio de ${dish.name}: ${formatPrice(line.unitPrice)} → ${formatPrice(dish.price)}.`,
      )
    }
    if (dish.prep_time_minutes !== line.prepTimeMinutes) {
      changes.push(`Cambió el tiempo de preparación de ${dish.name}.`)
    }
    return [lineOf(dish, line.quantity)]
  })
  return { lines: updated, changes }
}
