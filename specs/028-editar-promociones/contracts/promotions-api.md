# Contract — promotions API (spec 028, US-48)

All endpoints are JSON under `/api`. Only the Responsable of a restaurant can use them
(`Authorization: Bearer <token>` with `rol = restaurant`): another diner gets 403, another
restaurant's promotion is answered as 404. Invalid input is 400 with a Spanish message naming the
field to fix. Promotions are never deleted.

## Models

```ts
type DiscountType = 'percentage' | 'fixed'

type PromotionState = 'active' | 'programmed' | 'expired' | 'paused'

type Promotion = {
  id: string
  name: string
  description: string | null
  discount_type: DiscountType
  discount_value: string          // decimal
  minimum_amount: string | null   // required for `fixed`
  starts_on: string | null        // YYYY-MM-DD
  ends_on: string | null          // YYYY-MM-DD
  weekdays: number[] | null       // ISO 1–7
  start_time: string | null       // HH:MM
  end_time: string | null         // HH:MM
  active: boolean
  stackable: boolean
  state: PromotionState
}

type PromotionPayload = {
  name: string
  description?: string | null
  discount_type: DiscountType
  discount_value: string
  minimum_amount?: string | null
  starts_on?: string | null
  ends_on?: string | null
  weekdays?: number[] | null
  start_time?: string | null
  end_time?: string | null
  active?: boolean      // default true
  stackable?: boolean   // default true
}
```

## `GET /api/restaurant/promotions`

```json
{ "stack_promotions": false, "promotions": [Promotion, …] }
```

Sorted by `created_at` ascending. `state` is derived as in `data-model.md`.

## `POST /api/restaurant/promotions`

Body: `PromotionPayload & { request_id: UUID }`.

- `201` with `Promotion`.
- `200` with the stored `Promotion` when `request_id` was already used by this restaurant (double
  click or retry). The edge case asks for one promotion, not an error.

## `PUT /api/restaurant/promotions/{id}`

Body: `PromotionPayload`. `200` with the updated `Promotion`; `404` when it is not the caller's.

## `PATCH /api/restaurant/promotions/{id}`

Body: `{ "active": boolean }`. `200` with the `Promotion`; the reversible pause of the spec.

## `PUT /api/restaurant/promotions/policies`

Body: `{ "stack_promotions": boolean }`. `200` with `{ "stack_promotions": boolean }`. Declared
before `/{id}` in the router.

## Validation (400)

| Case | Message |
| --- | --- |
| Blank name | `Ingresá el nombre de la promoción.` |
| `discount_value <= 0` | `El descuento tiene que ser mayor a cero.` |
| `percentage > 100` | `El porcentaje no puede superar el 100%.` |
| `fixed` without minimum | `Indicá el monto mínimo del pedido para un descuento de monto fijo.` |
| `minimum_amount <= 0` | `El monto mínimo tiene que ser mayor a cero.` |
| `minimum_amount < discount_value` | `El monto mínimo no puede ser menor que el descuento.` |
| `percentage` with a minimum | `El monto mínimo solo aplica a los descuentos de monto fijo.` |
| `ends_on < starts_on` | `La fecha de fin no puede ser anterior a la de inicio.` |
| One date only | `Completá las dos fechas o dejálas vacías.` |
| `end_time <= start_time` | `La hora de fin tiene que ser posterior a la de inicio.` |
| One time only | `Completá el horario completo o dejalo vacío.` |
| No dates, weekdays nor time | `Elegí al menos una fecha, un día o un horario para la vigencia.` |
| Weekday out of 1–7 | `Los días de la semana no son válidos.` |

## Order integration

### `OrderPageResponse` (diner, existing `GET /api/reservations/{id}/order`)

The diner-facing contract must not expose promotion rules or discount lines in this stage.
`CartResponse` keeps `subtotal` and `total` as the normal menu bill. `OrderResponse` keeps
`subtotal` and `total` without `discount_total` or promotion snapshots.

### `RestaurantOrderResponse` (existing restaurant order views)

In this stage the restaurant order view keeps the normal bill fields and does not show promotion
discount lines. Promotion snapshots and restaurant discount breakdown are deferred until diner
promotion application is implemented.
