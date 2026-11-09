# Data Model: Reseñas de Reservas

## `reviews` (new)

| Field | Type | Rules |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `reservation_id` | UUID | FK `reservations.id`, `ON DELETE RESTRICT`, unique: one review per reservation (R4) |
| `rating` | integer | Required, 1 to 5 |
| `comment` | varchar(500) | Null, or not blank and up to 500 characters |
| `spend_per_person` | numeric(10, 0) | Null, or 1 to 1,000,000 whole pesos |
| `published_at` | timestamptz | Set when publishing |

There is no update or delete path: a review is final.

The diner and the restaurant come from the reservation. A review only exists for a reservation that was confirmed and had ended when it was published. US-25 and US-38 must keep it that way by refusing to cancel a reservation that already ended.

## Later stories

- **US-42** adds the restaurant's reply. **US-57** adds photos.
- **US-35** filters on the `rating` of the public restaurant.

## Derived values

For one restaurant:

- **Latest review of a person**: the review of their most recent reservation, by `starts_at`, then `published_at`.
- **`rating`**: the mean of those reviews, rounded half up to one decimal. Null without reviews.
- **`review_count`**: how many people have one.
- **`opinions`**: those reviews that have a comment, by most recent visit.
- **`average_spend_per_person`**: for each person, the amount of their most recent review that has one. With 5 or more people, their mean rounded half up to a whole peso; otherwise null.
- **`price_tier`**: from `average_spend_per_person` when it exists, using the limits of spec 002-elegir-restaurante (below 15,000 `$`; below 25,000 `$$`; up to 40,000 `$$$`; above `$$$$`). Otherwise `rango_precio`, which is still what the restaurant declares and edits in its profile.

## Reviewable reservation

The diner's own, `status = 'confirmed'`, `ends_at <= now`, `ends_at >= now - 30 days`, without a review.
