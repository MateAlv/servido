# Feature Specification: Reservar Mesa (Crear Reserva y Confirmar Datos)

**Created**: 2026-10-13

**Input**: Backlog Servido! — US-11, US-13

**Rol**: Comensal

## User Scenarios & Testing *(mandatory)*

### US-11 — Crear reserva (Prioridad: -, Estimación: 3)

Como **Comensal**, quiero crear una reserva, para guardar un lugar en el restaurante seleccionado.

**Valor**: Es la acción central del comensal: sin reserva no hay lugar garantizado en el restaurante.

**Independent Test**: Intentar elegir una fecha pasada, una fecha u horario fuera del rango de atención y un horario ya reservado; luego cambiar la fecha o el horario y verificar que las mesas disponibles se actualicen; por último, elegir una preferencia de tipo de mesa, verificar que la cantidad de comensales no pueda superar el máximo del restaurante y completar la selección con datos válidos.

**Acceptance Scenarios**:

1. **Dado** que seleccioné un restaurante, **Cuando** accedo a crear una reserva, **Entonces** puedo elegir la fecha, el horario y una preferencia de tipo de mesa.
2. **Dado** que estoy eligiendo la fecha, **Cuando** se muestra el calendario, **Entonces** no puedo seleccionar fechas pasadas.
3. **Dado** que estoy eligiendo fecha y horario, **Cuando** se muestran las opciones, **Entonces** solo veo fechas y horarios dentro del rango de atención del restaurante.
4. **Dado** que un horario ya está ocupado/reservado para el día y hora elegidos, **Cuando** intento seleccionarlo, **Entonces** el sistema no me lo permite.
5. **Dado** que ya elegí una fecha y un horario, **Cuando** cambio la fecha o el horario, **Entonces** las mesas disponibles se actualizan según la nueva selección.
6. **Dado** que quiero indicar dónde sentarme, **Cuando** elijo una preferencia de tipo de mesa (Adentro, Afuera, Terraza, etc.), **Entonces** se me ofrecen las mesas disponibles de ese tipo para la fecha y el horario elegidos.
7. **Dado** que no hay mesas disponibles para la fecha, el horario o el tipo de mesa elegidos, **Cuando** se actualiza la selección, **Entonces** el sistema me informa que no hay disponibilidad y me permite modificar mi elección.

---

### US-13 — Confirmar datos (Prioridad: -, Estimación: 2)

Como **Comensal**, quiero revisar los datos que seleccioné, para verificar que sean correctos antes de confirmar la reserva.

**Valor**: Evita reservas erróneas al darle al comensal una instancia de control antes del compromiso final.

**Independent Test**: Llegar al resumen con una selección completa, verificar que muestre todos los datos, volver atrás y modificar uno, y comprobar que la reserva no se confirma hasta ejecutar la confirmación de forma explícita.

**Acceptance Scenarios**:

1. **Dado** que completé la selección de mi reserva, **Cuando** continúo, **Entonces** puedo visualizar los datos que seleccioné antes de confirmar.
2. **Dado** que estoy en la revisión, **Cuando** se muestran los datos, **Entonces** veo el restaurante, la fecha, el horario, la cantidad de comensales y la mesa asignada.
3. **Dado** que detecté un dato incorrecto, **Cuando** elijo volver atrás, **Entonces** puedo modificar los datos y los demás datos ya elegidos se conservan.
4. **Dado** que estoy en la revisión, **Cuando** no realizo la confirmación explícita, **Entonces** la reserva no se confirma.
5. **Dado** que los datos son correctos, **Cuando** confirmo explícitamente, **Entonces** la reserva queda confirmada.

---

### Edge Cases

- **Cantidad de comensales**: US-11 no la menciona entre sus criterios, pero US-13 exige mostrarla en el resumen. [NEEDS CLARIFICATION: se asume que el comensal la indica al crear la reserva y que solo se ofrecen mesas con capacidad suficiente.] El máximo de comensales por reserva lo define el restaurante: es la capacidad de su mesa habilitada más grande, así que el comensal no puede indicar un grupo mayor (ver FR-013).
- **Restaurante sin mesas habilitadas**: no se puede indicar una cantidad de comensales ni elegir mesa; se informa que el restaurante todavía no tiene mesas disponibles.
- **Selección de mesa**: US-11 habla de mesas disponibles y de preferencia de tipo; US-13 muestra "la mesa asignada". [NEEDS CLARIFICATION: decisión del equipo del 23/10, siguiendo `prototipo-us11.html`: el comensal no elige una mesa concreta; la pantalla informa si hay mesa disponible para la preferencia elegida y la mesa se asigna al confirmar la reserva (US-13). Falta que la PO lo confirme.]
- **Criterio de "horario ocupado"**: el backlog no define si es por mesa o por restaurante. [NEEDS CLARIFICATION: se asume que un horario está ocupado para una mesa cuando ya tiene una reserva que se superpone, y que el horario sigue disponible mientras quede al menos una mesa libre.]
- **Granularidad y duración de la reserva**: no están definidas. [NEEDS CLARIFICATION: se propone horarios en intervalos de 30 minutos y duración fija de 90 minutos por reserva.]
- **Tipos de mesa**: el backlog da ejemplos ("Adentro, afuera, terraza, etc.") sin catálogo cerrado. [NEEDS CLARIFICATION: se asume que cada restaurante define sus tipos de mesa y que existe la opción "Sin preferencia".]
- **Estado al confirmar**: no se define si el restaurante debe aprobar la reserva. [NEEDS CLARIFICATION: se asume que queda confirmada directamente, sin aprobación del restaurante.]
- Fecha de hoy con horarios que ya pasaron: no son seleccionables.
- Días en que el restaurante no atiende: no se ofrecen como seleccionables.
- Cambio de fecha u horario: se actualiza la disponibilidad informada; si ya no hay mesa disponible, se informa al comensal.
- Volver atrás desde la revisión: se conservan los datos ya elegidos; si el cambio los vuelve inválidos, solo se pide corregir esos.
- Dos comensales eligen la misma mesa y horario al mismo tiempo: solo uno puede confirmar; al otro se le informa que ya no está disponible, sin perder el resto de su selección.
- Disponibilidad que cambia entre la revisión y la confirmación: se revalida al confirmar y, si ya no está disponible, la reserva no se crea.
- Envío doble de la confirmación: no debe crear dos reservas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-11)*: El sistema MUST permitir al comensal seleccionar fecha, horario y preferencia de tipo de mesa para el restaurante elegido.
- **FR-002** *(US-11)*: El sistema MUST NOT permitir seleccionar fechas pasadas.
- **FR-003** *(US-11)*: El sistema MUST mostrar únicamente fechas y horarios dentro del rango de atención del restaurante.
- **FR-004** *(US-11)*: El sistema MUST NOT permitir seleccionar un horario ya ocupado/reservado para el día y hora [NEEDS CLARIFICATION: ver Edge Cases].
- **FR-005** *(US-11)*: Cuando el comensal cambie la fecha o el horario, el sistema MUST actualizar la disponibilidad informada según la nueva selección.
- **FR-006** *(US-11)*: El sistema MUST permitir elegir una preferencia de tipo de mesa (Adentro, Afuera, Terraza, etc.) y MUST informar si hay mesas disponibles que la cumpan [NEEDS CLARIFICATION: ver Edge Cases].
- **FR-007** *(US-11)*: Si no hay mesas disponibles para la selección, el sistema MUST informarlo y MUST permitir modificar la elección.
- **FR-008** *(US-13)*: Antes de confirmar, el sistema MUST mostrar al comensal los datos que seleccionó.
- **FR-009** *(US-13)*: La revisión MUST incluir el restaurante, la fecha, el horario, la cantidad de comensales y la mesa asignada.
- **FR-010** *(US-13)*: El sistema MUST permitir volver atrás para modificar los datos antes de confirmar y MUST conservar los datos ya elegidos.
- **FR-011** *(US-13)*: El sistema MUST confirmar la reserva únicamente cuando el comensal lo indique de forma explícita; sin esa acción MUST NOT crear la reserva.
- **FR-012** *(US-13)*: Al confirmar, el sistema MUST revalidar la disponibilidad, MUST crear la reserva una única vez y, si la mesa o el horario ya no están disponibles, MUST informarlo sin crear la reserva.
- **FR-013** *(US-11)*: El sistema MUST limitar la cantidad de comensales por reserva al máximo que acepta el restaurante, definido por la capacidad de su mesa habilitada más grande, y MUST NOT permitir una cantidad mayor. Si el restaurante no tiene mesas habilitadas, el sistema MUST NOT ofrecer reservas.

### Key Entities

- **Restaurante**: rango de atención (días y horarios), mesas y cantidad máxima de comensales por reserva (la capacidad de su mesa habilitada más grande).
- **Mesa**: restaurante, tipo de mesa, capacidad.
- **Reserva**: cuenta del comensal, restaurante, fecha, horario, cantidad de comensales, mesa, estado, fecha de creación.

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: selección de fecha, horario, preferencia de tipo de mesa y aviso de disponibilidad de mesa; revisión de los datos; confirmación explícita de la reserva.
- **Fuera**: búsqueda y selección del restaurante, modificación o cancelación de la reserva, notificaciones o comprobante de la reserva, pedidos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 90% de los comensales completa la selección y confirma su reserva en menos de 3 minutos en el primer intento.
- **SC-002**: 100% de las fechas pasadas y de los horarios fuera del rango de atención son rechazados (0 reservas en el pasado o fuera de rango).
- **SC-003**: 0 reservas superpuestas sobre una misma mesa en un mismo horario.
- **SC-004**: 100% de los cambios de fecha u horario muestran las mesas disponibles actualizadas antes de permitir continuar.
- **SC-005**: 100% de las reservas confirmadas fueron precedidas por la revisión de datos y por una confirmación explícita (0 reservas creadas sin confirmación).

## Assumptions

- El comensal ya ingresó a su cuenta (US-1, US-3) y el restaurante ya fue seleccionado antes de crear la reserva.
- Cada reserva ocupa una única mesa.
- La cantidad máxima de comensales por reserva la define el restaurante a partir de sus mesas habilitadas (spec 004); no hay un límite fijo del sistema.
- Las fechas y horarios se interpretan en la zona horaria de Argentina (America/Argentina/Buenos_Aires).
- Idioma de la interfaz y mensajes: español (Argentina).
- Una reserva confirmada no requiere aprobación del restaurante.
