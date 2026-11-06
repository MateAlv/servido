import styles from './LegalPage.module.css'

const CONTACT = 'servido.gdsi@gmail.com'

export function RestaurantTermsPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Términos y condiciones para restaurantes</h1>
      <p className={styles.updated}>Versión 1.0 · Última actualización: 5 de noviembre de 2026</p>

      <h2>Adhesión a Servido!</h2>
      <p>
        Servido! permite a los restaurantes publicar la información de su local, sus horarios, mesas
        y platos para que los comensales puedan reservar y preparar su pedido.
      </p>

      <h2>Tu cuenta</h2>
      <ul>
        <li>La cuenta representa a un restaurante y sus datos deben ser verdaderos y actuales.</li>
        <li>Cuidá las credenciales de acceso y no las compartas.</li>
        <li>La configuración del local y del menú debe reflejar lo que ofrecés.</li>
      </ul>

      <h2>Uso de la plataforma</h2>
      <p>
        Al operar en Servido!, te comprometés a mantener disponibles y correctos los datos que
        consultan los comensales, incluyendo horarios, mesas y platos.
      </p>

      <h2>Tus datos</h2>
      <p>
        Los datos de la cuenta se usan para operar la plataforma. La política de privacidad explica
        el tratamiento de los datos personales.
      </p>

      <h2>Contacto</h2>
      <p>
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>

      <h2>[REVISAR] Cláusulas pendientes</h2>
      <p>
        [REVISAR] El equipo debe validar el alcance comercial y legal definitivo de la adhesión.
      </p>
    </main>
  )
}
