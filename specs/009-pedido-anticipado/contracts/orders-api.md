# Contract: Orders API

**Feature**: `specs/009-pedido-anticipado` | All routes under `/api`, diner token required (`Authorization: Bearer …`).

Common errors, as in spec 005: `401` no token or expired session (`SESSION_EXPIRED_DETAIL`, also when the diner no longer exists) · `403` restaurant account («Esta acción es solo para comensales.») · `400` invalid input (global validation handler, never 422). Checks run in the order of [data-model.md](../data-model.md) rule 6 (confirmation) and rule 7 (cart). Money is a decimal string with two places; datetimes are ISO 8601 with offset.

## `GET /api/reservations/{reservation_id}/order`

The order page: the reservation, its confirmed order (if any), the diner's saved cart (if any) and the menu to build it from.

**200**

```json
{
  "reservation": {
    "id": "…",
    "restaurant": { "id": "…", "nombre": "La Esquina de Palermo" },
    "date": "2026-11-05",
    "start_time": "21:00",
    "end_time": "22:30",
    "party_size": 4,
    "table": { "capacity": 4, "seating_area": "terrace" },
    "status": "confirmed",
    "has_order": true,
    "has_cart": true,
    "order_open": true,
    "order_deadline": "2026-11-05T20:15:00-03:00"
  },
  "order": {
    "confirmed_at": "2026-11-05T12:02:11-03:00",
    "items": [
      { "dish_id": "…", "name": "Provoleta", "unit_price": "7500.00", "prep_time_minutes": 10, "quantity": 2, "subtotal": "15000.00" }
    ],
    "total": "15000.00",
    "prep_time_minutes": 10
  },
  "cart": {
    "updated_at": "2026-11-05T12:30:40-03:00",
    "items": [
      { "dish_id": "…", "quantity": 3, "name": "Provoleta", "unit_price": "7500.00", "prep_time_minutes": 10 }
    ]
  },
  "menu": [
    { "id": "…", "name": "Provoleta", "description": null, "category": "entrada", "price": "7500.00", "photo_url": null, "dietary_restrictions": [], "prep_time_minutes": 10 }
  ]
}
```

- `order` is `null` when the reservation has no order. Its `prep_time_minutes` is `null` when no item has a time (P2). An item's `dish_id` is `null` if the dish was deleted after the confirmation.
- `cart` is `null` when there is no cart or the order is closed (`has_cart`). Its items carry the values the diner saw (P9), and a `dish_id` of `null` when the dish was deleted after it was saved; the page drops those with the menu-changed notice. It has no totals, since the page computes them from the current menu. Its `items` may be empty: a confirmed order the diner emptied (P11).
- `reservation.order_open`, `order_deadline` and `has_cart` follow data-model.md (`order_open`, `order_deadline`, `has_cart`).
- `menu` lists the dishes on the restaurant's menu (`menu_dishes`) in a fixed category order (entrada, plato_principal, postre, bebida), then by name. It is returned even when the order is closed.

**404** «No encontramos esa reserva.»: unknown id, or a reservation of another diner (rule 1).

## `PUT /api/reservations/{reservation_id}/order`

Confirms the order: replaces it with the items sent (P1, rule 4) and deletes the cart in the same transaction. Sending no items leaves the reservation without an order (P11). The page sends the items it shows, not a reference to the saved cart, so a save still on its way can't change what is confirmed.

**Request**

```json
{
  "items": [
    { "dish_id": "…", "quantity": 2, "name": "Provoleta", "unit_price": "7500.00", "prep_time_minutes": 10 }
  ]
}
```

`name`, `unit_price` and `prep_time_minutes` are what the page showed; they are compared with the menu (rule 5), never stored from the request.

**200**: the same body as `GET`, after the change (`order` is `null` if the items were empty; `cart` is always `null`).

| Status | When | `detail` |
| --- | --- | --- |
| 400 | More than 50 items, a repeated `dish_id`, quantity outside 1–20, a name over 150 characters, a malformed price or time | Validation message |
| 404 | Unknown reservation or another diner's | «No encontramos esa reserva.» |
| 409 | Not open: the deadline passed, the reservation is cancelled or past, or the restaurant has no menu | «Ya no se puede cambiar el pedido de esta reserva.» |
| 403 | Email not verified (spec 007, US-51 S5; P13) | «Verificá tu email para confirmar tu pedido.» |
| 400 | No items and no order to remove | «Agregá al menos un plato para confirmar tu pedido.» |
| 409 | The menu changed: a dish is gone or belongs to another restaurant, or its name, price or time differs (P9) | «El menú cambió. Revisá tu pedido antes de confirmarlo.» |

The table follows the check order of data-model.md rule 6. Every 409 changes nothing. The page then reloads the order with `GET`, which brings the order that stayed and the current menu. It tells the two 409s apart by the reloaded `order_open`, not by the message. For a changed menu, it compares the new menu with the name, price and time its cart stored for each dish to say what changed.

## `PUT /api/reservations/{reservation_id}/cart`

Saves the order being built (P1): replaces the reservation's cart with the items sent, creating it if needed (data-model.md rule 7). The page calls it debounced after each change. Allowed for an unverified diner (P13).

**Request**: the same body as `PUT …/order`. The items may be empty only to save an emptied confirmed order; otherwise the page discards the cart.

**200**: `{ "cart": { "updated_at": "…", "items": [ … ] } }`, or `{ "cart": null }` after an empty save with no order (rule 7).

| Status | When | `detail` |
| --- | --- | --- |
| 400 | Same bounds as the confirmation | Validation message |
| 404 | Unknown reservation or another diner's | «No encontramos esa reserva.» |
| 409 | Not open | «Ya no se puede cambiar el pedido de esta reserva.» |
| 409 | A dish is not on the restaurant's menu | «El menú cambió. Revisá tu pedido antes de confirmarlo.» |

The values are stored as sent; they are compared with the menu only at confirmation. On the closed 409 the page reloads into the closed state. On the menu-changed 409 it keeps its own items, reloads the menu with `GET`, drops the dishes that are gone, refreshes the values, shows what changed and saves again.

## `DELETE /api/reservations/{reservation_id}/cart`

«Descartar cambios»: deletes the cart. **204**, also when there was none or the order is closed. **404** for an unknown reservation or another diner's.

## `GET /api/reservations/upcoming`

The diner home list «Tus próximas reservas» (P4): the diner's confirmed reservations that haven't started, soonest first, at most 20.

**200**

```json
{ "reservations": [ { "id": "…", "restaurant": { "id": "…", "nombre": "…" }, "date": "2026-11-05", "start_time": "21:00", "end_time": "22:30", "party_size": 4, "table": { "capacity": 4, "seating_area": "terrace" }, "status": "confirmed", "has_order": false, "has_cart": false, "order_open": true, "order_deadline": "2026-11-05T20:15:00-03:00" } ] }
```

## Changes to existing responses

- **`ReservationResponse`** (spec 005: `POST /api/reservations`, `GET /api/reservations?date=`) gains `has_order`, `has_cart`, `order_open` and `order_deadline`, so the confirmed step and the home list can offer «Armar pedido», «Seguir armando» or «Ver pedido». `reservation_response` then needs the session and the clock.
- `GET /api/restaurants/{id}` (`PublicDish`) does not change: the order page gets its menu from the order endpoint.
