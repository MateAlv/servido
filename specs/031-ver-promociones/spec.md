# Feature Specification: Ver Promociones y Aplicar Descuento en el Pedido

**Created**: 2026-11-18

**Input**: Backlog Servido\! — US-55 (Sprint 6, 1 SP)

**Rol**: Comensal

**Sprint**: 6

**Tests**: requeridos. Cada escenario de aceptación tiene al menos un test automatizado (constitución, principio III).

Esta spec conecta la gestión de promociones del restaurante (US-48, spec 028\) con la experiencia del comensal en la ficha pública del restaurante (US-9, spec 002\) y en el armado/confirmación de su pedido anticipado (specs 009-pedido-anticipado y 020-Tiempo-pago).

## User Scenarios & Testing *(mandatory)*

### US-55 — Ver promociones (Prioridad: \-, Estimación: 1\)

Como **Comensal**, quiero ver las promociones o descuentos disponibles en el restaurante, para aprovechar ofertas al hacer mi pedido.

**Valor**: El comensal conoce de antemano los beneficios vigentes del restaurante y sus condiciones (días, horarios y monto mínimo de pedido) al explorar su ficha, y ve reflejado automáticamente el ahorro en su pedido anticipado cuando cumple las condiciones.

**Independent Test**: Con un restaurante que tiene una promoción porcentual vigente (ej. 20% de descuento los martes de 12:00 a 15:00), una promoción de monto fijo con pedido mínimo (ej. \$3.000 de descuento en pedidos desde \$10.000), una promoción pausada y una promoción vencida, abrir la ficha pública del restaurante y verificar que solo se muestran las promociones vigentes con sus condiciones (incluyendo el pedido mínimo); luego armar un pedido anticipado dentro de esa vigencia y verificar que la promoción de monto fijo solo se aplica cuando el subtotal alcanza los \$10.000, recalculándose automáticamente al agregar o quitar platos.

**Acceptance Scenarios**:

1. **Dado** que un restaurante tiene promociones vigentes (activas y no vencidas), **Cuando** entro a la ficha pública del restaurante, **Entonces** veo el listado de promociones vigentes con su nombre, beneficio (porcentaje general o monto fijo junto con el importe mínimo de pedido requerido), descripción y condiciones de vigencia (fechas, días y/u horarios) *(V1)*.  
2. **Dado** que un restaurante tiene promociones pausadas o cuya fecha de vigencia ya expiró, **Cuando** entro a la ficha pública del restaurante, **Entonces** esas promociones no se muestran.  
3. **Dado** que estoy armando o revisando mi pedido anticipado para una reserva cuya fecha y horario cumplen la vigencia de una promoción activa del restaurante y el subtotal cumple el monto mínimo (en caso de ser monto fijo), **Cuando** veo el resumen/cuenta del pedido, **Entonces** el sistema refleja el subtotal original, la promoción aplicada, el monto descontado y el total final con el descuento *(V2)*.  
4. **Dado** que tengo un pedido anticipado en armado para una reserva cuya fecha u horario NO cumple con la vigencia de ninguna promoción, o cuyo subtotal aún no alcanza el monto mínimo requerido por una promoción de monto fijo vigente, **Cuando** veo el resumen/cuenta del pedido, **Entonces** no se aplica ese descuento y el total coincide con el subtotal de los platos (o con otra promoción vigente que sí sea aplicable) *(V2, V3)*.  
5. **Dado** que tengo un pedido en armado y modifico los platos del carrito o cambio la hora de llegada (US-43) antes de confirmar, **Cuando** el pedido pasa a cumplir o dejar de cumplir la vigencia o el monto mínimo de una promoción, **Entonces** el descuento y el total del pedido se recalculan automáticamente antes de confirmar *(V3)*.

### Ampliación acordada — 2026-11-22

Se aclara la superficie de visualización del escenario 3 sin cambiar las reglas de elegibilidad,
el cálculo ni el snapshot del pedido confirmado: al pasar a **«Revisar y confirmar»**, antes de
seleccionar el medio de pago, el resumen de cuenta debe consultar y mostrar el subtotal,
promociones aplicadas, descuento y total calculados por el backend. Los cambios posteriores de
platos o de hora de llegada mantienen el guardado automático existente y actualizan ese resumen
antes de confirmar. Esta ampliación es aditiva a US-55 y no incorpora cupones, nuevas reglas de
promoción ni cambios en el comportamiento de confirmación.

---

### Edge Cases

- **Promociones vigentes vs. futuras programadas** *(V1 — propuesta para la PO)*: la ficha del restaurante muestra las promociones activas cuya vigencia está en curso o próxima a iniciar (no vencidas ni pausadas), indicando claramente los días, fechas, horarios y, para promociones de monto fijo, el importe mínimo de pedido requerido (ej. *«\$3.000 de descuento en pedidos desde \$10.000»*).  
- **Pedido en armado por debajo del monto mínimo** *(V2, V3)*: si existe una promoción de monto fijo vigente para la franja de la reserva pero el subtotal actual del carrito es menor a `monto_minimo`, la promoción no se descuenta aún del total; si el comensal agrega platos y alcanza o supera `monto_minimo`, el descuento se aplica automáticamente en el desglose.  
- **Restaurante sin promociones vigentes**: si el restaurante no tiene promociones activas vigentes, la ficha del restaurante se muestra normalmente sin bloques vacíos ni mensajes de error.  
- **Reflejo en el pedido y momento de evaluación** *(V2, V3)*: la aplicabilidad de la promoción se evalúa contra la fecha y hora de la reserva (o la hora de llegada confirmada en US-43, si fue modificada) en `America/Argentina/Buenos_Aires` y contra el subtotal actual del pedido. Como `monto_minimo >= valor_descuento` (spec 028), el total resultante nunca es negativo.  
- **Promoción pausada o modificada mientras el comensal arma el pedido**: si el restaurante pausa o modifica una promoción (por ejemplo, cambia su descuento o monto mínimo) antes de que el comensal confirme su pedido, al recalcular o confirmar el sistema toma el estado vigente de las promociones e informa el total actualizado antes de cerrar la confirmación.  
- **Pedido ya confirmado**: una vez confirmado el pedido anticipado, el descuento aplicado queda fijo y no cambia aunque la promoción expire o se modifique luego de la confirmación.  
- **Acceso público a la ficha**: cualquier comensal (incluso sin haber iniciado sesión, igual que en US-9 y US-15) puede ver las promociones vigentes en la ficha pública del restaurante; para armar un pedido requiere estar autenticado con una reserva activa.

## Decisiones propuestas para la PO

- **V1 — Visibilidad en ficha con condición de mínimo**: mostrar en la ficha del restaurante todas las promociones activas no vencidas (vigentes hoy y programadas a futuro), explicitando sus fechas/días/horarios y, cuando sea de monto fijo, el monto mínimo de pedido requerido; ocultar las pausadas y vencidas.  
- **V2 — Desglose transparente en el pedido**: mostrar en el detalle de cuenta del pedido el subtotal, el nombre de la promoción aplicada (cuando cumple vigencia y monto mínimo), el monto restado y el total final.  
- **V3 — Recálculo dinámico antes de confirmar**: cualquier cambio en los platos del carrito (que modifique el subtotal respecto del `monto_minimo`) o en la hora de llegada antes de confirmar recalcula automáticamente la elegibilidad y el importe de la promoción vigente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-55; V1)*: El sistema MUST mostrar en la ficha pública del restaurante las promociones activas no vencidas, detallando su nombre, tipo/valor de descuento, monto mínimo de pedido (cuando sea de monto fijo) y condiciones de vigencia (fechas, días y/u horarios).  
- **FR-002** *(US-55)*: El sistema MUST NOT mostrar en la ficha pública las promociones pausadas ni las ya vencidas.  
- **FR-003** *(US-55; V2)*: Al visualizar o armar un pedido anticipado cuya reserva cumple con la vigencia de una promoción activa del restaurante y cuyo subtotal iguala o supera su `monto_minimo` (en caso de ser de monto fijo), el sistema MUST aplicar el descuento y mostrar el desglose (subtotal, promoción aplicada, descuento y total a pagar).  
- **FR-004** *(US-55; V3)*: El sistema MUST recalcular automáticamente la elegibilidad y el descuento aplicado cuando se modifican los platos del pedido o la hora de llegada antes de confirmar.  
- **FR-005** *(US-55)*: El sistema MUST reflejar el total ya descontado al momento de seleccionar medio de pago y abonar el pedido (US-56 / US-60).

### Key Entities

- **Promoción** (definida en spec 028): consultada en modo lectura pública por restaurante, incluyendo `tipo_descuento`, `valor_descuento` y `monto_minimo` (nullable).  
- **Resumen / Cuenta del pedido anticipado** (extensión sobre spec 009/020): expone `subtotal`, `promocion_aplicada` (nombre y detalle del beneficio, nullable), `descuento` (Decimal) y `total` (Decimal).

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: visualizar promociones vigentes en la ficha pública del restaurante (con su monto mínimo cuando corresponda); reflejar automáticamente el descuento aplicable en el resumen y total del pedido anticipado; recalcular al cambiar platos u hora de llegada antes de confirmar.  
- **Fuera**: promociones por plato o categoría individual, filtrar restaurantes en el mapa por existencia de promociones (excluido explícitamente en spec 027), notificaciones masivas de marketing sobre nuevas promociones, ingreso manual de códigos de cupón.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% de las promociones mostradas en la ficha pública de un restaurante corresponden a promociones activas y no vencidas de ese local, informando su monto mínimo cuando son de monto fijo.  
- **SC-002**: 100% de los pedidos anticipados elegibles (por vigencia y monto mínimo) reflejan el mismo descuento en la vista de pedido y en el importe final a pagar.  
- **SC-003**: 0 promociones pausadas, vencidas o con monto mínimo no alcanzado se aplican al total de pedidos nuevos.

## Assumptions

- Las promociones son creadas y configuradas por el Responsable del restaurante según la spec 028 (US-48).  
- La fecha y hora vigentes para evaluar promociones se calculan en `America/Argentina/Buenos_Aires`.  
- Idioma de la interfaz y mensajes: español (Argentina).