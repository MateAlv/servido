# Restaurant Cancellation API Contract

Base path: `/api`. Endpoints require a valid restaurant session. A diner token
answers `403`; a missing or expired session answers `401`. A reservation belonging
to another restaurant is indistinguishable from a missing reservation (`404`).

## `POST /restaurante/reservas/{reservation_id}/cancelar`

Cancels one future reservation owned by the authenticated restaurant. The request
is idempotent by `request_id`; a repeated request after a completed cancellation
returns the existing result and does not refund or notify again.

### Request

```json
{
  "request_id": "4c1f5a3e-9d2b-4f7a-8c11-0e6b2a9d4f31"
}
```

### Response `200 OK`

```json
{
  "reservation_id": "b73c1f44-2a8e-4d6f-9c0a-1e5d7b3f8a22",
  "status": "cancelled",
  "message": "La reserva se canceló y el reembolso se completó correctamente.",
  "refund": {
    "status": "completed",
    "amount": "12500.00",
    "method": "online"
  },
  "notification_created": true
}
```

For an unpaid or orderless reservation, `refund` is `null` and the message says the
reservation was cancelled without a refund.

### Errors

| Status | Condition | Spanish detail |
| --- | --- | --- |
| `400` | Reservation already passed | `No podés cancelar una reserva que ya pasó.` |
| `401` | Missing or expired session | Existing session-expired response |
| `403` | Diner token | `No tenés permiso.` |
| `404` | Unknown or foreign reservation | `Reserva no encontrada.` |
| `409` | Less than 45 minutes remain | `No podés cancelar la reserva con menos de 45 minutos de anticipación.` |
| `409` | Already cancelled | `La reserva ya estaba cancelada.` |
| `502` | Simulated refund failed | `No pudimos completar el reembolso. La reserva sigue activa. Volvé a intentarlo.` |

No mutation is committed on a refund failure. The server creates at most one
completed refund and one in-app notification per reservation.

## In-app notice

The cancellation transaction creates a `Notification` for the diner. The feature adds:

`GET /api/notificaciones` → `{ "notifications": [...] }`

Each notification includes `id`, `kind`, `message`, `created_at` and `read_at`.
Email uses the existing mail backend after the transaction commits.
