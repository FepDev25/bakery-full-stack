import { Route, Routes } from 'react-router-dom'
import { RoleGuard } from './RoleGuard'
import { render, screen } from '@/test/utils'
import { useAuthStore } from '@/features/auth/useAuthStore'
import { mockUsers } from '@/test/msw/fixtures'

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null })
})

function renderWithRole(allowed: string[], path: string = '/app/ventas') {
  return render(
    <Routes>
      <Route element={<RoleGuard allowed={allowed as never} />}>
        <Route path="/app/ventas" element={<div>Sección protegida</div>} />
      </Route>
      <Route path="/403" element={<div>Acceso denegado</div>} />
    </Routes>,
    { initialEntries: [path] },
  )
}

describe('RoleGuard', () => {
  it('redirige a /403 cuando el rol no está en la lista de permitidos', () => {
    // Panadero intenta acceder a una ruta solo para cajero
    useAuthStore.setState({ accessToken: 'tok', refreshToken: null, user: mockUsers.panadero })
    renderWithRole(['cajero', 'admin'])

    expect(screen.getByText('Acceso denegado')).toBeInTheDocument()
    expect(screen.queryByText('Sección protegida')).not.toBeInTheDocument()
  })

  it('redirige a /403 cuando no hay usuario autenticado', () => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null })
    renderWithRole(['cajero', 'admin'])

    expect(screen.getByText('Acceso denegado')).toBeInTheDocument()
  })

  it('renderiza el <Outlet /> cuando el rol está en la lista', () => {
    useAuthStore.setState({ accessToken: 'tok', refreshToken: null, user: mockUsers.cajero })
    renderWithRole(['cajero', 'admin'])

    expect(screen.getByText('Sección protegida')).toBeInTheDocument()
    expect(screen.queryByText('Acceso denegado')).not.toBeInTheDocument()
  })

  it('admin siempre puede acceder a secciones multi-rol', () => {
    useAuthStore.setState({ accessToken: 'tok', refreshToken: null, user: mockUsers.admin })
    renderWithRole(['cajero', 'admin'])

    expect(screen.getByText('Sección protegida')).toBeInTheDocument()
  })
})
