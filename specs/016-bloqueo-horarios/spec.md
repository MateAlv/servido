# Feature Specification: Bloquear Horarios No Disponibles

**Created**: 2026-11-02

**Input**: Backlog Servido! — US-32 (Sprint 4, 1 SP). Se apoya en US-8 (horarios y turnos de atención, Sprint 2).

**Rol**: Restaurante

## User Scenarios & Testing *(mandatory)*

### US-32 — Bloquear horarios no disponibles (Prioridad: -, Estimación: 1)

Como **Responsable del restaurante**, quiero bloquear fechas u horarios puntuales en los que el restaurante no tomará reservas, para evitar reservas en momentos en los que no puedo atender, como eventos privados o feriados.

**Valor**: Permite cerrar días u horas puntuales sin tocar la configuración semanal de turnos.

**Independent Test**: Bloquear una fecha completa y una franja horaria y verificar que no se ofrecen a los comensales; bloquear sobre un horario con reservas confirmadas y verificar la advertencia previa y la cancelación de esas reservas; ver los bloqueos vigentes y quitar uno.

**Acceptance Scenarios**:

1. **Dado** que quiero cerrar un día, **Cuando** bloqueo una fecha completa, **Entonces** ningún horario de ese día se muestra como disponible a los comensales.
2. **Dado** que quiero cerrar solo unas horas, **Cuando** bloqueo una franja horaria de una fecha, **Entonces** los horarios que se superponen con esa franja no se muestran como disponibles.
3. **Dado** que hay reservas confirmadas dentro de lo que voy a bloquear, **Cuando** intento aplicar el bloqueo, **Entonces** el sistema me informa cuántas y cuáles son (fecha, horario y cantidad de personas) antes de aplicarlo.
4. **Dado** que se me informaron las reservas afectadas, **Cuando** confirmo el bloqueo, **Entonces** el bloqueo se aplica y esas reservas quedan canceladas.
5. **Dado** que se me informaron las reservas afectadas, **Cuando** desisto, **Entonces** no se aplica el bloqueo y las reservas siguen confirmadas.
6. **Dado** que ingreso una franja, **Cuando** la hora de fin es anterior o igual a la de inicio, o la fecha ya pasó, **Entonces** el sistema la rechaza e informa el motivo.
7. **Dado** que tengo bloqueos cargados, **Cuando** ingreso a la sección, **Entonces** veo los bloqueos vigentes y puedo quitar cualquiera.
8. **Dado** que quito un bloqueo, **Cuando** un comensal consulta esa fecha, **Entonces** los horarios vuelven a mostrarse según los turnos del restaurante.

---

### Edge Cases

- **Bloqueo con reservas** (criterio de US-32): las reservas afectadas pasan a estado cancelado. Se cancela también el pedido anticipado asociado y la mesa se libera. El restaurante las ve como canceladas en US-18.
- **Aviso al comensal** *(pendiente para la PO)*: US-32 no dice cómo se entera el comensal de que su reserva fue cancelada por el restaurante. Propuesta: mail con el detalle (restaurante, fecha y horario).
- **Reembolso** *(pendiente para la PO)*: cuando existan pagos (Sprints 5 y 6), las reservas canceladas por un bloqueo requieren reembolso (US-38).
- **Quitar un bloqueo**: no restaura las reservas ya canceladas.
- **Bloqueos que se superponen**: se permiten; un horario queda bloqueado si lo cubre al menos uno.
- **Bloqueo de fechas pasadas**: no se permite.
- **Franja parcialmente pasada** *(propuesta del equipo; falta que la PO la valide)*: si se bloquea una franja de hoy cuyo inicio ya pasó, se rechaza; para cerrar el resto del día se bloquea desde la hora actual en adelante o el día completo.
- **Bloqueo fuera de turno o en día sin atención** (US-8): se permite, no tiene efecto práctico; se informa que no hay horarios afectados.
- **Reservas que cruzan el borde de la franja** *(propuesta del equipo; falta que la PO la valide)*: una reserva se considera afectada si su horario se superpone con la franja bloqueada, aunque empiece antes o termine después.
- **Cambios de turnos** (US-8): si el restaurante modifica sus turnos, los bloqueos ya cargados se conservan, porque dependen de la fecha y la hora y no del turno.
- **Doble confirmación del bloqueo**: se aplica una sola vez y las reservas se cancelan una sola vez.
- **Reserva creada mientras se confirma el bloqueo** *(propuesta del equipo; falta que la PO la valide)*: si entre la advertencia y la confirmación entra una reserva nueva en esa franja, el sistema vuelve a advertir con la lista actualizada antes de aplicar.
- **Aislamiento**: un restaurante solo bloquea y ve sus propios bloqueos.
- **"Hoy" y "ahora"**: siempre en la hora de Argentina.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-32)*: El sistema MUST permitir bloquear una fecha completa o una franja horaria determinada.
- **FR-002** *(US-32)*: El sistema MUST NOT mostrar como disponibles a los comensales los horarios bloqueados.
- **FR-003** *(US-32)*: El sistema MUST rechazar una franja cuya hora de fin sea anterior o igual a la de inicio, y un bloqueo sobre una fecha pasada.
- **FR-004** *(US-32)*: Si hay reservas confirmadas en lo que se va a bloquear, el sistema MUST informarlas (fecha, horario y cantidad de personas) antes de aplicar el bloqueo y MUST pedir confirmación.
- **FR-005** *(US-32)*: Al confirmar el bloqueo, el sistema MUST cancelar las reservas afectadas, MUST cancelar sus pedidos anticipados y MUST liberar sus mesas.
- **FR-006** *(US-32)*: Si el restaurante desiste, el sistema MUST NOT aplicar el bloqueo y MUST mantener las reservas.
- **FR-007** *(US-32; propuesta del equipo)*: El sistema MUST avisar por mail a cada comensal cuya reserva fue cancelada por un bloqueo, con el restaurante, la fecha y el horario.
- **FR-008** *(US-32)*: El sistema MUST permitir al restaurante ver los bloqueos vigentes y quitarlos.
- **FR-009** *(US-32)*: Al quitar un bloqueo, el sistema MUST volver a ofrecer los horarios según los turnos del restaurante y MUST NOT restaurar las reservas canceladas.
- **FR-010** *(US-32)*: El sistema MUST permitir a cada restaurante bloquear y ver solo sus propios bloqueos.

### Key Entities

- **Bloqueo**: restaurante, fecha, franja horaria (o día completo), fecha de creación.
- **Reserva**: pasa a estado cancelado cuando el restaurante la cancela por un bloqueo.
- **Turno** (US-8): define los horarios que se ofrecen; el bloqueo los restringe sin modificarlos.

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: bloqueo de fechas completas o franjas; advertencia y cancelación de las reservas afectadas; ver y quitar bloqueos.
- **Fuera**: definir turnos (US-8) y mesas (US-10); reembolsos (US-38 y US-56); cancelar una reserva individual desde el restaurante (US-38, Sprint 5); bloqueos recurrentes (por ejemplo, «todos los lunes»).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% de los horarios bloqueados dejan de ofrecerse a los comensales.
- **SC-002**: 100% de los bloqueos con reservas afectadas fueron precedidos por la advertencia y una confirmación explícita.
- **SC-003**: El 90% de los restaurantes bloquea una fecha en menos de 1 minuto.
- **SC-004**: 100% de las reservas canceladas por un bloqueo liberan su mesa y su pedido.

## Assumptions

- El restaurante ya ingresó a su cuenta (US-4) y tiene turnos definidos (US-8).
- Las fechas y horarios se interpretan en la zona horaria de Argentina (America/Argentina/Buenos_Aires).
- Idioma de la interfaz y mensajes: español (Argentina).
