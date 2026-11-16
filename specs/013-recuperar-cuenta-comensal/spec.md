# Feature Specification: Recuperar Cuenta (Comensal)

**Created**: 2026-11-02

**Input**: Backlog Servido\! — US-31 (Sprint 4, 2 SP). La recuperación del restaurante es US-46 (Sprint 5).

**Rol**: Comensal

## User Scenarios & Testing *(mandatory)*

### US-31 — Recuperar cuenta (Prioridad: \-, Estimación: 2\)

Como **Comensal**, quiero poder recuperar el acceso a mi cuenta, para volver a ingresar si olvidé mi contraseña.

**Valor**: Evita que el comensal pierda su cuenta, sus reservas y sus pedidos por olvidar la contraseña.

**Independent Test**: Solicitar la recuperación con el mail de una cuenta existente, abrir el link recibido, establecer una nueva contraseña e ingresar con ella; luego intentar reutilizar el mismo link y usar uno vencido (más de 15 minutos).

**Acceptance Scenarios**:

1. **Dado** que olvidé mi contraseña, **Cuando** solicito recuperar mi cuenta indicando mi correo, **Entonces** el sistema me informa que, si existe una cuenta asociada, recibiré un correo con instrucciones.  
2. **Dado** que existe una cuenta asociada al correo, **Cuando** solicito la recuperación, **Entonces** Servido\! me envía un correo con un link para recuperar el acceso.  
3. **Dado** que recibí el correo, **Cuando** abro el link, **Entonces** puedo establecer una nueva contraseña.  
4. **Dado** que estoy estableciendo la nueva contraseña, **Cuando** no cumple los requisitos de Servido\!, **Entonces** el sistema me informa cuáles no cumple y no la guarda.  
5. **Dado** que establecí una nueva contraseña, **Cuando** inicio sesión, **Entonces** puedo ingresar con ella.  
6. **Dado** que ya usé el link para cambiar la contraseña, **Cuando** intento abrirlo de nuevo, **Entonces** el sistema me informa que ya no es válido y me permite solicitar uno nuevo.  
7. **Dado** que pasaron más de 15 minutos desde que se envió el link, **Cuando** intento usarlo, **Entonces** el sistema me informa que venció y me permite solicitar uno nuevo.  
8. **Dado** que no existe una cuenta asociada al correo, **Cuando** solicito la recuperación, **Entonces** el sistema muestra el mismo mensaje que en el escenario 1 y no envía ningún correo.

---

### Edge Cases

- **No revelar si el mail existe** *(propuesta del equipo; falta que la PO la valide)*: el mensaje al solicitar la recuperación es el mismo exista o no la cuenta, para no permitir descubrir qué correos están registrados. Es coherente con US-3, que tampoco revela cuál dato es incorrecto.  
- **Vencimiento**: el link vence a los 15 minutos de enviado (criterio de US-31), medidos en la hora de Argentina.  
- **Un solo uso**: una vez usado para cambiar la contraseña, el link no sirve de nuevo.  
- **Varias solicitudes**: al pedir un link nuevo, los anteriores dejan de valer; solo el último sirve.  
- **Contraseña anterior**: al establecer la nueva, la anterior deja de ser válida (criterio de US-46 para el restaurante, aplicado también aquí).  
- **Sesiones abiertas** *(propuesta del equipo; falta que la PO la valide)*: al cambiar la contraseña se cierran las sesiones abiertas de esa cuenta.  
- **Requisitos de contraseña** La recuperación debe aplicar los mismos requisitos que el registro.  
- **Cuenta creada con Google** si la cuenta no tiene contraseña propia, el correo le indica que ingresa con Google en lugar de ofrecerle un link.  
- **Cuenta sin email verificado** (US-51): puede recuperar el acceso igual; el link llega a la misma dirección.  
- **Abuso del envío** se limita la cantidad de solicitudes por correo a 5 y por período de media hora para evitar el envío masivo de mails.  
- **Correo con formato inválido**: el sistema lo informa y no envía nada.  
- **Fallo en el envío del correo**: el sistema informa que no pudo enviarse y permite reintentar.  
- **Doble clic en «Solicitar»**: no se envían dos correos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-31)*: El sistema MUST permitir al comensal solicitar la recuperación de su cuenta indicando el correo electrónico asociado.  
- **FR-002** *(US-31)*: Si existe una cuenta asociada al correo, el sistema MUST enviar un correo con las instrucciones para recuperar el acceso.  
- **FR-003** *(US-31; propuesta del equipo)*: El sistema MUST mostrar el mismo mensaje al solicitar la recuperación exista o no una cuenta asociada, y MUST NOT enviar correo si no existe.  
- **FR-004** *(US-31)*: El sistema MUST permitir establecer una nueva contraseña siguiendo las instrucciones recibidas.  
- **FR-005** *(US-31)*: La nueva contraseña MUST cumplir los requisitos de contraseña de Servido\!; si no los cumple, el sistema MUST informarlo y MUST NOT guardarla.  
- **FR-006** *(US-31)*: Una vez restablecida, el sistema MUST permitir iniciar sesión con la nueva contraseña, y la anterior MUST dejar de ser válida.  
- **FR-007** *(US-31)*: El link de recuperación MUST poder usarse una única vez.  
- **FR-008** *(US-31)*: El link de recuperación MUST vencer a los 15 minutos de enviado.  
- **FR-009** *(US-31)*: Si el link no es válido, ya fue usado o venció, el sistema MUST informarlo y MUST permitir solicitar uno nuevo.  
- **FR-010** *(US-31; propuesta del equipo)*: Al emitir un link nuevo, el sistema MUST invalidar los anteriores de esa cuenta.  
- **FR-011** *(US-31; propuesta del equipo)*: Al cambiar la contraseña, el sistema MUST cerrar las demás sesiones abiertas de la cuenta.  
- **FR-012** *(US-31; propuesta del equipo)*: El sistema MUST limitar la cantidad de solicitudes de recuperación por correo y por período.

### Key Entities

- **Cuenta de comensal**: correo, contraseña, método de ingreso (contraseña o Google).  
- **Solicitud de recuperación**: cuenta, token (de un solo uso), fecha de emisión, vencimiento (15 minutos), estado (pendiente, usado o vencido).

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: solicitar la recuperación por correo; link de un solo uso con vencimiento; establecer la nueva contraseña; ingresar con ella.  
- **Fuera**: recuperación de la cuenta del restaurante (US-46, Sprint 5), cambio de contraseña estando logueado, recuperación por SMS o preguntas de seguridad, autenticación en dos pasos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 90% de los comensales recupera el acceso en menos de 3 minutos en el primer intento.  
- **SC-002**: 0 links utilizables más de una vez o después de 15 minutos.  
- **SC-003**: 100% de las contraseñas anteriores dejan de funcionar tras un restablecimiento exitoso.  
- **SC-004**: La respuesta al solicitar la recuperación es indistinguible entre un correo registrado y uno que no lo está.

## Assumptions

- El envío de correos ya funciona (US-51, Sprint 2).  
- El comensal tiene acceso al correo con el que se registró.  
- Las fechas y horarios se interpretan en la zona horaria de Argentina (America/Argentina/Buenos\_Aires).  
- Idioma de la interfaz y mensajes: español (Argentina).