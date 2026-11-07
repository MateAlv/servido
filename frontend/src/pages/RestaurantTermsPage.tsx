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

      <h2>Reservas y pedidos anticipados</h2>
      <p>
        Las reservas se confirman según la disponibilidad que cargues y las reglas que muestra
        Servido!. Si ofrecés pedidos anticipados, los platos, precios y tiempos estimados deben
        estar actualizados.
      </p>
      <p>
        Los tiempos de preparación son estimados. Servido! no garantiza un tiempo exacto ni
        reemplaza la organización interna del restaurante.
      </p>

      <h2>Responsabilidad del restaurante</h2>
      <ul>
        <li>
          Sos responsable de que la información de tu local, menú, precios, horarios y mesas sea
          verdadera y esté actualizada.
        </li>
        <li>
          Sos responsable de las restricciones alimenticias que declares y de informar a los
          comensales cualquier aclaración necesaria.
        </li>
        <li>
          Debés respetar las reservas y comunicar por los canales disponibles cualquier
          inconveniente que afecte la atención.
        </li>
      </ul>

      <h2>Uso responsable</h2>
      <ul>
        <li>No cargues información falsa, ilegal o que pueda inducir a error.</li>
        <li>No uses la plataforma para perjudicar a comensales u otros restaurantes.</li>
        <li>No compartas las credenciales de tu cuenta ni permitas accesos no autorizados.</li>
      </ul>

      <h2>Tus datos</h2>
      <p>
        Los datos de la cuenta se usan para operar la plataforma. La política de privacidad explica
        el tratamiento de los datos personales.
      </p>

      <h2>Contacto</h2>
      <p>
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>
    </main>
  )
}
