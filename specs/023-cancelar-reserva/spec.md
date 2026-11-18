# **Feature Specification: Cancelar Reserva y Reembolsar al Comensal (Restaurante)**

**Created**: 2026-11-11

**Input**: Backlog Servido\! — US-38 (Sprint 5 \- 3 SP)

**Rol**: Responsable del restaurante

## Clarifications

### Session 2026-11-16

- Q: ¿Debemos implementar ahora la cancelación del restaurante con reembolso real, aunque el pago electrónico/US-56 figure como trabajo posterior, o dejar el reembolso como integración simulada/preparada? → A: Reembolso simulado.
- Q: ¿Qué canal debe cumplir US-38 para avisar al comensal? → A: Aviso en la app y por email.
- Q: ¿La acción de cancelar desde el restaurante requiere confirmación previa? → A: Sí, se muestra una ventana flotante «Confirmar cancelación» y la operación solo comienza al confirmarla.

## **User Scenarios & Testing *(mandatory)***

### **US-38 — Cancelar reserva (Prioridad: \-, Estimación: 3\)**

Como **Responsable del restaurante**, quiero reembolsar el dinero a un cliente tras la cancelación de una reserva, para devolverle lo cobrado.

**Valor**: Cuando el restaurante no puede atender una reserva, el comensal recupera lo que pagó por adelantado y se entera de que su pedido se canceló, sin tener que reclamarlo.

**Independent Test**: Con una reserva futura de un pedido anticipado pagado electrónicamente, cancelarla desde el restaurante con más de 45 minutos de anticipación y verificar que se reembolsa el importe, que el comensal recibe el aviso y que la reserva, el pedido y la mesa quedan actualizados; intentar cancelar una reserva a menos de 45 minutos de su horario; cancelar una reserva sin pago y verificar que no se genera reembolso.

**Acceptance Scenarios**:

1. **Dado** que una reserva de mi restaurante tiene un pedido anticipado ya pagado y faltan 45 minutos o más, **Cuando** la cancelo, **Entonces** el sistema reembolsa al comensal el importe del pedido y la reserva queda cancelada.  
2. **Dado** que se completó el reembolso, **Cuando** vuelvo a la pantalla, **Entonces** el sistema me informa que la cancelación y el reembolso se completaron correctamente.  
3. **Dado** que cancelo una reserva, **Cuando** la cancelación se completa, **Entonces** el comensal recibe un aviso de que su pedido se canceló.  
4. **Dado** que faltan menos de 45 minutos para la reserva, **Cuando** intento cancelarla y reembolsar, **Entonces** el sistema no me lo permite y me informa el motivo.  
5. **Dado** que la reserva no tiene un pedido pagado, **Cuando** la cancelo con 45 minutos o más de anticipación, **Entonces** la reserva queda cancelada, no se genera ningún reembolso y el comensal recibe el aviso.  
6. **Dado** que el reembolso no pudo completarse, **Cuando** intento cancelar, **Entonces** la reserva no queda cancelada, el sistema me informa el problema y puedo reintentar.  
7. **Dado** que la cancelación se completó, **Cuando** reviso mis reservas, **Entonces** la reserva figura como cancelada, su pedido también está cancelado y la mesa y el horario vuelven a estar disponibles.

---

### **Edge Cases**

* **Título y descripción de US-38** *(pendiente para la PO)*: el título dice «Cancelar reserva», pero la descripción y los criterios hablan solo de reembolsar tras la cancelación. Esta spec asume que la historia cubre la cancelación de la reserva por parte del restaurante y el reembolso al comensal, como indica la spec 011 («cancelación por parte del restaurante (US-38, Sprint 5)»).  
* **Plazo de 45 minutos** *(pendiente para la PO)*: US-25 usa 30 minutos para que el comensal cancele su reserva (spec 011), y US-17 y US-38 usan 45 minutos. Falta que la PO unifique el criterio. Esta spec aplica los 45 minutos de US-38, contados hasta el horario de la reserva, y asume que el límite bloquea tanto el reembolso como la cancelación desde el restaurante.  
* **Cuándo hay reembolso**: esta spec asume que solo se reembolsa si el comensal ya pagó electrónicamente (US-56). Para esta entrega, el reembolso se simula mediante un adaptador de prueba, sin integrar un proveedor de pagos real. Si el pedido es en efectivo o no hay pedido, no hay nada para reembolsar: la reserva se cancela y el comensal recibe el aviso.  
* **Importe a reembolsar**: «reembolsar correctamente» se interpreta como el importe total pagado por el pedido, por el mismo medio con que se pagó. El adaptador simulado devuelve ese importe. Los reembolsos parciales quedan fuera de esta spec.  
* **Reembolso como condición de la cancelación** *(pendiente para la PO)*: consistente con FR-011 de la spec 011, si el reembolso falla la reserva no se cancela y se puede reintentar. Falta confirmar si debe ser así o si la cancelación puede completarse con el reembolso pendiente.  
* **Aviso al comensal**: se muestra dentro de la aplicación y se envía por email, indicando restaurante, fecha y hora de la reserva y, si corresponde, el importe reembolsado.  
* **Motivo** *(pendiente para la PO)*: el backlog no pide indicar el motivo de la cancelación. Esta spec no lo exige; sí exige la confirmación previa definida en la clarificación de esta sesión.
* **Doble confirmación**: si la acción llega dos veces (doble clic o reintento), la reserva se cancela y el reembolso se realiza una sola vez, y se envía un solo aviso.  
* **Reserva ya cancelada**: si el restaurante intenta cancelar una reserva ya cancelada (por ejemplo, por el comensal desde otro dispositivo), se le informa que ya estaba cancelada y no se reembolsa de nuevo.  
* **Reservas que ya pasaron**: no se pueden cancelar ni reembolsar.  
* **Pedido y mesa**: al cancelarse, el pedido anticipado se cancela junto con la reserva, y la mesa y el horario vuelven a mostrarse como disponibles (spec 011). El restaurante la ve como cancelación en su listado (US-18).  
* **Bloqueo de horarios** (US-32): esta spec asume que si el restaurante cancela reservas al bloquear horarios, estas reglas también aplican (reembolso y aviso). *(Pendiente de confirmar con la PO.)*  
* **Relación con la cancelación del comensal** (US-25, spec 011): el reembolso de este flujo es el mismo que el pendiente de FR-011 de la spec 011\. Cuando exista, ambas cancelaciones deben reembolsar de la misma forma.  
* **Registro**: queda registrado el momento de la cancelación, quién la hizo y, si hubo reembolso, su importe.  
* **Privacidad**: el restaurante solo ve y cancela reservas de su propio restaurante.  
* **Sesión vencida durante la cancelación**: no se cancela ni reembolsa nada; el responsable vuelve a ingresar y la reserva sigue activa.  
* **"Ahora"**: siempre en la hora de Argentina, también para calcular los 45 minutos.

## **Requirements *(mandatory)***

### **Functional Requirements**

* **FR-001** *(US-38)*: El sistema MUST permitir al responsable del restaurante cancelar una reserva de su restaurante.  
* **FR-002** *(US-38)*: Cuando el pedido anticipado ya fue pagado, el sistema MUST reembolsar al comensal el importe pagado del pedido.  
* **FR-003** *(US-38)*: El sistema MUST informar al responsable que la cancelación y el reembolso se completaron correctamente.  
* **FR-004** *(US-38)*: El sistema MUST avisar al comensal dentro de la aplicación y por email que su pedido se canceló.  
* **FR-005** *(US-38)*: El sistema MUST NOT permitir cancelar ni reembolsar una reserva cuando faltan menos de 45 minutos para su horario, y MUST informar el motivo.  
* **FR-006** *(US-38)*: Si la reserva no tiene un pedido pagado, el sistema MUST cancelarla sin generar reembolso y MUST avisar al comensal.  
* **FR-007** *(US-38)*: Si el reembolso no puede completarse, el sistema MUST NOT cancelar la reserva, MUST informar el problema y MUST permitir reintentar.  
* **FR-008** *(US-38)*: Al cancelarse, el sistema MUST cancelar el pedido anticipado asociado y MUST liberar la mesa y el horario.  
* **FR-009** *(US-38)*: El sistema MUST cancelar y reembolsar una única vez ante una acción repetida, y MUST enviar un solo aviso.  
* **FR-010** *(US-38)*: El sistema MUST informar cuando la reserva ya estaba cancelada, sin reembolsar de nuevo.  
* **FR-011** *(US-38)*: El sistema MUST NOT permitir cancelar ni reembolsar una reserva que ya pasó.  
* **FR-012** *(US-38)*: El sistema MUST registrar el momento de la cancelación, quién la realizó y el importe reembolsado, si lo hubo.  
* **FR-013** *(US-38)*: El sistema MUST permitir al responsable cancelar únicamente reservas de su propio restaurante.

### **Key Entities**

* **Reserva**: comensal, restaurante, fecha, horario, mesa, estado (confirmada o cancelada), momento de la cancelación y quién la realizó.  
* **Pedido anticipado**: asociado a la reserva; platos, total, medio de pago y estado de pago; se cancela junto con ella.  
* **Reembolso**: importe devuelto al comensal, medio, momento y estado (completado o fallido), asociado al pedido.  
* **Aviso al comensal**: notificación dentro de la aplicación y por email, con datos de la reserva y del reembolso, si lo hubo.

## **Límites de alcance *(MVP Boundaries)***

* **Dentro**: cancelar una reserva desde el restaurante; simular el reembolso del pedido pagado mediante un adaptador de prueba; avisar al comensal; respetar el plazo de 45 minutos; liberar la mesa y cancelar el pedido asociado.  
* **Fuera**: integración con un proveedor real de pago electrónico (US-56), reembolsos parciales, cancelación por parte del comensal (spec 011), bloqueo de horarios (US-32), motivo de cancelación, detalle de la reserva cancelada (US-49, Sprint 6).

## **Success Criteria *(mandatory)***

### **Measurable Outcomes**

* **SC-001**: 100% de las cancelaciones de reservas con pedido pagado generan un reembolso por el importe pagado.  
* **SC-002**: 100% de los comensales cuya reserva fue cancelada por el restaurante reciben el aviso.  
* **SC-003**: 0 reservas canceladas o reembolsadas con menos de 45 minutos de anticipación.  
* **SC-004**: 0 reembolsos duplicados ante acciones repetidas.  
* **SC-005**: 100% de las mesas de reservas canceladas vuelven a figurar como disponibles.

## **Assumptions**

* El responsable ya ingresó a su cuenta y tiene un restaurante asociado.  
* El pago electrónico existe (US-56) y el adaptador simulado permite devolver el importe por el mismo medio, sin integrar todavía un proveedor real.  
* El restaurante ya ve las cancelaciones en su listado (US-18, Sprint 3).  
* Las reservas se interpretan en la zona horaria de Argentina (America/Argentina/Buenos\_Aires).  
* Idioma de la interfaz y mensajes: español (Argentina).

&nbsp;