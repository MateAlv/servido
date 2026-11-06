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
        disponibilidad puede cambiar mientras usás la plataforma.
      </p>

      <h2>Tus datos</h2>
      <p>
        Cómo usamos tus datos está en la <a href="/privacidad">política de privacidad</a>.
      </p>

      <h2>Contacto</h2>
      <p>
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>
      <h2>[REVISAR] Cláusulas pendientes</h2>
      <p>[REVISAR] El equipo debe validar el alcance legal definitivo de estos términos.</p>
    </main>
  )
}
