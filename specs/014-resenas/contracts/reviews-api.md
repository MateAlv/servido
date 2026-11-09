# Contract: Reviews API

Errors follow the usual shape, `{"detail": "<Spanish message>"}`. Invalid input answers 400.

## `GET /api/reviews/pending` (diner)

The reservations the diner can review, the last finished first, at most 20.

```json
{
  "author": "Mateo A.",
  "reservations": [
    {
      "reservation_id": "uuid",
      "restaurant_id": "uuid",
      "restaurant_name": "La Esquina",
      "date": "2026-11-02",
      "start_time": "21:00",
      "party_size": 2,
      "hidden_by_later_visit": false,
      "replaces_earlier_review": false
    }
  ]
}
```

`hidden_by_later_visit`: the diner already reviewed a later visit to this restaurant, so this review would stay private. `replaces_earlier_review`: this review would take the public place of the diner's earlier one.

401 without a session · 403 for a restaurant.

## `POST /api/reservations/{id}/review` (diner)

```json
{ "rating": 4, "comment": "Muy rico.", "spend_per_person": 25000 }
```

`rating` is required and a whole number from 1 to 5. `comment` is trimmed, and blank means none. `spend_per_person` is a whole number from 1 to 1,000,000. Both are optional.

| Status | When |
| --- | --- |
| 201 | Published: `id`, `rating`, `comment`, `spend_per_person`, `published_at` |
| 400 | Invalid input |
| 401 | No session |
| 403 | A restaurant, or «Verificá tu email para dejar tu reseña.» |
| 404 | The reservation doesn't exist or belongs to someone else: same answer for both |
| 409 | «Ya publicaste la reseña de esta reserva.», or «Esta reserva ya no se puede calificar.» when it is cancelled, hasn't ended or ended over 30 days ago |

There is no `PUT`, `PATCH` or `DELETE`: they answer 405.

## `GET /api/restaurant/reviews?offset=0` (restaurant)

All of the restaurant's reviews, the last published first, 20 at a time.

```json
{
  "rating": 4.5,
  "review_count": 3,
  "total_reviews": 5,
  "price_tier": "$$$",
  "average_spend_per_person": 30000,
  "spend_people": 5,
  "reviews": [
    {
      "id": "uuid",
      "author": "Ana P.",
      "visit_date": "2026-11-02",
      "visit_time": "21:00",
      "rating": 5,
      "comment": "Muy rico.",
      "spend_per_person": 25000,
      "published_at": "2026-11-03T10:00:00-03:00",
      "counts_in_average": true
    }
  ],
  "next_offset": null
}
```

401 without a session · 403 for a diner.

## Changes to `GET /api/restaurants` and `GET /api/restaurants/{id}`

Both add `rating` (one decimal, or null), `review_count`, `average_spend_per_person` (whole pesos, or null) and `spend_people` (0 when the tier isn't calculated). `price_tier` is now the calculated tier when there is one.

The detail also adds `opinions`:

```json
[
  {
    "author": "Juan P.",
    "rating": 5,
    "comment": "Muy rico.",
    "spend_per_person": 25000,
    "visit_date": "2026-11-02"
  }
]
```
