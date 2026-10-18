# Diseño

[boceto-pagina-inicial.html](boceto-pagina-inicial.html) es el primer boceto de estilo de Servido!: una guía de cómo pensamos la identidad visual, **no** el diseño final ni la landing definitiva. Abrilo en el navegador para verlo (es un prototipo con datos de ejemplo).

## Identidad

- Logo: `frontend/public/servido-logo.png` (pin de ubicación con una campana de plato). Lema: "Reservá. Pedí. Disfrutá."
- Tipografías: **Baloo 2** para títulos y **Nunito** para texto (Google Fonts).
- Color principal terracota `#D2441C` sobre crema `#FDF9EE`, texto marrón `#3B1F18`. Tiene modo claro y oscuro.
- Estados: verde (hay mesa / pagado), ámbar (quedan pocas / pendiente), rojo (completo / error).
- Formas redondeadas: botones tipo píldora y tarjetas con bordes de 22–28 px.
- Mobile first: los usuarios reservan desde el celular.

Los tokens ya están en `frontend/src/styles/tokens.css`. Al diseñar una pantalla nueva, usá esas variables en lugar de colores sueltos.
