import { beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ POST: vi.fn() }))
const session = vi.hoisted(() => ({ sessionHeaders: vi.fn(() => ({})) }))

vi.mock('./client', () => ({ api: client }))
vi.mock('./session', () => session)

import { SessionExpiredError } from './errors'
import { cancelRestaurantReservation } from './restaurantReservations'

describe('restaurant reservation API', () => {
  beforeEach(() => {
    client.POST.mockReset()
  })

  it('does not report cancellation success on 401', async () => {
    client.POST.mockResolvedValue({
      data: undefined,
      error: { detail: 'Sesión vencida.' },
      response: { status: 401 },
    })

    await expect(cancelRestaurantReservation('reservation-1')).rejects.toBeInstanceOf(
      SessionExpiredError,
    )
  })
})
