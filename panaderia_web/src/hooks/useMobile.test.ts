import { renderHook, act } from '@testing-library/react'
import { useMobile } from '@/hooks/useMobile'

// Helper para simular window.matchMedia

type ChangeListener = (e: { matches: boolean }) => void

function setupMatchMedia(initialMatches: boolean) {
  const listeners: ChangeListener[] = []

  const mql = {
    matches: initialMatches,
    addEventListener: vi.fn((_event: string, cb: ChangeListener) => {
      listeners.push(cb)
    }),
    removeEventListener: vi.fn((_event: string, cb: ChangeListener) => {
      const idx = listeners.indexOf(cb)
      if (idx !== -1) listeners.splice(idx, 1)
    }),
    /** Dispara el evento change a todos los listeners suscritos */
    fireChange: (newMatches: boolean) => {
      mql.matches = newMatches
      listeners.forEach((cb) => cb({ matches: newMatches }))
    },
  }

  window.matchMedia = vi.fn().mockReturnValue(mql)
  return mql
}

function setInnerWidth(px: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: px,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

// Tests

describe('useMobile', () => {
  it('devuelve true cuando innerWidth < 768 (mobile)', () => {
    setInnerWidth(375)
    setupMatchMedia(true)

    const { result } = renderHook(() => useMobile())
    expect(result.current).toBe(true)
  })

  it('devuelve false cuando innerWidth >= 768 (desktop)', () => {
    setInnerWidth(1280)
    setupMatchMedia(false)

    const { result } = renderHook(() => useMobile())
    expect(result.current).toBe(false)
  })

  it('actualiza a true cuando el MediaQueryList dispara change → matches=true', () => {
    setInnerWidth(1280)
    const mql = setupMatchMedia(false)

    const { result } = renderHook(() => useMobile())
    expect(result.current).toBe(false)

    act(() => {
      mql.fireChange(true)
    })

    expect(result.current).toBe(true)
  })

  it('actualiza a false cuando el MediaQueryList dispara change → matches=false', () => {
    setInnerWidth(375)
    const mql = setupMatchMedia(true)

    const { result } = renderHook(() => useMobile())
    expect(result.current).toBe(true)

    act(() => {
      mql.fireChange(false)
    })

    expect(result.current).toBe(false)
  })

  it('desuscribe el listener al desmontar el hook', () => {
    setInnerWidth(375)
    const mql = setupMatchMedia(true)

    const { unmount } = renderHook(() => useMobile())
    unmount()

    expect(mql.removeEventListener).toHaveBeenCalledOnce()
  })

  it('consulta el breakpoint correcto: max-width 767px', () => {
    setInnerWidth(1280)
    setupMatchMedia(false)

    renderHook(() => useMobile())

    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)')
  })
})
