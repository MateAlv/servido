# Restaurant orders API contract

## List current-shift orders

`GET /api/restaurante/pedidos/turno-actual`

Authentication: Bearer JWT for a restaurant account. Diner tokens receive
`403`; missing or expired sessions receive `401`.

### Response `200`

```json
{
  "shift": {
    "start_time": "19:00",
    "end_time": "23:00"
  },
  "orders": [
    {
      "id": "uuid",
      "reservation_id": "uuid",
      "arrival_time": "20:00",
      "prep_start_time": "19:20",
      "items": [
        {"dish_name": "Ravioles", "quantity": 2, "prep_time_minutes": 0}
      ],
      "prep_time_warning": true,
      "payment": {
        "status": "pending",
        "method": "No seleccionado",
        "total": "24000.00"
      }
    }
  ]
}
```

Only confirmed orders for confirmed reservations belonging to the authenticated
restaurant and active shift are returned. The list is ordered by arrival time,
then preparation start, then order ID. Outside an active shift, `shift` is
`null` and `orders` is empty.

## Order detail

`GET /api/restaurante/pedidos/{order_id}`

The same restaurant-only authentication and ownership rules apply. The response
contains the complete item list with names, quantities, preparation times and
item totals, plus the reservation arrival time and payment summary. When at
least one item has no preparation time, `prep_time_warning` is true and the UI
shows a warning that the preparation time is 0. A foreign order returns `404`
without revealing whether it exists.

## Payment fields

Payment state is `paid` or `pending`. Payment method is `cash`, `online`, or
the user-facing value `No seleccionado` when no method exists. This contract
does not define a payment gateway webhook or a cash-collection operation;
those are deferred integration points for a later implementation.

## Error behavior

- `401`: missing, invalid or expired session.
- `403`: authenticated diner or another disallowed role.
- `404`: order does not belong to the authenticated restaurant.
- `500`: unexpected persistence failure, surfaced through the existing global
  error handling rather than an empty success response.
