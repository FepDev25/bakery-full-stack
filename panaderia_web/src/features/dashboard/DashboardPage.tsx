import { AlertTriangle, Loader2, ShoppingCart, Truck } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Estructura de cada tarjeta de métrica
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

// Placeholder — los valores reales se conectan en Sprint 9
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Resumen del día</h2>
        <p className="text-sm text-muted-foreground">
          Las métricas en tiempo real estarán disponibles en la próxima versión.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Ventas del día"
          value="—"
          description="Total facturado hoy"
          icon={ShoppingCart}
          iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <MetricCard
          title="Lotes activos"
          value="—"
          description="En proceso de producción"
          icon={Truck}
          iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        />
        <MetricCard
          title="Stock bajo"
          value="—"
          description="Ingredientes por debajo del mínimo"
          icon={AlertTriangle}
          iconClassName="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          alert={false}
        />
      </div>

      {/* Espacio para futuros gráficos (Sprint 9) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex min-h-48 items-center justify-center border-dashed">
          <p className="text-sm text-muted-foreground">Gráfico de ventas semanales — Sprint 9</p>
        </Card>
        <Card className="flex min-h-48 items-center justify-center border-dashed">
          <p className="text-sm text-muted-foreground">Top productos del mes — Sprint 9</p>
        </Card>
      </div>
    </div>
  )
}
