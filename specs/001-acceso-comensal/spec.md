# Feature Specification: Acceso del Comensal (Registro e Ingreso)

**Created**: 2026-10-13

**Input**: Backlog Servido! — US-1, US-3

**Rol**: Comensal

## User Scenarios & Testing *(mandatory)*

### US-1 — Completar formulario de registro (Prioridad: -, Estimación: 3)

Como **Comensal**, quiero completar un formulario con mis datos, para crear una cuenta en Servido!.

**Valor**: Sin cuenta el comensal no puede identificarse; es la puerta de entrada al rol.

**Independent Test**: Abrir el formulario y enviarlo vacío, con datos inválidos y con datos válidos; solo el último caso debe permitir continuar con la creación de la cuenta.

**Acceptance Scenarios**:

1. **Dado** que accedo al registro, **Cuando** se muestra el formulario, **Entonces** el email y la contraseña aparecen identificados como obligatorios.

2. **Dado** que dejé algún campo obligatorio vacío, **Cuando** intento continuar, **Entonces** el sistema no me deja avanzar y señala qué campo falta.

3. **Dado** que ingresé un email con formato inválido o una contraseña que no cumple los requisitos, **Cuando** intento continuar, **Entonces** el sistema me informa qué dato debo corregir y conserva lo ya ingresado.

4. **Dado** que todos los datos obligatorios están completos y son válidos, **Cuando** continúo, **Entonces** puedo seguir con el proceso de creación de la cuenta y esta queda creada.

---

### US-3 — Ingresar usuario y contraseña (Prioridad: -, Estimación: 1)

Como **Comensal**, quiero ingresar a Servido! con mi usuario y contraseña, para acceder a mi cuenta y gestionar mis reservas y pedidos.

**Valor**: Permite volver a la cuenta creada y es requisito de toda acción posterior del comensal.

**Independent Test**: Intentar ingresar con campos vacíos, con formato inválido, con credenciales incorrectas y con credenciales correctas; verificar además que la contraseña se oculte al tipear.

**Acceptance Scenarios**:

1. **Dado** que quiero ingresar, **Cuando** abro la pantalla de ingreso, **Entonces** el sistema me solicita mis credenciales de acceso.

2. **Dado** que dejé vacío o con formato inválido el email o la contraseña, **Cuando** intento ingresar, **Entonces** el sistema no realiza el intento e indica qué completar o corregir.

3. **Dado** que ingresé credenciales válidas, **Cuando** envío el formulario, **Entonces** accedo correctamente a mi cuenta.

4. **Dado** que ingresé credenciales incorrectas, **Cuando** envío el formulario, **Entonces** el sistema informa que no se pudo iniciar sesión, sin indicar cuál de los datos es incorrecto.

5. **Dado** que escribo mi contraseña, **Cuando** tipeo, **Entonces** no se muestra en texto visible.

---

### Edge Cases

- **Email ya registrado** al crear la cuenta: el backlog no lo define para el comensal. [NEEDS CLARIFICATION: se propone informar que ya existe una cuenta asociada y no crear un duplicado, sin revelar más datos.]

- **Requisitos de contraseña**: no están definidos. [NEEDS CLARIFICATION: se propone mínimo 8 caracteres con al menos una letra y un número.]

- **"Usuario" en el ingreso**: US-3 pide "email y nombre de usuario", pero el registro (US-1) solo captura email y contraseña. [NEEDS CLARIFICATION: se asume que el usuario es el email.]

- Email con mayúsculas/minúsculas o espacios laterales: se normaliza antes de validar y comparar.

- Intentos de ingreso fallidos repetidos: el backlog no define bloqueo; queda fuera de alcance.

- Envío doble del formulario de registro: no debe crear dos cuentas.

- Contraseña con caracteres especiales o muy larga: se acepta hasta el máximo definido sin truncarse silenciosamente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**  *(US-1)*: El formulario de registro MUST solicitar el email y la contraseña, identificándolos como obligatorios.

- **FR-002**  *(US-1)*: El sistema MUST validar que los campos obligatorios estén completos y en estado válido antes de permitir continuar.

- **FR-003**  *(US-1)*: Si algún dato no es válido, el sistema MUST informar cuál es y MUST conservar los datos ingresados para su corrección.

- **FR-004**  *(US-1)*: Si los datos son válidos, el sistema MUST permitir continuar con la creación de la cuenta y MUST crearla una única vez.

- **FR-005**  *(US-1)*: El sistema MUST NOT crear una cuenta cuando el email ya está asociado a otra cuenta de comensal [NEEDS CLARIFICATION: ver Edge Cases].

- **FR-006**  *(US-3)*: El sistema MUST solicitar las credenciales de acceso (email y contraseña).

- **FR-007**  *(US-3)*: El sistema MUST exigir que los datos estén completos y en formato válido antes de intentar el ingreso.

- **FR-008**  *(US-3)*: Con credenciales válidas, el sistema MUST dar acceso a la cuenta del comensal.

- **FR-009**  *(US-3)*: Con credenciales incorrectas, el sistema MUST informar que no se pudo iniciar sesión sin indicar cuál dato es incorrecto; el mensaje MUST ser idéntico para email inexistente y contraseña errónea.

- **FR-010**  *(US-3)*: El campo de contraseña MUST ocultar el texto ingresado.

- **FR-011**: La contraseña MUST almacenarse de forma no reversible y MUST NOT aparecer en logs ni respuestas.

### Key Entities

- **CuentaComensal**: email (único), credencial de acceso, fecha de creación.

- **SesiónComensal**: cuenta autenticada, momento de inicio.

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: alta con email y contraseña; ingreso con email y contraseña.

- **Fuera**: términos y condiciones, verificación de email, recuperación de contraseña, alta e ingreso con Google (US-29, US-51, US-31, US-58, US-52).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 90% de los comensales completa el registro en menos de 2 minutos en el primer intento.

- **SC-002**: 100% de los datos inválidos son detectados antes de crear la cuenta (0 cuentas con email o contraseña inválidos).

- **SC-003**: 100% de los ingresos fallidos muestran un mensaje idéntico sin revelar qué dato falló.

- **SC-004**: 0 apariciones de la contraseña en texto plano en pantalla, almacenamiento o logs.

## Assumptions

- El email funciona como identificador de usuario del comensal.

- Idioma de la interfaz y mensajes: español (Argentina).

- Una cuenta de comensal es independiente de una cuenta de restaurante.
