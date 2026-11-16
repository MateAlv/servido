# Spec 022 — Ver pedido del restaurante

## Historia de usuario

### US-36 — Ver pedido asociado

**Como** restaurante, **quiero** consultar el pedido anticipado asociado a una reserva,
**para** conocer los platos confirmados por el comensal.

#### Criterios de aceptación

1. Desde el detalle de una reserva propia, el restaurante ve la sección «Pedido anticipado».
2. Si la reserva está confirmada y tiene pedido confirmado, se muestran platos, cantidades, subtotal por plato y total.
3. Si la reserva está confirmada y no tiene pedido confirmado, se muestra «Esta reserva no tiene pedido anticipado».
4. Si la reserva está cancelada, se muestra «La reserva está cancelada: su pedido también se canceló» y no se muestran platos.
5. Un pedido sin confirmar no se muestra como pedido confirmado.
6. Una reserva de otro restaurante no expone datos y responde como no encontrada.

## Decisiones del equipo

- **D7.** Desde `/restaurante/reservas`, el detalle `/restaurante/reservas/:reservationId/comensal` suma la sección «Pedido anticipado».
- **D8.** Si la reserva está confirmada y tiene pedido confirmado: platos, cantidades, subtotal por plato y total. No se muestra medio de pago ni horarios de llegada o de cocina.
- **D9.** Si la reserva está confirmada y no tiene pedido confirmado, incluido el caso de pedido sin confirmar: «Esta reserva no tiene pedido anticipado».
- **D10.** Si la reserva está cancelada: «La reserva está cancelada: su pedido también se canceló». No se muestran platos.
- **D11.** No se cambia la base de datos. Un pedido de una reserva cancelada sigue con status `confirmed` en `orders`; que cuente como cancelado se decide por `reservations.status = 'cancelled'`.

## Código existente

- `restaurant_order()` y `restaurant_orders()` ya filtran pedidos confirmados y reservas confirmadas y reutilizan el mapeo a `RestaurantOrderResponse`.
- `GET /api/restaurante/reservas/{reservation_id}/comensal` ya valida la pertenencia y devuelve solo el comensal.
- `Order` y `OrderItem` ya guardan el nombre y precio históricos del pedido confirmado.
