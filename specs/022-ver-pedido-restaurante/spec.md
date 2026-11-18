# **Feature Specification: Ver Pedido Anticipado de una Reserva (Restaurante)**

**Created**: 2026-11-11

**Input**: Backlog Servido\! — US-36 (Sprint a confirmar, 1 SP)

**Rol**: Responsable del restaurante

## **User Scenarios & Testing *(mandatory)***

### **US-36 — Ver pedido asociado (Prioridad: \-, Estimación: 1\)**

Como **Responsable del restaurante**, quiero ver el pedido anticipado asociado a una reserva, para saber qué debe preparar la cocina para esa mesa.

**Valor**: La cocina sabe de antemano qué platos y en qué cantidades debe preparar para cada mesa reservada, y el restaurante conoce el total del pedido.

**Independent Test**: Con una reserva que tenga un pedido anticipado confirmado, abrir su detalle y verificar que se muestran los platos, las cantidades y el total, y que corresponden al pedido confirmado por el comensal; con otra reserva sin pedido, verificar que el sistema lo indica.

**Acceptance Scenarios**:

1. **Dado** que una reserva de mi restaurante tiene un pedido anticipado confirmado, **Cuando** abro el detalle de la reserva, **Entonces** veo el pedido anticipado.  
2. **Dado** que estoy viendo el pedido anticipado, **Cuando** lo reviso, **Entonces** veo los platos incluidos, la cantidad de cada uno y el total del pedido.  
3. **Dado** que una reserva no tiene pedido anticipado asociado, **Cuando** abro su detalle, **Entonces** el sistema me indica que no tiene pedido anticipado.  
4. **Dado** que el comensal modificó su pedido antes de confirmarlo, **Cuando** abro el detalle de la reserva, **Entonces** veo el pedido tal como lo confirmó el comensal.  
5. **Dado** que tengo varias reservas con pedido, **Cuando** abro el detalle de una, **Entonces** veo el pedido de esa reserva y no el de otra.  
6. **Dado** que una reserva pertenece a otro restaurante, **Cuando** intento ver su pedido, **Entonces** el sistema no me lo permite.

---

### **Edge Cases**

* **Detalle de la reserva** *(pendiente para la PO)*: el criterio habla de «un detalle de la reserva». Esta spec asume que el restaurante ya ve sus reservas en un listado (US-18, Sprint 3\) y que puede abrir el detalle de cada una. Falta confirmar si ese detalle ya existe o si se define aquí.  
* **Pedido sin confirmar** *(pendiente para la PO)*: el criterio indica que se muestra el pedido confirmado por el comensal. Si la reserva tiene un pedido todavía sin confirmar (spec 015), esta spec asume que el restaurante no lo ve como pedido y el detalle indica que no hay pedido anticipado confirmado.  
* **Total del pedido** *(pendiente para la PO)*: esta spec asume que el total es la suma de las cantidades por el precio de cada plato vigente al momento de confirmar, expresado en pesos argentinos. Falta definir si hay otros conceptos (propina, descuentos).  
* **Datos que ayudan a la cocina** *(pendiente para la PO)*: la hora de llegada confirmada y el momento en que debe comenzar la preparación (spec 015), y el medio de pago (spec 015), no figuran en los criterios. Esta spec no los exige; la PO debe definir si se muestran en este detalle.  
* **Reserva sin pedido**: no se muestra un espacio vacío; el detalle indica con un mensaje claro que no hay pedido anticipado.  
* **Reserva cancelada**: al cancelarse una reserva, su pedido también se cancela (spec 011\) y el restaurante la ve como cancelación en su listado (US-18). Esta spec no muestra el pedido de una reserva cancelada como pedido a preparar. *(La PO debe confirmar si se muestra como cancelado.)*  
* **Pedido correcto**: el pedido mostrado siempre corresponde a la reserva seleccionada y a la última versión confirmada por el comensal.  
* **Plato modificado o retirado del menú**: el pedido sigue mostrando los platos tal como los confirmó el comensal, con las cantidades originales. *(Pendiente de confirmar con la PO.)*  
* **Pedido confirmado mientras se mira**: si el comensal confirma el pedido mientras el restaurante mira el detalle, el pedido se ve al actualizar.  
* **Solo lectura**: esta spec solo permite consultar el pedido. Modificar, aceptar o rechazar el pedido no forma parte de esta spec.  
* **Privacidad**: el restaurante solo ve las reservas y los pedidos de su propio restaurante.  
* **Sesión vencida**: no se muestra información; el responsable vuelve a ingresar y retoma desde sus reservas.  
* **Zona horaria**: las fechas y horarios se muestran en la hora de Argentina.

## **Requirements *(mandatory)***

### **Functional Requirements**

* **FR-001** *(US-36)*: El sistema MUST permitir al responsable del restaurante ver el pedido anticipado asociado a una reserva desde el detalle de la reserva.  
* **FR-002** *(US-36)*: El pedido MUST mostrar los platos incluidos, la cantidad de cada uno y el total del pedido.  
* **FR-003** *(US-36)*: El sistema MUST indicar cuando la reserva no tiene un pedido anticipado asociado.  
* **FR-004** *(US-36)*: La información mostrada MUST corresponder al pedido confirmado por el comensal.  
* **FR-005** *(US-36)*: El sistema MUST NOT mostrar como pedido a preparar uno que el comensal todavía no confirmó, y MUST indicar que no hay pedido anticipado confirmado.  
* **FR-006** *(US-36)*: El pedido mostrado MUST corresponder a la reserva seleccionada.  
* **FR-007** *(US-36)*: El sistema MUST mostrar únicamente las reservas y los pedidos de los restaurantes del responsable que inició sesión.  
* **FR-008** *(US-36)*: El sistema MUST mostrar el pedido con los platos y cantidades confirmados por el comensal, aunque el menú haya cambiado.

### **Key Entities**

* **Reserva**: comensal, fecha, horario, cantidad de comensales, mesa y estado; puede tener un pedido anticipado asociado.  
* **Pedido anticipado**: asociado a la reserva; platos con cantidades, total y estado (confirmado o no).  
* **Plato**: nombre y precio del plato solicitado.

## **Límites de alcance *(MVP Boundaries)***

* **Dentro**: ver el pedido anticipado confirmado desde el detalle de una reserva; ver platos, cantidades y total; indicar cuando no hay pedido asociado.  
* **Fuera**: aceptar, rechazar o modificar el pedido, armar y confirmar el pedido (specs 014 y 015), coordinación de la preparación en cocina, cancelación por parte del restaurante (US-38), ver el pedido desde la vista del comensal (spec 016), pago y reembolso (US-56 y US-38).

## **Success Criteria *(mandatory)***

### **Measurable Outcomes**

* **SC-001**: El 90% de los responsables abre el pedido de una reserva en menos de 30 segundos desde que ve el listado de reservas.  
* **SC-002**: 100% de los pedidos mostrados corresponden a la reserva seleccionada y a la versión confirmada por el comensal.  
* **SC-003**: 100% de los totales mostrados coinciden con la suma de las cantidades por los precios de los platos.  
* **SC-004**: 100% de las reservas sin pedido indican que no tienen pedido anticipado.  
* **SC-005**: 0 pedidos de otros restaurantes visibles.

## **Assumptions**

* El responsable ya ingresó a su cuenta y tiene un restaurante asociado.  
* El restaurante ya ve sus reservas (US-18, Sprint 3\) y los pedidos ya se confirman (spec 015).  
* Cada pedido anticipado está asociado a una única reserva.  
* Los precios se expresan en pesos argentinos.  
* Las fechas y horarios se interpretan en la zona horaria de Argentina (America/Argentina/Buenos\_Aires).  
* Idioma de la interfaz y mensajes: español (Argentina).

&nbsp;