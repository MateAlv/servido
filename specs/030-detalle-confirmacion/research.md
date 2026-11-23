# Research: Reservation Confirmation Details

## Decision: Reuse the existing reservation projection

- **Decision**: Add the restaurant address to `ReservationRestaurant` and keep the reservation
  `id` as the confirmation identifier in the existing `ReservationResponse`.
- **Rationale**: The reservation endpoint already returns the restaurant name, local date/time,
  party size, assigned table and id. The restaurant model already stores `direccion`, so the
  receipt needs a projection change rather than a new read model or endpoint.
- **Alternatives considered**: A separate confirmation endpoint or a new receipt table would
  duplicate data and would not improve the immediate confirmation flow required by US-54.

## Decision: Send confirmation mail after the reservation commit

- **Decision**: Build a confirmation `Mail` with the required details and call the existing
  `send_mail` only after `session.commit()` succeeds. Catch `MailError`, log it with context and
  return the already-confirmed reservation response.
- **Rationale**: The spec explicitly requires that a transient mail failure does not revert the
  reservation. The existing mail service already supports SES, SMTP, console and memory backends;
  using it preserves production configuration and makes tests inspect `mail.outbox`.
- **Alternatives considered**: Sending before commit could email a booking that later rolls back;
  a queue or retry worker violates the MVP constitution and is out of scope.

## Decision: Use existing request idempotency to prevent duplicate mail

- **Decision**: Send the confirmation mail only when `availability.confirm_reservation` reports
  `created=True`. For a repeated `request_id`, return the existing reservation without sending a
  second message.
- **Rationale**: `Reservation.request_id` is unique and the current confirmation flow already
  returns the original reservation for a repeated review. This directly satisfies one reservation
  and one notification without adding an idempotency table or endpoint.
- **Alternatives considered**: A separate notification record would add persistence and state not
  needed by the spec; client-side disabling alone cannot protect retries.

## Decision: Format all notification details in Buenos Aires time

- **Decision**: Convert stored UTC `starts_at` and `ends_at` with the existing
  `availability.BUENOS_AIRES` timezone before formatting the email and response.
- **Rationale**: Existing reservation responses already use this conversion, and the spec requires
  the same local date/time in the email and screen.
- **Alternatives considered**: Formatting UTC would expose implementation data and violate C2.

## Decision: Keep rejected confirmations side-effect free

- **Decision**: Preserve the existing rollback path for unavailable starts and confirmation
  conflicts; construct and send no confirmation mail unless a reservation is successfully
  committed.
- **Rationale**: The reservation row and the email must be created as one logical success path,
  while a rejected confirmation must produce neither a confirmed reservation nor a notification.
- **Alternatives considered**: Sending a pending email before availability validation could notify
  the diner about a booking that does not exist.
