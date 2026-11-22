# Public promotions and diner order contract

## `GET /api/restaurants/{restaurant_id}`

The existing `PublicRestaurantDetail` response gains:

```json
{
  "promotions": [
    {
      "name": "Martes al mediodía",
      "description": "Para disfrutar el menú del día",
      "discount_type": "percentage",
      "discount_value": "20.00",
      "minimum_amount": null,
      "starts_on": "2026-11-01",
      "ends_on": "2026-12-31",
      "weekdays": [2],
      "start_time": "12:00:00",
      "end_time": "15:00:00"
    }
  ]
}
```

Only active promotions whose end date has not passed are returned. This includes future
programmed promotions; paused and expired promotions are omitted. `404` and bookability rules
remain unchanged.

## Diner order responses

`GET /api/reservations/{reservation_id}/order` and the existing cart/confirmation responses expose
the same summary fields for the relevant state:

```json
{
  "subtotal": "12000.00",
  "promotions": [
    {
      "name": "Descuento fijo",
      "amount": "3000.00"
    }
  ],
  "discount": "3000.00",
  "total": "9000.00"
}
```

For a draft, these values are recalculated from the current cart, selected arrival time, and
current active promotions. An ineligible promotion produces an empty `promotions` list and
`discount: "0.00"`. On confirmation, the same result is persisted in `Order` and
`OrderDiscount`; later promotion changes do not mutate it.

Existing authentication, reservation ownership, payment-method, conflict, and validation status
codes remain unchanged. The frontend contract is regenerated from OpenAPI rather than hand-written.
