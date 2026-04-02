import { useQueries } from '@tanstack/react-query'
import { TrendingDown, TrendingUp, Wallet, BarChart3, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { listExpenses } from '@/api/finance'
import { listBatches } from '@/api/production'
import { listSales } from '@/api/sales'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/format'

// ── Helpers ──────────────────────────────────────────────────────────────

function startOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** ISO week number (Mon–Sun) */
function isoWeek(dateStr: string): number {
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00')
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const diff = d.getTime() - startOfWeek1.getTime()
  return Math.floor(diff / (7 * 24 * 3600 * 1000)) + 1
}

function weekLabel(dateStr: string): string {
  const week = isoWeek(dateStr)
  const year = dateStr.slice(0, 4)
  return `S${week} '${year.slice(2)}`
}

// ── Metric Card ────────────────────────────────────────────────────────────

interface MetricProps {
  title: string
  value: string
  sub?: string
  icon: React.ElementType
  iconClass: string
  loading: boolean
}

function MetricCard({ title, value, sub, icon: Icon, iconClass, loading }: MetricProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`rounded-md p-1.5 ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Cargando…</span>
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function FinanceDashboard() {
  const [fromDate, setFromDate] = useState(startOfMonth)
  const [toDate, setToDate] = useState(today)

  const [salesQuery, expensesQuery, batchesQuery] = useQueries({
    queries: [
      {
        queryKey: ['fin-sales', fromDate, toDate],
        queryFn: () => listSales({ from_date: fromDate, to_date: toDate, pageSize: 100 }),
      },
      {
        queryKey: ['fin-expenses', fromDate, toDate],
        queryFn: () => listExpenses({ from_date: fromDate, to_date: toDate, pageSize: 100 }),
      },
      {
        queryKey: ['fin-batches'],
        queryFn: () => listBatches({ pageSize: 100 }),
      },
    ],
  })

  const isLoading = salesQuery.isLoading || expensesQuery.isLoading || batchesQuery.isLoading

  const metrics = useMemo(() => {
    const sales = salesQuery.data?.items ?? []
    const expenses = expensesQuery.data?.items ?? []
    const batches = batchesQuery.data?.items ?? []

    // Only completed sales
    const completedSales = sales.filter((s) => s.status === 'completada')
    const totalSales = completedSales.reduce((sum, s) => sum + s.total_amount, 0)

    // Completed batches in date range (client-side filter since backend has no date param)
    const productionCost = batches
      .filter(
        (b) =>
          b.status === 'completado' &&
          b.production_date >= fromDate &&
          b.production_date <= toDate,
      )
      .reduce((sum, b) => sum + b.ingredient_cost, 0)

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const margin = totalSales - productionCost - totalExpenses

    return { totalSales, productionCost, totalExpenses, margin, salesCount: completedSales.length }
  }, [salesQuery.data, expensesQuery.data, batchesQuery.data, fromDate, toDate])

  // Weekly sales chart data
  const weeklyData = useMemo(() => {
    const sales = (salesQuery.data?.items ?? []).filter((s) => s.status === 'completada')
    const byWeek: Record<string, { label: string; total: number; order: number }> = {}
    for (const s of sales) {
      const label = weekLabel(s.sale_date)
      if (!byWeek[label]) {
        byWeek[label] = { label, total: 0, order: new Date(s.sale_date).getTime() }
      }
      byWeek[label].total += s.total_amount
    }
    return Object.values(byWeek).sort((a, b) => a.order - b.order)
  }, [salesQuery.data])

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Período desde</Label>
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
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Ventas del período"
          value={formatCurrency(metrics.totalSales)}
          sub={`${metrics.salesCount} ventas completadas`}
          icon={TrendingUp}
          iconClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          loading={isLoading}
        />
        <MetricCard
          title="Costo de producción"
          value={formatCurrency(metrics.productionCost)}
          sub="Ingredientes de lotes completados"
          icon={BarChart3}
          iconClass="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          loading={isLoading}
        />
        <MetricCard
          title="Gastos del período"
          value={formatCurrency(metrics.totalExpenses)}
          sub="Alquiler, salarios, servicios, etc."
          icon={Wallet}
          iconClass="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          loading={isLoading}
        />
        <MetricCard
          title="Margen estimado"
          value={formatCurrency(metrics.margin)}
          sub="Ventas − producción − gastos"
          icon={TrendingDown}
          iconClass={
            metrics.margin >= 0
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-destructive/10 text-destructive'
          }
          loading={isLoading}
        />
      </div>

      {/* Weekly sales chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Ventas por semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : weeklyData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Sin datos de ventas en el período seleccionado.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                  }
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Ventas']}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '13px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
