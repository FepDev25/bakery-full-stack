import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Respuesta estándar paginada del backend
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number        // 1-indexed
  page_size: number
  total_pages: number
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  // Paginación server-side
  page: number          // 1-indexed, igual que el backend
  pageSize: number
  total: number
  totalPages: number
  onPageChange: (page: number) => void
  isLoading?: boolean
  emptyMessage?: string
}

export function DataTable<TData>({
  columns,
  data,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  isLoading = false,
  emptyMessage = 'No hay datos.',
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // La paginación es server-side, no se usa el paginador interno de TanStack
    manualPagination: true,
    pageCount: totalPages,
  })

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/40 hover:bg-muted/40">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="font-semibold text-foreground/70 text-xs uppercase tracking-wide">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Skeleton rows
              Array.from({ length: pageSize > 5 ? 5 : pageSize }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Controles de paginación */}
      {total > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            Mostrando {from}–{to} de {total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[4rem] text-center text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
