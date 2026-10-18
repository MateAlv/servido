import { useQuery } from '@tanstack/react-query'

import { api } from '../api/client'
import styles from './HomePage.module.css'

function useApiHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/health')
      if (error) throw error
      return data
    },
    retry: false,
  })
}

export function HomePage() {
  const health = useApiHealth()

  return (
    <main className={styles.page}>
      <img className={styles.logo} src="/servido-logo.png" alt="" />
      <h1 className={styles.title}>
        Servido<b>!</b>
      </h1>
      <p className={styles.tagline}>Reservá. Pedí. Disfrutá.</p>
      {health.isPending && (
        <span className={`${styles.status} ${styles.pending}`}>Conectando con el servidor…</span>
      )}
      {health.isSuccess && (
        <span className={`${styles.status} ${styles.ok}`}>● Servidor conectado</span>
      )}
      {health.isError && (
        <span className={`${styles.status} ${styles.error}`}>■ Sin conexión con el servidor</span>
      )}
    </main>
  )
}
