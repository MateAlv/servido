# Feature Specification: Pedido Anticipado (Crear Pedido, Tiempo Estimado y Cuenta)

**Created**: 2026-10-30

**Input**: Backlog Servido! — US-17, US-19, US-21 (decisiones del equipo del 30/10 incorporadas)

**Rol**: Comensal

**Sprint**: 3

**Tests**: requeridos. Cada escenario de aceptación tiene al menos un test automatizado (constitución, principio III).

## User Scenarios & Testing *(mandatory)*

### US-17 — Crear pedido (Prioridad: -, Estimación: 3)

Como **Comensal**, quiero agregar platos a mi pedido, para completar lo que deseo comer.

**Valor**: Es lo que distingue a Servido! de una plataforma que solo reserva: el comensal deja elegida la comida antes de llegar y el restaurante puede tenerla lista para su llegada.

**Independent Test**: Con una reserva confirmada para dentro de unas horas en un restaurante con menú, abrir el pedido desde la confirmación de la reserva, agregar dos platos, subir y bajar la cantidad de uno, quitar el otro y verificar que el listado y el total acompañan cada cambio. Recargar la página y comprobar que el pedido sigue armado. Confirmarlo, volver a abrirlo desde el inicio, cambiarlo y confirmar de nuevo. Por último, con una reserva que empieza en menos de 45 minutos, comprobar que el pedido no se puede crear ni cambiar.

**Acceptance Scenarios**:

1. **Dado** que tengo una reserva confirmada y abrí su pedido, **Cuando** agrego un plato del menú del restaurante, **Entonces** el plato aparece en el listado de mi pedido con la cantidad elegida.
2. **Dado** que no tengo una reserva confirmada propia, **Cuando** quiero armar un pedido (desde el detalle de un restaurante, o abriendo el pedido de una reserva que no existe o es de otra persona), **Entonces** no puedo: el pedido solo se arma desde una reserva mía confirmada.
3. **Dado** que tengo platos en mi pedido, **Cuando** aumento o disminuyo la cantidad de uno, **Entonces** el listado muestra la nueva cantidad.
4. **Dado** que tengo platos en mi pedido, **Cuando** quito uno, **Entonces** desaparece del listado.
5. **Dado** que tengo platos en mi pedido, **Cuando** cambio una cantidad, agrego o quito un plato, **Entonces** el total del pedido se actualiza según el cambio.
6. **Dado** que armé mi pedido, **Cuando** confirmo explícitamente, **Entonces** el pedido queda confirmado y asociado a mi reserva; hasta ese momento no queda registrado, el restaurante no lo ve y la página me lo indica.
7. **Dado** que ya confirmé mi pedido y todavía estoy dentro del plazo, **Cuando** lo vuelvo a abrir, cambio platos o cantidades y confirmo, **Entonces** el pedido confirmado pasa a ser el nuevo.
8. **Dado** que faltan 45 minutos o menos para mi reserva, **Cuando** abro el pedido, **Entonces** no puedo agregar platos ni cambiar o quitar los que tiene; veo el pedido confirmado, si lo hay, sin opciones para modificarlo.
9. **Dado** que estaba armando o cambiando el pedido y mientras tanto venció el plazo, **Cuando** intento confirmar, **Entonces** el sistema no acepta el cambio, me informa que ya no se puede modificar y me muestra el pedido confirmado que quedó, si lo hay.

---

### US-19 — Ver tiempo estimado (Prioridad: -, Estimación: 1)

Como **Comensal**, quiero conocer el tiempo estimado de preparación de mi pedido, para organizar mi llegada al restaurante.

**Valor**: Le da al comensal una referencia de cuánto tarda la cocina, que es la base de la coordinación entre su llegada y la preparación.

**Independent Test**: Armar un pedido con un plato de 15 minutos y otro de 25, y verificar que el tiempo estimado es de 25 minutos. Quitar el de 25 y comprobar que pasa a 15. Armar otro pedido solo con platos sin tiempo de preparación cargado y verificar que no se muestra ningún tiempo.

**Acceptance Scenarios**:

1. **Dado** que mi pedido tiene platos con tiempo de preparación, **Cuando** lo veo, mientras lo armo o ya confirmado, **Entonces** se muestra el tiempo estimado de preparación del pedido.
2. **Dado** que mi pedido tiene varios platos con tiempo de preparación, **Cuando** se calcula el tiempo estimado, **Entonces** corresponde a los platos incluidos: es el tiempo del plato más lento *(P2)*.
3. **Dado** que estoy armando o cambiando el pedido, **Cuando** agrego o quito platos antes de confirmar, **Entonces** el tiempo estimado se actualiza según los cambios.
4. **Dado** que ningún plato de mi pedido tiene tiempo de preparación cargado, **Cuando** veo el pedido, **Entonces** no se muestra un tiempo estimado ni se avisa que falta *(P2)*.

---

### US-21 — Ver cuenta y total a pagar (Prioridad: -, Estimación: 1)

Como **Comensal**, quiero ver el resumen de cuenta y el total a pagar, para saber cuánto debo abonar.

**Valor**: El comensal sabe cuánto va a pagar antes de llegar y puede revisar cada ítem.

**Independent Test**: Armar un pedido con dos unidades de un plato de $7.500 y una de un plato de $18.500, abrir el detalle de la cuenta y verificar cada ítem (plato, cantidad, precio unitario y subtotal: $15.000 y $18.500) y el total de $33.500 con la aclaración de que incluye impuestos.

**Acceptance Scenarios**:

1. **Dado** que mi pedido tiene platos, **Cuando** abro el detalle de la cuenta, **Entonces** veo el valor de cada ítem.
2. **Dado** que veo la cuenta, **Cuando** miro el total, **Entonces** incluye todos los platos y los impuestos aplicables: los precios del menú son precios finales con impuestos incluidos, y el total lo aclara *(P3)*.
3. **Dado** que abrí el detalle de la cuenta, **Cuando** miro un ítem, **Entonces** su desglose muestra el plato, la cantidad, el precio unitario y el subtotal, y los subtotales suman el total.

---

### Edge Cases

Todas las decisiones de esta sección son del equipo (30/10) y falta que la PO las valide. La justificación de cada una está en `research.md`.

- **Cuándo queda registrado el pedido** *(P1)*: mientras el comensal arma el pedido, los platos quedan guardados en ese navegador y sobreviven a recargar la página. Nada se registra hasta «Confirmar pedido», y mientras haya cambios sin confirmar la página indica que el restaurante todavía no los ve. El restaurante solo ve pedidos confirmados (US-20).
- **Plazo para cambiarlo** *(P1, P6)*: un pedido confirmado se puede volver a abrir, cambiar y confirmar de nuevo mientras falten más de 45 minutos para el horario de inicio de la reserva. La página muestra hasta qué hora se puede cambiar. El plazo vale para crear, cambiar y quitar: una reserva que empieza en 45 minutos o menos no admite pedido nuevo, y la confirmación de la reserva no ofrece armarlo.
- **Un pedido por reserva** *(P5)*: cada reserva tiene como máximo un pedido, para todo el grupo. Agregar platos a una reserva que ya tiene pedido es cambiar ese pedido.
- **Hora de llegada** *(P7)*: hasta que exista US-43 (Sprint 5), la hora de llegada es el horario de inicio de la reserva. El plazo de 45 minutos se cuenta siempre desde el inicio de la reserva.
- **Nombre, precio y tiempo de cada plato** *(P8)*: quedan fijos en el pedido al confirmarlo, como los indicaba el menú en ese momento. Si el restaurante cambia después un plato, el pedido confirmado no cambia (como pide US-40 para los tiempos). Al confirmar un cambio, todos los platos toman los valores vigentes, que son los que el comensal ve antes de confirmar.
- **El menú cambió mientras armaba el pedido** *(P9)*: si al confirmar algún plato ya no está en el menú, o cambió su nombre, su precio o su tiempo, el pedido no se confirma. Se le muestra qué cambió (por ejemplo, «Cambió el precio de Provoleta: $7.500 → $8.000») y el pedido actualizado, y el comensal decide si confirma.
- **Cantidades** *(P10)*: de 1 a 20 unidades por plato, y hasta 50 platos distintos por pedido. Disminuir desde 1 equivale a quitar el plato.
- **Quitar todos los platos** *(P11)*: si el comensal quita todos los platos de un pedido confirmado y confirma, la reserva queda sin pedido; antes se le pide que lo confirme, aclarando que la reserva sigue en pie. Un pedido que nunca se confirmó no se puede confirmar vacío.
- **Reserva cancelada o pasada** *(P12)*: no admite pedido nuevo ni cambios. Si una reserva con pedido se cancela, el pedido queda cancelado con ella, sin borrarse (lo informa US-18, escenario 3). La cancelación en sí es de US-25 y US-38.
- **Comensal sin email verificado** *(P13, lectura de la spec 007, US-51 S5)*: puede armar el pedido, pero no confirmarlo. Al intentarlo se le indica que primero verifique su email, con la opción de reenviar el mail, y sus platos quedan guardados.
- **Restaurante sin menú** *(P14)*: si el restaurante no tiene platos cargados, la reserva no ofrece armar un pedido, sin avisar que falta el menú.
- **Dos pestañas o dos dispositivos** *(P1)*: el pedido en armado es de cada navegador. Si el comensal confirma desde dos lugares, queda el último confirmado. Si el pedido confirmado cambió desde otro lugar después de empezar a armar, al volver a abrirlo se muestra el confirmado y se descarta lo que se estaba armando.
- **Reserva de otro comensal**: nadie más que el comensal que reservó puede ver o cambiar su pedido desde las pantallas del comensal. Un responsable de restaurante no puede crear ni cambiar pedidos; los ve desde sus propias US (US-20, US-36).
- **Sesión vencida al confirmar**: se le pide ingresar de nuevo y vuelve al pedido con los platos que había elegido.
- **Tiempo estimado con datos parciales** *(P2)*: los platos sin tiempo de preparación no cuentan para el cálculo, así que con datos parciales el estimado es el del plato más lento que sí tiene tiempo. La cantidad de unidades no cambia el tiempo.
- **Impuestos** *(P3)*: en Argentina el precio al consumidor final ya incluye los impuestos, así que el total es la suma de los subtotales y no se agrega ni se discrimina ningún impuesto.
- **Pagos**: todavía no existen. Un pedido no tiene medio de pago ni estado de pago hasta US-45, US-56 y US-60; las reglas para cambiar o quitar un pedido ya pagado las definen esas US.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-17)*: El sistema MUST permitir armar un pedido solo desde una reserva confirmada del propio comensal, con platos del menú del restaurante de esa reserva.
- **FR-002** *(US-17)*: El sistema MUST permitir agregar platos, aumentar y disminuir su cantidad (de 1 a 20 unidades, hasta 50 platos distintos) y quitarlos, mostrando en todo momento el listado con la cantidad de cada plato.
- **FR-003** *(US-17)*: El sistema MUST conservar el pedido en armado si el comensal recarga la página en el mismo navegador, y MUST indicar mientras haya cambios sin confirmar que el restaurante todavía no los ve.
- **FR-004** *(US-17)*: El sistema MUST registrar el pedido solo cuando el comensal lo confirma explícitamente, y MUST NOT mostrarle al restaurante un pedido que no fue confirmado.
- **FR-005** *(US-17)*: El sistema MUST permitir cambiar un pedido confirmado y confirmarlo de nuevo, o dejar la reserva sin pedido quitando todos los platos, mientras falten más de 45 minutos para el inicio de la reserva, y MUST mostrar hasta qué hora se puede hacer.
- **FR-006** *(US-17)*: El sistema MUST NOT aceptar un pedido nuevo ni cambios cuando faltan 45 minutos o menos para el inicio de la reserva, ni cuando la reserva está cancelada o ya pasó, y MUST informarlo al comensal.
- **FR-007** *(US-17)*: El sistema MUST guardar, con cada plato del pedido confirmado, el nombre, el precio y el tiempo de preparación que tenía en el menú al confirmar.
- **FR-008** *(US-17)*: Si al confirmar algún plato ya no está en el menú o cambió su nombre, su precio o su tiempo, el sistema MUST NOT confirmar y MUST mostrarle al comensal qué cambió y el pedido actualizado antes de que confirme.
- **FR-009** *(US-17, spec 007 US-51 S5)*: El sistema MUST NOT permitir confirmar un pedido a un comensal con el email sin verificar, y MUST indicarle que verifique su email sin perder los platos elegidos.
- **FR-010** *(US-17)*: El sistema MUST permitir que, entre los comensales, solo el que hizo la reserva vea y cambie su pedido.
- **FR-011** *(US-17)*: El sistema MUST ofrecer armar o ver el pedido desde la confirmación de la reserva y desde una lista de las próximas reservas del comensal en su inicio, salvo que la reserva no lo admita (no tiene pedido y ya no se puede crear, o el restaurante no tiene menú).
- **FR-012** *(US-19)*: El sistema MUST mostrar como tiempo estimado de preparación del pedido el mayor tiempo de preparación entre sus platos, y MUST actualizarlo con cada cambio del pedido.
- **FR-013** *(US-19)*: Si ningún plato del pedido tiene tiempo de preparación, el sistema MUST NOT mostrar un tiempo estimado ni un aviso de que falta.
- **FR-014** *(US-21)*: El sistema MUST mostrar el total del pedido, actualizado con cada cambio, aclarando que incluye impuestos.
- **FR-015** *(US-21)*: El sistema MUST permitir abrir el detalle de la cuenta con cada ítem del pedido: plato, cantidad, precio unitario y subtotal.

### Key Entities

- **Pedido**: los platos que el comensal pide para una reserva, para todo el grupo. Pertenece a una sola reserva y una reserva tiene como máximo uno. Registra el momento de su última confirmación. Su estado se deriva de la reserva (confirmado mientras la reserva lo está, cancelado si la reserva se cancela), y su total y su tiempo estimado se calculan a partir de sus platos. La hora de llegada es la de la reserva.
- **Ítem del pedido**: un plato del pedido con su cantidad (1 a 20), y el nombre, el precio unitario y el tiempo de preparación que tenía el plato al confirmar. Su subtotal es cantidad por precio unitario.
- **Plato** (specs 006 y 007-agregar-plato): nombre, precio y tiempo de preparación opcional, del menú del restaurante.
- **Reserva** (spec 005): el pedido toma de ella el restaurante, el comensal, el horario de llegada y si está confirmada.

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: armar, confirmar y cambiar el pedido de una reserva hasta 45 minutos antes; tiempo estimado de preparación del pedido; cuenta con desglose por ítem y total; el acceso al pedido desde la confirmación de la reserva y desde una lista mínima de próximas reservas en el inicio del comensal, con «Ver pedido» para las que ya tienen uno.
- **Superposiciones con otras US**:
  - **US-15** (Ver platos y precios, Sprint 3) define cómo ve el comensal el menú. La página del pedido muestra el mismo menú agrupado por categoría. Si US-15 agrega disponibilidad (stock), un plato no disponible no se puede agregar y, al confirmar, cuenta como un plato que ya no está en el menú (P9).
  - **US-47** (Ver pedido asociado, Sprint 5): «Ver pedido» desde la lista del inicio ya cumple ver los platos y cantidades del pedido de una reserva próxima. A US-47 le queda el acceso desde el detalle de la reserva activa (US-23) y el aviso cuando la reserva no tiene pedido.
- **Fuera**:
  - Lo que ve el restaurante, que se especifica en sus propias US: pedidos del turno (US-20), pedido asociado a una reserva (US-36) y estado de pago (US-22).
  - Elegir otra hora de llegada (US-43).
  - El tiempo de preparación cargado por el restaurante para un pedido (US-40).
  - El detalle de la reserva activa (US-23).
  - Medio de pago, pago y seña (US-45, US-56, US-60).
  - Cancelar la reserva y reembolsar (US-25, US-38).
  - Aclaraciones por plato, propina y filtrar el menú.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un comensal con una reserva confirmada arma y confirma un pedido de 3 platos en menos de 2 minutos.
- **SC-002**: 0 pedidos creados o modificados con 45 minutos o menos para el inicio de su reserva.
- **SC-003**: En el 100% de los pedidos, el total mostrado es igual a la suma de los subtotales, y cada subtotal es la cantidad por el precio unitario, también con precios con centavos.
- **SC-004**: En el 100% de los pedidos con algún plato con tiempo de preparación, el tiempo estimado es igual al del plato más lento.
- **SC-005**: El restaurante nunca ve un pedido que el comensal no confirmó, y un pedido confirmado no cambia si después el restaurante cambia un plato.

## Assumptions

- Los platos y sus tiempos de preparación los carga el restaurante (spec 007-agregar-plato, US-12). El tiempo de preparación es opcional y en minutos.
- Hoy todos los platos del menú se pueden pedir: no existe la disponibilidad por plato (ver US-15 en los límites de alcance).
- La lista de próximas reservas del inicio muestra solo las reservas confirmadas del comensal que todavía no empezaron, con el restaurante, la fecha, el horario, la cantidad de personas y si tienen pedido.
- Idioma de la interfaz y de los mensajes: español (Argentina).
- Fechas y horarios en la zona horaria de Argentina (America/Argentina/Buenos_Aires).
