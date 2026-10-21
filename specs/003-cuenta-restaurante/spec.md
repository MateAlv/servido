# Feature Specification: Registro y Acceso de Cuenta de Restaurante

**Input** : Backlog Servido! (rol Restaurante) — US-2, US-4

**Backlog origen** : US-2 (est. 3) · US-4 (est. 1)

## User Scenarios & Testing *(mandatory)*

### US-2 — Ingresar datos obligatorios para Registrarme

Como **Responsable del restaurante**, quiero Completar un formulario con los datos obligatorios de mi restaurante, para Crear la cuenta del restaurante en Servido!.

**Why this priority**: Permite el ingreso de la entidad Restaurante a la plataforma, fundamental para el Sprint 1.

**Independent Test**: Completar el formulario con datos faltantes, CUIT/Mail con sintaxis o algoritmo inválido, CUIT/Mail duplicado y datos válidos, comprobando que solo el último caso crea la cuenta.

**Acceptance Scenarios**:

1. **Dado** que falta completar un campo obligatorio (mail, CUIT, teléfono) o el CUIT/mail no cumple el formato válido, **Cuando** intento continuar, **Entonces** el sistema me informa explícitamente qué dato corregir (HTTP 400 Bad Request) y no permite avanzar.
2. **Dado** que ingreso un mail o CUIT que ya posee una cuenta registrada, **Cuando** intento registrarme, **Entonces** el sistema informa el duplicado y rechaza la creación de cuenta (HTTP 409 Conflict).
3. **Dado** que ingreso datos obligatorios sintáctica y semánticamente válidos, **Cuando** envío el formulario, **Entonces** la cuenta del restaurante se crea exitosamente (HTTP 201 Created) con la contraseña almacenada mediante hash seguro.

### US-4 — Ingresar usuario y contraseña

Como **Responsable del restaurante**, quiero Ingresar a Servido! utilizando mi usuario y contraseña, para Acceder a la cuenta de mi restaurante y gestionar sus reservas y pedidos.

**Why this priority**: Habilita al restaurante a administrar su sucursal luego del registro.

**Independent Test**: Ingresar con credenciales inválidas y válidas, verificando los mensajes de error genéricos y el acceso correcto a las funciones del rol..

**Acceptance Scenarios**:

1. **Dado** que ingreso un email no registrado o una contraseña incorrecta, **Cuando** intento iniciar sesión, **Entonces** el sistema retorna HTTP 401 Unauthorized con un mensaje genérico ("Credenciales inválidas") sin revelar cuál dato falló.
2. **Dado** que ingreso credenciales válidas, **Cuando** inicio sesión, **Entonces** accedo al panel del restaurante.
3. **Dado** que poseo una sesión activa con rol Restaurante, **Cuando** intento invocar endpoints exclusivos del rol Comensal o de otros restaurantes, **Entonces** se responde HTTP 403 Forbidden.

## Edge Cases *(mandatory)*

- Inyección de caracteres maliciosos o XSS en campos de texto -> Sanitización en backend antes de persistir.

- Intentos masivos de inicio de sesión fallidos -> Rate limiting.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-2)*: El formulario MUST solicitar nombre del restaurante, mail, CUIT y teléfono como obligatorios.
- **FR-002** *(US-2)*: El sistema MUST validar unicidad de CUIT y mail contra la base de datos.

- **FR-003** *(US-4)*: El login MUST rechazar accesos incorrectos con un mensaje genérico por seguridad.
- **FR-004** *(US-4)*: El sistema MUST manejar control de acceso asegurando que la cuenta de restaurante solo dé acceso a funcionalidades de su rol.

- **FR-005** *(US-2, US-4; decisión del equipo, 18/10)*: El registro MUST pedir también la contraseña con la que se ingresa en US-4, con las mismas reglas que la del comensal (spec 001, FR-012).

### Key Entities

- **Restaurante**: id (UUID), nombre, mail (unique), CUIT (unique, 11 dígitos), telefono, password_hash. Dirección, barrio y tipo de comida quedan vacíos al registrarse y se completan más adelante (US-6, US-8). No hay proveedor de autenticación: el ingreso con Google pasa a US-28.

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: registro con nombre, mail, CUIT, teléfono y contraseña; ingreso con mail y contraseña.

- **Fuera** *(decisión del equipo, 21/10)*: registro e ingreso con Google, aunque el backlog lo menciona en US-2: pasa a US-28 (Sprint 4). El escenario 3 de US-4 (HTTP 403 con el rol equivocado) se prueba cuando existan endpoints exclusivos de cada rol (Sprint 2, specs 004 y 006). Rate limiting y sanitización de los edge cases quedan para después del MVP.

## Success Criteria *(mandatory)*

- **SC-001**: 0% de restaurantes duplicados por CUIT o Mail en la base de datos (garantizado por constraints de DB e integraciones BDD).
- **SC-002**: 100% de cobertura de pruebas automatizadas en los escenarios BDD de validación de campos y rechazo de credenciales inválidas.
