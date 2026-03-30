import { useAuthStore } from '@/features/auth/useAuthStore'
import { mockUsers } from '@/test/msw/fixtures'

// Prevent jsdom from throwing or navigating on window.location.href assignment
beforeAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { href: '' },
  })
})

beforeEach(() => {
  // Reset store and localStorage before every test
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null })
  localStorage.clear()
})

describe('useAuthStore — estado inicial', () => {
  it('accessToken es null al inicio', () => {
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('refreshToken es null al inicio', () => {
    expect(useAuthStore.getState().refreshToken).toBeNull()
  })

  it('user es null al inicio', () => {
    expect(useAuthStore.getState().user).toBeNull()
  })
})

describe('useAuthStore — login', () => {
  it('almacena accessToken, refreshToken y user', () => {
    useAuthStore.getState().login('tok-abc', 'ref-xyz', mockUsers.admin)

    const { accessToken, refreshToken, user } = useAuthStore.getState()
    expect(accessToken).toBe('tok-abc')
    expect(refreshToken).toBe('ref-xyz')
    expect(user).toEqual(mockUsers.admin)
  })

  it('sobrescribe una sesión previa', () => {
    useAuthStore.getState().login('tok-1', 'ref-1', mockUsers.admin)
    useAuthStore.getState().login('tok-2', 'ref-2', mockUsers.cajero)

    expect(useAuthStore.getState().accessToken).toBe('tok-2')
    expect(useAuthStore.getState().user?.role).toBe('cajero')
  })
})

describe('useAuthStore — logout', () => {
  it('limpia accessToken, refreshToken y user', () => {
    useAuthStore.getState().login('tok', 'ref', mockUsers.admin)
    useAuthStore.getState().logout()

    const { accessToken, refreshToken, user } = useAuthStore.getState()
    expect(accessToken).toBeNull()
    expect(refreshToken).toBeNull()
    expect(user).toBeNull()
  })

  it('redirige a /login', () => {
    useAuthStore.getState().logout()
    expect((window.location as { href: string }).href).toBe('/login')
  })
})

describe('useAuthStore — persistencia (zustand persist)', () => {
  it('escribe los tokens en localStorage tras login', () => {
    useAuthStore.getState().login('stored-tok', 'stored-ref', mockUsers.panadero)

    const raw = localStorage.getItem('panaderia-auth')
    expect(raw).not.toBeNull()

    const parsed = JSON.parse(raw!)
    expect(parsed.state.accessToken).toBe('stored-tok')
    expect(parsed.state.refreshToken).toBe('stored-ref')
    expect(parsed.state.user?.role).toBe('panadero')
  })

  it('rehidrata el estado desde localStorage', () => {
    localStorage.setItem(
      'panaderia-auth',
      JSON.stringify({
        state: {
          accessToken: 'hydrated-tok',
          refreshToken: 'hydrated-ref',
          user: mockUsers.contador,
        },
        version: 0,
      }),
    )

    useAuthStore.persist.rehydrate!()

    const { accessToken, refreshToken, user } = useAuthStore.getState()
    expect(accessToken).toBe('hydrated-tok')
    expect(refreshToken).toBe('hydrated-ref')
    expect(user?.role).toBe('contador')
  })

  it('elimina los datos de localStorage tras logout', () => {
    useAuthStore.getState().login('tok', 'ref', mockUsers.admin)
    useAuthStore.getState().logout()

    // El store limpia su entrada en localStorage al resetear el estado persistido
    const raw = localStorage.getItem('panaderia-auth')
    if (raw) {
      const parsed = JSON.parse(raw)
      expect(parsed.state.accessToken).toBeNull()
      expect(parsed.state.user).toBeNull()
    }
    // Si no hay entrada es igualmente válido
  })
})

describe('useAuthStore — setTokens', () => {
  it('actualiza solo los tokens sin tocar el user', () => {
    useAuthStore.getState().login('old-tok', 'old-ref', mockUsers.admin)
    useAuthStore.getState().setTokens('new-tok', 'new-ref')

    const { accessToken, refreshToken, user } = useAuthStore.getState()
    expect(accessToken).toBe('new-tok')
    expect(refreshToken).toBe('new-ref')
    expect(user).toEqual(mockUsers.admin) // user intacto
  })
})
