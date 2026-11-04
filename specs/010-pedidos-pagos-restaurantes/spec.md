# **Feature Specification: Gestión de Pedidos y Estados de Pago del Restaurante**

**Created**: 2026-10-26

**Input**: Backlog Servido\! — US-20, US-22

**Rol**: Responsable del restaurante

**Sprint**: 3

## **User Scenarios & Testing *(mandatory)***

### **US-20 — Ver pedidos del turno actual (Prioridad: \-, Estimación: 2\)**

Como **Responsable del restaurante**, quiero ver los pedidos anticipados del turno, para planificar el trabajo de la cocina antes de que lleguen los comensales.

**Valor**: Permite al restaurante anticipar la preparación de los platos y organizar el trabajo de la cocina según las reservas confirmadas.

**Independent Test:** Contar con pedidos asociados a distintas reservas y turnos, incluyendo pedidos confirmados de reservas vigentes, pedidos todavía no confirmados y pedidos asociados a reservas canceladas. Consultar el turno actual y verificar que solamente aparezcan los pedidos confirmados de reservas no canceladas, ordenados por hora de llegada. Comprobar que los pedidos con igual horario se ordenen por el inicio sugerido de preparación y que sus detalles muestren los platos y cantidades correctos. 

**Acceptance Scenarios**:

1. **Dado** que existen pedidos anticipados confirmados para el turno actual, **Cuando** consulto los pedidos del restaurante, **Entonces** puedo visualizar esos pedidos.  
2. **Dado** que consulto los pedidos del turno, **Cuando** se muestra el listado, **Entonces** cada pedido indica la reserva asociada, la hora de llegada, los platos y sus cantidades.  
3. **Dado** que existen pedidos confirmados, pedidos sin confirmar y pedidos asociados a reservas canceladas, **Cuando** consulto el turno actual, **Entonces** solamente se muestran los pedidos confirmados cuyas reservas no fueron canceladas.  
4. **Dado** que selecciono un pedido del listado, **Cuando** consulto su detalle, **Entonces** puedo visualizar los platos incluidos y sus cantidades.  
5. **Dado** que existen pedidos con diferentes horas de llegada confirmadas, **Cuando** consulto el listado, **Entonces** aparecen ordenados desde la llegada más próxima hasta la más lejana.  
6. **Dado** que dos pedidos tienen la misma hora de llegada confirmada, **Cuando** se ordena el listado, **Entonces** se utiliza la hora sugerida de inicio de preparación como criterio secundario.

---

### **US-22 — Ver estado de pago (Prioridad: \-, Estimación: 2\)**

Como **Responsable del restaurante**, quiero ver el estado de pago de cada pedido, para saber qué pedidos ya fueron abonados y cuáles deben cobrarse en el restaurante.

**Valor**: Permite identificar los pedidos pendientes de cobro y distinguirlos de aquellos cuyo pago ya fue confirmado.

**Independent Test**: Consultar pedidos con distintos estados y medios de pago. Verificar que cada uno muestre su estado, total, desglose y medio seleccionado. Simular la aprobación de un pago electrónico y comprobar la actualización del estado. Verificar que un pedido con pago en efectivo permanezca pendiente hasta que se confirme su cobro.

**Acceptance Scenarios**:

1. **Dado** que existen pedidos asociados a mi restaurante, **Cuando** consulto su información de pago, **Entonces** cada pedido muestra su estado como «Pagado» o «Pendiente de pago».  
2. **Dado** que consulto un pedido, **Cuando** accedo a su información económica, **Entonces** puedo visualizar el total y el desglose por plato.  
3. **Dado** que el comensal seleccionó un medio de pago, **Cuando** consulto el pedido, **Entonces** se muestra el medio de pago seleccionado.  
4. **Dado** que un pedido tiene un pago electrónico pendiente, **Cuando** se aprueba el pago, **Entonces** su estado se actualiza a «Pagado».  
5. **Dado** que un pedido tiene seleccionado el pago en efectivo, **Cuando** todavía no se confirmó su cobro, **Entonces** permanece en estado «Pendiente de pago».  
6. **Dado** que se confirma el cobro en efectivo de un pedido, **Cuando** se actualiza su información de pago, **Entonces** pasa a estado «Pagado».  
7. **Dado** que consulto pedidos pagados y pendientes, **Cuando** se muestra el listado, **Entonces** ambos estados se distinguen visualmente.

---

## **Edge Cases *(mandatory)***

* **Turno sin pedidos**: si no existen pedidos confirmados para el turno actual, el sistema informa que no hay pedidos para mostrar.  
* **Pedido sin confirmar**: no debe aparecer en el listado de pedidos anticipados confirmados del turno.  
* **Reserva cancelada**: los pedidos asociados a reservas canceladas no deben incluirse en el listado del turno.  
* **Pedidos con igual horario**: deben ordenarse según la hora sugerida de inicio de preparación.  
* **Pedidos con igual hora de llegada e inicio de preparación:** cuando dos pedidos coinciden en ambos valores, el sistema mantiene un orden consistente entre consultas.   
* **Definición del turno actual:** el turno actual se determina a partir de los días y horarios de atención configurados por el restaurante (US-8). Si el restaurante se encuentra fuera de sus horarios de atención o entre turnos, el sistema informa que no hay un turno activo.   
* **Hora sugerida de inicio de preparación**: se calcula restando a la hora de llegada el mayor tiempo de preparación de los platos del pedido. Si un plato no tiene tiempo cargado, se considera de 0 minutos y se muestra una advertencia indicando ese dato.  
* **Confirmación del pedido:** la US-20 muestra únicamente pedidos confirmados. La confirmación debe distinguirse de la confirmación de la reserva (US-13), ya que son operaciones diferentes.   
* **Medio de pago no seleccionado**: se muestra «No seleccionado» y el pedido permanece visible.  
* **Aprobación del pago electrónico**: la integración de aprobación queda fuera de la implementación actual; se documenta el punto de integración sin agregar una pasarela, webhook u operación ficticia.  
* **Confirmación del cobro en efectivo**: la confirmación queda fuera de la implementación actual; el pedido permanece pendiente hasta que una funcionalidad futura confirme el cobro.  
* **Actualización del estado de pago**: el sistema debe reflejar el estado vigente y evitar mostrar como pendiente un pago ya aprobado.  
* **Desglose económico**: los importes mostrados deben ser consistentes con el resumen de cuenta definido en la US-21.

## **Requirements *(mandatory)***

### **Functional Requirements**

* **FR-001** *(US-20)*: El sistema MUST permitir al responsable consultar los pedidos anticipados confirmados correspondientes al turno actual de su restaurante.  
* **FR-002** *(US-20)*: Cada pedido MUST mostrar la reserva asociada, la hora de llegada, los platos y sus cantidades.  
* **FR-003** *(US-20)*: El sistema MUST mostrar únicamente pedidos confirmados y MUST excluir los asociados a reservas canceladas.  
* **FR-004** *(US-20)*: El sistema MUST permitir consultar el detalle de un pedido, incluyendo platos y cantidades.  
* **FR-005** *(US-20)*: Los pedidos MUST ordenarse por hora de llegada confirmada, desde la más próxima hasta la más lejana.  
* **FR-006** *(US-20)*: Cuando dos pedidos tengan la misma hora de llegada, el sistema MUST utilizar la hora sugerida de inicio de preparación como criterio secundario de ordenamiento.  
* **FR-007** *(US-22)*: El sistema MUST mostrar el estado de pago de cada pedido como «Pagado» o «Pendiente de pago».  
* **FR-008** *(US-22)*: El sistema MUST permitir consultar el total del pedido y su desglose por plato.  
* **FR-009** *(US-22)*: El sistema MUST mostrar el medio de pago seleccionado por el comensal.  
* **FR-010** *(US-22)*: El estado de pago MUST actualizarse cuando se apruebe un pago electrónico.  
* **FR-011** *(US-22)*: Los pedidos con pago en efectivo MUST permanecer pendientes hasta que se confirme su cobro.  
* **FR-012** *(US-22)*: Los pedidos pagados MUST distinguirse visualmente de los pendientes de pago.  
* **FR-013** *(US-20, US-22)*: El sistema MUST restringir la consulta de pedidos e información de pago a los responsables del restaurante correspondiente.

### **Key Entities**

* **Restaurante**: identificador y cuenta responsable.  
* **Turno**: restaurante, día, horario de inicio y horario de finalización.  
* **Reserva**: identificador, restaurante, fecha, horario de llegada y estado.  
* **Pedido**: identificador, reserva asociada, estado de confirmación y hora sugerida de inicio de preparación.  
* **Ítem de pedido**: plato, cantidad, precio y subtotal.  
* **Pago**: pedido asociado, medio de pago, estado e importe total.

Estas entidades representan la información necesaria para las historias y no implican necesariamente crear una tabla independiente para cada una.

## **Límites de alcance *(MVP Boundaries)***

**Dentro del alcance:**

* Consulta de pedidos anticipados confirmados del turno actual.  
* Visualización de la reserva y hora de llegada asociadas.  
* Consulta de platos y cantidades de cada pedido.  
* Ordenamiento por hora de llegada e inicio sugerido de preparación.  
* Exclusión de pedidos asociados a reservas canceladas.  
* Visualización del estado de pago.  
* Consulta del total, desglose y medio de pago.  
* Visualización del estado de pago actualizado cuando se registra la aprobación de un pago electrónico.   
* Identificación de pedidos con pago en efectivo pendiente.  
* Diferenciación visual entre pedidos pagados y pendientes.

**Fuera del alcance:**

* Creación y modificación de pedidos por el comensal (US-17).  
* Cancelación manual de reservas.  
* Procesamiento de pagos electrónicos.  
* Selección de medios de pago por parte del comensal.  
* Gestión del proceso de preparación de los platos.  
* Modificación de los pedidos desde la vista del restaurante.

Las operaciones que producen cambios en el estado de pago requieren definir su integración con las funcionalidades correspondientes.

## **Success Criteria *(mandatory)***

### **Measurable Outcomes**

* **SC-001**: El 100% de los pedidos mostrados corresponde al turno actual del restaurante y se encuentra confirmado.  
* **SC-002**: Ningún pedido asociado a una reserva cancelada aparece en el listado del turno.  
* **SC-003**: El 100% de los pedidos se presenta ordenado por hora de llegada y, en caso de empate, por inicio sugerido de preparación.  
* **SC-004**: El 100% de los pedidos consultados muestra su reserva asociada, horario, platos y cantidades.  
* **SC-005**: El 100% de los pedidos con información de pago disponible muestra su estado, total, desglose y medio de pago.  
* **SC-006**: Los pagos electrónicos aprobados se reflejan correctamente como pagados.  
* **SC-007**: Los pedidos con pago en efectivo permanecen pendientes mientras no se confirme su cobro.  
* **SC-008**: Los pedidos pagados y pendientes se distinguen visualmente.  
* **SC-009**: Ningún responsable puede consultar pedidos o información de pago pertenecientes a otro restaurante.

## **Assumptions**

* El responsable del restaurante inició sesión.  
* Cada responsable solamente puede consultar pedidos asociados a su establecimiento.  
* Los turnos provienen de la configuración definida en la US-8.  
* Los pedidos anticipados se generan mediante la funcionalidad de la US-17.  
* Cada pedido está asociado a una reserva.  
* Los pedidos mostrados en el turno actual tienen un estado de confirmación identificable.  
* Los importes y desgloses económicos son consistentes con los definidos en la US-21.  
* Las fechas y horarios se interpretan en la zona horaria `America/Argentina/Buenos_Aires`.  
* Los importes se expresan en pesos argentinos.  
* La interfaz utiliza español de Argentina.  
* Las decisiones aclaradas en esta especificación deben mantenerse alineadas con el plan y los contratos antes de implementar cada historia.
