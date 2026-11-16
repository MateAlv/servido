# Feature Specification: Filtrar Restaurantes (Rating, Restricciones, Horario y Personas)

**Created**: 2026-11-12 (versión del Drive) · actualizada el 2026-11-15 con las decisiones F1–F10 · actualizada el 2026-11-15 (F4: el día solo filtra, pedido del equipo) · actualizada el 2026-11-15 (F4, F7 y F8: horas cada 30 minutos con rueda y reloj, «hasta» de 1 h 30 y filtros guardados en el navegador, pedido del equipo)

**Input**: Backlog Servido! — US-35, US-53, US-59, US-61

**Rol**: Comensal

**Sprint**: 5 (US-35 era del Sprint 5; US-53, US-59 y US-61 se adelantaron del Sprint 6 en la planning del 12/11)

**Tests**: requeridos. Cada escenario de aceptación tiene al menos un test automatizado (constitución, principio III).

Estos filtros se suman al filtro de precio de la spec 002-elegir-restaurante (US-7) y funcionan igual que él: se aplican al mapa y al listado (US-33), se pueden cambiar y quitar, y el detalle permite comprobar lo filtrado. Las decisiones F1–F10 son del equipo (15/11) y falta que la PO las valide.

## User Scenarios & Testing *(mandatory)*

### US-35 — Filtrar por ratings de cada restaurante (Prioridad: -, Estimación: 1)

Como **Comensal**, quiero filtrar los restaurantes según su rating, para encontrar opciones que hayan sido bien valoradas por otros comensales.

**Valor**: El comensal llega más rápido a los restaurantes que otros comensales valoraron bien, sin revisarlos uno por uno.

**Independent Test**: Con restaurantes de distintos promedios y uno sin reseñas, elegir «4 o más», verificar que solo quedan los de promedio 4 o mayor; cambiar a «3 o más» y verificar que el resultado se amplía; quitar el filtro y verificar que vuelven todos, incluido el que no tiene reseñas.

**Acceptance Scenarios**:

1. **Dado** que veo los restaurantes, **Cuando** elijo un rating mínimo («3 o más», «4 o más» o «4,5 o más»), **Entonces** en el mapa y en el listado solo quedan los restaurantes cuyo promedio es igual o mayor al elegido.
2. **Dado** que hay un rating mínimo aplicado, **Cuando** elijo otro, **Entonces** el resultado se actualiza al nuevo mínimo.
3. **Dado** que hay un rating mínimo aplicado, **Cuando** lo quito, **Entonces** vuelvo a ver todos los restaurantes que los demás filtros permiten.
4. **Dado** que un restaurante todavía no tiene reseñas, **Cuando** hay un rating mínimo aplicado, **Entonces** ese restaurante no aparece; al quitar el filtro vuelve a aparecer *(F1)*.

---

### US-53 — Filtrar restaurante por restricciones alimenticias (Prioridad: -, Estimación: 1)

Como **Comensal**, quiero filtrar los restaurantes según las restricciones alimenticias que contemplan, para encontrar opciones adecuadas a mis necesidades.

**Valor**: El comensal no pierde tiempo revisando menús de restaurantes que no tienen nada que pueda comer.

**Independent Test**: Con un restaurante que tiene un plato sin TACC y vegano, otro con un plato sin TACC y otro vegano (platos distintos) y otro sin platos con restricciones, elegir «Sin TACC» y verificar que aparecen los dos primeros; sumar «Vegano» y verificar que queda solo el primero; quitar «Sin TACC» y verificar el cambio; quitar todas y verificar que vuelven todos.

**Acceptance Scenarios**:

1. **Dado** que veo los restaurantes, **Cuando** elijo una restricción alimenticia (sin TACC, vegetariano o vegano), **Entonces** solo quedan los restaurantes que tienen al menos un plato disponible del menú marcado con esa restricción *(F2)*.
2. **Dado** que veo los restaurantes, **Cuando** elijo más de una restricción, **Entonces** solo quedan los restaurantes que tienen al menos un plato disponible que cumple todas las elegidas a la vez *(F3)*.
3. **Dado** que hay restricciones aplicadas, **Cuando** agrego o saco una, **Entonces** el resultado se actualiza a las restricciones que quedaron elegidas.
4. **Dado** que hay restricciones aplicadas, **Cuando** las quito todas, **Entonces** vuelvo a ver todos los restaurantes que los demás filtros permiten.

---

### US-59 — Filtrar restaurante por horarios de turno (Prioridad: -, Estimación: 1)

Como **Comensal**, quiero filtrar los restaurantes según los horarios disponibles, para encontrar lugares que encajen en mi agenda.

**Valor**: El comensal no ve restaurantes que a esa hora están cerrados o bloqueados, en los que no podría reservar.

**Independent Test**: Con un restaurante que atiende de 20:00 a 23:30, otro que atiende de 12:00 a 15:00 y otro que bloqueó la fecha elegida, elegir esa fecha y la hora 21:00 y verificar que solo aparece el primero; cambiar a un rango de 12:00 a 14:00 y verificar que aparece solo el segundo; quitar el filtro y verificar que vuelven todos.

**Acceptance Scenarios**:

1. **Dado** que veo los restaurantes, **Cuando** elijo un día y una hora puntual, **Entonces** solo quedan los restaurantes en los que ese día se puede empezar una reserva a esa hora *(F4)*.
2. **Dado** que veo los restaurantes, **Cuando** elijo un día y un rango horario (desde y hasta), **Entonces** solo quedan los restaurantes en los que ese día se puede empezar una reserva en algún horario dentro del rango, incluidos sus extremos *(F4)*.
3. **Dado** que hay un día y un horario aplicados, **Cuando** cambio el día, la hora o el rango, **Entonces** el resultado se actualiza.
4. **Dado** que hay un día y un horario aplicados, **Cuando** quito el filtro, **Entonces** vuelvo a ver todos los restaurantes que los demás filtros permiten.
5. **Dado** que veo los restaurantes, **Cuando** elijo solo un día, **Entonces** solo quedan los restaurantes en los que ese día se puede empezar alguna reserva *(F4)*.
6. **Dado** que elijo un rango, **Cuando** elijo «desde» y todavía no elegí «hasta», **Entonces** «hasta» es «desde» más 1 h 30, lo que dura una reserva, y lo sigue si cambio «desde» *(F4)*.

---

### US-61 — Filtrar restaurante por máxima cantidad de comensales por mesa (Prioridad: -, Estimación: 1)

Como **Comensal**, quiero filtrar según la cantidad de personas que van conmigo, para encontrar restaurantes que permitan dicha cantidad por reserva.

**Valor**: El comensal no elige un restaurante que no tiene una mesa para todo su grupo.

**Independent Test**: Con un restaurante cuya mesa más grande es de 4 y otro con una mesa de 8, elegir 6 personas y verificar que solo aparece el segundo; cambiar a 2 y verificar que aparecen los dos; quitar el filtro y verificar que vuelven todos.

**Acceptance Scenarios**:

1. **Dado** que veo los restaurantes, **Cuando** indico una cantidad de personas, **Entonces** solo quedan los restaurantes que tienen una mesa habilitada con capacidad para esa cantidad *(F5)*.
2. **Dado** que hay una cantidad aplicada, **Cuando** la cambio, **Entonces** el resultado se actualiza.
3. **Dado** que hay una cantidad aplicada, **Cuando** la quito, **Entonces** vuelvo a ver todos los restaurantes que los demás filtros permiten.

---

### Comportamiento común de los filtros

Estos escenarios valen para los cinco filtros (los cuatro de esta spec y el de precio). Sus tests llevan el número de la US que prueba cada caso.

1. **Dado** que tengo filtros de distinto tipo aplicados, **Cuando** miro el mapa o el listado, **Entonces** solo aparecen los restaurantes que cumplen todos a la vez *(F6)*.
2. **Dado** que tengo filtros aplicados, **Cuando** miro el mapa o el listado, **Entonces** veo cada filtro activo como una etiqueta que lo describe (por ejemplo «4 o más ★», «Sin TACC», «Sáb 22/11», «Sáb 22/11 · 21:00», «Sáb 22/11 · 20:00–22:00», «6 personas»), con una acción para quitarlo, y una acción para quitar todos *(F7)*.
3. **Dado** que ningún restaurante cumple los filtros, **Cuando** miro el mapa o el listado, **Entonces** se me informa que no hay resultados y se me ofrece quitar los filtros.
4. **Dado** que tengo filtros aplicados, **Cuando** abro el detalle de un restaurante y vuelvo, o recargo la página, **Entonces** los filtros siguen aplicados *(F8)*.
5. **Dado** que filtré por día, horario o cantidad de personas, **Cuando** elijo reservar en un restaurante del resultado, **Entonces** la reserva empieza con ese día, esa cantidad de personas y, si elegí una hora puntual, esa hora (con el día solo o con un rango, sin hora), y puedo cambiarlos *(F9)*.
6. **Dado** que usé filtros en este navegador, **Cuando** vuelvo al mapa o al inicio sin filtros en la dirección, **Entonces** se aplican los últimos filtros que usé; si la dirección trae filtros, mandan esos *(F8)*.

### Edge Cases

- **Restaurantes de prueba** *(F10)*: los restaurantes de prueba (que no se pueden reservar, D4) no tienen turnos ni mesas, así que no aparecen mientras haya un filtro de horario o de cantidad de personas. Con rating, restricciones y precio participan con sus datos de prueba: su rating de prueba y las restricciones de sus platos de prueba.
- **Restaurante sin menú o sin platos disponibles**: no cumple ningún filtro de restricciones (no tiene platos), igual que queda fuera del filtro de precio (spec 002-elegir-restaurante).
- **Restricciones declaradas en el perfil**: las etiquetas que el restaurante declara en su perfil no cuentan para el filtro; cuentan solo los platos disponibles del menú (F2). Un restaurante que declara «Vegano» sin ningún plato vegano no aparece al filtrar por vegano.
- **Promedio en el límite**: el filtro compara el promedio sin redondear. Un promedio de 3,96 se muestra como 4,0 pero no cumple «4 o más». *(Es la misma cuenta del promedio de la spec 014-resenas, R12 y R13: la última reseña de cada persona.)*
- **Hoy, con horarios que ya pasaron**: si el día elegido es hoy, solo cuentan los horarios que todavía no empezaron.
- **Rango sin horarios posibles**: un rango en el que ningún restaurante puede empezar una reserva (por ejemplo de 04:00 a 05:00) no deja ningún restaurante; se informa que no hay resultados.
- **Horas fuera de la grilla**: la hora puntual y los extremos del rango se eligen cada 30 minutos (los horarios de reserva van cada 30 minutos, spec 003, D5), así que no se puede elegir 21:10. Un enlace con un rango fuera de la grilla se toma como el día solo.
- **Rango invertido**: el «hasta» no ofrece horas anteriores al «desde». Si el comensal elige un «desde» posterior al «hasta», el «hasta» vuelve a ser «desde» más 1 h 30.
- **Día fuera del plazo**: se puede elegir desde hoy hasta 60 días adelante, el mismo plazo en el que se puede reservar (spec 003, D10).
- **Mesa ocupada**: los filtros de horario y de personas no miran si las mesas ya están reservadas. Un restaurante puede aparecer y, al reservar, no tener mesa libre a esa hora; la reserva lo informa como hoy (spec 003).
- **Personas sin horario**: el filtro de personas mira la mesa más grande del restaurante, haya o no un horario elegido; no combina la capacidad con un horario puntual.
- **Precarga que ya no vale** (F9): si al abrir la reserva la hora precargada ya no está disponible, la reserva se abre con el día y las personas, sin hora, y el comensal elige otra.
- **Filtros en un enlace compartido** (F8): quien abre un enlace con filtros los ve aplicados. Un día que ya pasó se descarta y se avisa.
- **Filtros guardados que ya no valen** (F8): si el día de los últimos filtros guardados en el navegador ya pasó, se descarta sin aviso y se aplican los demás.

## Decisiones del equipo (15/11, falta que la PO las valide)

- **F1 — Rating mínimo**: las opciones son «3 o más», «4 o más» y «4,5 o más» estrellas. Los restaurantes sin reseñas quedan afuera mientras el filtro está activo, porque no hay cómo saber si cumplen.
- **F2 — Restricciones por plato**: un restaurante cumple una restricción si tiene al menos un plato disponible del menú marcado con ella. Las etiquetas del perfil del restaurante no cuentan, porque pueden no coincidir con el menú (riesgo 5: la restricción se muestra siempre como la declaró el restaurante).
- **F3 — Varias restricciones a la vez**: con más de una elegida, tiene que haber un mismo plato que cumpla todas. Una persona celíaca y vegana necesita un plato sin TACC y vegano, no dos platos distintos.
- **F4 — Horario reservable**: el comensal elige un día y, si quiere, lo acota con una hora puntual o un rango; el día solo vale como cualquier horario de ese día. Un restaurante cumple si ese día tiene un horario en el que se puede empezar una reserva (en la hora o el rango, si se eligieron): dentro de un turno, con los 90 minutos de la reserva adentro del turno (spec 003, D5) y sin un bloqueo que lo cubra (spec 016-bloqueo-horarios). No se miran las mesas ya reservadas. La hora y los extremos del rango se eligen cada 30 minutos; mientras el comensal no elige «hasta», vale «desde» más 1 h 30.
- **F5 — Cantidad de personas**: de 1 a 20. Un restaurante cumple si su mesa habilitada más grande alcanza para esa cantidad, que es el máximo que acepta una reserva (spec 003, FR-013).
- **F6 — Combinación**: los filtros de distinto tipo se combinan con «y»: el restaurante tiene que cumplir todos, incluido el de precio.
- **F7 — Presentación**: un botón «Filtros» abre un panel con todos los filtros, precio incluido. En el celular el panel sube desde abajo y en pantallas grandes se abre al costado. El horario se elige entre «Todo el día», «Una hora» y «Entre horas»; la hora se elige con una rueda que se desliza de a media hora, como la de una alarma, o con un reloj que se abre al tocarla, primero la hora y después los minutos (en punto o y media). Los filtros activos se ven como etiquetas arriba del mapa y del listado, cada una con su acción para quitarla, más una para quitar todos.
- **F8 — Conservación**: los filtros forman parte de la dirección de la página. Se conservan al abrir un detalle y volver, al recargar y al compartir el enlace. Además, el navegador recuerda los últimos filtros usados: al volver al mapa o al inicio sin filtros en la dirección, se aplican esos. Un enlace con filtros manda sobre los guardados, y quitar todos los filtros también los borra del navegador. No se guardan en la cuenta.
- **F9 — Precarga de la reserva**: con día, horario o personas filtrados, la reserva empieza con esos datos y el comensal los puede cambiar. La hora se precarga solo si se eligió una hora puntual; con el día solo o con un rango, la reserva empieza con el día y las personas. Con esto se cumple el criterio de US-39 «el sistema te pregunta cuántos y cuándo antes de elegir un restaurante», como opción y no como paso obligatorio.
- **F10 — Restaurantes de prueba**: no tienen turnos ni mesas, así que quedan fuera de los filtros de horario y de personas. Para que el filtro de restricciones funcione con ellos, sus platos de prueba llevan restricciones coherentes con las que ya muestran.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-35; F1)*: El sistema MUST permitir filtrar por rating mínimo (3, 4 o 4,5 estrellas) y mostrar solo los restaurantes con promedio igual o mayor, y MUST NOT mostrar los que no tienen reseñas mientras el filtro está activo.
- **FR-002** *(US-53; F2, F3)*: El sistema MUST permitir elegir una o más restricciones alimenticias y mostrar solo los restaurantes con al menos un plato disponible que cumpla todas las elegidas.
- **FR-003** *(US-59; F4)*: El sistema MUST permitir elegir un día (desde hoy hasta 60 días adelante), solo o acotado con una hora puntual o un rango horario elegidos cada 30 minutos (con «hasta» igual a «desde» más 1 h 30 mientras no se elija), y mostrar solo los restaurantes en los que ese día se puede empezar una reserva (en ese horario, si se eligió) según sus turnos, la duración de la reserva y sus bloqueos.
- **FR-004** *(US-61; F5)*: El sistema MUST permitir indicar de 1 a 20 personas y mostrar solo los restaurantes cuya mesa habilitada más grande alcanza para esa cantidad.
- **FR-005** *(US-35, US-53, US-59, US-61)*: El sistema MUST permitir cambiar y quitar cada filtro, y al quitarlos MUST volver a mostrar todos los restaurantes que los demás filtros permiten.
- **FR-006** *(F6)*: El sistema MUST aplicar todos los filtros activos a la vez, incluido el de precio, tanto en el mapa como en el listado.
- **FR-007** *(F7)*: El sistema MUST mostrar los filtros activos, cada uno con una acción para quitarlo, y una acción para quitarlos todos.
- **FR-008**: Si ningún restaurante cumple los filtros, el sistema MUST informarlo y ofrecer quitarlos.
- **FR-009** *(F8)*: Los filtros MUST conservarse al abrir un detalle y volver, al recargar la página y al abrir un enlace con filtros, y el navegador MUST aplicar los últimos usados cuando se vuelve sin filtros en la dirección.
- **FR-010** *(F9; US-39)*: Al reservar desde un resultado filtrado, el sistema MUST empezar la reserva con el día, la cantidad de personas y, si se eligió una, la hora puntual del filtro, y MUST permitir cambiarlos.
- **FR-011** *(F10)*: Con un filtro de horario o de cantidad de personas activo, el sistema MUST NOT mostrar los restaurantes de prueba.
- **FR-012** *(US-9)*: El detalle de un restaurante MUST permitir comprobar el rating y las restricciones de los platos; el horario y la cantidad de personas se comprueban al reservar, porque llegan precargados.

### Key Entities

- **Filtros de búsqueda**: lo que eligió el comensal: rating mínimo, restricciones alimenticias, día (solo o con hora puntual o rango), cantidad de personas y categoría de precio. Viven en la dirección de la página y el navegador recuerda los últimos; no se guardan en la cuenta.
- **Restaurante** (sin cambios): su promedio (spec 014-resenas), sus platos disponibles con sus restricciones (spec 009-ver-platos-precios), sus turnos y bloqueos (specs 004 y 016-bloqueo-horarios) y sus mesas habilitadas (spec 004).

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: filtrar por rating mínimo, restricciones, día y horario, y cantidad de personas; combinarlos con el filtro de precio; etiquetas de filtros activos; aviso sin resultados; conservar los filtros en la dirección y en el navegador; precargar la reserva.
- **Fuera**: ordenar los resultados (por rating o cercanía), búsqueda por texto, guardar filtros en la cuenta, mirar si hay mesas libres al filtrar, filtrar por tipo de mesa o por promociones (US-55).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% de los restaurantes mostrados con filtros activos cumplen todos los filtros.
- **SC-002**: Quitar todos los filtros restablece exactamente el conjunto de restaurantes que se veía sin filtros.
- **SC-003**: Nunca se muestra un mapa o un listado vacío sin el aviso de que no hay resultados.
- **SC-004**: Un comensal aplica una combinación de dos filtros y llega a reservar con los datos precargados en menos de 1 minuto.

## Assumptions

- Las restricciones son las tres que hoy se cargan en los platos: sin TACC, vegetariano y vegano.
- El rating es el promedio que ya muestran el mapa, el listado y el detalle (spec 014-resenas).
- Grupos de más de 20 personas quedan fuera del filtro; se pueden reservar si el restaurante tiene una mesa para ellos.
- Esta spec viene de la versión del Drive (`Specs/Sprint 5/Comensal`, creada el 12/11 como 019). Pasó a 027 porque 019 ya era la spec de Google y verificación del comensal.
- Idioma de la interfaz y de los mensajes: español (Argentina).
- Fechas y horarios en la zona horaria de Argentina (America/Argentina/Buenos_Aires).
