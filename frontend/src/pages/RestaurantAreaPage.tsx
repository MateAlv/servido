import { Button, Card, IconArrowLeft } from '../components/ui'
import styles from './RestaurantAreaPage.module.css'

type RestaurantAreaPageProps = {
  title: string
  description: string
}

/** Navigation target for restaurant areas whose full management flow is outside Sprint 2. */
export function RestaurantAreaPage({ title, description }: RestaurantAreaPageProps) {
  return (
    <main className={styles.page}>
      <Button variant="ghost" size="sm" to="/" icon={<IconArrowLeft />}>
        Volver al panel
      </Button>
      <Card>
        <p className={styles.eyebrow}>Panel del restaurante</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <Button to="/">Volver al panel</Button>
      </Card>
    </main>
  )
}
