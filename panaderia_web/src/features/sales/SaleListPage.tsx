import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { listSales, type SaleResponse } from '@/api/sales'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { SaleDetailSheet } from './SaleDetailSheet'

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta_debito: 'Débito',
  tarjeta_credito: 'Crédito',
  transferencia: 'Transf.',
  qr: 'QR',
}

export default function SaleListPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completada' | 'cancelada'>('all')
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['sales', page, fromDate, toDate],
    queryFn: () =>
      listSales({
        page,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      }),
  })

  // Status filter is client-side
  const filteredItems =
    statusFilter === 'all'
      ? (data?.items ?? [])
      : (data?.items ?? []).filter((s) => s.status === statusFilter)

  const columns: ColumnDef<SaleResponse, unknown>[] = [
    {
      header: 'N°',
      accessorKey: 'sale_number',
      cell: ({ getValue }) => (
        <span className="font-mono text-sm">{getValue() as string}</span>
      ),
    },
    {
      header: 'Fecha',
      accessorKey: 'sale_date',
      cell: ({ getValue }) => formatDateTime(getValue() as string),
    },
    {
      header: 'Total',
      accessorKey: 'total_amount',
      cell: ({ getValue }) => (
        <span className="font-semibold">{formatCurrency(getValue() as number)}</span>
      ),
    },
    {
      header: 'Pago',
      accessorKey: 'payment_method',
      cell: ({ getValue }) => (
        <Badge variant="outline" className="text-xs font-normal">
          {PAYMENT_LABELS[getValue() as string] ?? getValue() as string}
        </Badge>
      ),
    },
    {
      header: 'Estado',
      accessorKey: 'status',
      cell: ({ getValue }) => <StatusBadge status={getValue() as 'completada' | 'cancelada'} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => setSelectedSaleId(row.original.id)}
        >
          Ver detalle
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Ventas</h2>
          <p className="text-sm text-muted-foreground">Historial de ventas del sistema.</p>
        </div>
        <Button onClick={() => navigate('/app/ventas/nueva')}>
          <Plus className="mr-1.5 h-4 w-4" /> Nueva venta
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Desde</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
            className="w-36"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hasta</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1) }}
            className="w-36"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Estado</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="completada">Completada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(fromDate || toDate || statusFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => { setFromDate(''); setToDate(''); setStatusFilter('all'); setPage(1) }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filteredItems}
        page={page}
        pageSize={20}
        total={data?.total ?? 0}
        totalPages={data?.total_pages ?? 1}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No hay ventas en el período seleccionado."
      />

      <SaleDetailSheet
        saleId={selectedSaleId}
        onOpenChange={(open) => { if (!open) setSelectedSaleId(null) }}
      />
    </div>
  )
}
