# US-15 — Ver platos y precios

## Qué hice

Implementé la US-15 para que un comensal pueda consultar el menú público de un restaurante, ver los precios actuales y abrir el detalle de cada plato.

## Cómo funciona

- Cada plato tiene una disponibilidad booleana, disponible por defecto.
- El backend centraliza la consulta pública en `menu_dishes`: filtra los platos no disponibles y los ordena por categoría y nombre.
- El detalle público usa esa misma consulta para el menú y para decidir si el restaurante tiene menú.
- El frontend agrupa las categorías en Entradas, Principales, Postres y Bebidas, conserva fotos y restricciones alimenticias y muestra cada plato como un botón accesible.
- Al seleccionar un plato se abre un modal con nombre, foto o «Sin foto», descripción, precio y restricciones. Se puede cerrar con «Cerrar», Escape o clic fuera.

## Dónde verlo en el sitio local

Con la aplicación levantada, abrí [http://localhost:5173](http://localhost:5173).

1. Entrá en **Mapa** desde la navegación principal o abrí directamente [http://localhost:5173/mapa](http://localhost:5173/mapa).
2. Seleccioná un restaurante real y elegí **Ver detalle**. La URL tendrá este formato: `http://localhost:5173/restaurantes/<id>`.
3. En la página del detalle, el bloque **Menú** aparece debajo de la información principal del restaurante.
4. Allí se ven las categorías **Entradas**, **Principales**, **Postres** y **Bebidas**, en ese orden. Cada plato muestra su nombre, descripción y precio actualizado.
5. Hacé clic en un plato para abrir el modal:
   - un plato con foto muestra la imagen y el texto alternativo `Foto de <nombre>`;
   - un plato sin foto muestra el recuadro **Sin foto**;
   - también se muestran la descripción, el precio y las restricciones alimenticias, cuando existen.
6. El modal se cierra con el botón **Cerrar**, la tecla **Escape** o haciendo clic fuera del contenido.

Para probar los datos del seed, usá el restaurante **Restaurante Demo** después de ejecutar el seed. Su menú aparece en el detalle público y el plato marcado como agotado no se muestra.

## Decisiones y alcance

Las decisiones D1–D4 son propuestas del equipo y quedan pendientes de validación de la PO. La UI para marcar platos sin stock queda para US-34; las cantidades y el pedido anticipado quedan fuera, para US-17/19/21; no se agregaron filtros.

Los restaurantes fixture se mantienen sin fotos ni disponibilidad para no cambiar el comportamiento de prueba existente.
