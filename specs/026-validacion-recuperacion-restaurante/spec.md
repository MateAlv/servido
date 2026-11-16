# **Feature Specification: Verificación y Recuperación de Cuenta del Restaurante**

**Created**: 2026-11-11

**Input**: Backlog Servido\! — US-44, US-46 (3 SP)

**Rol**: Responsable del restaurante

## **User Scenarios & Testing *(mandatory)***

### **US-44 — Validación de cuenta con email (Prioridad: \-, Estimación: 1\)**

Como **Responsable del restaurante**, quiero recibir un correo de verificación al registrar mi restaurante, para validar mi dirección de correo electrónico y completar la creación de la cuenta.

**Valor**: Confirma que el correo pertenece a quien registra el restaurante y evita que aparezcan en Servido\! restaurantes con cuentas no validadas.

**Independent Test**: Registrar un restaurante con datos completos y verificar que llega un correo de verificación a la dirección ingresada. Antes de abrir el link, verificar que el restaurante no es visible para los comensales. Abrir el link y verificar que la cuenta queda verificada. Probar un link inválido y uno vencido, y verificar que se informa el problema y que se puede solicitar uno nuevo.

**Acceptance Scenarios**:

1. **Dado** que completé correctamente los datos de registro del restaurante, **Cuando** envío el registro, **Entonces** el sistema envía un correo de verificación a la dirección que ingresé.  
2. **Dado** que recibí el correo de verificación, **Cuando** hago clic en el link, **Entonces** la cuenta del restaurante queda registrada como verificada y el sistema me lo informa.  
3. **Dado** que el link de verificación no es válido o ya no está vigente, **Cuando** lo abro, **Entonces** el sistema me informa el problema y me permite solicitar un link nuevo.  
4. **Dado** que solicito un link nuevo, **Cuando** confirmo la solicitud, **Entonces** el sistema envía un nuevo correo de verificación a la dirección del registro.  
5. **Dado** que mi cuenta todavía no está verificada, **Cuando** un comensal busca restaurantes, **Entonces** mi restaurante no es visible para él.  
6. **Dado** que mi cuenta ya está verificada, **Cuando** un comensal busca restaurantes, **Entonces** mi restaurante deja de estar oculto por falta de verificación.

---

### **US-46 — Recuperar cuenta (Prioridad: \-, Estimación: 2\)**

Como **Responsable del restaurante**, quiero poder recuperar el acceso a la cuenta de mi restaurante, para volver a ingresar si olvidé mi contraseña.

**Valor**: El Responsable no queda bloqueado fuera de la cuenta de su restaurante por olvidar la contraseña, y la recuperación se hace de forma segura a través de su correo.

**Independent Test**: Solicitar la recuperación con el correo de una cuenta existente y verificar que llega un correo con instrucciones. Solicitarla con un correo sin cuenta y verificar que se ve el mismo mensaje y no llega ningún correo. Seguir las instrucciones, probar una contraseña que no cumple los requisitos y verificar que se rechaza. Establecer una contraseña válida, verificar que se puede ingresar con ella y que la contraseña anterior ya no funciona.

**Acceptance Scenarios**:

1. **Dado** que olvidé mi contraseña, **Cuando** elijo recuperar mi cuenta e indico el correo electrónico asociado, **Entonces** el sistema procesa mi solicitud de recuperación.  
2. **Dado** que existe una cuenta asociada al correo ingresado, **Cuando** solicito la recuperación, **Entonces** Servido\! me envía un correo con las instrucciones para recuperar el acceso.  
3. **Dado** que no existe una cuenta asociada al correo ingresado, **Cuando** solicito la recuperación, **Entonces** veo el mismo mensaje que si existiera y no se envía ningún correo.  
4. **Dado** que recibí el correo, **Cuando** sigo las instrucciones e ingreso una nueva contraseña que cumple los requisitos de seguridad, **Entonces** la nueva contraseña queda establecida.  
5. **Dado** que estoy estableciendo una nueva contraseña, **Cuando** ingreso una que no cumple los requisitos de seguridad, **Entonces** el sistema no la acepta y me informa qué requisitos debe cumplir.  
6. **Dado** que establecí una nueva contraseña, **Cuando** intento ingresar con la contraseña anterior, **Entonces** el sistema no me lo permite.  
7. **Dado** que establecí una nueva contraseña, **Cuando** ingreso con ella, **Entonces** accedo a la cuenta de mi restaurante.

---

### **Edge Cases**

* **Ingreso con la cuenta sin verificar**: el backlog dice que la verificación «completa la creación de la cuenta», por lo cual el restaurante no es visible para los comensales hasta verificarla. Se propone un mensaje que informe que la cuenta no está verificada y ofrezca reenviar el correo de verificación en el dashboard del restaurante.
* **Recuperación de una cuenta sin verificar**: para no enviar instrucciones de recuperación a un correo no validado, esta spec propone que el sistema responda igual que siempre, pero envíe un nuevo link de verificación en lugar de las instrucciones de recuperación.  
* **Vigencia, reemplazo y reenvío de los links**: el backlog no define cuánto dura cada link. Esta spec propone 24 horas para el de verificación y 15 minutos para el de recuperación, consistente con lo estipulado del lado del comensal en la spec 013. Un link nuevo deja sin efecto a los anteriores. Entre una solicitud y la siguiente deben pasar al menos 60 segundos.  
* **Mensaje neutro en la recuperación**: el backlog solo dice que se envía el correo «si existe una cuenta», tal como se propuso en la spec 013 para el comensal. Esta spec propone que el mensaje que ve el Responsable sea el mismo exista o no la cuenta.
* **Sesiones abiertas al cambiar la contraseña**: esta spec propone que, al establecerse la nueva contraseña, se cierren las sesiones abiertas con la contraseña anterior.  
* **Link de verificación de una cuenta ya verificada**: el sistema informa que la cuenta ya estaba verificada. No es un error y no cambia nada.  
* **Doble clic o link abierto dos veces**: la cuenta se verifica una sola vez y no se muestra ningún error.  
* **Link de recuperación ya usado, inválido o vencido**: el sistema informa el problema y permite solicitar uno nuevo. Cada link sirve una sola vez.  
* **Falla del envío del correo**: el registro no se pierde. El Responsable puede solicitar un link nuevo, y en la recuperación ve el mismo mensaje neutro.  
* **Correo asociado**: se compara sin distinguir mayúsculas de minúsculas.  
* **Seguridad**: la contraseña nunca se envía por correo ni se muestra. El link de recuperación solo permite cambiar la contraseña de la cuenta que lo solicitó.  
* **Consistencia**: la recuperación de la cuenta (US-46) del restaurante aplica los mismos criterios que la recuperación de la cuenta del comensal (spec 013, US-31) y la validación de la cuenta (US-44) aplica los mismos criterios que la verificación de la cuenta del comensal (spec 019, US-51). Esto refiere a tanto a lo funcional como lo visual.
* **"Ahora"**: siempre en la hora de Argentina, también para calcular la vigencia de los links.

## **Requirements *(mandatory)***

### **Functional Requirements**

* **FR-001** *(US-44)*: El sistema MUST enviar un correo de verificación a la dirección ingresada cuando el registro del restaurante se completa correctamente.  
* **FR-002** *(US-44)*: El sistema MUST registrar la cuenta como verificada cuando se abre un link de verificación válido y vigente, y MUST informarlo.  
* **FR-003** *(US-44)*: El sistema MUST informar cuando el link de verificación no es válido o no está vigente, y MUST permitir solicitar uno nuevo.  
* **FR-004** *(US-44)*: El sistema MUST enviar un nuevo correo de verificación ante la solicitud, y el link anterior MUST dejar de ser válido.  
* **FR-005** *(US-44)*: El sistema MUST NOT mostrar el restaurante a los comensales mientras su cuenta no esté verificada.  
* **FR-006** *(US-44)*: El sistema MUST informar que la cuenta ya estaba verificada cuando se abre el link de una cuenta ya verificada, sin modificar nada.  
* **FR-007** *(US-46)*: El sistema MUST permitir solicitar la recuperación de la cuenta indicando el correo electrónico asociado.  
* **FR-008** *(US-46)*: El sistema MUST enviar un correo con las instrucciones para recuperar el acceso cuando existe una cuenta verificada asociada al correo ingresado.  
* **FR-009** *(US-46)*: El sistema MUST mostrar el mismo mensaje exista o no una cuenta asociada al correo ingresado, y MUST enviar un link de verificación en lugar del de recuperación cuando la cuenta no está verificada.  
* **FR-010** *(US-46)*: El sistema MUST permitir establecer una nueva contraseña siguiendo las instrucciones recibidas.  
* **FR-011** *(US-46)*: El sistema MUST aceptar únicamente nuevas contraseñas que cumplan los requisitos de seguridad definidos, y MUST informar qué requisitos no se cumplen.  
* **FR-012** *(US-46)*: Al establecerse la nueva contraseña, el sistema MUST invalidar la anterior y, según lo propuesto, MUST cerrar las sesiones abiertas con ella.  
* **FR-013** *(US-46)*: El sistema MUST informar cuando el link de recuperación no es válido, ya se usó o venció, y MUST permitir solicitar uno nuevo.

### **Key Entities**

* **Cuenta del restaurante**: correo electrónico, contraseña, estado (pendiente de verificación o verificada), momento de la verificación.  
* **Restaurante**: asociado a la cuenta; su visibilidad para los comensales depende de que la cuenta esté verificada.  
* **Link de verificación**: cuenta asociada, vigencia, estado (vigente, usado o reemplazado).  
* **Link de recuperación**: cuenta asociada, vigencia, estado (vigente, usado o reemplazado).

## **Límites de alcance *(MVP Boundaries)***

* **Dentro**: envío del correo de verificación, verificación de la cuenta por link, reenvío de un link nuevo, ocultar el restaurante a los comensales hasta la verificación; solicitud de recuperación por correo, envío de las instrucciones, establecer una nueva contraseña que cumpla los requisitos, invalidar la anterior.  
* **Fuera**: el formulario de registro y la validación de sus datos, cambiar el correo de la cuenta, cambiar la contraseña con la sesión iniciada, recuperación de cuenta del comensal, recuperación por otros medios (SMS, preguntas de seguridad), bloqueo por intentos fallidos, verificación en dos pasos, eliminar cuentas que nunca se verifican.

## **Success Criteria *(mandatory)***

### **Measurable Outcomes**

* **SC-001**: El 95% de los correos de verificación y de recuperación se envía en menos de 1 minuto desde la solicitud.  
* **SC-002**: 0 restaurantes visibles para los comensales con la cuenta sin verificar.  
* **SC-003**: 100% de los links inválidos o vencidos informan el problema y permiten solicitar uno nuevo.  
* **SC-004**: 0 cuentas accesibles con la contraseña anterior después de una recuperación.  
* **SC-005**: 0 respuestas de recuperación que revelen si un correo tiene o no una cuenta.  
* **SC-006**: El 90% de los Responsables completa la recuperación, desde que la solicita hasta que ingresa con la nueva contraseña, en menos de 5 minutos.

## **Assumptions**

* El registro del restaurante (datos requeridos y sus validaciones, como el correo único) está cubierto por otra historia. Esta spec parte de datos de registro completos y válidos.  
* Cada cuenta corresponde a un restaurante y a un Responsable, y se identifica por su correo electrónico.  
* «Verificada» significa que el Responsable abrió un link de verificación válido y vigente.  
* Los requisitos de seguridad de la contraseña son los mismos que se usan al registrar la cuenta; esta spec no los redefine.  
* El servicio de envío de correos está disponible.  
* Las fechas y vigencias se interpretan en la zona horaria de Argentina (America/Argentina/Buenos\_Aires).  
* Idioma de la interfaz, mensajes y correos: español (Argentina).