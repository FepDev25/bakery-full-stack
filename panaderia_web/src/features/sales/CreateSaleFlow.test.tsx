import { http, HttpResponse } from 'msw'
import { toast } from 'sonner'
import CreateSaleFlow from './CreateSaleFlow'
import { server } from '@/test/msw/server'
import { mockProducts, mockCustomers, mockSaleWithItems } from '@/test/msw/fixtures'
import { render, screen, waitFor, setupUser, setAuthUser, within } from '@/test/utils'

const BASE = 'http://localhost:8000'

// Mock de sonner — evita DOM de portales y permite verificar llamadas
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}))

const mockNavigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

beforeEach(() => {
  setAuthUser('cajero')
  mockNavigate.mockReset()
  vi.mocked(toast.success).mockReset()
  vi.mocked(toast.error).mockReset()
})

// ── Paso 1: selección de productos ────────────────────────────────────────

describe('CreateSaleFlow — Paso 1: productos', () => {
  it('botón "Continuar" está deshabilitado cuando el carrito está vacío', async () => {
    render(<CreateSaleFlow />)

    // Espera que los productos carguen
    await screen.findByText(mockProducts[0].name)

    const continuarBtn = screen.getByRole('button', { name: /continuar/i })
    expect(continuarBtn).toBeDisabled()
  })

  it('agregar un producto lo muestra en el carrito con el precio correcto', async () => {
    render(<CreateSaleFlow />)
    const user = setupUser()

    const product = mockProducts[0] // Pan de campo, precio 850
    await screen.findByText(product.name)

    // Encuentra el card del producto y hace clic en el botón "+" (último botón dentro del card)
    const productCard = screen.getByText(product.name).closest('[class*="bg-card"]') as HTMLElement
    const addBtn = within(productCard).getAllByRole('button').at(-1)!
    await user.click(addBtn)

    // El producto aparece en el carrito (nombre visible en lista + carrito = 2 ocurrencias)
    await waitFor(() => {
      expect(screen.getAllByText(product.name, { exact: false })).toHaveLength(2)
    })

    // El botón "Continuar" ahora debe estar habilitado
    expect(screen.getByRole('button', { name: /continuar/i })).not.toBeDisabled()
  })

  it('muestra badge de "Stock insuficiente" cuando la cantidad supera el stock', async () => {
    render(<CreateSaleFlow />)
    const user = setupUser()

    // mockProducts[1] = Medialunas, stock_quantity = 3
    const product = mockProducts[1]
    await screen.findByText(product.name)

    const productCard = screen.getByText(product.name).closest('[class*="bg-card"]') as HTMLElement
    const addBtn = within(productCard).getAllByRole('button').at(-1)!

    // Agrega 4 unidades (stock es 3)
    await user.click(addBtn)
    await user.click(addBtn)
    await user.click(addBtn)
    await user.click(addBtn)

    expect(await screen.findByText(/stock insuficiente/i)).toBeInTheDocument()

    // El botón Continuar debe estar deshabilitado por stock insuficiente
    expect(screen.getByRole('button', { name: /continuar/i })).toBeDisabled()
  })
})

// ── Paso 2: cierre de venta ───────────────────────────────────────────────

describe('CreateSaleFlow — Paso 2: cierre', () => {
  async function goToStep2() {
    render(<CreateSaleFlow />)
    const user = setupUser()

    // Agrega un producto al carrito (Pan de campo, stock 20)
    const product = mockProducts[0]
    await screen.findByText(product.name)

    const productCard = screen.getByText(product.name).closest('[class*="bg-card"]') as HTMLElement
    const addBtn = within(productCard).getAllByRole('button').at(-1)!
    await user.click(addBtn)

    // Avanza al paso 2
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    // Verifica que estamos en paso 2
    await screen.findByRole('button', { name: /confirmar venta/i })

    return user
  }

  it('muestra el preview de puntos de fidelidad cuando se selecciona un cliente (RN-007)', async () => {
    const user = await goToStep2()

    // Busca el cliente María García (150 pts, id cust-0000-0000-0000-000000000001)
    const customerInput = screen.getByPlaceholderText(/buscar por nombre o email/i)
    await user.type(customerInput, 'María')

    // Selecciona el cliente de la lista desplegable
    await user.click(await screen.findByText('María García'))

    // Debe mostrar la estimación de puntos (total 850, ratio 10 → 85 puntos)
    await waitFor(() => {
      expect(screen.getByText(/acumulará/i)).toBeInTheDocument()
    })
  })

  it('submit → POST /sales → toast de éxito → navega a /app/ventas', async () => {
    server.use(
      http.post(`${BASE}/api/v1/sales`, () =>
        HttpResponse.json(mockSaleWithItems, { status: 201 }),
      ),
    )

    await goToStep2()

    await setupUser().click(screen.getByRole('button', { name: /confirmar venta/i }))

    await waitFor(() => {
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
        expect.stringContaining(mockSaleWithItems.sale_number),
      )
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app/ventas', { replace: true })
    })
  })
})
