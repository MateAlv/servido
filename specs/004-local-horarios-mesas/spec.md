# Feature Specification: Configuración de Local, Horarios y Capacidad por Mesas

**Input** : Backlog Servido! (rol Restaurante) — US-6, US-8, US-10

**Backlog origen** : US-6 (est. 2) · US-8 (est. 2) · US-10 (est. 2)

## User Scenarios & Testing *(mandatory)*

### US-6 — Ingresar nombre y características

Como **Responsable del restaurante**, quiero Cargar el nombre y las características de mi restaurante, para Que los comensales puedan conocerlo y encontrarlo al buscar dónde comer.

**Why this priority**: Es la información pública que verán los comensales en el Sprint 2 para decidir dónde comer.

**Independent Test**: Probar guardado con y sin nombre.

**Acceptance Scenarios**:

1. **Dado** que completo la información (nombre, descripción, tipo de cocina, rango de precios, URL de foto y restricciones alimenticias), **Cuando** guardo, **Entonces** la información queda disponible para la consulta de los comensales, incluida la foto en el mapa de restaurantes.
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

1. **Dado** que registro grupos de mesas indicando su cantidad, su capacidad y su tipo (ej. 4 mesas de capacidad 2 adentro, 2 mesas de capacidad 4 en la terraza) y las marco como disponibles, **Entonces** el algoritmo de reservas las toma en cuenta para calcular disponibilidad.
2. **Dado** que desactivo o marco como no disponible un grupo de mesas, **Cuando** los comensales buscan reserva, **Entonces** esa capacidad se descuenta de la disponibilidad del turno.
3. **Dado** que intento marcar como no disponible un grupo de mesas cuya capacidad actualmente compromete reservas futuras ya confirmadas, **Cuando** envío la solicitud, **Entonces** el sistema me advierte de la situación antes de proceder.

## Edge Cases *(mandatory)*

- Intento de modificar la capacidad de mesas en paralelo con la confirmación de una reserva -> Manejo de transacciones en base de datos para evitar sobre-reserva de capacidad.
- Grupos de mesas cargados antes de que existiera el tipo de mesa *(decisión del equipo, 28/10)* -> Quedan como "Adentro"; el restaurante puede cambiarlo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-6)*: `nombre` MUST ser de llenado obligatorio.
- **FR-002** *(US-6)*: Las coordenadas geográficas MUST persistirse (latitud y longitud).
- **FR-003** *(US-6)*: El restaurante MUST poder ingresar una URL de foto en `foto_url`; el sistema MUST persistirla y MUST devolverla para su visualización desde el mapa de restaurantes. Este MVP no carga ni almacena archivos de imagen.
- **FR-004** *(US-8)*: El backend MUST validar la consistencia temporal de cada turno (sin superposiciones en el mismo día calendárico).
- **FR-005** *(US-10)*: Cada registro de inventario MUST representar un grupo indicando `quantity` mesas de `capacity` personas de un tipo de mesa; las mesas no tienen identificadores únicos ni identificadores físicos expuestos (no existe “Mesa 1”, “Mesa 2”). Para evitar la sobre-reserva, la spec 005 numera internamente las mesas de cada grupo; ese número no se muestra.
- **FR-006** *(US-10)*: La capacidad por mesa MUST ser un entero mayor a 0.
- **FR-007** *(US-10)*: El sistema MUST calcular la disponibilidad sumando la cantidad (`quantity`) de mesas de grupos disponibles cuya capacidad (`capacity`) sea suficiente para el tamaño solicitado. No MUST combinar la capacidad de varias mesas para una misma reserva.
- **FR-008** *(US-10)*: El sistema MUST advertir si la deshabilitación de un grupo de mesas genera sobre-reserva sobre reservas ya confirmadas.
- **FR-009** *(US-10; decisión del equipo, 28/10)*: Cada grupo MUST tener un tipo de mesa de un catálogo fijo: Adentro, Afuera o Terraza. Un restaurante no puede tener dos grupos con la misma capacidad y el mismo tipo. El comensal usa el tipo como preferencia al reservar (spec 005, US-11).

### Key Entities

- **Restaurante_Perfil**: restaurante_id, nombre, descripcion, tipo_cocina, rango_precio, foto_url, restricciones_tags[], direccion, latitud, longitud.
- **Turno**: id, restaurante_id, dia_semana, hora_inicio, hora_fin, activo.
- **Mesa_Inventario**: restaurante_id, capacity (int), quantity (int), seating_area (Adentro, Afuera o Terraza), available (boolean). Representa grupos; no modela mesas físicas individuales ni les asigna nombres o identificadores visibles.

## Success Criteria *(mandatory)*

- **SC-001**: 100% de los algoritmos de validación de solapamiento de turnos cubiertos por pruebas unitarias automatizadas.
- **SC-002**: 0% de inconsistencias de reservas que consuman más cantidad de mesas elegibles que la configurada (`quantity`) para cada grupo, fecha y turno.
