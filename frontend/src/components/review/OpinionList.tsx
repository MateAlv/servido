import { useState } from 'react'

import type { RestaurantReview } from '../../data/restaurants.fixture'
import { longDate } from '../../lib/date'
import { Button } from '../ui'
import { OpinionCard } from './OpinionCard'
import { OpinionReply } from './OpinionReply'
import styles from './OpinionList.module.css'

const STEP = 5

type OpinionListProps = {
  opinions: RestaurantReview[]
  /** Labels the restaurant's replies: «Respuesta de …». */
  restaurantName: string
}

/** A restaurant's public opinions, a few at a time so they don't bury what comes after them. */
export function OpinionList({ opinions, restaurantName }: OpinionListProps) {
  const [shown, setShown] = useState(STEP)
  const remaining = opinions.length - shown

  return (
    <>
      <ul className={styles.list}>
        {opinions.slice(0, shown).map((opinion, index) => (
          <li key={`${opinion.author}-${opinion.date}-${index}`} className={styles.item}>
            <OpinionCard
              author={opinion.author}
              rating={opinion.rating}
              comment={opinion.comment}
              photos={opinion.photos}
              spendPerPerson={opinion.spendPerPerson}
              visit={`Visitó el ${longDate(opinion.date)}`}
            >
              {opinion.reply && (
                <OpinionReply
                  label={`Respuesta de ${restaurantName}`}
                  text={opinion.reply.text}
                  date={opinion.reply.date}
                  edited={opinion.reply.edited}
                  collapsible
                />
              )}
            </OpinionCard>
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <div>
          <Button variant="secondary" size="sm" onClick={() => setShown(shown + STEP)}>
            Ver más opiniones ({remaining})
          </Button>
        </div>
      )}
    </>
  )
}
