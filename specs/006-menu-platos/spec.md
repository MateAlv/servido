# Feature Specification: Gestión Inicial del Menú (Agregar Plato)

**Input** : Backlog Servido! (rol Restaurante) — US-12

**Backlog origen** : US-12 (est. 3)

## User Scenarios & Testing *(mandatory)*

### US-12 — Agregar plato

Como **Responsable del restaurante**, quiero Agregar un plato al menú de mi restaurante, para Que los comensales puedan verlo e incluirlo en sus pedidos anticipados.

**Why this priority**: Sin platos no se pueden hacer pedidos anticipados, funcionalidad core del MVP.

**Independent Test**: Probar creación de plato con campos obligatorios vacíos, precio `<= 0`, foto con formato no permitido; luego crear un plato válido y verificar su presencia inmediata en el catálogo del comensal.

**Acceptance Scenarios**:

1. **Dado** que ingreso nombre, categoría válida, precio `> 0`, descripción, tiempo de preparación (minutos `> 0`) e imagen válida, **Cuando** ejecuto la acción de guardar, **Entonces** el plato se crea con éxito (HTTP 201 Created).
2. **Dado** que omito nombre, categoría o precio, **Cuando** intento guardar, **Entonces** el backend responde HTTP 400 Bad Request indicando los campos requeridos no provistos.
3. **Dado** que ingreso un precio `= 0` o un valor numérico negativo, **Cuando** intento guardar, **Entonces** el sistema rechaza el valor notificando que debe ser estrictamente mayor a cero.
4. **Dado** que selecciono etiquetas de restricciones alimenticias (ej: Sin TACC, Vegetariano), **Cuando** guardo el plato, **Entonces** dichas etiquetas quedan vinculadas formalmente al plato para filtrado de comensales.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-12)*: El backend MUST exigir obligatoriedad en `nombre`, `categoria` y `precio`.
- **FR-002** *(US-12)*: El backend MUST validar que `precio` sea un valor numérico decimal mayor a 0.00.
- **FR-003** *(US-12)*: El parámetro `tiempo_preparacion_estimado` MUST ser un entero positivo en minutos.
- **FR-004** *(US-12)*: Las etiquetas de restricciones alimenticias MUST validarse contra un catálogo controlado del sistema.

### Key Entities

- **Plato**: id (UUID), restaurante_id, nombre, descripcion, categoria (Enum / String), precio (Decimal), tiempo_preparacion_minutos (Int).
- **PlatoRestriccion**: plato_id, restriccion_tag_id.

## Success Criteria *(mandatory)*

- **SC-001**: 100% de los intentos de crear un plato con precio `<= 0` o campos obligatorios faltantes son rechazados.

- **SC-002**: 0% de archivos corruptos o no soportados persistidos en el storage de imágenes.
