# Feature Specification: Registro y Acceso de Cuenta de Restaurante

**Input** : Backlog Servido! (rol Restaurante) — US-2, US-4, US-28

**Backlog origen** : US-2 (est. 3) · US-4 (est. 1) · US-28 (est. 1, adelantada del Sprint 4 al 2 el 25/10, junto con el último criterio de US-2)

## User Scenarios & Testing *(mandatory)*

### US-2 — Ingresar datos obligatorios para Registrarme

Como **Responsable del restaurante**, quiero Completar un formulario con los datos obligatorios de mi restaurante, para Crear la cuenta del restaurante en Servido!.

**Why this priority**: Permite el ingreso de la entidad Restaurante a la plataforma, fundamental para el Sprint 1.

**Independent Test**: Completar el formulario con datos faltantes, CUIT/Mail con sintaxis o algoritmo inválido, CUIT/Mail duplicado y datos válidos, comprobando que solo el último caso crea la cuenta.

**Acceptance Scenarios**:

1. **Dado** que falta completar un campo obligatorio (mail, CUIT, teléfono) o el CUIT/mail no cumple el formato válido, **Cuando** intento continuar, **Entonces** el sistema me informa explícitamente qué dato corregir (HTTP 400 Bad Request) y no permite avanzar.
2. **Dado** que ingreso un mail o CUIT que ya posee una cuenta registrada, **Cuando** intento registrarme, **Entonces** el sistema informa el duplicado y rechaza la creación de cuenta (HTTP 409 Conflict).
3. **Dado** que ingreso datos obligatorios sintáctica y semánticamente válidos, **Cuando** envío el formulario, **Entonces** la cuenta del restaurante se crea exitosamente (HTTP 201 Created) con la contraseña almacenada mediante hash seguro.
4. **Dado** que la confirmación de la contraseña no coincide con la contraseña, **Cuando** intento continuar, **Entonces** el sistema me avisa que las contraseñas no coinciden y no crea la cuenta.
5. **Dado** que elijo registrarme con mi cuenta de Google, **Cuando** Google me autentica correctamente, **Entonces** el formulario me pide los mismos datos del restaurante salvo el mail y la contraseña (el mail es el de Google), y al enviarlo se crea la cuenta del restaurante y accedo a ella (HTTP 201 Created).
6. **Dado** que la autenticación con Google no se completa (la cancelo, la rechazo o falla), **Cuando** vuelvo a Servido!, **Entonces** no se crea ninguna cuenta y se me informa que no se pudo registrar con Google.

### US-4 — Ingresar usuario y contraseña

Como **Responsable del restaurante**, quiero Ingresar a Servido! utilizando mi usuario y contraseña, para Acceder a la cuenta de mi restaurante y gestionar sus reservas y pedidos.

**Why this priority**: Habilita al restaurante a administrar su sucursal luego del registro.

**Independent Test**: Ingresar con credenciales inválidas y válidas, verificando los mensajes de error genéricos y el acceso correcto a las funciones del rol..

**Acceptance Scenarios**:

1. **Dado** que ingreso un email no registrado o una contraseña incorrecta, **Cuando** intento iniciar sesión, **Entonces** el sistema retorna HTTP 401 Unauthorized con un mensaje genérico ("Credenciales inválidas") sin revelar cuál dato falló.
2. **Dado** que ingreso credenciales válidas, **Cuando** inicio sesión, **Entonces** accedo al panel del restaurante.
3. **Dado** que poseo una sesión activa con rol Restaurante, **Cuando** intento invocar endpoints exclusivos del rol Comensal o de otros restaurantes, **Entonces** se responde HTTP 403 Forbidden.

### US-28 — Ingresar con Google (Prioridad: -, Estimación: 1)

Como **Responsable del restaurante**, quiero Ingresar a Servido! utilizando mi cuenta de Google, para Acceder a la cuenta de mi restaurante sin tener que ingresar mi usuario y contraseña.

**Independent Test**: Con un restaurante registrado con el mail de una cuenta de Google, ingresar con Google y llegar a su cuenta; repetir con una cuenta de Google sin restaurante y con una autenticación cancelada o fallida, y verificar que en esos casos no se accede.

**Acceptance Scenarios**:

1. **Dado** que estoy en la pantalla de ingreso con el tipo de cuenta Restaurante, **Cuando** se muestra, **Entonces** puedo elegir ingresar con Google, además del ingreso con mail y contraseña.
2. **Dado** que existe una cuenta de restaurante con el mismo mail que mi cuenta de Google, **Cuando** Google me autentica correctamente, **Entonces** accedo a la cuenta de mi restaurante, igual que con mail y contraseña.
3. **Dado** que no existe ninguna cuenta de restaurante con el mail de mi cuenta de Google, **Cuando** Google me autentica correctamente, **Entonces** Servido! me informa que no existe una cuenta asociada, no me da acceso y me ofrece registrar el restaurante con esa cuenta de Google (US-2, escenario 5).
4. **Dado** que la autenticación con Google no se completa (la cancelo, la rechazo o falla), **Cuando** vuelvo a Servido!, **Entonces** no accedo a ninguna cuenta y se me informa que no se pudo ingresar con Google.

## Edge Cases *(mandatory)*

- Restaurante registrado con Google -> No tiene contraseña: solo ingresa con Google, y el ingreso con mail y contraseña responde el mismo error genérico. Agregar una contraseña después queda para recuperar la cuenta (US-31).

- Mail de Google con cuenta de comensal -> No impide registrar ni ingresar al restaurante: las cuentas de comensal y de restaurante son independientes, y el ingreso con Google de cada rol solo busca cuentas de ese rol (spec 007).


- Inyección de caracteres maliciosos o XSS en campos de texto -> Sanitización en backend antes de persistir.

- Intentos masivos de inicio de sesión fallidos -> Rate limiting.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-2)*: El formulario MUST solicitar nombre del restaurante, mail, CUIT y teléfono como obligatorios.
- **FR-002** *(US-2)*: El sistema MUST validar unicidad de CUIT y mail contra la base de datos.

- **FR-003** *(US-4)*: El login MUST rechazar accesos incorrectos con un mensaje genérico por seguridad.
- **FR-004** *(US-4)*: El sistema MUST manejar control de acceso asegurando que la cuenta de restaurante solo dé acceso a funcionalidades de su rol.

- **FR-005** *(US-2, US-4; decisión del equipo, 18/10)*: El registro MUST pedir también la contraseña con la que se ingresa en US-4, con las mismas reglas que la del comensal (spec 001, FR-012), y pedirla dos veces como el comensal (spec 001, FR-013).

- **FR-006** *(US-2)*: El registro MUST permitir usar una cuenta de Google en vez del mail y la contraseña: el mail de la cuenta es el de Google, y el formulario MUST pedir los demás datos obligatorios (nombre, CUIT, teléfono) con las mismas validaciones.

- **FR-007** *(US-2)*: Si la autenticación con Google no se completa o no es válida, el sistema MUST NOT crear ninguna cuenta.

- **FR-008** *(US-28)*: El ingreso del restaurante MUST ofrecer ingresar con Google; si existe una cuenta de restaurante con el mail de Google, MUST dar acceso a ella con la misma sesión que el ingreso con mail y contraseña.

- **FR-009** *(US-28)*: Si no existe una cuenta de restaurante con ese mail, el sistema MUST informarlo, MUST NOT dar acceso y MUST ofrecer registrar el restaurante con esa cuenta de Google.

### Key Entities

- **Restaurante**: id (UUID), nombre, mail (unique), CUIT (unique, 11 dígitos), telefono, password_hash. Dirección, barrio y tipo de comida quedan vacíos al registrarse y se completan más adelante (US-6, US-8). Un restaurante registrado con Google guarda su mail de Google y no tiene contraseña utilizable (spec 007, research R10).

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: registro con nombre, mail, CUIT, teléfono y contraseña, o con Google en vez de mail y contraseña; ingreso con mail y contraseña o con Google.

- **Fuera** *(decisión del equipo, 21/10)*: el escenario 3 de US-4 (HTTP 403 con el rol equivocado) se prueba cuando existan endpoints exclusivos de cada rol (Sprint 2, specs 004 y 006). Rate limiting y sanitización de los edge cases quedan para después del MVP.

## Success Criteria *(mandatory)*

- **SC-001**: 0% de restaurantes duplicados por CUIT o Mail en la base de datos (garantizado por constraints de DB e integraciones BDD).
- **SC-002**: 100% de cobertura de pruebas automatizadas en los escenarios BDD de validación de campos y rechazo de credenciales inválidas.
