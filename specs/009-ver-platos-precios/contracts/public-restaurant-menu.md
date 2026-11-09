# Public Restaurant Menu Contract

`GET /api/restaurants/{restaurant_id}` returns the bookable restaurant detail.

The `menu` array contains only dishes with `disponible = true`. Each item exposes:

- `id`
- `name`
- `description`
- `category`
- `price`
- `photo_url`
- `dietary_restrictions`

Items are ordered by the fixed category order `entrada`, `plato_principal`, `postre`, `bebida`, followed by unknown categories, and then by `name` within each category. `has_menu` is false when the filtered menu is empty.
