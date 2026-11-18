# Feature Specification: Estimar preparación de pedidos anticipados

**Created**: 2026-11-16

**Input**: Backlog Servido! — US-40

**Rol**: Restaurante

**Sprint**: 5

**Tests**: requeridos. Cada escenario de aceptación tiene al menos un test automatizado.

## User Scenarios & Testing *(mandatory)*

### US-40 — Registrar tiempo estimado de preparación de pedido anticipado (Prioridad: -, Estimación: 2 SP)

Como **Responsable del restaurante**, quiero registrar el tiempo estimado de preparación de los platos, para que Servido! coordine los pedidos con la llegada de los comensales sin sobrecargar la cocina.

**Valor**: El restaurante puede planificar la preparación y el comensal recibe una estimación coherente de cuánto tardará su pedido.

**Independent Test**: Con un restaurante autenticado y platos disponibles, registrar y modificar sus tiempos de preparación, armar un pedido nuevo y comprobar que el tiempo total corresponde al plato más lento. Confirmar un pedido, modificar luego el menú y verificar que el pedido confirmado conserva los tiempos que tenía al confirmarse, mientras los pedidos nuevos usan los valores actualizados.

**Acceptance Scenarios**:

1. **Dado** que un restaurante tiene un plato disponible, **Cuando** registra un tiempo de preparación mayor a cero, **Entonces** el plato queda guardado con ese tiempo y puede visualizarlo en el menú.
2. **Dado** que un plato tiene un tiempo de preparación registrado, **Cuando** el restaurante lo modifica por otro valor mayor a cero, **Entonces** el nuevo valor se muestra para los pedidos nuevos.
3. **Dado** que el restaurante intenta registrar un tiempo cero, negativo o inválido, **Cuando** guarda el plato, **Entonces** el sistema rechaza el valor e informa que debe ser un número entero mayor a cero.
4. **Dado** que un pedido nuevo incluye varios platos con tiempos registrados, **Cuando** consulto el pedido, **Entonces** el tiempo estimado total es el mayor tiempo de preparación de sus platos.
5. **Dado** que un pedido confirmado tenía tiempos de preparación registrados, **Cuando** el restaurante modifica luego los tiempos del menú, **Entonces** el pedido confirmado conserva los valores y el tiempo total que tenía al confirmarse.
6. **Dado** que un comensal consulta el estado de su pedido, **Cuando** el pedido tiene un tiempo estimado, **Entonces** puede visualizar ese tiempo en español.

### Edge Cases

- **Plato sin tiempo**: un plato sin tiempo registrado se muestra sin estimación y no aporta minutos al cálculo del pedido; el sistema informa que falta completar el tiempo.
- **Pedido con mezcla de platos**: el tiempo total es el mayor de los tiempos disponibles, no la suma.
- **Modificación de plato sin pedidos confirmados**: el nuevo valor se utiliza inmediatamente en los pedidos nuevos.
- **Pedido confirmado inmutable**: modificar o quitar el tiempo del plato no altera los datos ya confirmados.
- **Restaurante ajeno**: un restaurante no puede modificar ni consultar tiempos de platos pertenecientes a otro restaurante.
- **Valor fuera de rango**: valores no enteros o mayores al máximo admitido por el sistema se rechazan con un mensaje claro.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-40)*: El sistema MUST permitir al responsable registrar el tiempo estimado de preparación de un plato de su restaurante.
- **FR-002** *(US-40)*: El sistema MUST permitir modificar el tiempo estimado de preparación de un plato de su restaurante.
- **FR-003** *(US-40)*: El tiempo de preparación MUST ser un número entero mayor a cero.
- **FR-004** *(US-40)*: El sistema MUST mostrar el tiempo estimado registrado junto al plato cuando corresponda.
- **FR-005** *(US-40)*: El sistema MUST calcular el tiempo total de un pedido nuevo usando el mayor tiempo de preparación de los platos que incluye.
- **FR-006** *(US-40)*: El sistema MUST informar al comensal el tiempo estimado total de su pedido cuando exista.
- **FR-007** *(US-40)*: Los tiempos y el total de los pedidos confirmados MUST conservar el valor vigente al momento de confirmarlos.
- **FR-008** *(US-40)*: El sistema MUST impedir que un restaurante modifique o consulte los platos de otro restaurante.
- **FR-009** *(US-40)*: El sistema MUST rechazar valores inválidos o fuera de rango sin modificar el tiempo previamente registrado.

### Key Entities

- **Plato**: nombre, precio, disponibilidad y tiempo estimado de preparación declarado por el restaurante.
- **Pedido**: reserva asociada, platos, cantidades y tiempo estimado total.
- **Ítem del pedido**: plato, cantidad y tiempo de preparación conservado al confirmar.

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: registrar y modificar tiempos de preparación de platos; mostrar esos tiempos; calcular el total de pedidos nuevos; conservar los datos de pedidos confirmados; mostrar la estimación al comensal.
- **Fuera**: medir tiempos reales de cocina, iniciar o monitorear la preparación, notificar retrasos, sumar tiempos en paralelo, pagos, cancelaciones y cambios de pedidos ya confirmados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los valores válidos registrados por el restaurante se refleja en el plato correspondiente.
- **SC-002**: El 100% de los pedidos nuevos con tiempos registrados muestra como total el mayor tiempo de sus platos.
- **SC-003**: El 100% de los pedidos confirmados conserva sus tiempos aunque el menú cambie después.
- **SC-004**: El 100% de los valores cero, negativos, no enteros o fuera de rango se rechaza sin alterar el valor anterior.
- **SC-005**: El 100% de los pedidos con estimación disponible muestra esa información al comensal.
- **SC-006**: Ningún restaurante puede modificar o consultar tiempos de platos de otro restaurante.

## Assumptions

- El tiempo de preparación se registra por plato y se copia al ítem del pedido al confirmarlo.
- El total del pedido se interpreta como el máximo tiempo de sus platos, porque se preparan en paralelo.
- Un plato sin tiempo puede seguir publicado, pero el pedido muestra una advertencia de estimación incompleta.
- El restaurante ya dispone de las pantallas de alta y edición de platos.
- Idioma de la interfaz y de los mensajes: español (Argentina).
- Fechas y horarios en la zona horaria de Argentina (America/Argentina/Buenos_Aires).
