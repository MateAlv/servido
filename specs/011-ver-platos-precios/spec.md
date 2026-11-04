# Feature Specification: Ver platos y precios

**Created**: 2026-11-02

**Input**: Backlog Servido! — US-15

**Rol**: Comensal

**Sprint**: 3

**Tests**: requeridos. Cada escenario de aceptación tiene al menos un test automatizado.

## User Scenarios & Testing *(mandatory)*

### US-15 — Ver platos y precios (Prioridad: -, Estimación: 2 SP)

Como **Comensal**, quiero ver los platos disponibles con sus precios, para saber qué puedo elegir según mi presupuesto y gusto.

**Valor**: El comensal puede conocer la oferta actual del restaurante antes de reservar y decidir qué le interesa comer.

**Independent Test**: Con un restaurante reservable que tenga platos de varias categorías, algunos no disponibles y al menos uno con foto, consultar su detalle. Verificar que solo aparecen los disponibles, que muestran nombre, descripción y precio actualizados, que las categorías están agrupadas en el orden acordado y que al seleccionar el plato con foto se abre su detalle.

**Acceptance Scenarios**:

1. **Dado** un restaurante con platos disponibles, **Cuando** consulto el menú, **Entonces** cada plato muestra su nombre, descripción y precio actualizado.
2. **Dado** que hay platos disponibles y sin stock, **Cuando** consulto el menú, **Entonces** solo se muestran los platos disponibles.
3. **Dado** que hay platos de distintas categorías, **Cuando** consulto el menú, **Entonces** aparecen agrupados en el orden Entradas, Principales, Postres y Bebidas; dentro de cada categoría se ordenan por nombre.
4. **Dado** un plato con foto cargada, **Cuando** lo selecciono, **Entonces** puedo ver su foto y sus datos; un plato sin foto muestra que no tiene foto.

### Edge Cases

- **Restaurante sin platos disponibles**: se omite la sección Menú, sin anunciar que falta.
- **Todos los platos sin stock**: el restaurante no se considera con menú público y el menú devuelto queda vacío.
- **Foto que no carga**: el detalle muestra el recuadro «Sin foto» para que el resto de los datos siga siendo utilizable.
- **Disponibilidad inicial**: todo plato nuevo queda disponible por defecto.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-15)*: El sistema MUST mostrar públicamente solo platos marcados como disponibles.
- **FR-002** *(US-15)*: El sistema MUST mostrar nombre, descripción y precio vigente de cada plato disponible.
- **FR-003** *(US-15)*: El sistema MUST agrupar platos por las categorías Entradas, Principales, Postres y Bebidas, en ese orden, y ordenar cada grupo por nombre.
- **FR-004** *(US-15)*: El sistema MUST permitir seleccionar un plato para consultar su foto, descripción, precio y restricciones alimenticias.
- **FR-005** *(US-15)*: El sistema MUST considerar disponible por defecto un plato nuevo.
- **FR-006** *(US-15)*: El sistema MUST omitir el menú público y el indicador de menú cuando no haya platos disponibles.

### Key Entities

- **Plato**: oferta de comida de un restaurante; incluye nombre, descripción, categoría, precio, foto opcional, restricciones alimenticias y disponibilidad.
- **Menú público**: conjunto de platos disponibles de un restaurante, agrupado por categoría para el comensal.

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: disponibilidad pública, listado agrupado, precios actuales y detalle visual de un plato con foto opcional.
- **Fuera**: pantalla para marcar un plato sin stock (US-34), cantidades y armado del pedido (US-17, US-19, US-21), filtros por platos o restricciones.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En cada consulta pública, el 100% de los platos mostrados son disponibles y contienen nombre y precio vigente.
- **SC-002**: En un menú con las cuatro categorías, el 100% de las categorías y platos se presentan en el orden definido.
- **SC-003**: Un comensal puede abrir el detalle de un plato con foto y verla, y puede cerrar el detalle con botón, Escape o clic fuera.

## Assumptions

- La disponibilidad es binaria y no representa una cantidad de stock; la edición queda para US-34.
- Las etiquetas de restricciones alimenticias existentes se muestran como Sin TACC, Vegetariano y Vegano.
- Las decisiones D1–D4 (disponibilidad booleana, filtrado público, orden y fixtures sin cambios) son propuestas del equipo y **falta que la PO las valide**.
- Las fotos existentes se sirven desde la URL pública ya configurada por la aplicación.
- Idioma de la interfaz y de los mensajes: español (Argentina).
- Fechas y horarios en la zona horaria de Argentina (America/Argentina/Buenos_Aires).
