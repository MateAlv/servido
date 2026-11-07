import styles from './LegalPage.module.css'

const CONTACT = 'servido.gdsi@gmail.com'

export function TermsPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Términos y condiciones</h1>
      <p className={styles.updated}>Versión 1.0 · Última actualización: 5 de noviembre de 2026</p>

      <h2>Qué es Servido!</h2>
      <p>
        Servido! es una plataforma para consultar restaurantes, reservar una mesa y elegir platos
        antes de llegar. Durante esta versión, los datos y las operaciones pueden corresponder a un
        entorno académico.
      </p>

      <h2>Tu cuenta</h2>
      <ul>
        <li>La cuenta es personal. Cuidá tu contraseña y no la compartas.</li>
        <li>Usá datos verdaderos al registrarte.</li>
        <li>Usá Servido! de forma responsable y respetá a las demás personas.</li>
      </ul>

      <h2>Disponibilidad</h2>
      <p>
        Podés consultar los restaurantes que estén disponibles, sus horarios, mesas y menú. La
        disponibilidad puede cambiar mientras usás la plataforma. Una reserva queda sujeta a la
        confirmación que muestra Servido! y a los datos informados por el restaurante.
      </p>

      <h2>Reservas y pedidos anticipados</h2>
      <p>
        Podés reservar una mesa sin hacer un pedido. Si el restaurante ofrece pedidos anticipados,
        podés elegir platos antes de tu llegada. El tiempo de preparación es estimado y no garantiza
        una hora exacta de entrega.
      </p>
      <p>
        Revisá los datos de la reserva y del pedido antes de confirmarlos. Las modificaciones y
        cancelaciones están sujetas a los plazos y condiciones que muestra Servido! para cada
        operación.
      </p>

      <h2>Información de los restaurantes</h2>
      <p>
        La información sobre horarios, mesas, menú, precios y restricciones alimenticias es
        declarada por cada restaurante. Consultá las indicaciones del local si tenés una restricción
        alimenticia o necesitás información adicional.
      </p>

      <h2>Uso responsable</h2>
      <ul>
        <li>No uses la plataforma para realizar reservas falsas o acaparar mesas.</li>
        <li>
          No publiques contenido ofensivo, ilegal o que no esté relacionado con tu experiencia.
        </li>
        <li>No intentes acceder a cuentas, datos o funciones que no te correspondan.</li>
      </ul>

      <h2>Tus datos</h2>
      <p>
        Cómo usamos tus datos está en la <a href="/privacidad">política de privacidad</a>.
      </p>

      <h2>Contacto</h2>
      <p>
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>
    </main>
  )
}
