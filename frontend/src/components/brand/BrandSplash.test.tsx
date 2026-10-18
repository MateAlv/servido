import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BrandSplash } from './BrandSplash'

const logo = () => screen.getByRole('img', { name: 'Servido!', hidden: true })
const splash = () => screen.getByTestId('brand-splash')

describe('BrandSplash', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('plays intro, outro and lift, then calls onDone and disappears', () => {
    const onDone = vi.fn()
    render(<BrandSplash onDone={onDone} />)
    expect(document.documentElement.dataset.splash).toBe('')

    fireEvent.animationEnd(logo())
    fireEvent.animationEnd(logo())
    expect(document.documentElement.dataset.splash).toBeUndefined()
    fireEvent.animationEnd(splash())

    expect(onDone).toHaveBeenCalledOnce()
    expect(screen.queryByTestId('brand-splash')).not.toBeInTheDocument()
  })

  it('waits after the intro until it is ready', () => {
    const onDone = vi.fn()
    const { rerender } = render(<BrandSplash ready={false} onDone={onDone} />)

    fireEvent.animationEnd(logo())
    fireEvent.animationEnd(logo())
    fireEvent.animationEnd(splash())
    expect(onDone).not.toHaveBeenCalled()

    rerender(<BrandSplash ready onDone={onDone} />)
    fireEvent.animationEnd(logo())
    fireEvent.animationEnd(splash())
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('skips to the exit when clicked', () => {
    const onDone = vi.fn()
    render(<BrandSplash onDone={onDone} />)

    fireEvent.click(splash())
    fireEvent.animationEnd(logo())
    fireEvent.animationEnd(splash())

    expect(onDone).toHaveBeenCalledOnce()
  })

  it('is skipped entirely when the user prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    const onDone = vi.fn()

    render(<BrandSplash onDone={onDone} />)

    expect(screen.queryByTestId('brand-splash')).not.toBeInTheDocument()
    expect(onDone).toHaveBeenCalledOnce()
  })
})
