# Feature Specification: Editar o Quitar Plato

**Created**: 2026-11-02

**Input**: Backlog Servido! — US-34 (Sprint 4, 2 SP). Se apoya en US-12 (agregar plato, Sprint 2) y US-17 (crear pedido, Sprint 3).

**Rol**: Restaurante

**Sprint**: 4

**Tests**: requeridos. Cada escenario de aceptación debe contar con al menos un test automatizado (constitución, principio III).

## User Scenarios & Testing *(mandatory)*

### US-34 — Editar/quitar plato (Prioridad: -, Estimación: 2)

Como **Responsable del restaurante**, quiero editar o quitar un plato del menú, para mantener el menú actualizado según lo que el restaurante realmente ofrece.

**Valor**: El menú refleja la oferta real del restaurante (precios, disponibilidad, platos que ya no se hacen) sin afectar los pedidos ya confirmados.

**Independent Test**: Ingresar como responsable de un restaurante con platos cargados. Editar un plato y verificar que los cambios se reflejan en el menú público. Marcarlo como no disponible y comprobar que deja de mostrarse a los comensales, pero permanece en el menú del restaurante. Volver a habilitarlo y verificar que reaparece. Quitar el plato mediante confirmación y comprobar que desaparece del menú. Finalmente, verificar que un pedido confirmado anteriormente conserva el nombre y el precio originales del plato.

**Acceptance Scenarios**:

1. **Dado** que tengo un plato en el menú, **Cuando** modifico sus datos (nombre, descripción, categoría, precio, foto, restricciones alimenticias y tiempo de preparación) y guardo, **Entonces** los cambios quedan registrados y el menú de los comensales muestra los datos actualizados.
2. **Dado** que edito un plato, **Cuando** dejo vacío el nombre o la categoría, o ingreso un precio que no es mayor a cero, **Entonces** el sistema no guarda los cambios e informa qué debo corregir.
3. **Dado** que un plato está agotado o no se prepara temporalmente, **Cuando** lo marco como no disponible, **Entonces** deja de mostrarse a los comensales, pero permanece en el menú de mi restaurante identificado como no disponible.
4. **Dado** que un plato está marcado como no disponible, **Cuando** vuelvo a marcarlo como disponible, **Entonces** vuelve a mostrarse a los comensales con sus datos vigentes.
5. **Dado** que ya no ofrezco un plato, **Cuando** selecciono la opción de quitarlo, **Entonces** el sistema solicita una confirmación explícita antes de eliminarlo.
6. **Dado** que se me solicitó confirmar la eliminación de un plato, **Cuando** confirmo, **Entonces** el plato desaparece del menú del restaurante y deja de mostrarse a los comensales.
7. **Dado** que se me solicitó confirmar la eliminación de un plato, **Cuando** cancelo la operación, **Entonces** el plato permanece en el menú sin modificaciones.
8. **Dado** que un pedido confirmado incluye un plato que posteriormente fue editado, deshabilitado o eliminado, **Cuando** consulto ese pedido, **Entonces** conserva el nombre, el precio y la cantidad pactados originalmente.

---

### Edge Cases

- **Pedidos confirmados**: conservan los datos de cada plato tal como estaban al confirmarse. Editar, marcar como no disponible o eliminar un plato no modifica el nombre, precio, cantidad ni otros datos históricos del pedido. Las promociones pertenecen a US-48 y quedan fuera del alcance de esta implementación.

- **Pedidos en armado**: si el nombre, precio o tiempo de preparación de un plato cambia antes de confirmar el pedido, el sistema informa el cambio y permite al comensal revisar los datos actualizados antes de confirmar. Si un plato fue eliminado o marcado como no disponible, el sistema lo retira del pedido e informa lo sucedido. Se reutiliza el comportamiento existente de US-17, sin desarrollar un nuevo flujo para el comensal.

- **Plato no disponible vs. eliminado**: marcar un plato como no disponible es una operación reversible. El plato conserva sus datos y permanece visible para el restaurante. Eliminarlo es una operación definitiva desde la interfaz: deja de aparecer en el menú del restaurante y no puede volver a habilitarse.

- **Eliminación definitiva**: quitar un plato es irreversible desde la interfaz del restaurante. Para volver a ofrecerlo, debe crearse nuevamente mediante US-12, pudiendo utilizar el mismo nombre del plato eliminado. La implementación debe preservar los datos históricos de los pedidos confirmados y evitar que los platos eliminados impidan crear nuevos platos con el mismo nombre.

- **Categoría sin platos disponibles**: si una categoría deja de tener platos disponibles porque fueron deshabilitados o eliminados, deja de mostrarse en el menú público.

- **Campos obligatorios**: el nombre y la categoría no pueden estar vacíos y el precio debe ser mayor a cero. Se mantienen las validaciones y restricciones de US-12 para los demás campos.

- **Cambio de precio**: el nuevo precio se aplica desde que se guarda la modificación. No se implementan precios programados ni historial de cambios.

- **Foto**: el restaurante puede reemplazar o quitar la foto de un plato. Si la quita, el plato continúa existiendo y se muestra sin imagen, de acuerdo con el comportamiento del menú público.

- **Tiempo estimado de preparación**: las modificaciones afectan los pedidos que se confirmen posteriormente y no alteran los datos almacenados en pedidos ya confirmados.

- **Ediciones simultáneas**: si el mismo plato se modifica desde dos sesiones, prevalece la última modificación guardada. El sistema informa al restaurante si detecta que el plato cambió desde que abrió el formulario. No se implementa un sistema de bloqueo de edición.

- **Guardado sin cambios**: guardar un plato sin modificar sus datos no produce errores ni cambios innecesarios.

- **Confirmación repetida de eliminación**: si la solicitud de eliminación se repite, el plato no se elimina más de una vez ni se afectan otros registros.

- **Aislamiento entre restaurantes**: cada responsable puede editar, cambiar la disponibilidad o eliminar únicamente los platos de su propio restaurante. El backend debe verificar esta restricción independientemente de la interfaz.

- **Promociones**: la modificación de promociones asociadas a platos corresponde a US-48 y queda fuera del alcance de US-34.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-34)*: El sistema MUST permitir al restaurante modificar los datos de un plato existente: nombre, descripción, categoría, precio, foto, restricciones alimenticias y tiempo estimado de preparación.

- **FR-002** *(US-34)*: Al guardar un plato, el sistema MUST validar que el nombre y la categoría no estén vacíos y que el precio sea mayor a cero. MUST NOT guardar cambios inválidos y MUST informar qué campo debe corregirse. Las demás validaciones MUST ser coherentes con US-12.

- **FR-003** *(US-34)*: El sistema MUST permitir marcar un plato como no disponible, sin eliminarlo, y volver a marcarlo como disponible. El restaurante MUST poder identificar su estado actual.

- **FR-004** *(US-34)*: El sistema MUST permitir eliminar un plato del menú únicamente después de una confirmación explícita del responsable del restaurante. La cancelación MUST conservar el plato sin modificaciones.

- **FR-005** *(US-34)*: Los platos eliminados o marcados como no disponibles MUST dejar de mostrarse en el menú público y MUST NOT poder seleccionarse para nuevos pedidos.

- **FR-006** *(US-34)*: Los cambios guardados en los datos de un plato disponible MUST reflejarse en el menú que consultan los comensales.

- **FR-007** *(US-34)*: La edición, deshabilitación o eliminación de un plato MUST NOT modificar los datos de pedidos ya confirmados, que MUST conservar el nombre, precio y cantidad pactados originalmente.

- **FR-008** *(US-34; integración con US-17)*: Al confirmar un pedido, el sistema MUST validar sus platos contra el menú vigente. Si algún plato fue eliminado, marcado como no disponible o modificado, MUST impedir que se confirme con datos desactualizados y MUST informar los cambios al comensal, permitiéndole revisar el pedido actualizado antes de confirmar. Se MUST reutilizar el comportamiento existente de US-17, sin incorporar un nuevo flujo de gestión del pedido.

- **FR-009** *(US-34)*: El sistema MUST permitir a cada restaurante editar, cambiar la disponibilidad o eliminar únicamente los platos que le pertenecen. MUST rechazar operaciones sobre platos de otros restaurantes.

- **FR-010** *(US-34)*: El sistema MUST dejar de mostrar a los comensales cualquier categoría que no contenga platos disponibles.

### Key Entities

- **Plato**: pertenece a un restaurante y contiene nombre, descripción, categoría, precio, foto, restricciones alimenticias, tiempo estimado de preparación y disponibilidad. Puede encontrarse disponible, no disponible o eliminado. Un plato eliminado deja de formar parte del menú del restaurante.

- **Restaurante**: responsable de administrar únicamente los platos que le pertenecen.

- **Pedido confirmado**: contiene los ítems y sus datos pactados al momento de la confirmación. Estos datos deben conservarse independientemente de las modificaciones posteriores del menú.

- **Pedido en armado**: contiene los platos seleccionados por un comensal antes de confirmar el pedido. Su contenido está sujeto a las validaciones del menú vigente al momento de la confirmación.

## Límites de alcance *(MVP Boundaries)*

**Dentro del alcance**:

- Editar los datos de platos existentes desde la interfaz del restaurante.
- Marcar platos como disponibles o no disponibles.
- Eliminar platos mediante confirmación explícita.
- Mostrar correctamente el estado de disponibilidad en el menú del restaurante.
- Garantizar que los cambios se reflejen en el menú público.
- Preservar los datos históricos de los pedidos confirmados.
- Restringir las operaciones a los platos del restaurante autenticado.
- Incorporar pruebas automatizadas de los escenarios de aceptación.

**Integración con funcionalidades existentes**:

- US-12: reutilizar las reglas de validación y los campos existentes de creación de platos.
- US-15: aprovechar la visualización pública del menú, que ya contempla platos disponibles.
- US-17: aprovechar la validación del menú al confirmar pedidos.
- US-20 y US-22: preservar los datos que se muestran en los pedidos del restaurante.

**Fuera del alcance**:

- Agregar nuevos platos (US-12).
- Rediseñar el menú público (US-15).
- Desarrollar nuevamente el detalle de platos del comensal (US-41).
- Editar promociones (US-48).
- Registrar o administrar la preparación de pedidos (US-40).
- Implementar historial de precios o de modificaciones.
- Edición o eliminación masiva de platos.
- Incorporar sistemas de bloqueo, colaboración en tiempo real o infraestructura adicional.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 90% de los responsables de restaurantes puede editar un plato en menos de 1 minuto.

- **SC-002**: El 100% de los platos marcados como no disponibles o eliminados deja de mostrarse en el menú público.

- **SC-003**: Ningún pedido confirmado modifica sus datos históricos como consecuencia de una edición, deshabilitación o eliminación posterior de un plato.

- **SC-004**: El 100% de las eliminaciones realizadas desde la interfaz requiere confirmación explícita.

- **SC-005**: El 100% de los intentos de modificar o eliminar platos pertenecientes a otro restaurante es rechazado.

## Assumptions

- El responsable del restaurante ya dispone de una cuenta y puede iniciar sesión.
- El restaurante tiene platos cargados mediante US-12.
- El menú del restaurante y el menú público ya existen.
- Los pedidos confirmados conservan los datos de sus ítems, independientemente del estado actual del plato.
- Eliminar un plato es irreversible desde la interfaz, aunque la implementación técnica puede conservar su registro para mantener la integridad referencial.
- Para volver a ofrecer un plato eliminado, el restaurante debe crearlo nuevamente.
- Los pedidos en armado se validan contra el menú vigente al momento de la confirmación.
- Ante ediciones simultáneas, prevalece el último guardado y se informa cuando se detectan modificaciones realizadas desde otra sesión.
- No se incorporan dependencias ni infraestructura adicional salvo que resulten estrictamente necesarias.
- Los textos de la interfaz y los mensajes de error utilizan español de Argentina.