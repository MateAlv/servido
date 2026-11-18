# **Feature Specification: Tiempo Estimado de Preparación**

**Created**: 2026-11-11

**Input**: Backlog Servido\! — US-40 (el backlog no define prioridad ni estimación)

**Rol**: Responsable del restaurante

## **User Scenarios & Testing *(mandatory)***

### **US-40 — Registrar tiempo estimado de preparación de pedido anticipado (Prioridad: \-, Estimación: \-)**

Como **Responsable del restaurante**, quiero registrar el tiempo estimado de preparación de los platos, para que Servido\! coordine los pedidos con la llegada de los comensales sin sobrecargar la cocina.

**Valor**: El restaurante define cuánto tarda su cocina en cada plato, y el comensal recibe una estimación realista de su pedido anticipado. Así los pedidos se coordinan con la llegada de los comensales sin sobrecargar la cocina.

**Independent Test**: Con la cuenta del Responsable, registrar un tiempo en un plato y verificar que queda guardado; modificarlo y verificar que se actualiza; intentar guardar cero, un negativo, un valor vacío y un texto, y verificar que se rechazan con un mensaje. Armar un pedido con varios platos y verificar que el total coincide con el cálculo. Cambiar el tiempo de un plato y verificar que un pedido ya confirmado conserva su tiempo mientras que un pedido nuevo usa el actualizado. Con la cuenta del comensal, verificar que al ver el estado de su pedido aparece el tiempo registrado por el restaurante.

**Acceptance Scenarios**:

1. **Dado** que ingresé como Responsable y estoy en un plato de mi restaurante, **Cuando** registro un tiempo estimado de preparación válido, **Entonces** el sistema lo guarda y me lo muestra en el plato.  
2. **Dado** que un plato ya tiene un tiempo registrado, **Cuando** lo modifico con un valor válido, **Entonces** el sistema guarda el nuevo valor.  
3. **Dado** que estoy registrando o modificando un tiempo, **Cuando** ingreso un valor que no es un número mayor a cero (cero, negativo, vacío o texto), **Entonces** el sistema no lo guarda y me informa que el tiempo debe ser un número mayor a cero.  
4. **Dado** que un pedido anticipado incluye platos con tiempo registrado, **Cuando** lo visualizo, **Entonces** veo el tiempo estimado total del pedido, calculado a partir de los platos que incluye (por ejemplo, 2 platos de 10 minutos y 1 de 15 minutos dan un total de 35 minutos).  
5. **Dado** que modifiqué el tiempo de un plato, **Cuando** se confirma un pedido nuevo que incluye ese plato, **Entonces** el pedido toma el tiempo actualizado.  
6. **Dado** que existe un pedido ya confirmado, **Cuando** modifico el tiempo de un plato que ese pedido incluye, **Entonces** el tiempo estimado del pedido confirmado no cambia.  
7. **Dado** que un comensal tiene un pedido anticipado, **Cuando** ve el estado de su pedido, **Entonces** se le informa el tiempo estimado registrado por el restaurante.

---

### **Edge Cases**

* **Nivel de registro** *(NEEDS CLARIFICATION — propuesta para la PO)*: el título y los criterios hablan de «tiempo de un pedido», pero la historia habla de «tiempo de los platos» y el total se calcula «a partir de los platos». Esta spec propone que el Responsable registre el tiempo **por plato** y que el total del pedido se calcule a partir de ellos. El total del pedido no se carga a mano.  
* **Cálculo del total** *(NEEDS CLARIFICATION — propuesta para la PO)*: el backlog no dice cómo combinar los tiempos. Esta spec propone sumar el tiempo de cada plato multiplicado por su cantidad. Es la estimación más conservadora para no sobrecargar la cocina. La alternativa sería tomar el plato más largo, si la cocina prepara en paralelo.  
* **Plato sin tiempo registrado** *(NEEDS CLARIFICATION — propuesta para la PO)*: si un pedido incluye un plato sin tiempo, el sistema muestra el total como incompleto e indica al Responsable qué platos faltan. Al comensal no se le informa una estimación parcial.  
* **Valor inválido**: cero, negativo, vacío o no numérico no se guardan. El tiempo anterior, si lo había, se mantiene.  
* **Pedido ya confirmado**: conserva el tiempo estimado vigente al momento de su confirmación. Los cambios posteriores solo aplican a los pedidos nuevos.  
* **Pedido en armado**: si el comensal todavía no lo confirmó, toma el tiempo vigente al momento de confirmar.  
* **Privacidad**: el Responsable solo registra y modifica los tiempos de los platos de su propio restaurante.  
* **Sesión vencida durante el guardado**: no se guarda nada; el Responsable vuelve a ingresar y el tiempo anterior sigue vigente.  
* **Coordinación con la llegada del comensal**: esta spec solo registra e informa los tiempos. Decidir cuándo conviene empezar a preparar un pedido no forma parte de esta historia.

## **Requirements *(mandatory)***

### **Functional Requirements**

* **FR-001** *(US-40)*: El sistema MUST permitir al Responsable registrar el tiempo estimado de preparación de cada plato de su restaurante.  
* **FR-002** *(US-40)*: El sistema MUST permitir al Responsable modificar un tiempo ya registrado.  
* **FR-003** *(US-40)*: El sistema MUST aceptar únicamente tiempos que sean un número mayor a cero, y MUST informar el motivo cuando rechaza un valor.  
* **FR-004** *(US-40)*: El sistema MUST mostrar al Responsable el tiempo estimado total de un pedido anticipado, calculado a partir de los platos que incluye.  
* **FR-005** *(US-40)*: El sistema MUST informar al comensal, al ver el estado de su pedido, el tiempo estimado registrado por el restaurante.  
* **FR-006** *(US-40)*: Los cambios de tiempo MUST aplicar a los pedidos nuevos y MUST NOT modificar el tiempo estimado de los pedidos ya confirmados.  
* **FR-007** *(US-40)*: El sistema MUST permitir registrar y modificar tiempos solamente al Responsable del restaurante dueño de los platos.  
* **FR-008** *(US-40; pendiente de aclaración)*: El sistema MUST indicar cuando el total de un pedido es incompleto porque incluye platos sin tiempo registrado, y MUST NOT informar al comensal una estimación parcial.  
* **FR-009** *(US-40)*: El sistema MUST NOT guardar cambios si la sesión venció, y MUST conservar el tiempo anterior.

### **Key Entities**

* **Plato**: restaurante, nombre, tiempo estimado de preparación (en minutos).  
* **Pedido anticipado**: asociado a una reserva, platos incluidos con su cantidad, tiempo estimado total (queda fijado al confirmarse el pedido).

## **Límites de alcance *(MVP Boundaries)***

* **Dentro**: registrar y modificar el tiempo estimado de preparación de los platos; validar que sea mayor a cero; ver el tiempo estimado total de un pedido; informar el tiempo al comensal en el estado de su pedido; que los cambios no alteren los pedidos ya confirmados.  
* **Fuera**: planificar o avisar al restaurante cuándo empezar a preparar cada pedido, límites de capacidad de la cocina, modificar pedidos ya confirmados, la pantalla de estado del pedido en sí (solo se define qué tiempo se informa).

## **Success Criteria *(mandatory)***

### **Measurable Outcomes**

* **SC-001**: El 90% de los Responsables registra el tiempo de un plato en menos de 1 minuto desde que abre el plato.  
* **SC-002**: 0 tiempos guardados con un valor cero, negativo o no numérico.  
* **SC-003**: 0 pedidos confirmados cuyo tiempo estimado cambió por una modificación posterior de un plato.  
* **SC-004**: 100% de los pedidos muestran al comensal el mismo tiempo estimado que ve el restaurante.

## **Assumptions**

* El Responsable ya ingresó a su cuenta y tiene platos cargados (US-12).  
* El comensal ya puede crear pedidos anticipados asociados a una reserva.  
* El tiempo se expresa en minutos.  
* La pantalla donde el comensal ve el estado de su pedido pertenece a otra historia del backlog (posiblemente US-47); esta spec solo define qué tiempo se informa allí.  
* Idioma de la interfaz y mensajes: español (Argentina).

&nbsp;