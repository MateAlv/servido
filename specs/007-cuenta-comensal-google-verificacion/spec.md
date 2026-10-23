# Feature Specification: Cuenta del Comensal (Ingreso con Google y verificación del email)

**Created**: 2026-10-23

**Input**: Backlog Servido! — US-52, US-51

**Rol**: Comensal

**Sprint**: 2 (las dos US se adelantan del Sprint 6)

**Tests**: requeridos. Cada escenario de aceptación tiene al menos un test automatizado (constitución, principio III).

## User Scenarios & Testing *(mandatory)*

### US-52 — Ingresar con Google (Prioridad: -, Estimación: 1)

Como **Comensal**, quiero ingresar a Servido! utilizando mi cuenta de Google, para acceder a mis reservas y pedidos sin tener que ingresar mi usuario y contraseña.

**Valor**: Ingresar con un toque, sin recordar otra contraseña, baja la fricción justo antes de reservar desde el celular.

**Independent Test**: Con una cuenta de comensal creada con el email de una cuenta de Google, ingresar con Google y llegar a la cuenta; repetir con una cuenta de Google cuyo email no tiene cuenta en Servido! y con una autenticación de Google cancelada o fallida, y verificar que en esos dos casos no se accede.

**Acceptance Scenarios**:

1. **Dado** que estoy en la pantalla de ingreso del comensal, **Cuando** se muestra, **Entonces** puedo elegir la opción de ingresar con Google, además del ingreso con email y contraseña.

2. **Dado** que existe una cuenta de comensal de Servido! con el mismo email que mi cuenta de Google, **Cuando** Google me autentica correctamente, **Entonces** accedo a mi cuenta de Servido!, igual que si hubiera ingresado con email y contraseña.

3. **Dado** que no existe ninguna cuenta de comensal de Servido! con el email de mi cuenta de Google, **Cuando** Google me autentica correctamente, **Entonces** Servido! me informa que no existe una cuenta asociada, no me da acceso y me ofrece crear una cuenta.

4. **Dado** que la autenticación con Google no se completa (la cancelo, la rechazo o falla), **Cuando** vuelvo a Servido!, **Entonces** no accedo a ninguna cuenta y sigo en la pantalla de ingreso con un aviso de que no se pudo ingresar con Google.

---

### US-51 — Recibir mail de verificación (Prioridad: -, Estimación: 1)

Como **Comensal**, quiero recibir un correo de verificación al registrarme, para validar mi dirección de correo electrónico y completar la creación de mi cuenta.

**Valor**: Confirma que el email es del comensal: el restaurante puede confiar en a quién le prepara un pedido, y nadie puede registrar una cuenta con el email de otra persona.

**Independent Test**: Registrar un comensal, recibir el correo, abrir el enlace y ver la cuenta verificada; repetir con un enlace alterado, uno vencido y uno ya usado, y comprobar que se informa que no se pudo verificar.

**Acceptance Scenarios**:

1. **Dado** que completé correctamente el registro, **Cuando** se crea mi cuenta, **Entonces** Servido! envía un correo de verificación a la dirección que ingresé y me avisa que revise mi correo.

2. **Dado** que recibí el correo de verificación, **Cuando** lo abro, **Entonces** contiene un enlace para verificar mi dirección de correo.

3. **Dado** que abro el enlace de verificación vigente, **Cuando** Servido! lo valida, **Entonces** mi cuenta queda registrada como verificada y se me informa.

4. **Dado** que abro un enlace de verificación inválido o que ya no está vigente, **Cuando** Servido! intenta validarlo, **Entonces** me informa que no se pudo completar la verificación y mi cuenta sigue sin verificar.

5. **Dado** que mi cuenta todavía no está verificada, **Cuando** intento realizar un pedido, **Entonces** Servido! no me lo permite y me indica que primero tengo que verificar mi email.

6. **Dado** que existe una cuenta sin verificar con un email, **Cuando** alguien intenta registrar otra cuenta con ese mismo email, **Entonces** Servido! no crea la nueva cuenta.

---

### Edge Cases

- **Enlace ya usado**: abrir de nuevo el enlace de una cuenta que ya quedó verificada informa que la cuenta ya está verificada; no es un error ni cambia nada.

- **Vigencia del enlace**: el enlace vence a las 24 horas de enviado.

- **Pedir un correo nuevo**: [NEEDS CLARIFICATION: si el enlace venció o el correo no llegó, ¿el comensal puede pedir que se lo reenvíen? Se propone: sí, con una opción "Reenviar mail de verificación" en el aviso de cuenta sin verificar y en la pantalla de enlace vencido; cada reenvío invalida los enlaces anteriores.]

- **Ingreso sin verificar**: el comensal sin verificar puede ingresar y navegar; la única restricción es la del backlog (no puede realizar pedidos). Mientras no verifique, ve un aviso que se lo recuerda.

- **Google con una cuenta sin verificar**: [NEEDS CLARIFICATION: si el comensal ingresa con Google y su cuenta de Servido! con ese email todavía no está verificada, ¿qué pasa? Se propone: ingresa y la cuenta queda verificada, porque Google ya comprobó que el email es suyo.]

- **Email de Google con mayúsculas o distinto formato**: se compara con el mismo criterio que el ingreso con email (sin distinguir mayúsculas ni espacios laterales).

- **Cuenta de restaurante con el email de Google**: el ingreso con Google del comensal solo busca cuentas de comensal; una cuenta de restaurante con ese email no da acceso (el ingreso con Google del restaurante es US-28).

- **El correo no se puede enviar** (dirección inexistente o falla del envío): la cuenta igual se crea, sin verificar, y el comensal puede pedir un correo nuevo si se aprueba la opción de reenvío.

- **Cuentas creadas antes de esta funcionalidad**: se consideran verificadas, para no bloquear a quienes ya se registraron.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-52)*: La pantalla de ingreso del comensal MUST ofrecer la opción de ingresar con Google, además del ingreso con email y contraseña.

- **FR-002** *(US-52)*: Cuando Google autentica correctamente al usuario, el sistema MUST dar acceso a la cuenta de comensal cuyo email coincide con el de la cuenta de Google, con la misma sesión que el ingreso con email y contraseña.

- **FR-003** *(US-52)*: Si no existe una cuenta de comensal con ese email, el sistema MUST informar que no existe una cuenta asociada, MUST NOT dar acceso y MUST NOT crear una cuenta (crear cuenta con Google es US-58).

- **FR-004** *(US-52)*: Si la autenticación con Google no se completa o no es válida, el sistema MUST NOT dar acceso a ninguna cuenta.

- **FR-005** *(US-51)*: Al crearse una cuenta de comensal con email y contraseña, el sistema MUST enviar un correo de verificación a la dirección registrada.

- **FR-006** *(US-51)*: El correo MUST contener un enlace de verificación único para esa cuenta, que venza a las 24 horas.

- **FR-007** *(US-51)*: Al abrir un enlace vigente, el sistema MUST registrar la cuenta como verificada e informarlo.

- **FR-008** *(US-51)*: Ante un enlace inválido o vencido, el sistema MUST informar que no se pudo completar la verificación y MUST NOT cambiar el estado de la cuenta.

- **FR-009** *(US-51)*: Mientras la cuenta no esté verificada, el sistema MUST NOT permitir realizar un pedido.

- **FR-010** *(US-51)*: El sistema MUST NOT crear una cuenta nueva con un email que ya tiene una cuenta, verificada o no (ya lo exige la spec 001, FR-005).

- **FR-011** *(US-51)*: El enlace de verificación MUST NOT permitir ingresar a la cuenta ni revelar sus datos: solo verifica el email.

### Key Entities

- **CuentaComensal** (spec 001): suma si el email está verificado y cuándo se verificó.

- **Verificación de email**: el enlace pendiente de una cuenta, con su vencimiento; deja de servir al usarse, al vencer o al pedirse uno nuevo.

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: ingreso del comensal con Google para cuentas existentes; correo de verificación al registrarse con email y contraseña; verificación por enlace; restricción de pedidos para cuentas sin verificar.

- **Fuera**: crear cuenta con Google (US-58); ingreso con Google del restaurante (US-28); verificación del email del restaurante; recuperar la cuenta (US-31); el pedido en sí (US-17, Sprint 3), del que esta spec solo define la restricción.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un comensal con cuenta ingresa con Google en menos de 15 segundos desde la pantalla de ingreso, sin escribir email ni contraseña.

- **SC-002**: El 100% de los ingresos con Google sin cuenta asociada, cancelados o fallidos terminan sin acceso a ninguna cuenta.

- **SC-003**: El correo de verificación llega dentro de los 2 minutos posteriores al registro.

- **SC-004**: El 0% de los enlaces vencidos, alterados o ajenos verifica una cuenta.

- **SC-005**: El 0% de los pedidos los realiza una cuenta sin verificar.

## Assumptions

- "Cuenta de Servido! asociada" a una cuenta de Google es la cuenta de comensal con el mismo email.

- El correo de verificación sale desde una dirección de Servido! que no recibe respuestas, en español y con la identidad visual de Servido!.

- La restricción de pedidos se prueba cuando exista el pedido (US-17); hasta entonces, el estado de verificación queda disponible para esa US.

- Las cuentas de demo creadas para el Sprint 1 quedan verificadas (ver "Cuentas creadas antes de esta funcionalidad").

- Idioma de la interfaz, los mensajes y el correo: español (Argentina).

- Fechas y horarios en la zona horaria de Argentina (America/Argentina/Buenos_Aires).
