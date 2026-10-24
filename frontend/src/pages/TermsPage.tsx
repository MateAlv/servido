import { Link } from 'react-router'

import styles from './LegalPage.module.css'

const CONTACT = 'servido.gdsi@gmail.com'

/** Provisional terms of service: Google requires them to publish the Google sign-in. US-29 replaces them. */
export function TermsPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Términos y condiciones</h1>
      <p className={styles.updated}>Última actualización: 24 de octubre de 2026</p>
      <p className={styles.draft}>
        Versión provisoria. Los términos definitivos llegan con la historia de usuario 29.
      </p>

      <h2>Qué es Servido!</h2>
      <p>
        Servido! es un proyecto académico de la Facultad de Ingeniería de la Universidad de Buenos
        Aires, sin fines comerciales. Los restaurantes, reservas y pedidos que ves durante la
        cursada son de prueba: no reservan una mesa real ni generan cobros.
      </p>

      <h2>Tu cuenta</h2>
      <ul>
        <li>La cuenta es personal. Cuidá tu contraseña y no la compartas.</li>
        <li>Usá datos verdaderos al registrarte.</li>
        <li>No uses Servido! para nada ilegal ni para perjudicar a otras personas.</li>
      </ul>

      <h2>Disponibilidad</h2>
      <p>
        Servido! puede cambiar, dejar de estar disponible o perder datos sin aviso previo, y deja de
        funcionar al terminar la cursada.
      </p>

      <h2>Tus datos</h2>
      <p>
        Cómo usamos tus datos está en la <Link to="/privacidad">política de privacidad</Link>.
      </p>

      <h2>Contacto</h2>
      <p>
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>
    </main>
  )
}
