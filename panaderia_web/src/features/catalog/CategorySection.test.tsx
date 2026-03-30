import { http, HttpResponse } from 'msw'
import { CategorySection } from './CategorySection'
import { server } from '@/test/msw/server'
import { mockCategories, paginated } from '@/test/msw/fixtures'
import { render, screen, waitFor, setupUser } from '@/test/utils'
import { setAuthUser } from '@/test/utils'

const BASE = 'http://localhost:8000'

beforeEach(() => {
  setAuthUser('admin')
})

// ── Carga inicial ─────────────────────────────────────────────────────────

describe('CategorySection — carga inicial', () => {
  it('lista las categorías devueltas por MSW', async () => {
    render(<CategorySection />)

    // Espera que aparezcan los nombres de las categorías del fixture
    expect(await screen.findByText('Panes')).toBeInTheDocument()
    expect(await screen.findByText('Facturas')).toBeInTheDocument()
  })

  it('muestra el total de categorías en el subtítulo', async () => {
    render(<CategorySection />)

    await waitFor(() => {
      expect(screen.getByText(/2 categorías/)).toBeInTheDocument()
    })
  })
})

// ── Crear categoría ───────────────────────────────────────────────────────

describe('CategorySection — crear', () => {
  it('abre el dialog, completa el form, envía POST y muestra la nueva categoría', async () => {
    const newCat = {
      ...mockCategories[0],
      id: 'cat-new-0000-0000-000000000099',
      name: 'Tortas',
      description: 'Tortas artesanales',
    }

    server.use(
      http.post(`${BASE}/api/v1/categories`, () =>
        HttpResponse.json(newCat, { status: 201 }),
      ),
      // Después del POST, la lista devuelve las categorías + la nueva
      http.get(`${BASE}/api/v1/categories`, () =>
        HttpResponse.json({
          items: [...mockCategories, newCat],
          total: 3,
          page: 1,
          page_size: 100,
          total_pages: 1,
        }),
      ),
    )

    render(<CategorySection />)
    const user = setupUser()

    // Espera que cargue la lista inicial
    await screen.findByText('Panes')

    // Abre el dialog
    await user.click(screen.getByRole('button', { name: /nueva categoría/i }))

    // Completa el formulario
    await user.type(screen.getByLabelText(/nombre/i), 'Tortas')
    await user.type(screen.getByLabelText(/descripción/i), 'Tortas artesanales')

    // Envía
    await user.click(screen.getByRole('button', { name: /crear/i }))

    // Verifica que la nueva categoría aparece en la lista
    expect(await screen.findByText('Tortas')).toBeInTheDocument()
  })
})

// ── Eliminar categoría (optimistic update) ────────────────────────────────

describe('CategorySection — eliminar', () => {
  it('ConfirmDialog aparece → confirmar → la fila desaparece (optimistic + refetch)', async () => {
    // Handler GET con estado: después del DELETE devuelve lista sin "Panes"
    let deleted = false
    server.use(
      http.get(`${BASE}/api/v1/categories`, () =>
        HttpResponse.json(
          paginated(deleted ? [mockCategories[1]] : mockCategories),
        ),
      ),
      http.delete(`${BASE}/api/v1/categories/:id`, () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    render(<CategorySection />)
    const user = setupUser()

    // Espera la lista inicial
    await screen.findByText('Panes')

    // Clic en el botón de eliminar "Panes"
    await user.click(screen.getByRole('button', { name: /eliminar panes/i }))

    // El ConfirmDialog debe mostrar el nombre de la categoría en la descripción
    expect(await screen.findByText(/eliminar "panes"/i)).toBeInTheDocument()

    // Confirmar — el botón de confirmación tiene confirmLabel="Eliminar"
    await user.click(screen.getByRole('button', { name: /^eliminar$/i }))

    // Optimistic update + refetch: la fila desaparece
    await waitFor(() => {
      expect(screen.queryByText('Panes')).not.toBeInTheDocument()
    })
  })

  it('rollback si el DELETE falla: la fila vuelve a aparecer', async () => {
    server.use(
      http.delete(`${BASE}/api/v1/categories/:id`, () =>
        HttpResponse.json({ detail: 'Error del servidor' }, { status: 500 }),
      ),
    )

    render(<CategorySection />)
    const user = setupUser()

    await screen.findByText('Panes')
    await user.click(screen.getByRole('button', { name: /eliminar panes/i }))
    await screen.findByText(/eliminar "panes"/i)
    await user.click(screen.getByRole('button', { name: /^eliminar$/i }))

    // Después del error, la fila debe volver (rollback optimistic)
    expect(await screen.findByText('Panes')).toBeInTheDocument()
  })
})
