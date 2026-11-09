# Quickstart: Reseñas de Reservas

## Local

```sh
make up-local
```

The seed loads the review demo on «Restaurante Demo», and loading it again replaces it, so each start brings the two pending reservations back.

1. **Diner**: sign in at <http://localhost:5173/ingresar> with `cliente@servido.local` / `Demo12345`. Under «¿Cómo estuvo?», choose «Dejar reseña», pick the stars, write a comment and a spend, review and publish.
2. **Public**: open the restaurant's detail. It shows the average, the count, the opinions and a `$` tier calculated from the spend, which replaces the declared `$$`.
3. **Restaurant**: sign in with `demo@servido.local` / `Demo12345` and choose «Ver reseñas». It lists everything, including Ana's older visit, marked because the public doesn't see it.

## Demo data on another database

```sh
cd backend
REVIEW_DEMO_PASSWORD='<at least 12 characters>' uv run python -m scripts.review_demo \
  --restaurant-email <demo restaurant> --diner-email <diner who reviews live>
uv run python -m scripts.review_demo --restaurant-email <demo restaurant> --remove
```

The restaurant's name must contain «demo». Loading again replaces what was created, including what the diner published on those two reservations.

**Production**: run it only with Mateo's explicit approval (R18), inside the API container, once this is deployed.
