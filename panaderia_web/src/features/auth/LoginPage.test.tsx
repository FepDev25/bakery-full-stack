import { http, HttpResponse } from 'msw'
import LoginPage from './LoginPage'
import { server } from '@/test/msw/server'
import { mockTokens, mockUsers } from '@/test/msw/fixtures'
import { render, screen, waitFor, setupUser } from '@/test/utils'
import { useAuthStore } from './useAuthStore'

const BASE = 'http://localhost:8000'

// Espia el navigate sin romper el resto de react-router-dom
const navigateMock = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

beforeEach(() => {
  navigateMock.mockReset()
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null })
})

// Helpers
function renderLogin() {
  return render(<LoginPage />, { initialEntries: ['/login'] })
}

async function fillAndSubmit(email: string, password: string) {
  const user = setupUser()
  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Contraseña'), password)
  await user.click(screen.getByRole('button', { name: /ingresar/i }))
}

// ── Validación Zod (sin llamada a la API) ─────────────────────────────────

describe('LoginPage — validación del formulario', () => {
  it('muestra "Email inválido" al enviar un email sin @ sin tocar la API', async () => {
    renderLogin()
    const user = setupUser()

    await user.type(screen.getByLabelText('Email'), 'notanemail')
    await user.type(screen.getByLabelText('Contraseña'), 'secret')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(await screen.findByText('Email inválido')).toBeInTheDocument()
    // La API no debe haberse llamado — navigate no fue invocado
    expect(navigateMock).not.toHaveBeenCalled()
  })
})

// ── Errores de servidor ───────────────────────────────────────────────────

describe('LoginPage — errores de servidor', () => {
  it('muestra "Email o contraseña incorrectos" cuando la API responde 401', async () => {
    server.use(
      http.post(`${BASE}/api/v1/auth/login`, () =>
        HttpResponse.json({ detail: 'Credenciales incorrectas' }, { status: 401 }),
      ),
    )

    renderLogin()
    await fillAndSubmit('wrong@test.com', 'badpass')

    expect(await screen.findByText('Email o contraseña incorrectos.')).toBeInTheDocument()
  })
})

// ── Redirección por rol ───────────────────────────────────────────────────

describe('LoginPage — redirección según rol', () => {
  it('redirige a /app/dashboard cuando el rol es admin', async () => {
    // El handler de /auth/me ya devuelve mockUsers.admin por defecto
    renderLogin()
    await fillAndSubmit('admin@panaderia.com', 'password123')

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/dashboard', { replace: true })
    })
  })

  it('redirige a /app/ventas cuando el rol es cajero', async () => {
    server.use(
      http.get(`${BASE}/api/v1/auth/me`, () => HttpResponse.json(mockUsers.cajero)),
    )

    renderLogin()
    await fillAndSubmit('cajero@panaderia.com', 'password123')

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/ventas', { replace: true })
    })
  })

  it('redirige a /app/produccion cuando el rol es panadero', async () => {
    server.use(
      http.get(`${BASE}/api/v1/auth/me`, () => HttpResponse.json(mockUsers.panadero)),
    )

    renderLogin()
    await fillAndSubmit('panadero@panaderia.com', 'password123')

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/produccion', { replace: true })
    })
  })

  it('guarda los tokens y el usuario en el store tras login exitoso', async () => {
    renderLogin()
    await fillAndSubmit('admin@panaderia.com', 'password123')

    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBe(mockTokens.access_token)
      expect(useAuthStore.getState().user?.role).toBe('admin')
    })
  })
})

// ── Estado de carga ───────────────────────────────────────────────────────

describe('LoginPage — estado de carga', () => {
  it('deshabilita el botón submit mientras la petición está en vuelo', async () => {
    // Handler que bloquea indefinidamente
    let unblock!: () => void
    server.use(
      http.post(`${BASE}/api/v1/auth/login`, () =>
        new Promise<Response>((resolve) => {
          unblock = () => resolve(HttpResponse.json(mockTokens) as unknown as Response)
        }),
      ),
    )

    renderLogin()
    const user = setupUser()
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Contraseña')
    const button = screen.getByRole('button', { name: /ingresar/i })

    await user.type(emailInput, 'admin@panaderia.com')
    await user.type(passwordInput, 'password123')

    // No await — dejamos la petición en vuelo
    user.click(button)

    // El botón debe estar deshabilitado durante la carga
    await waitFor(() => expect(button).toBeDisabled())

    // Desbloqueamos para no dejar promesas pendientes
    unblock()
  })
})
