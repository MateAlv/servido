# Feature Specification: Alta de Plato en el Menú

**Created**: 2026-10-24

**Input**: Backlog Servido! — US-12

**Rol**: Responsable del restaurante

## User Scenarios & Testing *(mandatory)*

### US-12 — Agregar plato (Prioridad: -, Estimación: 3)

Como **Responsable del restaurante**, quiero agregar un plato al menú de mi restaurante, para que los comensales puedan verlo e incluirlo en sus pedidos anticipados.

**Valor**: Sin platos cargados el comensal no tiene qué elegir; es la base del menú y de los pedidos anticipados.

**Independent Test**: Abrir el formulario de alta y enviarlo vacío, con precio igual a cero y con datos válidos; solo el último caso debe guardar el plato y hacerlo visible en el menú que consultan los comensales.

**Acceptance Scenarios**:

1. **Dado** que accedo a agregar un plato, **Cuando** se muestra el formulario, **Entonces** puedo cargar nombre, descripción, categoría, precio y foto, y el nombre, el precio y la categoría aparecen identificados como obligatorios.
2. **Dado** que dejé vacío el nombre, el precio o la categoría, **Cuando** intento guardar, **Entonces** el sistema no guarda el plato y señala qué campo falta.
3. **Dado** que ingresé un precio que no es mayor a cero, **Cuando** intento guardar, **Entonces** el sistema me informa que el precio debe ser mayor a cero y conserva lo ya ingresado.
4. **Dado** que estoy cargando un plato, **Cuando** completo las restricciones alimenticias, **Entonces** puedo indicar con cuáles cumple el plato, o ninguna.
5. **Dado** que estoy cargando un plato, **Cuando** completo el tiempo estimado de preparación, **Entonces** puedo indicarlo y queda asociado al plato.
6. **Dado** que todos los datos obligatorios están completos y son válidos, **Cuando** guardo, **Entonces** el plato queda creado en el menú de mi restaurante y se muestra en el menú que consultan los comensales.

---

### Edge Cases

- **Categorías disponibles**: el backlog no define si la categoría se elige de una lista o se escribe libremente. Definido: se elige entre categorías predefinidas, por ejemplo entrada, plato principal, postre y bebida.
- **Restricciones alimenticias**: no está definido el conjunto posible. Definido: lista predefinida de selección múltiple, por ejemplo sin TACC, vegetariano y vegano, de carga opcional.
- **Tiempo estimado de preparación**: no están definidos la unidad ni los límites. Definido: número entero de minutos mayor a cero, de carga opcional.
- **Foto**: no están definidos formatos ni tamaño máximo. Definido: JPG o PNG de hasta 5 MB, de carga opcional.
- **Precio**: no están definidos moneda, decimales ni tope. Definido: pesos argentinos, hasta 2 decimales y un máximo definido por el sistema.
- **Plato repetido**: el backlog no define qué pasa si ya existe un plato con el mismo nombre en el restaurante. Definido: se informa que ya existe y no se crea un duplicado.
- **Foto que no se puede cargar**: el sistema informa el error, permite reintentar y no pierde los demás datos ingresados.
- Nombre con mayúsculas/minúsculas o espacios laterales: se normaliza antes de validar y comparar.
- Precio con formato no numérico o con signo negativo: se rechaza igual que un precio igual a cero.
- Envío doble del formulario: no debe crear dos platos.
- Descripción o nombre muy largos: se acepta hasta el máximo definido sin truncarse silenciosamente.
- Restaurante sin platos previos: el primer plato guardado hace que el menú se muestre a los comensales con ese plato.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**  *(US-12)*: El formulario de alta MUST permitir cargar nombre, descripción, categoría, precio y foto del plato.
- **FR-002**  *(US-12)*: El formulario MUST identificar nombre, precio y categoría como obligatorios; descripción y foto son opcionales.
- **FR-003**  *(US-12)*: El sistema MUST validar que nombre, precio y categoría estén completos, y que el precio sea un número mayor a cero, antes de permitir guardar.
- **FR-004**  *(US-12)*: Si algún dato no es válido, el sistema MUST informar cuál es y MUST conservar los datos ingresados para su corrección.
- **FR-005**  *(US-12)*: El sistema MUST permitir indicar las restricciones alimenticias con las que cumple el plato (cero o más) de una lista predefinida.
- **FR-006**  *(US-12)*: El sistema MUST permitir indicar el tiempo estimado de preparación del plato, de forma opcional y en minutos.
- **FR-007**  *(US-12)*: Si los datos son válidos, el sistema MUST guardar el plato en el menú del restaurante del responsable y MUST crearlo una única vez.
- **FR-008**  *(US-12)*: Una vez guardado, el sistema MUST mostrar el plato en el menú que consultan los comensales, con los datos cargados, sin pasos adicionales.
- **FR-009**  *(US-12)*: El sistema MUST NOT crear un plato cuando ya existe otro con el mismo nombre en el menú del restaurante, y MUST informar que ya existe.
- **FR-010**: Solo un responsable autenticado del restaurante MUST poder agregar platos, y el plato MUST quedar asociado únicamente a su restaurante.

### Key Entities

- **Plato**: nombre, descripción (opcional), categoría, precio, foto (opcional), restricciones alimenticias (cero o más), tiempo estimado de preparación (opcional), restaurante, fecha de creación.
- **Categoría**: nombre; agrupa los platos dentro del menú.
- **RestricciónAlimenticia**: nombre; se asocia a los platos que la cumplen.
- **Menú**: conjunto de platos de un restaurante, el que consultan los comensales.

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: alta de un plato con nombre, descripción, categoría, precio, foto, restricciones alimenticias y tiempo estimado de preparación; visibilidad del plato en el menú de los comensales.
- **Fuera**: edición, baja u ocultamiento de platos, gestión de categorías y de restricciones alimenticias, disponibilidad o stock por día, carga masiva de platos y filtrado del menú por restricciones.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 90% de los responsables carga un plato completo en menos de 3 minutos en el primer intento.
- **SC-002**: 100% de los datos inválidos son detectados antes de guardar (0 platos sin nombre, sin categoría o sin precio, ni con precio menor o igual a cero).
- **SC-003**: 100% de los platos guardados aparecen en el menú de los comensales de inmediato, sin acciones adicionales del responsable.
- **SC-004**: 0 platos duplicados generados por envíos dobles del formulario.

## Assumptions

- El responsable ya inició sesión y su restaurante ya existe en Servido!.
- Idioma de la interfaz y mensajes: español (Argentina).
- Los precios se expresan en pesos argentinos.
- El plato se publica al guardarse; no existe un estado de borrador en esta historia.
- Las restricciones alimenticias y el tiempo de preparación se muestran como información del plato; su uso en filtros o en pedidos se define en otras historias.
