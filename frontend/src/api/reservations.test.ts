import { beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ DELETE: vi.fn() }))
const session = vi.hoisted(() => ({ sessionHeaders: vi.fn(() => ({})) }))

vi.mock('./client', () => ({ api: client }))
vi.mock('./session', () => session)

import { cancelReservation } from './reservations'
import { SessionExpiredError } from './errors'

describe('reservation API', () => {
  beforeEach(() => {
    client.DELETE.mockReset()
    session.sessionHeaders.mockClear()
  })

  it('does not report cancellation success on 401', async () => {
    client.DELETE.mockResolvedValue({
      data: undefined,
      error: { detail: 'Sesión vencida.' },
      response: { status: 401 },
    })

    await expect(cancelReservation('reservation-1')).rejects.toBeInstanceOf(SessionExpiredError)
  })
})
