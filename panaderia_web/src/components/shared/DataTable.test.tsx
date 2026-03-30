import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from './DataTable'
import { render, screen, fireEvent } from '@/test/utils'

// ── Fixtures ──────────────────────────────────────────────────────────────

interface Row {
  id: string
  name: string
}

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Nombre' },
]

const twoRows: Row[] = [
  { id: '1', name: 'Alpha' },
  { id: '2', name: 'Beta' },
]

const defaultProps = {
  columns,
  data: twoRows,
  page: 1,
  pageSize: 20,
  total: 2,
  totalPages: 1,
  onPageChange: vi.fn(),
}

// ── Renderizado de datos ──────────────────────────────────────────────────

describe('DataTable — renderizado de datos', () => {
  it('renderiza las filas correctamente a partir de data', () => {
    render(<DataTable {...defaultProps} />)

    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    // Cabeceras
    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('Nombre')).toBeInTheDocument()
  })

  it('muestra skeleton rows cuando isLoading=true', () => {
    render(<DataTable {...defaultProps} data={[]} isLoading total={0} totalPages={0} />)

    // Las skeleton rows tienen un div con animate-pulse
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
    // No deben mostrarse los textos de datos reales
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
  })

  it('muestra EmptyState cuando data=[] y no está cargando', () => {
    render(<DataTable {...defaultProps} data={[]} total={0} totalPages={0} emptyMessage="Sin resultados" />)

    expect(screen.getByText('Sin resultados')).toBeInTheDocument()
  })
})

// ── Paginación ────────────────────────────────────────────────────────────

describe('DataTable — paginación', () => {
  const paginatedProps = {
    ...defaultProps,
    total: 50,
    totalPages: 3,
  }

  it('el botón "anterior" está deshabilitado en page=1', () => {
    render(<DataTable {...paginatedProps} page={1} />)

    const prev = screen.getByRole('button', { name: /página anterior/i })
    expect(prev).toBeDisabled()
  })

  it('el botón "siguiente" está deshabilitado cuando page=totalPages', () => {
    render(<DataTable {...paginatedProps} page={3} />)

    const next = screen.getByRole('button', { name: /página siguiente/i })
    expect(next).toBeDisabled()
  })

  it('onPageChange se llama con page-1 al clickear "anterior"', () => {
    const onPageChange = vi.fn()
    render(<DataTable {...paginatedProps} page={2} onPageChange={onPageChange} />)

    fireEvent.click(screen.getByRole('button', { name: /página anterior/i }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('onPageChange se llama con page+1 al clickear "siguiente"', () => {
    const onPageChange = vi.fn()
    render(<DataTable {...paginatedProps} page={1} onPageChange={onPageChange} />)

    fireEvent.click(screen.getByRole('button', { name: /página siguiente/i }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('muestra el contador de registros correcto', () => {
    render(<DataTable {...paginatedProps} page={2} pageSize={20} total={50} />)

    expect(screen.getByText(/21.*40.*50/)).toBeInTheDocument()
  })

  it('no muestra controles de paginación cuando total=0', () => {
    render(<DataTable {...defaultProps} data={[]} total={0} totalPages={0} />)

    expect(screen.queryByRole('button', { name: /página anterior/i })).not.toBeInTheDocument()
  })
})
