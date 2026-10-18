# Feature Specification: Configuración de Local, Horarios y Capacidad por Mesas

**Input** : Backlog Servido! (rol Restaurante) — US-6, US-8, US-10

**Backlog origen** : US-6 (est. 2) · US-8 (est. 2) · US-10 (est. 2)

## User Scenarios & Testing *(mandatory)*

### US-6 — Ingresar nombre y características

Como **Responsable del restaurante**, quiero Cargar el nombre y las características de mi restaurante, para Que los comensales puedan conocerlo y encontrarlo al buscar dónde comer.

**Why this priority**: Es la información pública que verán los comensales en el Sprint 2 para decidir dónde comer.

**Independent Test**: Probar guardado con y sin nombre.

**Acceptance Scenarios**:

1. **Dado** que completo la información (nombre, descripción, tipo de cocina, rango de precios, fotos y restricciones alimenticias), **Cuando** guardo, **Entonces** la información queda disponible para la consulta de los comensales.
2. **Dado** que omito el campo `nombre`, **Cuando** intento guardar, **Entonces** el sistema responde HTTP 400 Bad Request indicando que es obligatorio.
3. **Dado** que ingreso una dirección física válida, **Cuando** el sistema la procesa en el mapa, **Entonces** me muestra la ubicación resultante para verificarla antes de guardar.
4. **Dado** que la dirección ingresada no puede ubicarse, **Cuando** el sistema la procesa, **Entonces** me informa el error y no la guarda.

### US-8 — Definir horarios de atención

Como **Responsable del restaurante**, quiero Definir los días y horarios de atención de mi restaurante, organizados en turnos, para Que solo se puedan realizar reservas dentro de los horarios en que el restaurante atiende.

**Acceptance Scenarios**:

1. **Dado** que defino uno o más turnos con hora de inicio y fin para un día de la semana, **Cuando** guardo, **Entonces** los turnos quedan registrados para habilitar reservas.
2. **Dado** que ingreso turnos superpuestos o con hora de fin anterior a la de inicio, **Cuando** intento guardar, **Entonces** el sistema lo rechaza.
3. **Dado** que marco un día en el que el restaurante no atiende, **Cuando** guardo, **Entonces** no se ofrecen horarios de reserva para ese día.

### US-10 — Definir inventario de mesas y capacidad

Como **Responsable del restaurante**, quiero Registrar las mesas de mi restaurante según su capacidad e indicar cuáles están disponibles para reservar, para Que los comensales solo puedan reservar según la capacidad física real del local.

**Why this priority**: Permite que el sistema valide automáticamente si el restaurante cuenta con combinaciones de mesas/sillas suficientes para un grupo.

**Acceptance Scenarios**:

1. **Dado** que registro grupos de mesas indicando su capacidad (ej. 4 mesas para 2 personas, 2 mesas para 4 personas) y las marco como disponibles, **Entonces** el algoritmo de reservas las toma en cuenta para calcular disponibilidad.
2. **Dado** que desactivo o marco como no disponible un grupo de mesas, **Cuando** los comensales buscan reserva, **Entonces** esa capacidad se descuenta de la disponibilidad del turno.
3. **Dado** que intento marcar como no disponible un grupo de mesas cuya capacidad actualmente compromete reservas futuras ya confirmadas, **Cuando** envío la solicitud, **Entonces** el sistema me advierte de la situación antes de proceder.

## Edge Cases *(mandatory)*

- Intento de modificar la capacidad de mesas en paralelo con la confirmación de una reserva -> Manejo de transacciones en base de datos para evitar sobre-reserva de capacidad.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-6)*: `nombre` MUST ser de llenado obligatorio.
- **FR-002** *(US-6)*: Las coordenadas geográficas MUST persistirse (latitud y longitud).
- **FR-003** *(US-8)*: El backend MUST validar la consistencia temporal de cada turno (sin superposiciones en el mismo día calendárico).
- **FR-004** *(US-10)*: La capacidad por mesa MUST ser un entero mayor a 0.
- **FR-005** *(US-10)*: El sistema MUST sumar la capacidad total por configuración de mesas para validar disponibilidad ante solicitudes de reservas del comensal.
- **FR-006** *(US-10)*: El sistema MUST advertir si la deshabilitación de mesas genera sobre-reserva sobre reservas ya confirmadas.

### Key Entities

- **Restaurante_Perfil**: restaurante_id, nombre, descripcion, tipo_cocina, rango_precio, restricciones_tags[], direccion, latitud, longitud.
- **Turno**: id, restaurante_id, dia_semana, hora_inicio, hora_fin, activo.
- **Mesa_Inventario**: id, restaurante_id, capacidad_comensales (int), cantidad_mesas (int), disponible (boolean).

## Success Criteria *(mandatory)*

- **SC-001**: 100% de los algoritmos de validación de solapamiento de turnos cubiertos por pruebas unitarias automatizadas.
- **SC-002**: 0% de inconsistencias de reservas que superen la capacidad total combinada de mesas disponibles configuradas por el restaurante.
