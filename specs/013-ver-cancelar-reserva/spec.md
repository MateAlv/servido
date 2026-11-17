# Feature Specification: Ver y Cancelar Reserva

**Created**: 2026-11-02

**Input**: Backlog Servido\! — US-23, US-25 (Sprint 4, 2 SP)

**Rol**: Comensal

## User Scenarios & Testing *(mandatory)*

### US-23 — Ver reserva activa (Prioridad: \-, Estimación: 1\)

Como **Comensal**, quiero ver mi reserva, para repasar la información cuando lo necesite.

**Valor**: El comensal tiene a mano los datos de su reserva (dónde, cuándo y en qué mesa) sin depender del mail ni de recordarlos.

**Independent Test**: Con una reserva confirmada futura, entrar a la sección de reservas, verificar que aparece y que su detalle muestra restaurante, fecha, hora, mesa y cantidad de comensales; con la cuenta sin reservas activas, verificar que se informa que no hay ninguna.

**Acceptance Scenarios**:

1. **Dado** que tengo una reserva confirmada futura, **Cuando** ingreso a la sección de reservas, **Entonces** la veo en la lista de mis reservas activas.  
2. **Dado** que estoy en la lista, **Cuando** selecciono una reserva, **Entonces** veo su detalle: restaurante, fecha, hora, mesa (por capacidad y tipo, por ejemplo «Mesa para 4 · Terraza») y cantidad de comensales.  
3. **Dado** que tengo más de una reserva activa, **Cuando** abro la sección de reservas, **Entonces** las veo ordenadas de la más próxima a la más lejana.  
4. **Dado** que no tengo reservas activas, **Cuando** abro la sección de reservas, **Entonces** el sistema me lo informa.  
5. **Dado** que cancelé una reserva, **Cuando** abro la sección de reservas, **Entonces** ya no aparece entre las activas.

---

### US-25 — Confirmar cancelación (Prioridad: \-, Estimación: 1\)

Como **Comensal**, quiero confirmar la cancelación de una reserva, para evitar cancelarla accidentalmente.

**Valor**: Evita perder un lugar por un toque equivocado y libera la mesa de forma clara cuando el comensal no puede ir.

**Independent Test**: Desde el detalle de una reserva activa, iniciar la cancelación, desistir y verificar que sigue activa; volver a iniciarla, confirmar y verificar que queda cancelada, se informa el resultado y la mesa vuelve a estar disponible; intentar cancelar una reserva a menos de 45 minutos de su horario.

**Acceptance Scenarios**:

1. **Dado** que estoy viendo una reserva activa, **Cuando** elijo cancelarla, **Entonces** el sistema me pide confirmación antes de cancelar.  
2. **Dado** que se me pide confirmación, **Cuando** desisto, **Entonces** la reserva permanece activa.  
3. **Dado** que se me pide confirmación, **Cuando** confirmo, **Entonces** la reserva queda cancelada.  
4. **Dado** que la cancelación se completó, **Cuando** vuelvo a la pantalla, **Entonces** el sistema me informa que se completó correctamente.  
5. **Dado** que faltan menos de 45 minutos para la reserva, **Cuando** intento cancelarla, **Entonces** el sistema no me lo permite y me informa el motivo.  
6. **Dado** que la reserva tenía un pedido anticipado asociado, **Cuando** confirmo la cancelación, **Entonces** el pedido también queda cancelado.

---

### Edge Cases

- **Plazo de cancelación**: esta spec aplica 45 minutos para cancelar la reserva, unificando el criterio con US-17 y US-38.  
- **Reembolso** *(pendiente para la PO)*: US-25 exige reembolsar al comensal que ya pagó, pero el pago electrónico (US-56) y el reembolso (US-38) se construyen en los Sprints 5 y 6\. En el Sprint 4 no existen pagos, así que ese criterio no se puede cumplir ni probar todavía; queda para los Sprints 5 y 6\.  
- **Pedido asociado**: si la reserva tiene pedido anticipado, se cancela junto con ella (consistente con US-18). El restaurante lo ve como cancelación en su listado (US-18).  
- **Mesa liberada**: al cancelarse, la mesa y el horario vuelven a mostrarse como disponibles a otros comensales (US-18).  
- **Doble confirmación**: si la confirmación llega dos veces (doble clic o reintento), la reserva se cancela una sola vez y el comensal ve un solo aviso.  
- **Reserva ya cancelada**: si el comensal intenta cancelar una reserva ya cancelada (por ejemplo, desde otra pestaña), se le informa que ya estaba cancelada.  
- **Reserva cancelada por el restaurante** (US-32, bloqueo de horarios): deja de figurar entre las activas. El detalle de una reserva cancelada es US-49 (Sprint 6).  
- **Reservas que ya pasaron**: no figuran entre las activas y no se pueden cancelar.  
- **Privacidad**: el comensal solo ve y cancela sus propias reservas.  
- **Sesión vencida durante la cancelación**: no se cancela nada; el comensal vuelve a ingresar y la reserva sigue activa.  
- **"Ahora"**: siempre en la hora de Argentina, también para calcular los 45 minutos.  
- **Modificar la reserva**: no está en el backlog del MVP; el criterio de US-11 «no puede modificar la reserva si faltan menos de 45 minutos» no aplica a esta spec.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-23)*: El sistema MUST mostrar al comensal, en la sección de reservas, sus reservas activas (confirmadas y futuras), ordenadas de la más próxima a la más lejana.  
- **FR-002** *(US-23)*: El detalle de la reserva MUST incluir el restaurante, la fecha, la hora, la mesa y la cantidad de comensales.  
- **FR-003** *(US-23)*: El sistema MUST informar cuando el comensal no tiene reservas activas.  
- **FR-004** *(US-23)*: El sistema MUST mostrar únicamente las reservas del comensal que inició sesión.  
- **FR-005** *(US-25)*: El sistema MUST pedir confirmación antes de cancelar una reserva y MUST permitir desistir.  
- **FR-006** *(US-25)*: Si el comensal desiste, la reserva MUST permanecer activa; si confirma, MUST quedar cancelada.  
- **FR-007** *(US-25)*: El sistema MUST informar al comensal que la cancelación se completó correctamente.  
- **FR-008** *(US-25)*: El sistema MUST NOT permitir cancelar una reserva cuando faltan menos de 45 minutos para su horario, y MUST informar el motivo.  
- **FR-009** *(US-25)*: Al cancelarse, el sistema MUST liberar la mesa y el horario, y MUST cancelar el pedido anticipado asociado, si lo hay.  
- **FR-010** *(US-25)*: El sistema MUST cancelar una única vez ante una confirmación repetida.  
- **FR-011** *(US-25; pendiente de Sprints 5 y 6\)*: Cuando existan pagos, el sistema MUST reembolsar al comensal que ya abonó como condición para completar la cancelación (ver Edge Cases).

### Key Entities

- **Reserva**: cuenta del comensal, restaurante, fecha, horario, cantidad de comensales, mesa asignada, estado (confirmada o cancelada), momento de la cancelación.  
- **Pedido anticipado**: asociado a la reserva; se cancela junto con ella.

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: lista y detalle de las reservas activas del comensal; cancelación con confirmación; liberación de la mesa; cancelación del pedido asociado.  
- **Fuera**: modificar la reserva, detalle de la cancelación (US-49, Sprint 6), reembolso (US-38 y US-56, Sprints 5 y 6), ver el pedido asociado (US-47, Sprint 5), cancelación por parte del restaurante (US-38, Sprint 5).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 90% de los comensales encuentra y abre su reserva en menos de 30 segundos desde que entra a la sección de reservas.  
- **SC-002**: 100% de las cancelaciones fueron precedidas por una confirmación explícita (0 reservas canceladas por accidente).  
- **SC-003**: 0 reservas canceladas con menos de 45 minutos de anticipación.
- **SC-004**: 100% de las mesas de reservas canceladas vuelven a figurar como disponibles.

## Assumptions

- El comensal ya ingresó a su cuenta (US-3) y tiene reservas creadas (US-11, US-13, Sprints 2 y 3).  
- Las reservas se interpretan en la zona horaria de Argentina (America/Argentina/Buenos\_Aires).  
- «Activa» significa confirmada y todavía no finalizada.  
- El restaurante ya ve las cancelaciones (US-18, Sprint 3).  
- Idioma de la interfaz y mensajes: español (Argentina).