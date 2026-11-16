# Preparation Time Contracts

US-40 reuses the existing dish and order contracts. No new external service is
introduced.

## Restaurant dish write

The existing restaurant dish create/edit operation accepts an optional preparation
time:

```json
{
  "prep_time_minutes": 25
}
```

Rules:

- Present values are integer minutes greater than zero.
- Empty values mean that the dish has no declared estimate.
- Invalid values return the repository-standard Spanish validation error and do not
  modify the existing dish.
- Ownership checks prevent access to another restaurant's dish.

## Diner order read

The existing order response exposes:

```json
{
  "prep_time_minutes": 25,
  "prep_start_time": "19:35"
}
```

`prep_time_minutes` is the maximum item snapshot time and is null when no item has
an estimate. The response exposes a Spanish warning when at least one item lacks a
time, using the existing order contract.

## Restaurant order read

The existing restaurant order response exposes each item's `prep_time_minutes`,
the derived `prep_start_time`, and `prep_time_warning`. These values are read-only
for confirmed orders.
