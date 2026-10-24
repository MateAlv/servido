import { Link } from 'react-router'

import styles from './LegalPage.module.css'

const CONTACT = 'servido.gdsi@gmail.com'

/** Provisional privacy policy: Google requires one to publish the Google sign-in (spec 007). */
export function PrivacyPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Política de privacidad</h1>
      <p className={styles.updated}>Última actualización: 24 de octubre de 2026</p>
      <p className={styles.draft}>
        Versión provisoria. La versión definitiva se publica junto con los{' '}
        <Link to="/terminos">términos y condiciones</Link>.
      </p>

      <h2>Quiénes somos</h2>
      <p>
        Servido! es un proyecto académico del Grupo 3 de la materia Gestión del Desarrollo de
        Sistemas Informáticos de la Facultad de Ingeniería de la Universidad de Buenos Aires
        (FIUBA), segundo cuatrimestre de 2026. No es un servicio comercial.
      </p>

      <h2>Qué datos guardamos</h2>
      <ul>
        <li>
          Si sos comensal: tu nombre, tu email y tu contraseña. La contraseña se guarda cifrada y
          nadie puede leerla.
        </li>
        <li>
          Si sos restaurante: el nombre del local, el email, el CUIT, el teléfono y la contraseña,
          también cifrada.
        </li>
        <li>
          Si ingresás con Google: solo usamos el nombre y el email de tu cuenta de Google para
          encontrar tu cuenta de Servido!. No accedemos a ningún otro dato de Google.
        </li>
        <li>
          Tu ubicación se usa solo en tu dispositivo, para mostrarte la distancia a cada
          restaurante. No la guardamos.
        </li>
      </ul>

      <h2>Para qué los usamos</h2>
      <p>
        Para identificarte cuando ingresás y para gestionar tus reservas y pedidos. No vendemos ni
        compartimos tus datos, y no mostramos publicidad.
      </p>

      <h2>Dónde se guardan y por cuánto tiempo</h2>
      <p>
        En servidores de Amazon Web Services. El mapa se dibuja con OpenStreetMap, que recibe los
        pedidos de mapa de tu navegador. Al terminar la cursada se borran todos los datos.
      </p>

      <h2>En tu navegador</h2>
      <p>
        No usamos cookies. Tu navegador guarda la sesión mientras la pestaña está abierta y el tema
        claro u oscuro que elegiste.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Podés pedirnos ver, corregir o borrar tus datos escribiendo a{' '}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </main>
  )
}
