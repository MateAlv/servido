# **Feature Specification: Ver Pedido Asociado y Detalle de Cancelación**

**Created**: 2026-11-12
**Input**: Backlog Servido! — US-47, US-49 (Sprint 5, 2 SP)
**Rol**: Comensal

*(Nota de implementación técnica: La US-47 se encuentra actualmente implementada de forma parcial. El detalle del pedido ya es visible desde la sección de inicio. Lo que falta implementar primariamente de ella es el acceso desde el detalle de la reserva y el aviso de reserva sin pedido, en lo cual hace énfasis esta spec).*

## **User Scenarios & Testing *(mandatory)***

### **US-47 — Ver pedido asociado (Prioridad: -, Estimación: 1)**
Como **Comensal**, quiero consultar el pedido asociado a mi reserva, para revisar qué platos solicité anticipadamente.
**Valor**: El comensal tiene a mano qué pidió sin depender de su memoria ni del restaurante.
**Independent Test**: Con una reserva activa que tenga un pedido anticipado, entrar a su detalle, abrir el pedido y verificar que se muestran los platos y sus cantidades y que corresponden a esa reserva; con otra reserva activa sin pedido, verificar que se informa que no tiene pedido asociado.

### **US-49 — Ver detalle de cancelación (Prioridad: -, Estimación: 1)**
Como **Comensal**, quiero ver el detalle de una reserva cancelada, para entender el motivo, quién la canceló y el estado del reembolso.
**Valor**: Aporta transparencia y tranquilidad al comensal respecto al flujo de su dinero y la razón por la cual no asistirá.
**Independent Test**: Ingresar al historial de reservas canceladas, abrir una y verificar que figura el origen de la cancelación y, si hubo un pago previo, el estado del reembolso asociado.

**Acceptance Scenarios**:

1. **Dado** que tengo una reserva activa con pedido anticipado, **Cuando** abro el detalle de la reserva, **Entonces** puedo acceder al pedido asociado.  
2. **Dado** que estoy viendo el pedido asociado, **Cuando** lo reviso, **Entonces** veo los platos incluidos y la cantidad de cada uno.  
3. **Dado** que tengo más de una reserva activa con pedido, **Cuando** abro el pedido de una de ellas, **Entonces** veo los platos del pedido vinculado a esa reserva y no los de otra.  
4. **Dado** que tengo una reserva activa sin pedido anticipado, **Cuando** intento ver su pedido, **Entonces** el sistema me informa que la reserva no tiene un pedido asociado.
5. **Dado** que mi reserva fue cancelada, **Cuando** visualizo sus detalles, **Entonces** veo quién ejecutó la cancelación y la información de reembolso (si corresponde).

---

### **Edge Cases**

* **Integración del pedido parcial**: Ya que la visualización del pedido de la US-47 ya existe en el inicio, la navegación desde el detalle de la reserva debe reutilizar el componente o vista existente sin duplicar lógica.
* **Cancelaciones sin pago previo**: Si la reserva se canceló pero el comensal no había pagado anticipadamente, el detalle de cancelación (US-49) no debe mostrar información de reembolso ni estados confusos, solo confirmar que fue cancelada.
* **Alcance de la información**: El backlog pide mostrar los platos y sus cantidades. Esta spec asume que se muestran esos datos base; falta definir por PO si se añaden precios y total aquí o en otra vista.
* **Reserva cancelada mientras se mira**: Si la reserva se cancela (por ejemplo, desde otra pestaña o por el restaurante), al actualizar deja de figurar entre las activas y se muestra su detalle de cancelación correspondiente a la US-49.
* **Privacidad y Solo Lectura**: El comensal solo ve los pedidos de sus propias reservas. Esta spec es estrictamente de consulta: no agrega acciones nuevas. El pedido que se abre desde el detalle de la reserva es la misma vista que desde el inicio, así que conserva «Modificar platos», «Modificar medio de pago» y «Pagar» mientras el pedido los permita (24/11, prueba del equipo).

## **Requirements *(mandatory)***

### **Functional Requirements**

* **FR-001** *(US-47)*: El sistema MUST permitir al comensal acceder al pedido asociado a una reserva activa desde el detalle de la reserva.  
* **FR-002** *(US-47)*: El pedido MUST mostrar los platos incluidos y la cantidad de cada uno, correspondiendo estrictamente a la reserva seleccionada.
* **FR-003** *(US-47)*: El sistema MUST informar al comensal mediante un aviso claro cuando la reserva no tiene un pedido anticipado asociado.
* **FR-004** *(US-49)*: El sistema MUST mostrar el historial de cancelación de una reserva inactiva, incluyendo explícitamente el origen de cancelación y el estado del reembolso.
* **FR-005** *(US-47, US-49)*: El sistema MUST aislar la visualización para mostrar únicamente las reservas y pedidos del comensal que inició sesión.

### **Key Entities**

* **Reserva**: Cuenta con un estado (activa, cancelada, completada) y opcionalmente un pedido anticipado.  
* **Pedido anticipado**: Asociado a una única reserva; contiene platos con sus cantidades.
* **Cancelación**: Metadatos asociados a la reserva (quién canceló, fecha, estado de reembolso).

## **Límites de alcance *(MVP Boundaries)***

* **Dentro**: Acceder al pedido desde el detalle de una reserva activa; ver platos y cantidades; informar cuando no hay pedido asociado. Mostrar la información de solo lectura del detalle de cancelaciones.
* **Fuera**: La acción misma de cancelar, modificar o cancelar el pedido por separado, armar o confirmar el pedido, pago y reembolso, o emitir comprobantes de pago.

## **Success Criteria *(mandatory)***

### **Measurable Outcomes**

* **SC-001**: 100% de las reservas activas sin pedido muestran el aviso unificado en la vista de detalle en lugar de una pantalla vacía.
* **SC-002**: 100% de los pedidos mostrados corresponden unívocamente a la reserva seleccionada.
* **SC-003**: 0 pedidos o detalles de cancelación de otros comensales resultan visibles por cruce de datos.