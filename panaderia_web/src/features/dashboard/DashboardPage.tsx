import { useQueries } from '@tanstack/react-query'
import { AlertTriangle, Loader2, ShoppingCart, Truck } from 'lucide-react'

import { listIngredients } from '@/api/catalog'
import { listBatches } from '@/api/production'
import { listSales } from '@/api/sales'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/features/auth/useAuthStore'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'

// Metric Card

interface MetricCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ElementType
  iconClassName?: string
  loading?: boolean
  alert?: boolean
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  iconClassName,
  loading = false,
  alert = false,
}: MetricCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', alert && 'border-amber-300 dark:border-amber-800')}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn('rounded-md p-1.5', iconClassName ?? 'bg-primary/10 text-primary')}>
          <Icon className="h-4 w-4" aria-hidden />
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
            <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
      {alert && (
        <div className="absolute right-3 top-3">
          <span className="flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
        </div>
      )}
    </Card>
  )
}

// Dashboard

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const role = user?.role

  const canSeeSales = role === 'cajero' || role === 'admin'
  const canSeeProduction = role === 'panadero' || role === 'admin'
  const canSeeInventory = role === 'panadero' || role === 'contador' || role === 'admin'

  const todayStr = localToday()

  const [salesQuery, batchesQuery, ingredientsQuery] = useQueries({
    queries: [
      {
        queryKey: ['dash-sales', todayStr],
        queryFn: () =>
          listSales({ from_date: todayStr, to_date: todayStr, pageSize: 100 }),
        enabled: canSeeSales,
      },
      {
        queryKey: ['dash-batches'],
        queryFn: () => listBatches({ pageSize: 100 }),
        enabled: canSeeProduction,
      },
      {
        queryKey: ['dash-ingredients'],
        queryFn: () => listIngredients({ page: 1, pageSize: 100 }),
        enabled: canSeeInventory,
      },
    ],
  })

  const todaySales = (salesQuery.data?.items ?? []).filter((s) => s.status === 'completada')
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total_amount, 0)

  const activeBatches = (batchesQuery.data?.items ?? []).filter((b) => b.status === 'en_proceso')

  const lowStockIngredients = (ingredientsQuery.data?.items ?? []).filter(
    (i) => i.stock_quantity <= i.min_stock_alert,
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Resumen del día</h2>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {canSeeSales && (
          <MetricCard
            title="Ventas del día"
            value={salesQuery.isLoading ? '—' : formatCurrency(todayRevenue)}
            description={
              salesQuery.isLoading ? '' : `${todaySales.length} venta${todaySales.length !== 1 ? 's' : ''} completada${todaySales.length !== 1 ? 's' : ''}`
            }
            icon={ShoppingCart}
            iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            loading={salesQuery.isLoading}
          />
        )}

        {canSeeProduction && (
          <MetricCard
            title="Lotes activos"
            value={batchesQuery.isLoading ? '—' : activeBatches.length}
            description="En proceso de producción"
            icon={Truck}
            iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            loading={batchesQuery.isLoading}
          />
        )}

        {canSeeInventory && (
          <MetricCard
            title="Stock bajo"
            value={ingredientsQuery.isLoading ? '—' : lowStockIngredients.length}
            description="Ingredientes por debajo del mínimo"
            icon={AlertTriangle}
            iconClassName="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            alert={!ingredientsQuery.isLoading && lowStockIngredients.length > 0}
            loading={ingredientsQuery.isLoading}
          />
        )}
      </div>
    </div>
  )
}
