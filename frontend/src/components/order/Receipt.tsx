import { formatCents } from '../../lib/orderSummary'
import styles from './Receipt.module.css'

export type ReceiptLine = {
  name: string
  quantity: number
  unitPriceCents: number
  subtotalCents: number
}

type ReceiptProps = {
  restaurant: string
  /** "martes, 3 de noviembre · 21:00 · 4 personas". */
  reservation: string
  lines: ReceiptLine[]
  totalCents: number
  /** The order's estimate (US-19); null hides it. */
  prepTimeMinutes: number | null
  arrival: string
  confirmed: boolean
}

/** The bill of an order (US-21), printed like a restaurant receipt. */
export function Receipt({
  restaurant,
  reservation,
  lines,
  totalCents,
  prepTimeMinutes,
  arrival,
  confirmed,
}: ReceiptProps) {
  return (
    <div className={styles.receipt} data-entrance="">
      <header className={styles.header}>
        <p className={styles.restaurant}>{restaurant}</p>
        <p className={styles.meta}>{reservation}</p>
        <p className={styles.kind}>Pedido anticipado · Servido!</p>
      </header>

      <table className={styles.items}>
        <caption className="visually-hidden">Detalle de la cuenta</caption>
        <thead>
          <tr>
            <th scope="col">Plato</th>
            <th scope="col">Cant.</th>
            <th scope="col">Precio</th>
            <th scope="col">Importe</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.name}>
              <td>{line.name}</td>
              <td>{line.quantity}</td>
              <td>{formatCents(line.unitPriceCents)}</td>
              <td>{formatCents(line.subtotalCents)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={3}>
              Total
            </th>
            <td>{formatCents(totalCents)}</td>
          </tr>
        </tfoot>
      </table>

      <p className={styles.taxes}>Impuestos incluidos</p>

      <footer className={styles.footer}>
        {prepTimeMinutes !== null && (
          <p>
            Preparación: unos {prepTimeMinutes} min, para tu llegada a las {arrival}
          </p>
        )}
        <p className={styles.status}>
          {confirmed ? '● Pedido confirmado' : '▲ Sin confirmar: el restaurante todavía no lo ve'}
        </p>
        <p className={styles.thanks}>¡Gracias! Te esperamos.</p>
      </footer>
    </div>
  )
}
