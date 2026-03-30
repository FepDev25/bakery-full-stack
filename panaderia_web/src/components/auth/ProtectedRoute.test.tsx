import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { render, screen } from '@/test/utils'
import { useAuthStore } from '@/features/auth/useAuthStore'

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null })
})

function renderWithRoutes(initialPath: string) {
  return render(
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/app/dashboard" element={<div>Contenido protegido</div>} />
      </Route>
      <Route path="/login" element={<div>Página de login</div>} />
    </Routes>,
    { initialEntries: [initialPath] },
  )
}

describe('ProtectedRoute', () => {
  it('redirige a /login cuando no hay accessToken', () => {
    // sin token en el store (ya reseteado en beforeEach)
    renderWithRoutes('/app/dashboard')
    expect(screen.getByText('Página de login')).toBeInTheDocument()
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('renderiza el <Outlet /> cuando hay accessToken', () => {
    useAuthStore.setState({ accessToken: 'valid-token', refreshToken: null, user: null })
    renderWithRoutes('/app/dashboard')
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
    expect(screen.queryByText('Página de login')).not.toBeInTheDocument()
  })
})
