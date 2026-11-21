# Feature Specification: Pagar Pedido Anticipado (Pago Electrónico y Efectivo)

**Created**: 2026-11-18

**Input**: Backlog Servido\! — US-56 (Sprint 6, 3 SP), US-60 (Sprint 6, 2 SP)

**Rol**: Comensal

**Sprint**: 6

**Tests**: requeridos. Cada escenario de aceptación tiene al menos un test automatizado (constitución, principio III).

*(Nota de implementación técnica: La selección base de pago en efectivo y su estado pendiente ya fueron implementados parcialmente en `spec 020-tiempo-pago` (`US-45`). Esta especificación integra ambos medios bajo un mismo ciclo de estados de pago, incorpora el procesamiento del pago electrónico (`US-56`) y asegura la consistencia y cobertura completa de todos los criterios de aceptación de `US-60`.)*

## User Scenarios & Testing *(mandatory)*

### US-56 — Pagar electrónicamente (Prioridad: \-, Estimación: 3\)

Como **Comensal**, quiero pagar mi pedido mediante un medio de pago electrónico, para completar el pago de forma digital.

**Valor**: Permite al comensal abonar por adelantado su pedido (incluyendo la seña correspondiente) desde la aplicación y obtener confirmación inmediata de aprobación.

**Independent Test**: Con un pedido anticipado confirmado pendiente de pago, iniciar el pago electrónico, verificar que se muestra el importe total a abonar (incluyendo la seña si corresponde), completar los datos de tarjeta o billetera virtual y confirmar; verificar que el sistema informa la aprobación, asocia el pago aprobado al pedido y rechaza cualquier intento duplicado de cobro.

**Acceptance Scenarios**:

1. **Dado** que tengo un pedido anticipado confirmado pendiente de pago, **Cuando** inicio el pago electrónico del pedido, **Entonces** el sistema me permite elegir el medio electrónico (tarjeta o billetera virtual) e ingresar los datos requeridos para abonar *(E1)*.  
2. **Dado** que inicié el pago electrónico de mi pedido, **Cuando** reviso la pantalla de pago antes de confirmar la operación, **Entonces** visualizo claramente el importe total a abonar, incluyendo el monto del pedido (con promociones vigentes si aplican) y el pago de la seña correspondiente *(E2)*.  
3. **Dado** que ingresé datos válidos de pago electrónico, **Cuando** el pago se completa correctamente, **Entonces** el sistema me informa que el pago fue aprobado, emite el comprobante correspondiente y deja el pago aprobado asociado al pedido *(E1, E3)*.  
4. **Dado** que estoy realizando un pago electrónico, **Cuando** el pago no se completa correctamente (datos inválidos o rechazo del medio de pago), **Entonces** el sistema me informa el rechazo y el pedido permanece sin pagar, permitiéndome reintentar o cambiar de medio de pago.  
5. **Dado** que un pedido anticipado ya tiene un pago aprobado asociado, **Cuando** intento volver a pagarlo electrónicamente (por reintento, doble clic o desde otra pestaña) o modificar su medio de pago, **Entonces** el sistema rechaza la operación (HTTP 409\) sin generar un segundo cobro e informa que el pedido ya fue abonado *(E4)*.

---

### US-60 — Pagar con efectivo (Prioridad: \-, Estimación: 2\)

Como **Comensal**, quiero seleccionar el pago en efectivo para mi pedido, para abonarlo directamente en el restaurante.

**Valor**: Brinda flexibilidad al comensal que prefiere abonar presencialmente en el local, informándole el monto exacto a pagar y manteniendo el pedido identificado como pendiente de pago hasta su confirmación en el restaurante.

**Independent Test**: Seleccionar «Efectivo» como forma de pago para un pedido anticipado y confirmarlo; verificar que el pedido queda identificado como pendiente de pago (no pagado), que el comensal visualiza el importe total que deberá abonar en el restaurante y que el restaurante ve dicha modalidad en el detalle del pedido.

**Acceptance Scenarios**:

1. **Dado** que estoy configurando o revisando el pago de mi pedido anticipado, **Cuando** selecciono «Efectivo» como forma de pago y confirmo el pedido, **Entonces** el pedido queda registrado con modalidad en efectivo e identificado como pendiente de pago sin ejecutar cobros electrónicos *(reutiliza y extiende US-45)*.  
2. **Dado** que seleccioné el pago en efectivo para mi pedido, **Cuando** reviso la confirmación o el detalle del pedido, **Entonces** puedo visualizar claramente el importe total que deberé abonar en el restaurante (incluyendo descuentos de promociones vigentes si aplican).  
3. **Dado** que un pedido fue confirmado con pago en efectivo, **Cuando** consulto su estado (como comensal o como restaurante en US-36), **Entonces** el pedido no figura como pagado sino como pendiente de pago en el local hasta que el pago en efectivo sea confirmado *(E5)*.  
4. **Dado** que confirmé un pedido con pago en efectivo y aún figura pendiente de pago, **Cuando** entro al detalle del pedido antes de la reserva y decido pagarlo digitalmente, **Entonces** el sistema me permite cambiar a pago electrónico y completarlo según las reglas de US-56.

---

### Edge Cases

- **Checkout electrónico del MVP** *(E1 — propuesta para la PO)*: en cumplimiento de la constitución (principio V, sin integraciones externas pagas innecesarias), el pago electrónico se resuelve mediante un flujo integrado en Servido\! que admite **Tarjeta** (número de 16 dígitos, titular, vencimiento MM/AA y código de seguridad) y **Billetera virtual** (alias/identificador o autorización simulada), permitiendo validar formatos y simular aprobación o rechazo sin procesar dinero real.  
- **Inclusión de la seña e importe total** *(E2 — propuesta para la PO)*: dado que en Servido\! no existe un cobro de seña independiente sin pedido, el pago electrónico del pedido anticipado incluye el concepto de seña dentro del importe total a abonar (mostrando explícitamente en el desglose que el abono cubre el pedido y la seña de la reserva, descontando promociones vigentes de US-48/US-55). Si una promoción del 100% deja el total en `$0,00`, no corresponde cobro electrónico.  
- **Comprobante de pago** *(E3)*: tras aprobarse el pago electrónico, se muestra en pantalla el comprobante con número de operación, fecha/hora local, restaurante, detalle del pedido, descuento aplicado (si hubo), medio utilizado e importe abonado, quedando accesible en el detalle del pedido y enviándose por correo electrónico (`mail.py`).  
- **Invariante de no doble cobro** *(E4 — Constitución, principio III)*: la imposibilidad de asociar más de un pago aprobado a un mismo pedido se garantiza mediante restricción única en PostgreSQL y bloqueo transaccional, devolviendo HTTP 409 Conflict ante intentos duplicados o concurrentes.  
- **Estado pendiente en efectivo y visibilidad en restaurante** *(E5)*: al elegir efectivo, el pedido permanece en estado `pendiente_pago` (`unpaid`) y nunca pasa a `pagado` de forma automática. En la vista de pedido del restaurante (`spec 022`, `US-36`) se muestra claramente «Abona en efectivo en el local» junto con el importe a cobrar, o «Pagado electrónicamente» cuando corresponda.  
- **Compatibilidad con reembolso del restaurante (US-38)**: solo los pedidos que cuenten con un pago electrónico aprobado (`pagado`) generan reembolso si el restaurante cancela la reserva con 45 minutos o más de anticipación (`spec 023`, `US-38`). Los pedidos pendientes en efectivo no generan reembolso.  
- **Pedido o reserva cancelada**: no se puede iniciar ni completar un pago electrónico ni seleccionar efectivo sobre un pedido o reserva ya cancelada o cuya fecha/hora ya pasó.  
- **Privacidad**: un comensal solo puede iniciar pagos, visualizar importes pendientes y consultar comprobantes de sus propios pedidos.  
- **Zona horaria**: las marcas temporales de pago se persisten en UTC y se muestran en `America/Argentina/Buenos_Aires`.

## Decisiones propuestas para la PO

- **E1 — Checkout electrónico simulado del MVP**: formulario integrado en Servido\! para Tarjeta (crédito/débito) y Billetera virtual con validación de datos y simulación de aprobación/rechazo, sin pasarelas externas pagas.  
- **E2 — Inclusión de la seña en el pago del pedido**: al no existir un flujo separado de seña por mesa sin pedido, el pago electrónico del pedido anticipado incluye la seña de la reserva dentro del importe total mostrado y abonado (neto de promociones vigentes).  
- **E3 — Comprobante de pago**: visualización inmediata tras la aprobación, acceso persistente desde el detalle del pedido y envío por correo electrónico al comensal.  
- **E4 — Protección contra doble cobro**: restricción única a nivel de base de datos sobre pagos aprobados por pedido (constitución, principio III).  
- **E5 — Consistencia del pago en efectivo**: seleccionar efectivo mantiene el pedido como pendiente de pago (nunca pagado hasta su confirmación) y expone el importe a cobrar tanto al comensal como al restaurante (`US-36`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-56; E1)*: El sistema MUST permitir al comensal iniciar el pago electrónico de un pedido anticipado confirmado pendiente de pago, eligiendo entre tarjeta o billetera virtual.  
- **FR-002** *(US-56; E2)*: Antes de confirmar el pago electrónico, el sistema MUST mostrar al comensal el importe total a abonar, incluyendo el detalle del pedido, promociones aplicadas (si corresponden) y el concepto de seña incluido.  
- **FR-003** *(US-56; E1, E3)*: Cuando el pago electrónico se completa correctamente, el sistema MUST informar al comensal que el pago fue aprobado, registrar la transacción asociada al pedido en estado aprobado con fecha/hora UTC y emitir el comprobante correspondiente.  
- **FR-004** *(US-56; E1)*: Cuando el pago electrónico no se completa correctamente, el sistema MUST informar el motivo al comensal y mantener el pedido sin pagar.  
- **FR-005** *(US-56; E4; Constitución III)*: El sistema MUST impedir mediante restricción de base de datos y control transaccional que un pedido con pago aprobado vuelva a cobrarse (retornando HTTP 409 Conflict) o cambie su medio de pago.  
- **FR-006** *(US-60)*: El sistema MUST permitir al comensal seleccionar «Efectivo» como forma de pago para su pedido y dejar el pedido identificado como pendiente de pago sin realizar cobros electrónicos.  
- **FR-007** *(US-60)*: El sistema MUST mostrar al comensal el importe total que deberá abonar en el restaurante cuando selecciona pago en efectivo.  
- **FR-008** *(US-60; E5)*: El sistema MUST mantener el pedido en estado pendiente de pago (sin registrarlo como pagado) hasta que el pago en efectivo sea confirmado, reflejando dicho estado tanto al comensal como al restaurante (`US-36`).  
- **FR-009** *(US-56, US-60)*: El sistema MUST permitir que un pedido confirmado con pago en efectivo pase a abonarse electrónicamente antes de la reserva mientras permanezca pendiente de pago y no cancelado.  
- **FR-010** *(US-56, US-60)*: El sistema MUST rechazar operaciones de pago sobre pedidos vacíos, pedidos/reservas canceladas o pasadas, y pedidos pertenecientes a otro comensal.

### Key Entities

- **PagoPedido**: id, `pedido_id` (con restricción de unicidad parcial para registros en estado `approved`), `comensal_id`, `metodo` (`tarjeta` \| `billetera_virtual`), `monto` (Decimal), `incluye_sena` (Boolean, `true`), `estado` (`approved` \| `rejected`), `numero_comprobante` (nullable si `rejected`), `motivo_rechazo` (nullable), `created_at` (UTC).  
- **Pedido anticipado** (integración con `spec 020` / `spec 028`): `medio_pago` (`efectivo` \| `electronico`), `estado_pago` (`pendiente_pago` \| `pagado` \| `reembolsado`).

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: iniciar pago electrónico del pedido; visualizar importe total (incluyendo seña) antes de pagar; informar aprobación o rechazo; asociar pago aprobado al pedido e impedir doble cobro; emitir comprobante; seleccionar pago en efectivo dejando el pedido como pendiente de pago (no pagado); visualizar el importe a abonar en el restaurante.  
- **Fuera**: integración con pasarelas de pago reales de terceros (Mercado Pago, Stripe, etc.), cobro de seña independiente para reservas sin pedido, división de cuenta entre comensales, emisión de factura fiscal AFIP/ARCA, panel de caja/cierre de turno del salón.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 pedidos anticipados registran más de un pago aprobado ante reintentos, doble clic o solicitudes concurrentes.  
- **SC-002**: 100% de los pagos electrónicos aprobados informan la aprobación, quedan asociados al pedido correspondiente y muestran el importe total (con seña incluida) antes de confirmar.  
- **SC-003**: 100% de los pedidos con pago en efectivo permanecen en estado pendiente de pago (sin marcarse como pagados) y muestran al comensal el importe exacto a abonar en el local.  
- **SC-004**: Un comensal completa el pago electrónico o la selección de efectivo de su pedido en menos de 1 minuto.

## Assumptions

- El comensal ya cuenta con una reserva confirmada (`spec 003`) y un pedido anticipado armado o confirmado (`specs 009` y `020`).  
- La selección base de pago en efectivo implementada en `US-45` (`spec 020`) se mantiene compatible y se extiende con los criterios de visualización de importe y estados de esta spec.  
- Idioma de la interfaz y mensajes: español (Argentina).