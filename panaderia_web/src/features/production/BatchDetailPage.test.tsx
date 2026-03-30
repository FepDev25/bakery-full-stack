import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { toast } from 'sonner'
import BatchDetailPage from './BatchDetailPage'
import { server } from '@/test/msw/server'
import { mockBatches } from '@/test/msw/fixtures'
import { render, screen, waitFor, setupUser, setAuthUser, within } from '@/test/utils'

const BASE = 'http://localhost:8000'

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

const BATCH_EN_PROCESO = mockBatches[0] // status: 'en_proceso'
const BATCH_COMPLETADO = mockBatches[1] // status: 'completado'

function renderBatchDetail(batchId: string) {
  return render(
    <Routes>
      <Route path="/app/produccion/:id" element={<BatchDetailPage />} />
    </Routes>,
    { initialEntries: [`/app/produccion/${batchId}`] },
  )
}

beforeEach(() => {
  setAuthUser('panadero')
  mockNavigate.mockReset()
  vi.mocked(toast.success).mockReset()
  vi.mocked(toast.info).mockReset()
})

// ── Lote en proceso — acciones disponibles ────────────────────────────────

describe('BatchDetailPage — lote en_proceso', () => {
  it('completar lote: ConfirmDialog → confirmar → toast "stock actualizado" (RN-002)', async () => {
    server.use(
      http.post(`${BASE}/api/v1/production-batches/${BATCH_EN_PROCESO.id}/complete`, () =>
        HttpResponse.json({ ...BATCH_EN_PROCESO, status: 'completado' }),
      ),
    )

    renderBatchDetail(BATCH_EN_PROCESO.id)
    const user = setupUser()

    // Espera que cargue el detalle (botón de acción solo aparece cuando status='en_proceso')
    await screen.findByRole('button', { name: /completar lote/i })

    // Clic en "Completar"
    await user.click(screen.getByRole('button', { name: /completar lote/i }))

    // ConfirmDialog debe aparecer
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: /completar lote/i })).toBeInTheDocument()

    // Confirmar
    await user.click(screen.getByRole('button', { name: /^completar$/i }))

    // Toast con mención a stock actualizado (RN-002)
    await waitFor(() => {
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
        expect.stringMatching(/stock|completado/i),
      )
    })
  })

  it('descartar lote: ConfirmDialog muestra texto del impacto → confirmar → toast (RN-008)', async () => {
    server.use(
      http.post(`${BASE}/api/v1/production-batches/${BATCH_EN_PROCESO.id}/discard`, () =>
        HttpResponse.json({ ...BATCH_EN_PROCESO, status: 'descartado' }),
      ),
    )

    renderBatchDetail(BATCH_EN_PROCESO.id)
    const user = setupUser()

    // Espera que cargue (botón solo aparece en 'en_proceso')
    await screen.findByRole('button', { name: /descartar lote/i })

    // Clic en "Descartar"
    await user.click(screen.getByRole('button', { name: /descartar lote/i }))

    // El dialog debe mencionar el impacto en ingredientes (RN-008)
    const dialog = await screen.findByRole('dialog')
    expect(dialog.textContent).toMatch(/ingrediente|consumir|stock/i)

    // Confirmar — scoped al dialog para evitar conflicto con el botón de acción
    await user.click(within(dialog).getByRole('button', { name: /^descartar lote$/i }))

    // Toast confirmando el descarte
    await waitFor(() => {
      expect(
        vi.mocked(toast.success).mock.calls.length +
          vi.mocked(toast.info).mock.calls.length,
      ).toBeGreaterThan(0)
    })
  })
})

// ── Lote ya completado — sin botones de acción ────────────────────────────

describe('BatchDetailPage — lote completado', () => {
  it('no muestra botones de "Completar" ni "Descartar"', async () => {
    server.use(
      http.get(`${BASE}/api/v1/production-batches/${BATCH_COMPLETADO.id}`, () =>
        HttpResponse.json(BATCH_COMPLETADO),
      ),
    )

    renderBatchDetail(BATCH_COMPLETADO.id)

    // Espera que cargue — el nombre del producto aparece en el heading
    await screen.findByText('Medialunas (x6)')

    expect(screen.queryByRole('button', { name: /completar lote/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /descartar lote/i })).not.toBeInTheDocument()
  })
})
