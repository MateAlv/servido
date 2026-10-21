# Feature Specification: Elegir Restaurante (Mapa, Filtro por Precio y Detalle)

**Created**: 2026-10-13

**Input**: Backlog Servido! — US-5, US-7, US-9

**Rol**: Comensal

## User Scenarios & Testing *(mandatory)*

### US-5 — Ver mapa de restaurantes (Prioridad: -, Estimación: 5)

Como **Comensal**, quiero ver la ubicación y características de cada restaurante en un mapa interactivo de mi posición actual, para decidir a cuál ir según su ubicación y mis preferencias.

**Valor**: Es el punto de entrada para descubrir dónde comer.

**Independent Test**: Con restaurantes cargados y la ubicación del dispositivo habilitada, abrir el mapa y verificar marcadores, distancia, concurrencia, acceso al detalle y actualización periódica.

**Acceptance Scenarios**:

1. **Dado** que habilité mi ubicación, **Cuando** abro el mapa, **Entonces** veo mi posición actual y los restaurantes como marcadores.

2. **Dado** que el mapa está visible, **Cuando** miro cada restaurante, **Entonces** se muestra un indicador de concurrencia (bajo / medio / alto).

3. **Dado** que el mapa está visible, **Cuando** miro un restaurante, **Entonces** puedo ver la distancia desde mi posición hasta él.

4. **Dado** que veo un restaurante en el mapa, **Cuando** hago clic en él, **Entonces** accedo al detalle de su menú y características.

5. **Dado** que el mapa permanece abierto, **Cuando** transcurre el período de actualización, **Entonces** la concurrencia se actualiza sin recargar manualmente.

---

### US-7 — Filtrar restaurantes por precios del menú (Prioridad: -, Estimación: 2)

Como **Comensal**, quiero filtrar los restaurantes según los precios de su menú, para encontrar opciones que se ajusten a mi presupuesto.

**Valor**: Reduce el conjunto de opciones según el presupuesto del comensal.

**Independent Test**: Aplicar un filtro de precio y verificar el resultado; modificarlo y quitarlo.

**Acceptance Scenarios**:

1. **Dado** que veo los restaurantes, **Cuando** aplico un filtro según los precios del menú, **Entonces** se muestran los restaurantes cuyos menús cumplen con el criterio seleccionado.

2. **Dado** que hay un filtro de precio aplicado, **Cuando** lo modifico, **Entonces** el resultado se actualiza al nuevo criterio.

3. **Dado** que hay un filtro de precio aplicado, **Cuando** lo quito, **Entonces** vuelvo a visualizar todos los restaurantes.

---

### US-9 — Ver detalle de restaurante (Prioridad: -, Estimación: 1)

Como **Comensal**, quiero ver en detalle el restaurante seleccionado, para decidir si reservar en el lugar.

**Valor**: Aporta la información final para decidir antes de reservar.

**Independent Test**: Seleccionar un restaurante desde el mapa y comprobar que el detalle muestre características, menú y precios actualizados.

**Acceptance Scenarios**:

1. **Dado** que veo un restaurante en el mapa, **Cuando** lo selecciono, **Entonces** accedo a su detalle desde el mapa interactivo.

2. **Dado** que apliqué un filtro, **Cuando** miro el detalle, **Entonces** puedo verificar que el restaurante cumple lo filtrado.
3. **Dado** que estoy en el detalle, **Cuando** reviso el menú, **Entonces** veo los platos con sus precios actualizados antes de decidir si reservo.

---

### Edge Cases

- **Ubicación denegada o no disponible**: [NEEDS CLARIFICATION: se propone mostrar el mapa centrado en una zona por defecto, sin distancias, e informar cómo habilitar la ubicación.]

- **Cálculo de la concurrencia**: [NEEDS CLARIFICATION: fuente del dato, umbrales de bajo/medio/alto y frecuencia de actualización. Mientras no exista otra fuente, se asume un valor por restaurante provisto por la fuente de datos.]

*Implementación provisoria (19/10)*: el mapa vuelve a pedir la concurrencia cada **30 segundos** mientras permanece abierto. La frecuencia queda pendiente de confirmación con la PO.

**Criterio del filtro de precio** *(decisión del equipo, actualizada el 19/10)*: por ahora el filtro es provisorio. Cada restaurante de la demo tiene un gasto promedio por persona numérico mockeado, expresado en pesos argentinos; su categoría se deriva de ese monto: `$` para menos de $15.000; `$$` desde $15.000 hasta menos de $25.000; `$$$` desde $25.000 hasta $40.000 inclusive; `$$$$` para más de $40.000. Estos límites resuelven provisoriamente las superposiciones de la propuesta original. El filtro muestra los restaurantes de las categorías elegidas. En el futuro, el promedio se calculará a partir de al menos 5 reseñas con precio por persona (US-56); ese cálculo todavía no está implementado ni forma parte de este cambio. La demostración del filtro de precios funciona con datos simulados y todavía no está conectada con los restaurantes mostrados en el mapa (US-5) ni con datos reales del backend.

- Sin restaurantes para mostrar o ninguno cumple el filtro: estado vacío informativo con acción para quitar el filtro.

- Restaurantes sin menú cargado: se muestran en el mapa; el filtro de precio los excluye; el detalle informa que no hay platos.

- Pérdida de conexión durante la actualización periódica: se conserva el último valor y se indica que puede estar desactualizado.

- Alta densidad de restaurantes en una zona: los marcadores se agrupan para mantener el mapa legible.

- El filtro aplicado se conserva al abrir un detalle y volver al mapa.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**  *(US-5)*: El sistema MUST mostrar un mapa interactivo con la posición actual del comensal y la ubicación de cada restaurante.

- **FR-002**  *(US-5)*: El sistema MUST mostrar para cada restaurante un indicador de concurrencia de tres niveles: bajo, medio, alto.

- **FR-003**  *(US-5)*: El sistema MUST mostrar la distancia desde la posición del comensal hasta cada restaurante.

- **FR-004**  *(US-5)*: El sistema MUST actualizar periódicamente la concurrencia sin intervención del usuario.

- **FR-005**  *(US-5, US-9)*: El comensal MUST poder hacer clic en un restaurante del mapa para acceder a su detalle.

- **FR-006**  *(US-7)*: El sistema MUST permitir aplicar un filtro según los precios del menú y mostrar los restaurantes que cumplen el criterio.

- **FR-007**  *(US-7)*: El sistema MUST permitir modificar el filtro aplicado y recalcular el resultado.

- **FR-008**  *(US-7)*: El sistema MUST permitir quitar el filtro y volver a mostrar todos los restaurantes.

- **FR-009**  *(US-9)*: El detalle MUST mostrar las características del restaurante, de modo que se pueda verificar que cumple lo filtrado.

- **FR-010**  *(US-9)*: El detalle MUST mostrar el menú con los precios actualizados.

- **FR-011**: El mapa MUST mostrar únicamente restaurantes con ubicación válida.

- **FR-012**: El filtro MUST aplicarse sobre los marcadores del mapa.

### Key Entities

- **Restaurante (vista pública)**: nombre, descripción, tipo de cocina, rango de precios, restricciones contempladas, ubicación, menú.

- **IndicadorConcurrencia**: restaurante, nivel (bajo | medio | alto), momento de cálculo.

- **UbicaciónComensal**: coordenadas actuales, origen (dispositivo | por defecto).

- **FiltroPrecio**: criterio de precio aplicado, estado (activo | inactivo).

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: mapa con marcadores, distancia y concurrencia; filtro por precio; detalle accesible desde el mapa.

- **Fuera**: listado de restaurantes, filtros por rating, restricciones, horarios y cantidad de comensales, foto de platos, promociones, reservar desde el detalle (US-33, US-35, US-53, US-59, US-61, US-41, US-55, US-11).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El mapa con marcadores se muestra en menos de 3 segundos para el 95% de las cargas.

- **SC-002**: La distancia mostrada difiere en menos de 5% de la distancia real en línea recta.

- **SC-003**: 100% de los restaurantes mostrados con filtro activo cumplen el criterio de precio.

- **SC-004**: Quitar el filtro restablece exactamente el conjunto original de restaurantes.

- **SC-005**: La concurrencia mostrada tiene como máximo un período de actualización de antigüedad.

## Assumptions

- Los datos del restaurante y su menú provienen de la carga realizada por el rol Restaurante.

- La distancia se calcula en línea recta, salvo que se defina otra métrica.

- Solo se muestran restaurantes con cuenta creada y ubicación válida.
