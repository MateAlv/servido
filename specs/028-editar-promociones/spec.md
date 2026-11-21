# Feature Specification: Crear y Editar Promociones del Restaurante

**Created**: 2026-11-18

**Input**: Backlog Servido! — US-48 (Sprint 6, 2 SP)

**Rol**: Responsable del restaurante

**Sprint**: 6

**Tests**: requeridos. Cada escenario de aceptación tiene al menos un test automatizado (constitución, principio III).

Esta spec incorpora la gestión de promociones y descuentos del restaurante (US-48) sobre el catálogo de platos y pedidos anticipados ya construidos en las specs 005-agregar-plato (US-12), 009-pedido-anticipado (US-17, US-19, US-21) y 017-editar-quitar-plato (US-34), donde ya se dejó previsto que los pedidos confirmados congelan las promociones vigentes al momento de confirmar. Los puntos marcados como *propuesta para la PO* resuelven detalles no especificados en el backlog y quedan sujetos a validación;

## User Scenarios & Testing *(mandatory)*

### US-48 — Editar promociones (Prioridad: -, Estimación: 2)

Como **Responsable del restaurante**, quiero crear o editar promociones o descuentos, para atraer más comensales en días u horarios específicos.

**Valor**: El restaurante puede incentivar reservas y pedidos anticipados en franjas o días de menor demanda sin alterar los precios base de su menú ni afectar los pedidos ya confirmados.

**Independent Test**: Con la cuenta del Responsable, crear una promoción porcentual general con vigencia de fechas y horarios y verificar que queda guardada; crear una promoción de monto fijo indicando el monto mínimo de pedido a partir del cual aplica (ej. $3.000 de descuento en pedidos de $10.000 o más); editar una promoción existente (cambiar porcentaje/monto, mínimo, vigencia o pausarla) y verificar que los cambios se reflejan en el cálculo del total de un pedido anticipado en armado dentro de la vigencia, mientras que un pedido fuera de vigencia, por debajo del monto mínimo o ya confirmado no se ve afectado.

**Acceptance Scenarios**:

1. **Dado** que ingresé como Responsable del restaurante, **Cuando** creo una promoción indicando nombre, tipo de descuento porcentual general (entre 1% y 100%) y su vigencia (fechas, días de la semana y/u horarios), **Entonces** la promoción queda guardada y activa en mi restaurante *(P1, P2)*.
2. **Dado** que ingresé como Responsable del restaurante, **Cuando** creo una promoción indicando un descuento de monto fijo mayor a cero, el monto mínimo de pedido a partir del cual aplica (mayor o igual al descuento) y su vigencia, **Entonces** la promoción queda guardada y activa en mi restaurante *(P1)*.
3. **Dado** que tengo promociones creadas en mi restaurante, **Cuando** accedo a la gestión de promociones, **Entonces** veo el listado con su nombre, tipo y valor de descuento (incluyendo el monto mínimo de pedido si es de monto fijo), vigencia configurada y estado (activa, programada, vencida o pausada).
4. **Dado** que tengo una promoción existente, **Cuando** edito su nombre, valor de descuento, monto mínimo, tipo, vigencia o estado (activar/pausar) y guardo, **Entonces** el sistema actualiza la promoción con los nuevos datos.
5. **Dado** que intento crear o editar una promoción con nombre vacío, valor de descuento menor o igual a cero, porcentaje mayor a 100%, promoción de monto fijo sin monto mínimo válido (menor o igual a cero o menor al valor del descuento), fecha de fin anterior a la de inicio u hora de fin anterior o igual a la de inicio, **Cuando** intento guardar, **Entonces** el sistema rechaza la operación e informa qué dato corregir sin guardar cambios inválidos.
6. **Dado** que existe una promoción activa cuya vigencia coincide con la fecha y horario de una reserva con pedido anticipado en armado y el subtotal cumple la condición de monto mínimo (si es de monto fijo), **Cuando** se calcula el total visible al comensal, **Entonces** el sistema no aplica ni muestra el descuento en esta etapa; el comensal sigue viendo el subtotal y total normales *(P1, P2, P3; alcance visible diferido)*.
7. **Dado** que un pedido anticipado ya fue confirmado, **Cuando** el Responsable edita o pausa una promoción posteriormente, **Entonces** el pedido confirmado no incorpora descuentos ni cambia por promociones de esta etapa; el total continúa siendo el total normal del pedido *(P4)*.

---

### Edge Cases

- **Monto mínimo obligatorio en promociones de monto fijo** *(P1)*: cuando `tipo_descuento = monto_fijo`, es obligatorio definir `monto_minimo` (en ARS), con `monto_minimo > 0` y `monto_minimo >= valor_descuento`. Si el subtotal del pedido anticipado es menor a `monto_minimo`, la promoción no aplica al pedido. Al exigirse `monto_minimo >= valor_descuento`, el total del pedido resultante nunca puede ser negativo. Para promociones porcentuales, `monto_minimo` no aplica (`null`).
- **Alcance general de la promoción (sin selección por plato)** *(P2 — propuesta para la PO)*: tanto las promociones porcentuales como las de monto fijo aplican de manera general sobre el subtotal del pedido anticipado completo del restaurante (no por plato ni categoría individual), manteniendo simple la configuración y evitando inconsistencias si un plato se pausa o elimina del menú.
- **Condiciones de vigencia** *(P3 — propuesta para la PO)*: el backlog menciona «fechas u horarios». Se permite combinar opcionalmente rango de fechas (`fecha_inicio` a `fecha_fin`, inclusive), días de la semana (lunes a domingo) y franja horaria (`hora_inicio` a `hora_fin`), evaluados en `America/Argentina/Buenos_Aires` contra la fecha y hora de la reserva (o la hora de llegada confirmada en US-43). Debe definirse al menos una condición de vigencia (fecha, día u horario) para evitar descuentos permanentes accidentales.
- **Múltiples promociones vigentes simultáneamente** *(P5)*: el comportamiento ante promociones acumulables se configura en dos niveles:
    - **Nivel restaurante (configuración global)**: el Responsable define la política por defecto para todo el restaurante. Las opciones son: (a) aplicar automáticamente la promoción que otorga mayor ahorro monetario al comensal, sin acumular; o (b) acumular todas las promociones elegibles. Esta configuración aplica a todas las promociones salvo que una promoción individual la sobreescriba.
    - **Nivel promoción (override individual)**: al crear o editar una promoción, el Responsable puede indicar si esa promoción participa o no de la acumulación, independientemente de la política global. Por ejemplo, una promo de lanzamiento podría marcarse como “no acumulable” aunque el restaurante tenga habilitada la acumulación por defecto.
    - **Regla de resolución**: con la política «mayor ahorro» se aplica una sola promoción, la que descuenta más dinero. Con la política «acumular», si hay promociones elegibles marcadas como no acumulables, se comparan dos alternativas y se aplica la que más ahorra: la mejor promoción no acumulable sola, o la suma de las acumulables. Entre promociones que empatan se elige la más antigua. Los descuentos se aplican en orden de mayor a menor y el total nunca baja de cero.
- **Pedidos confirmados vs. en armado** *(P4)*: consistente con US-34 (spec 017) y US-40 (spec 024), la edición o desactivación de una promoción solo afecta a pedidos nuevos o aún sin confirmar.
- **Pausar vs. eliminar**: el Responsable puede pausar/desactivar una promoción de forma reversible; la eliminación definitiva queda fuera del alcance del MVP para preservar trazabilidad.
- **Envío doble del formulario**: ante doble clic o reintento al crear una promoción, se crea una única promoción.
- **Aislamiento**: el Responsable solo puede ver, crear y editar promociones de su propio restaurante.
- **Sesión vencida durante el guardado**: no se guarda nada; el Responsable vuelve a ingresar y los datos anteriores permanecen intactos.

## Decisiones propuestas para la PO

- **P1 — Modalidades de descuento y monto mínimo en monto fijo**: porcentaje entero o decimal entre `1` y `100` (general, sin monto mínimo), o monto fijo decimal `> 0` en pesos argentinos (ARS) con **`monto_minimo` obligatorio** (`> 0` y `>= valor_descuento`), aplicándose únicamente cuando `subtotal >= monto_minimo`.
- **P2 — Aplicación general sobre el pedido (sin alcance por plato)**: la promoción aplica al subtotal del pedido anticipado completo del restaurante (coherente con «se aplica al calcular el total del pedido» y con US-55), descartando promociones por plato o categoría individual.
- **P3 — Reglas de vigencia**: el Responsable puede especificar rango de fechas, días de la semana y/o rango horario dentro del día. La evaluación de vigencia se realiza respecto de la fecha y hora de la reserva (o de llegada confirmada) en `America/Argentina/Buenos_Aires`.
- **P4 — Inmutabilidad de pedidos confirmados**: en esta etapa las promociones no se aplican a pedidos de comensales. Cuando se habilite su aplicación, al confirmar deberá registrarse una copia de la promoción aplicada y el monto descontado; ediciones posteriores no deberán alterar pedidos confirmados.
- **P5 — Política ante promociones simultáneas**: el restaurante define si acumula promociones (opción b) o aplica solo la de mayor ahorro (opción a, por defecto). Cada promoción indica si es acumulable. Con acumulación, la mejor promoción no acumulable compite contra la suma de las acumulables y se aplica la que más ahorra; los empates se resuelven por la promoción más antigua.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-48; P1)*: El sistema MUST permitir al Responsable del restaurante crear promociones configurando nombre, descripción opcional y un descuento porcentual general (`1%` a `100%`) o de monto fijo (`> $0`) acompañado obligatoriamente de un monto mínimo de pedido (`monto_minimo >= valor_descuento`).
- **FR-002** *(US-48; P3)*: El sistema MUST permitir definir la vigencia de cada promoción mediante rango de fechas, días de la semana y/o franja horaria en `America/Argentina/Buenos_Aires`.
- **FR-003** *(US-48; P1)*: El sistema MUST validar la consistencia de los datos (nombre obligatorio, valor de descuento válido, `monto_minimo > 0` y `monto_minimo >= valor_descuento` cuando el tipo es monto fijo, `fecha_fin >= fecha_inicio`, `hora_fin > hora_inicio` y al menos un criterio de vigencia) y MUST rechazar valores inválidos informando el motivo.
- **FR-004** *(US-48)*: El sistema MUST permitir al Responsable listar sus promociones (visualizando el monto mínimo cuando corresponda), editar sus atributos y activarlas o pausarlas.
- **FR-005** *(US-48; P1, P2, P5)*: En esta etapa, el sistema MUST permitir configurar y resolver promociones únicamente del lado del restaurante. No MUST exponer reglas ni descuentos al comensal ni aplicarlos a carritos o totales visibles del pedido anticipado.
- **FR-006** *(US-48; P4)*: El sistema MUST mantener sin cambios el total normal de los pedidos anticipados ante cualquier edición o desactivación posterior de una promoción.
- **FR-007** *(US-48)*: El sistema MUST restringir la creación, consulta y edición de promociones exclusivamente al Responsable propietario del restaurante.

### Key Entities

- **Promoción**: id, `restaurante_id`, nombre, descripción (opcional), `tipo_descuento` (`porcentaje` | `monto_fijo`), `valor_descuento` (Decimal), `monto_minimo` (Decimal, obligatorio si `tipo_descuento = monto_fijo` con `monto_minimo >= valor_descuento`; `null` si `tipo_descuento = porcentaje`), `fecha_inicio` (opcional), `fecha_fin` (opcional), `dias_semana` (lista opcional 1–7), `hora_inicio` (local, opcional), `hora_fin` (local, opcional), `activa` (boolean), `acumulable` (boolean, P5).
- **Restaurante** (extensión): `acumular_promociones` (boolean, P5): política por defecto al haber más de una promoción elegible.
- **Pedido anticipado** (extensión sobre spec 009/020): incorpora el `subtotal`, la lista de promociones aplicadas con su nombre y monto descontado, `monto_descuento` y `total_final` congelados al confirmar.

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: crear y editar promociones porcentuales generales o de monto fijo con importe mínimo de pedido; configurar vigencia por fechas, días y/u horarios; activar o pausar promociones; elegir si el restaurante acumula promociones y cuáles son acumulables; aplicar automáticamente los descuentos elegibles al total del pedido anticipado; mantener inmutables los pedidos confirmados.
- **Fuera**: promociones por plato o categoría individual, monto mínimo para promociones porcentuales, cupones o códigos promocionales ingresados manualmente por el comensal, eliminación física de promociones.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% de las promociones creadas o editadas con datos válidos (incluyendo `monto_minimo` en las de monto fijo) persisten correctamente y reflejan su estado de vigencia en `America/Argentina/Buenos_Aires`.
- **SC-002**: 100% de los pedidos anticipados en armado dentro de la vigencia y que cumplen el monto mínimo reflejan el descuento exacto en su total, y 0% de los pedidos por debajo del monto mínimo reciben un descuento fijo no elegible.
- **SC-003**: 0 pedidos ya confirmados ven alterado su total o descuento tras editar o pausar una promoción.

## Assumptions

- El Responsable ya cuenta con un restaurante registrado y verificado (specs 002, 004 y 026).
- Los importes monetarios se almacenan como decimales en pesos argentinos (ARS) y los instantes en UTC con reglas de negocio en `America/Argentina/Buenos_Aires`.
- Idioma de la interfaz y mensajes: español (Argentina).