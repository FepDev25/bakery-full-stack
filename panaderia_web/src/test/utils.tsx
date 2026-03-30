/**
 * Custom render wrapper que provee todos los contextos necesarios:
 * QueryClient (con retry desactivado), MemoryRouter y Auth store limpio.
 *
 * Uso:
 *   import { render, screen } from '@/test/utils'
 *   render(<MiComponente />)
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactElement, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/useAuthStore'
import type { Role } from '@/features/auth/useAuthStore'

// ── QueryClient sin retries para tests rápidos ─────────────────────────────

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// ── Seed de auth store para tests que requieren usuario autenticado ─────────

export function setAuthUser(role: Role = 'admin') {
  useAuthStore.setState({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: {
      id: `user-${role}-uuid`,
      email: `${role}@panaderia.com`,
      full_name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      role,
      is_active: true,
    },
  })
}

// ── Wrapper con todos los providers ────────────────────────────────────────

interface WrapperOptions {
  initialEntries?: string[]
  queryClient?: QueryClient
}

function createWrapper({ initialEntries = ['/'], queryClient }: WrapperOptions = {}) {
  const client = queryClient ?? createTestQueryClient()

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }

  return Wrapper
}

// ── Custom render ──────────────────────────────────────────────────────────

type CustomRenderOptions = Omit<RenderOptions, 'wrapper'> & WrapperOptions

function customRender(ui: ReactElement, options: CustomRenderOptions = {}) {
  const { initialEntries, queryClient, ...renderOptions } = options
  const wrapper = createWrapper({ initialEntries, queryClient })
  return render(ui, { wrapper, ...renderOptions })
}

// ── Setup de usuario por defecto para tests con auth ──────────────────────

export function renderAsRole(ui: ReactElement, role: Role, options: CustomRenderOptions = {}) {
  setAuthUser(role)
  return customRender(ui, options)
}

// ── Helper para userEvent con setup ───────────────────────────────────────

export function setupUser() {
  return userEvent.setup()
}

// Re-exporta todo de RTL para que los tests importen solo de '@/test/utils'
export * from '@testing-library/react'
export { customRender as render }
