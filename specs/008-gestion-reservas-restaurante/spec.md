# **Feature Specification: Gestión de Reservas del Restaurante**

**Created**: 2026-10-26

**Input**: Backlog Servido\! — US-14, US-16, US-18

**Rol**: Responsable del restaurante

**Sprint**: 3

## **User Scenarios & Testing *(mandatory)***

### **US-14 — Ver calendario de reservas (Prioridad: \-, Estimación: 3\)**

Como **Responsable del restaurante**, quiero ver la agenda de reservas de mi restaurante, para organizar el salón y el personal según la ocupación esperada.

**Valor**: Permite al restaurante conocer anticipadamente la ocupación del salón y organizar su atención.

**Independent Test**: Registrar reservas para distintas fechas y turnos, consultar la agenda y comprobar que se muestran ordenadas por horario. Navegar entre fechas y verificar que las reservas nuevas y canceladas se reflejen correctamente.

**Acceptance Scenarios**:

1. **Dado** que existen reservas para distintas fechas y turnos, **Cuando** consulto el calendario, **Entonces** puedo visualizar las reservas agrupadas por día y turno.  
2. **Dado** que consulto las reservas de un turno, **Cuando** se muestra el listado, **Entonces** cada reserva indica su horario, mesa, cantidad de comensales y estado.  
3. **Dado** que existen varias reservas para un mismo turno, **Cuando** consulto el listado, **Entonces** aparecen ordenadas cronológicamente por horario.  
4. **Dado** que estoy consultando una fecha, **Cuando** selecciono otra fecha, **Entonces** el calendario muestra las reservas correspondientes a la nueva selección.  
5. **Dado** que se registra una nueva reserva, **Cuando** consulto la agenda actualizada, **Entonces** la nueva reserva aparece en la fecha y turno correspondientes.  
6. **Dado** que una reserva fue cancelada, **Cuando** consulto la agenda actualizada, **Entonces** su estado refleja la cancelación.

---

### **US-16 — Ver cliente (Prioridad: \-, Estimación: 1\)**

Como **Responsable del restaurante**, quiero ver los datos del comensal que realizó una reserva, para identificarlo al llegar y poder contactarlo ante un inconveniente.

**Valor**: Facilita la identificación del comensal y la comunicación necesaria para gestionar su reserva.

**Independent Test**: Ingresar como responsable de un restaurante y consultar los datos del comensal asociados a una reserva propia. Intentar acceder a los datos de una reserva perteneciente a otro restaurante y verificar que el sistema lo impide.

**Acceptance Scenarios**:

1. **Dado** que existe una reserva en mi restaurante, **Cuando** consulto su detalle, **Entonces** puedo visualizar el nombre del comensal y sus datos de contacto, sin mostrar información personal innecesaria para gestionar la reserva.   
2. **Dado** que intento consultar los datos de un comensal asociado a una reserva de otro restaurante, **Cuando** solicito esa información, **Entonces** el sistema impide el acceso.

---

### **US-18 — Ver cancelaciones (Prioridad: \-, Estimación: 1\)**

Como **Responsable del restaurante**, quiero ver las reservas que fueron canceladas, para mantener actualizada la planificación del salón y de la cocina.

**Valor**: Permite identificar reservas que dejaron de estar vigentes y conocer su impacto en la disponibilidad del restaurante.

**Independent Test**: Contar con reservas canceladas en diferentes fechas, algunas con pedidos anticipados asociados. Consultar las cancelaciones, aplicar filtros por fecha y verificar que se muestran sus datos y estados. Comprobar también la notificación por correo y la liberación de disponibilidad.

**Acceptance Scenarios**:

1. **Dado** que existen reservas canceladas en mi restaurante, **Cuando** consulto las cancelaciones, **Entonces** puedo identificarlas mediante el estado «Cancelado».  
2. **Dado** que consulto una reserva cancelada, **Cuando** visualizo su detalle, **Entonces** se muestran la fecha y el horario de la reserva, la mesa y el momento en que se produjo la cancelación.  
3. **Dado** que una reserva cancelada tenía un pedido anticipado asociado, **Cuando** consulto su detalle, **Entonces** se indica que el pedido también fue cancelado.  
4. **Dado** que existen cancelaciones en diferentes fechas, **Cuando** aplico un filtro por fecha, **Entonces** se muestran las cancelaciones correspondientes a la fecha seleccionada.  
5. **Dado** que se cancela una reserva, **Cuando** se procesa la cancelación, **Entonces** el restaurante recibe un correo electrónico con el aviso y el detalle correspondiente.  
6. **Dado** que una reserva fue cancelada, **Cuando** se actualiza la disponibilidad del restaurante, **Entonces** su mesa y horario vuelven a ofrecerse a los comensales, siempre que no exista otra restricción de disponibilidad.

---

## **Edge Cases *(mandatory)***

* **Sin reservas**: cuando no existen reservas para una fecha o turno, el sistema informa que no hay reservas registradas.  
* **Sin cancelaciones**: cuando no existen reservas canceladas para la fecha seleccionada, el sistema muestra un estado vacío.  
* **Acceso entre restaurantes**: un responsable no puede consultar reservas ni datos personales asociados a otro restaurante.  
* **Actualización de estados**: una reserva cancelada no debe continuar apareciendo como confirmada.  
* **Datos personales**: el detalle debe limitarse a la información necesaria para gestionar la reserva.  
* **Cancelaciones y Sprint 5:** la US-18 contempla la consulta de reservas canceladas, mientras que la US-38 está prevista para el Sprint 5\. Para validar la consulta durante el Sprint 3, se podrán utilizar reservas de prueba previamente registradas con estado «Cancelado».  
* **Pedidos asociados:** si una reserva cancelada tenía un pedido anticipado asociado, el sistema debe mostrar que dicho pedido también fue cancelado.  
* **Notificación por correo:** cuando se produce una cancelación, el sistema debe enviar un correo electrónico al restaurante con el aviso y los detalles correspondientes.  
* **Disponibilidad liberada:** la cancelación debe liberar la mesa y el horario correspondientes. \[NEEDS CLARIFICATION: confirmar cómo se integrará esta actualización con el mecanismo de disponibilidad implementado para la US-11.\]  
* **Actualización del calendario:** el backlog exige reflejar nuevas reservas y cancelaciones, pero no establece actualización en tiempo real. \[NEEDS CLARIFICATION: determinar si basta con actualizar la vista al volver a consultarla o si debe actualizarse automáticamente.\]

## **Requirements *(mandatory)***

### **Functional Requirements**

* **FR-001** *(US-14)*: El sistema MUST permitir al responsable consultar las reservas de su restaurante agrupadas por día y turno.  
* **FR-002** *(US-14)*: Cada reserva MUST mostrar horario, mesa, cantidad de comensales y estado.  
* **FR-003** *(US-14)*: Las reservas MUST presentarse ordenadas cronológicamente por horario.  
* **FR-004** *(US-14)*: El sistema MUST permitir navegar entre fechas.  
* **FR-005** *(US-14)*: La agenda MUST reflejar las reservas nuevas y los cambios de estado por cancelación.  
* **FR-006** *(US-16)*: El sistema MUST permitir consultar el nombre y los datos de contacto del comensal asociados a una reserva.  
* **FR-007** *(US-16)*: El sistema MUST limitar la información personal mostrada a los datos necesarios para gestionar la reserva.  
* **FR-008** *(US-16)*: El sistema MUST impedir que un restaurante consulte los datos personales asociados a reservas de otros restaurantes.  
* **FR-009** *(US-18)*: El sistema MUST permitir consultar las reservas canceladas e identificarlas mediante su estado.  
* **FR-010** *(US-18)*: Cada cancelación MUST mostrar fecha y horario de la reserva, mesa y momento de cancelación.  
* **FR-011** *(US-18)*: Si una reserva cancelada tenía un pedido anticipado, el sistema MUST indicar que dicho pedido también fue cancelado.  
* **FR-012** *(US-18)*: El sistema MUST permitir filtrar las cancelaciones por fecha.  
* **FR-013** (US-18): El sistema MUST enviar un correo al restaurante cuando se produzca una cancelación, incluyendo su detalle.  
* **FR-014** (US-18): Al cancelarse una reserva, el sistema MUST liberar la disponibilidad de la mesa y horario correspondientes, respetando otras restricciones existentes.

### **Key Entities**

* **Restaurante**: identificador y cuenta responsable.  
* **Comensal**: identificador, nombre y datos de contacto necesarios.  
* **Reserva**: identificador, restaurante, comensal, fecha, horario, mesa, cantidad de personas y estado.  
* **Turno**: restaurante, día y horario de atención.  
* **Cancelación**: reserva asociada y momento de cancelación.  
* **Pedido anticipado**: reserva asociada y estado, cuando corresponda.

Las entidades representan información necesaria para las historias; no implican necesariamente crear una tabla independiente para cada una.

## **Límites de alcance *(MVP Boundaries)***

**Dentro del alcance:**

* Consulta de reservas del restaurante por fecha y turno.  
* Visualización de sus datos y estados.  
* Navegación entre fechas.  
* Consulta de los datos necesarios del comensal.  
* Consulta y filtrado de reservas canceladas.  
* Identificación de pedidos asociados a reservas canceladas.  
* Notificación por correo ante cancelaciones y liberación de la disponibilidad de la mesa y el horario correspondientes. 

**Fuera del alcance:**

* Cancelación manual de reservas por el restaurante (US-38).  
* Creación de pedidos anticipados (US-17).  
* Gestión de pagos.  
* Modificación de reservas desde el calendario.

## **Success Criteria *(mandatory)***

### **Measurable Outcomes**

* **SC-001**: El 100% de las reservas consultadas se presenta en la fecha y turno correspondientes.  
* **SC-002**: El 100% de los listados de reservas se muestra ordenado por horario.  
* **SC-003**: El 100% de las reservas muestra horario, mesa, cantidad de comensales y estado.  
* **SC-004**: Ningún responsable puede acceder a datos personales de reservas pertenecientes a otro restaurante.  
* **SC-005**: El 100% de las cancelaciones consultadas muestra los datos obligatorios definidos en la US-18.  
* **SC-006**: Los filtros por fecha muestran únicamente las cancelaciones correspondientes a la fecha seleccionada.  
* **SC-007**: Las reservas canceladas se identifican correctamente y no se presentan como confirmadas.

## **Assumptions**

* El responsable del restaurante inició sesión y solamente puede consultar información de su propio establecimiento.  
* Las reservas se generan mediante el flujo definido en las US-11 y US-13.  
* Los turnos y horarios provienen de la configuración del restaurante definida en la US-8.  
* Las fechas y horarios se interpretan en la zona horaria `America/Argentina/Buenos_Aires`.  
* La interfaz utiliza español de Argentina.  
* Esta spec no incorpora una operación nueva para cancelar reservas.  
* Las decisiones marcadas como `[NEEDS CLARIFICATION]` deben validarse con la PO antes de considerarlas requisitos de implementación definitivos.

