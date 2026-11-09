# Guion de demo: reseñas (US-27, US-50, US-24, US-7)

Dura unos 4 minutos. Los números son los de la demo recién cargada, con una reseña de 5 estrellas y $13.000.

## Antes de empezar

1. Levantar la app y recargar la demo. Con `make up-local`, o si ya está corriendo:

   ```sh
   docker compose -f docker-compose.yml -f compose.local.yml restart backend
   ```

2. Abrir <http://localhost:5173> en dos ventanas:
   - **Normal**: comensal, `cliente@servido.local` / `Demo12345`.
   - **Incógnito**: restaurante, `demo@servido.local` / `Demo12345`.
3. Comprobar que «Restaurante Demo» muestre 4,3 · 6 reseñas.

## Guion

| # | Qué hacer | Qué decir | Qué se ve | US |
| --- | --- | --- | --- | --- |
| 1 | Comensal: abrir el detalle de «Restaurante Demo» | «Esto ve cualquier persona, con o sin cuenta». | 4,3 · 6 reseñas. Precio `$`, $12.900 por persona, según 5 comensales. «4 comentarios de 6 reseñas» | 27, 50 |
| 2 | Volver al inicio y filtrar por `$`, después por `$$`, y quitar el filtro | «El local declaró `$$`, pero con 5 personas que informaron su gasto, la categoría sale de lo que gastaron». | Aparece en `$` y no en `$$` | 7 |
| 3 | Bajar hasta «¿Cómo estuvo?» | «Después de la visita, y durante 30 días, la reserva aparece acá». | Las reservas terminadas sin reseña | 27 |
| 4 | «Dejar reseña» en la reserva de las 20:00 más reciente. Tocar «Continuar» sin elegir estrellas | «Las estrellas son lo único obligatorio». | «Elegí una calificación de 1 a 5 estrellas.» | 27 |
| 5 | Elegir 5 estrellas. Comentario: «Reservé y pedí desde casa. Cuando llegamos, la mesa y los platos estaban listos.» Gasto: 13000 | «El comentario y el gasto son opcionales, y el formulario avisa que el monto se publica». | «5 de 5» y los dos campos marcados como opcionales | 50 |
| 6 | «Continuar», «Volver», «Continuar» | «Antes de publicar ves cómo va a quedar. Si volvés, no perdés nada». | «Así se va a ver», «Todavía no se publicó» y «Es definitiva» | 50 |
| 7 | «Publicar», y después «Ver el restaurante» | «Se actualiza en el momento». | 4,4 · 7 reseñas. $12.917 por persona, según 6 comensales. «5 comentarios de 7 reseñas», con «Cliente D.» primero | 27, 50, 7 |
| 8 | Volver al inicio y tocar «Dejar reseña» en la reserva de las 20:00 anterior. Mostrar el aviso y cerrar sin publicar | «En público cuenta solo la última visita de cada persona, y la app lo avisa antes». | «Ya reseñaste una visita más reciente a este local: esta reseña la va a ver solo el restaurante.» | 50 |
| 9 | Restaurante: mostrar la tarjeta «Reseñas» y tocar «Ver reseñas» | «El restaurante ve todo, sin datos de contacto y sin poder cambiar nada». | 4,4 · 7 reseñas en la tarjeta. «Recibiste 8 en total» y de dónde sale la categoría de precio | 24, 7 |
| 10 | Bajar hasta la última reseña | «Esta es una visita anterior: el restaurante la ve, pero no cuenta ni es pública». | «Ana R.» con «Visita anterior: no cuenta en el promedio ni se ve en público.» | 24 |

## Para repetirla

Reiniciar el backend con el comando de arriba borra lo publicado sobre las dos reservas de las 20:00 y las vuelve a crear.

**Publicar solo sobre esas dos.** En local puede haber otras reservas viejas en el bloque, de pruebas anteriores, y lo que se publique sobre ellas no se borra al reiniciar.

## En producción

Requiere el código desplegado, un restaurante con «demo» en el nombre y cargar los datos con [el script](quickstart.md#demo-data-on-another-database), con aprobación explícita (R18). Los números pueden cambiar según las reseñas que ya tenga ese restaurante.
