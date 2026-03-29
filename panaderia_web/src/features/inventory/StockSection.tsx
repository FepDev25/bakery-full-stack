import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'

import { listIngredients, type IngredientResponse } from '@/api/catalog'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/format'

const UNIT_LABELS: Record<string, string> = {
  kg: 'kg', gramo: 'g', litro: 'L', ml: 'mL', unidad: 'u',
}

export default function StockSection() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['ingredients', page],
    queryFn: () => listIngredients({ page, pageSize: 30 }),
  })

  const columns: ColumnDef<IngredientResponse, unknown>[] = [
    {
      header: 'Ingrediente',
      accessorKey: 'name',
      cell: ({ row }) => {
        const isLow = row.original.stock_quantity <= row.original.min_stock_alert
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            {isLow && (
              <Badge
                variant="outline"
                className="border-amber-400/60 bg-amber-50 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
              >
                <AlertTriangle className="mr-1 h-3 w-3" />
                Stock bajo
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      header: 'Stock actual',
      accessorKey: 'stock_quantity',
      cell: ({ row }) => {
        const isLow = row.original.stock_quantity <= row.original.min_stock_alert
        return (
          <span className={isLow ? 'font-semibold text-amber-600 dark:text-amber-400' : ''}>
            {row.original.stock_quantity} {UNIT_LABELS[row.original.unit] ?? row.original.unit}
          </span>
        )
      },
    },
    {
      header: 'Mínimo',
      accessorKey: 'min_stock_alert',
      cell: ({ row }) =>
        `${row.original.min_stock_alert} ${UNIT_LABELS[row.original.unit] ?? row.original.unit}`,
    },
    {
      header: 'Costo unitario',
      accessorKey: 'unit_cost',
      cell: ({ getValue }) => formatCurrency(getValue() as number),
    },
    {
      header: 'Estado',
      id: 'estado',
      cell: ({ row }) => {
        if (!row.original.is_active)
          return <Badge variant="secondary">Inactivo</Badge>
        return (
          <Badge
            variant="outline"
            className={
              row.original.stock_quantity <= row.original.min_stock_alert
                ? 'border-amber-400/60 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                : 'border-green-400/60 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
            }
          >
            {row.original.stock_quantity <= row.original.min_stock_alert ? 'Bajo' : 'OK'}
          </Badge>
        )
      },
    },
  ]

  const lowStockCount = data?.items.filter((i) => i.stock_quantity <= i.min_stock_alert).length ?? 0

  return (
    <div className="space-y-4">
      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {lowStockCount} ingrediente{lowStockCount > 1 ? 's' : ''} con stock por debajo del
            mínimo.
          </span>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        page={page}
        pageSize={30}
        total={data?.total ?? 0}
        totalPages={data?.total_pages ?? 1}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No hay ingredientes registrados."
      />
    </div>
  )
}
