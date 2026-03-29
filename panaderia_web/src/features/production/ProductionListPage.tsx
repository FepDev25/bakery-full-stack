import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { listBatches, type BatchStatus, type ProductionBatchResponse } from '@/api/production'
import { listProducts } from '@/api/catalog'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/format'

export default function ProductionListPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<BatchStatus | 'all'>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['batches', page],
    queryFn: () => listBatches({ page }),
  })

  const { data: products } = useQuery({
    queryKey: ['products', 1, ''],
    queryFn: () => listProducts({ page: 1, pageSize: 100 }),
  })

  const productName = (id: string) =>
    products?.items.find((p) => p.id === id)?.name ?? id.slice(0, 8) + '…'

  // Filtro de estado cliente-side (backend no lo soporta como param)
  const filtered =
    statusFilter === 'all'
      ? (data?.items ?? [])
      : (data?.items ?? []).filter((b) => b.status === statusFilter)

  const columns: ColumnDef<ProductionBatchResponse, unknown>[] = [
    {
      header: 'Producto',
      accessorKey: 'product_id',
      cell: ({ getValue }) => (
        <span className="font-medium">{productName(getValue() as string)}</span>
      ),
    },
    {
      header: 'Cantidad',
      accessorKey: 'quantity_produced',
      cell: ({ row }) => `${row.original.quantity_produced} ${row.original.unit}`,
    },
    {
      header: 'Costo ingredientes',
      accessorKey: 'ingredient_cost',
      cell: ({ getValue }) => formatCurrency(getValue() as number),
    },
    {
      header: 'Fecha',
      accessorKey: 'production_date',
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
    {
      header: 'Estado',
      accessorKey: 'status',
      cell: ({ getValue }) => <StatusBadge status={getValue() as BatchStatus} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => navigate(`/app/produccion/${row.original.id}`)}
        >
          Ver lote
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Producción</h2>
          <p className="text-sm text-muted-foreground">Lotes de producción y trazabilidad.</p>
        </div>
        <Button onClick={() => navigate('/app/produccion/nuevo')}>
          <Plus className="mr-1.5 h-4 w-4" /> Nuevo lote
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1) }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="en_proceso">En proceso</SelectItem>
            <SelectItem value="completado">Completado</SelectItem>
            <SelectItem value="descartado">Descartado</SelectItem>
          </SelectContent>
        </Select>
        {statusFilter !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setStatusFilter('all')}
          >
            Limpiar
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        page={page}
        pageSize={20}
        total={data?.total ?? 0}
        totalPages={data?.total_pages ?? 1}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No hay lotes de producción."
      />
    </div>
  )
}
