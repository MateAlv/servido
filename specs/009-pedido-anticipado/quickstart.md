# Quickstart: Pedido Anticipado

**Feature**: `specs/009-pedido-anticipado`

How to try US-17, US-19 and US-21 locally once they are built.

## Run

```bash
make db                                   # Postgres on :55432
make migrate
cd backend && uv run uvicorn app.main:app --reload
cd frontend && npm run dev                # http://localhost:5173
```

## Prepare a restaurant and a reservation

1. Register a restaurant at `/suma-tu-local`, then load its location (`/restaurante/perfil`), its shifts (`/restaurante/horarios`) and at least one table group (`/restaurante/mesas`), so it is bookable (spec 005, D4).
2. In `/restaurante/menu/nuevo-plato`, add three dishes: Provoleta $7.500 (10 min), Bife de chorizo $18.500 (25 min) and Flan $6.000 with no preparation time.
3. Register a diner at `/registrarme` and verify the email (the link is printed in the API log with `MAIL_BACKEND=console`).
4. As the diner, book a table in that restaurant for later today or tomorrow (`/reservar/<id>`), more than 45 minutes ahead.

## Walk through

| Step | Expect |
| --- | --- |
| On the confirmed reservation, click «Armar pedido» | The order page: reservation summary with «Podés cambiarlo hasta las …», the menu by category, «Agregá platos del menú para armar tu pedido.» |
| Add Provoleta, then Bife de chorizo | Both listed with quantity 1; «Preparación: unos 25 min» (US-19 S2); «Total del pedido» $26.000, «Impuestos incluidos»; «Sin confirmar: el restaurante todavía no lo ve» |
| Raise Provoleta to 2, open «Ver detalle de la cuenta» | Provoleta 2 × $7.500 = $15.000, Bife 1 × $18.500 = $18.500, total $33.500 (US-21) |
| Remove Bife de chorizo | Estimate 10 min (US-19 S3), total $15.000 (US-17 S5) |
| Reload the page | The order being built is still there (FR-003) |
| «Confirmar pedido» | «¡Pedido confirmado!» (US-17 S6) |
| Go to `/` | «Tus próximas reservas» lists the reservation with «Pedido confirmado» and «Ver pedido» (P4) |
| Open it, add Flan, «Confirmar cambios» | The confirmed order now has Flan; the estimate stays 10 min (Flan has no time, P2) |
| Book another reservation and order only Flan | No estimate shown at all (US-19 S4) |

## Edge cases

- **Cutoff**: book a reservation starting within 45 minutes; the confirmed step offers no order. With a reservation further ahead, an order page left open past `order_deadline` refuses the confirmation and shows «Ya no se pueden hacer pedidos para esta reserva…», or «Tu pedido ya está cerrado…» when it had a confirmed order (US-17 S8, S9).
- **Menu changed**: with an order being built, change a dish price in the database; «Confirmar pedido» lists «Cambió el precio de …» and shows the updated total (P9).
- **Unverified diner**: register a second diner without verifying; the order can be built, and confirming asks to verify the email (P13).
- **Empty the order**: remove every dish of a confirmed order; the button becomes «Quitar pedido» and asks first (P11).
- **Another diner's order**: open `/reservas/<id>/pedido` with a reservation of someone else: «No encontramos esa reserva.»
