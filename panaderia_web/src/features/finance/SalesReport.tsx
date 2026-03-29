import { useQuery } from '@tanstack/react-query'
import { Loader2, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { listSales } from '@/api/sales'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/format'

type GroupBy = 'day' | 'week'

function startOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function isoWeek(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00')
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  return Math.floor((d.getTime() - startOfWeek1.getTime()) / (7 * 24 * 3600 * 1000)) + 1
}

function groupKey(dateStr: string, by: GroupBy): string {
  if (by === 'day') return dateStr
  const week = isoWeek(dateStr)
  const year = dateStr.slice(0, 4)
  return `${year}-S${String(week).padStart(2, '0')}`
}

function groupLabel(key: string, by: GroupBy): string {
  if (by === 'day') return formatDate(key)
  const [year, week] = key.split('-S')
  return `Semana ${week} / ${year}`
}

export default function SalesReport() {
  const [fromDate, setFromDate] = useState(startOfMonth)
  const [toDate, setToDate] = useState(today)
  const [groupBy, setGroupBy] = useState<GroupBy>('day')

  const { data, isLoading } = useQuery({
    queryKey: ['report-sales', fromDate, toDate],
    queryFn: () =>
      listSales({ from_date: fromDate, to_date: toDate, pageSize: 100 }),
    enabled: !!fromDate && !!toDate,
  })

  const rows = useMemo(() => {
    const completedSales = (data?.items ?? []).filter((s) => s.status === 'completada')
    const grouped: Record<
      string,
      { key: string; count: number; total: number; subtotal: number; discount: number }
    > = {}

    for (const sale of completedSales) {
      const key = groupKey(sale.sale_date, groupBy)
      if (!grouped[key]) {
        grouped[key] = { key, count: 0, total: 0, subtotal: 0, discount: 0 }
      }
      grouped[key].count++
      grouped[key].total += sale.total_amount
      grouped[key].subtotal += sale.subtotal
      grouped[key].discount += sale.discount_amount
    }

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
  }, [data, groupBy])

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0)
  const grandCount = rows.reduce((sum, r) => sum + r.count, 0)

  const hasFilters = fromDate !== startOfMonth() || toDate !== today()

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Desde</Label>
          <Input
            type="date"
            className="w-36"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Hasta</Label>
          <Input
            type="date"
            className="w-36"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Agrupar por</Label>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Día</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => {
              setFromDate(startOfMonth())
              setToDate(today())
            }}
          >
            <X className="h-3.5 w-3.5" />
            Resetear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No hay ventas en el período seleccionado.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{groupBy === 'day' ? 'Fecha' : 'Semana'}</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">Descuentos</TableHead>
                <TableHead className="text-right font-semibold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-medium">
                    {groupLabel(row.key, groupBy)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{row.count}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(row.subtotal)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.discount > 0 ? `−${formatCurrency(row.discount)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(row.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Grand total row */}
          <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Total del período — {grandCount} ventas
            </span>
            <span className="text-lg font-bold">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
