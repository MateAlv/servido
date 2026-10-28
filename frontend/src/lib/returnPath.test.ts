import { describe, expect, it } from 'vitest'

import { returnPath, withReturnPath } from './returnPath'

const params = (volver: string) => new URLSearchParams({ volver })

describe('returnPath', () => {
  it('returns to a path of this site, with its query', () => {
    expect(returnPath(params('/reservar/abc?fecha=2026-11-03&paso=revision'))).toBe(
      '/reservar/abc?fecha=2026-11-03&paso=revision',
    )
  })

  it('never leaves the site', () => {
    for (const volver of [
      'https://evil.example.com',
      '//evil.example.com',
      '/\t/evil.example.com',
      '/\\evil.example.com',
    ]) {
      expect(returnPath(params(volver))).not.toContain('evil')
    }
    expect(returnPath(new URLSearchParams())).toBe('/')
  })

  it('keeps volver between sign-in and sign-up', () => {
    expect(withReturnPath('/registrarme', params('/reservar/abc'))).toBe(
      '/registrarme?volver=%2Freservar%2Fabc',
    )
    expect(withReturnPath('/ingresar?rol=comensal', new URLSearchParams())).toBe(
      '/ingresar?rol=comensal',
    )
  })
})
