import { useQuery } from '@tanstack/react-query'

import { api } from '../../api/client'
import styles from './ApiStatus.module.css'

/** Development aid: shows whether the frontend reaches the API and its database. */
export function ApiStatus() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/health')
      if (error) throw error
      return data
    },
    retry: false,
  })

  if (health.isPending) {
    return <span className={`${styles.status} ${styles.pending}`}>Conectando con el servidor…</span>
  }
  if (health.isError) {
    return (
      <span className={`${styles.status} ${styles.error}`}>■ Sin conexión con el servidor</span>
    )
  }
  return <span className={`${styles.status} ${styles.ok}`}>● Servidor conectado</span>
}
