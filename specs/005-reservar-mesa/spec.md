# Feature Specification: Reservar Mesa (Crear Reserva y Confirmar Datos)

**Created**: 2026-10-13

**Input**: Backlog Servido! — US-11, US-13 (US-13 se construye en el Sprint 3; decisiones del equipo del 28/10 incorporadas)

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
2. **Dado** que estoy en la revisión, **Cuando** se muestran los datos, **Entonces** veo el restaurante, la fecha, el horario, la cantidad de comensales y la mesa asignada, indicada por su capacidad y su tipo (por ejemplo, «Mesa para 4 · Terraza»).
3. **Dado** que detecté un dato incorrecto, **Cuando** elijo volver atrás, **Entonces** puedo modificar los datos y los demás datos ya elegidos se conservan.
4. **Dado** que estoy en la revisión, **Cuando** no realizo la confirmación explícita, **Entonces** la reserva no se confirma.
5. **Dado** que los datos son correctos, **Cuando** confirmo explícitamente, **Entonces** la reserva queda confirmada.
6. **Dado** que ya tengo una reserva confirmada que se superpone con el horario elegido, **Cuando** llego a la revisión, **Entonces** el sistema me avisa con el restaurante y el horario de esa reserva, y aun así puedo confirmar la nueva *(decisión del equipo, 28/10; falta que la PO lo valide)*.

---

### Edge Cases

- **Cantidad de comensales**: US-11 no la menciona entre sus criterios, pero US-13 exige mostrarla en el resumen. *(decisión del equipo, 23/10; falta que la PO la valide)*: el comensal la indica al crear la reserva y solo se ofrecen mesas con capacidad suficiente. En el backlog la pide US-39 (Sprint 5). El máximo de comensales por reserva lo define el restaurante: es la capacidad de su mesa habilitada más grande, así que el comensal no puede indicar un grupo mayor (ver FR-013).
- **Restaurante sin mesas habilitadas**: no se puede indicar una cantidad de comensales ni elegir mesa; se informa que el restaurante todavía no tiene mesas disponibles.
- **Selección de mesa** *(decisiones del equipo del 23/10 y 28/10; falta que la PO las valide)*: el comensal no elige una mesa concreta. Las mesas del restaurante son grupos (cantidad × capacidad × tipo, spec 004). La revisión muestra como mesa asignada la del grupo más chico del tipo elegido en el que entra la cantidad de comensales («Mesa para 4 · Terraza»); con «Sin preferencia», la más chica de cualquier tipo. Al confirmar, el sistema toma una de las mesas libres de ese grupo; cuál es un dato interno que no se muestra.
- **Criterio de "horario ocupado"** *(decisión del equipo, 28/10; falta que la PO la valide)*: una mesa está ocupada en un horario cuando ya tiene una reserva confirmada que se superpone. El horario sigue disponible mientras quede al menos una mesa libre con capacidad suficiente.
- **Granularidad y duración de la reserva** *(decisión del equipo, 28/10; falta que la PO la valide)*: los horarios se ofrecen cada 30 minutos y cada reserva dura 90 minutos. Un horario se ofrece solo si los 90 minutos entran en el turno.
- **Tipos de mesa** *(decisión del equipo, 28/10; falta que la PO la valide)*: catálogo fijo de tres tipos, Adentro, Afuera y Terraza. El restaurante le asigna uno a cada grupo de mesas (spec 004, FR-009), y el comensal también puede elegir «Sin preferencia».
- **Estado al confirmar** *(decisión del equipo, 28/10; falta que la PO la valide)*: la reserva queda confirmada directamente, sin aprobación del restaurante.
- **Reservas superpuestas del mismo comensal** *(decisión del equipo, 28/10; falta que la PO la valide)*: no se impiden. Si el comensal ya tiene una reserva confirmada que se superpone con el horario elegido, en cualquier restaurante, la revisión se lo avisa y puede confirmar igual (US-13, escenario 6).
- **El restaurante reduce o deshabilita mesas con reservas futuras** *(decisión del equipo, 28/10, D9; falta que la PO la valide)*: el cambio se rechaza y se le muestran las reservas que quedarían sin mesa (fecha, horario y cantidad de personas). Es la advertencia de US-10 S3 (spec 004), sin la opción de guardar igual, porque esas reservas quedarían sin mesa. Cambiar la capacidad o el tipo de un grupo con reservas cuenta como sacarlo, así que también se rechaza mientras tenga reservas que no terminaron.
- **El restaurante cambia sus horarios con reservas futuras**: las reservas ya confirmadas se mantienen aunque queden fuera del nuevo horario; las nuevas solo se ofrecen dentro de él. [Pendiente para la PO: si el cambio de horarios debería advertir como el de mesas.]
- **Dos mesas en el mismo restaurante y horario**: el comensal puede confirmar dos reservas en el mismo restaurante y horario (por ejemplo, un grupo grande en dos mesas); la segunda muestra el aviso del escenario 6 de US-13.
- **Doble envío de la confirmación**: si la misma confirmación llega dos veces (doble clic o reintento), se crea una sola reserva y el comensal ve la confirmación una vez.
- **La sesión vence durante la revisión**: el comensal vuelve a ingresar y regresa a la revisión con su selección.
- **Comensal sin email verificado**: puede reservar; la verificación solo restringe los pedidos (spec 007, US-51).
- **"Ahora" y "hoy"**: siempre en la hora de Argentina, también para decidir qué horarios ya pasaron.
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
- **FR-004** *(US-11)*: El sistema MUST NOT permitir seleccionar un horario ya ocupado/reservado para el día y hora, según el criterio de "horario ocupado" de Edge Cases.
- **FR-005** *(US-11)*: Cuando el comensal cambie la fecha o el horario, el sistema MUST actualizar la disponibilidad informada según la nueva selección.
- **FR-006** *(US-11)*: El sistema MUST permitir elegir una preferencia de tipo de mesa (Adentro, Afuera o Terraza, o «Sin preferencia») y MUST informar si hay mesas disponibles que la cumplan.
- **FR-007** *(US-11)*: Si no hay mesas disponibles para la selección, el sistema MUST informarlo y MUST permitir modificar la elección.
- **FR-008** *(US-13)*: Antes de confirmar, el sistema MUST mostrar al comensal los datos que seleccionó.
- **FR-009** *(US-13)*: La revisión MUST incluir el restaurante, la fecha, el horario, la cantidad de comensales y la mesa asignada.
- **FR-010** *(US-13)*: El sistema MUST permitir volver atrás para modificar los datos antes de confirmar y MUST conservar los datos ya elegidos.
- **FR-011** *(US-13)*: El sistema MUST confirmar la reserva únicamente cuando el comensal lo indique de forma explícita; sin esa acción MUST NOT crear la reserva.
- **FR-012** *(US-13)*: Al confirmar, el sistema MUST revalidar la disponibilidad, MUST crear la reserva una única vez y, si la mesa o el horario ya no están disponibles, MUST informarlo sin crear la reserva.
- **FR-013** *(US-11)*: El sistema MUST limitar la cantidad de comensales por reserva al máximo que acepta el restaurante, definido por la capacidad de su mesa habilitada más grande, y MUST NOT permitir una cantidad mayor. Si el restaurante no tiene mesas habilitadas, el sistema MUST NOT ofrecer reservas.
- **FR-014** *(US-13)*: La revisión MUST proponer como mesa asignada una del grupo más chico, del tipo elegido, cuya capacidad alcance para la cantidad de comensales (con «Sin preferencia», del grupo más chico de cualquier tipo), y MUST mostrarla por su capacidad y su tipo. Al confirmar, el sistema MUST asignar una mesa libre de ese grupo y MUST rechazar un grupo sin capacidad suficiente.
- **FR-015** *(US-13)*: La reserva MUST quedar confirmada al crearse, sin aprobación del restaurante.
- **FR-016** *(US-13; decisión del equipo, 28/10)*: Si el comensal ya tiene una reserva confirmada que se superpone con el horario elegido, la revisión MUST avisárselo, indicando el restaurante y el horario de esa reserva, y MUST NOT impedirle confirmar.

### Key Entities

- **Restaurante**: rango de atención (días y horarios), mesas y cantidad máxima de comensales por reserva (la capacidad de su mesa habilitada más grande).
- **Mesa**: grupo de mesas del restaurante (spec 004): capacidad, cantidad y tipo de mesa.
- **Reserva**: cuenta del comensal, restaurante, fecha, horario (inicio y fin, 90 minutos), cantidad de comensales, mesa asignada (grupo y mesa interna del grupo), estado (confirmada o cancelada), fecha de creación.

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: selección de fecha, horario, preferencia de tipo de mesa y aviso de disponibilidad de mesa; revisión de los datos; confirmación explícita de la reserva.
- **Fuera**: búsqueda y selección del restaurante, modificación o cancelación de la reserva (incluido el criterio de US-11 en el backlog, «no puede modificar la reserva si faltan menos de 30 minutos», que corresponde a modificar una reserva existente), notificaciones o comprobante de la reserva, pedidos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 90% de los comensales completa la selección y confirma su reserva en menos de 3 minutos en el primer intento.
- **SC-002**: 100% de las fechas pasadas y de los horarios fuera del rango de atención son rechazados (0 reservas en el pasado o fuera de rango).
- **SC-003**: 0 reservas superpuestas sobre una misma mesa en un mismo horario.
- **SC-004**: 100% de los cambios de fecha u horario muestran las mesas disponibles actualizadas antes de permitir continuar.
- **SC-005**: 100% de las reservas confirmadas fueron precedidas por la revisión de datos y por una confirmación explícita (0 reservas creadas sin confirmación).

## Assumptions

- El comensal ya ingresó a su cuenta (US-1, US-3) y el restaurante ya fue seleccionado antes de crear la reserva.
- Solo se pueden reservar restaurantes reales, cargados en la base con ubicación, turnos y mesas (spec 004). El mapa muestra esos restaurantes junto con los de prueba de la spec 002, que no se pueden reservar *(decisión del equipo, 28/10)*.
- Cada reserva ocupa una única mesa.
- La cantidad máxima de comensales por reserva la define el restaurante a partir de sus mesas habilitadas (spec 004); no hay un límite fijo del sistema.
- Las fechas y horarios se interpretan en la zona horaria de Argentina (America/Argentina/Buenos_Aires).
- Idioma de la interfaz y mensajes: español (Argentina).
- Una reserva confirmada no requiere aprobación del restaurante.
