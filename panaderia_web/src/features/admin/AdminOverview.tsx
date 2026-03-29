import { useQueries } from '@tanstack/react-query'
import { Loader2, Package, ShoppingCart, Truck, Users, Wallet } from 'lucide-react'

import { listIngredients, listProducts } from '@/api/catalog'
import { listExpenses } from '@/api/finance'
import { listBatches } from '@/api/production'
import { listSales } from '@/api/sales'
import { listUsers } from '@/api/users'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'
import type { Role } from '@/features/auth/useAuthStore'

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  cajero: 'Cajero',
  panadero: 'Panadero',
  contador: 'Contador',
}

const todayStr = new Date().toISOString().slice(0, 10)
const startOfMonth = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
})()

interface StatCardProps {
  title: string
  value: string | number
  sub?: string
  icon: React.ElementType
  iconClass: string
  loading: boolean
}

function StatCard({ title, value, sub, icon: Icon, iconClass, loading }: StatCardProps) {
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
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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

export default function AdminOverview() {
  const [usersQ, salesQ, batchesQ, ingredientsQ, productsQ, expensesQ] = useQueries({
    queries: [
      { queryKey: ['users', 'all'], queryFn: () => listUsers({ limit: 200 }) },
      {
        queryKey: ['overview-sales', todayStr],
        queryFn: () => listSales({ from_date: startOfMonth, to_date: todayStr, pageSize: 100 }),
      },
      { queryKey: ['overview-batches'], queryFn: () => listBatches({ pageSize: 100 }) },
      { queryKey: ['overview-ingredients'], queryFn: () => listIngredients({ page: 1, pageSize: 100 }) },
      { queryKey: ['overview-products'], queryFn: () => listProducts({ page: 1, pageSize: 100 }) },
      {
        queryKey: ['overview-expenses', startOfMonth, todayStr],
        queryFn: () => listExpenses({ from_date: startOfMonth, to_date: todayStr, pageSize: 100 }),
      },
    ],
  })

  const users = usersQ.data ?? []
  const sales = (salesQ.data?.items ?? []).filter((s) => s.status === 'completada')
  const batches = batchesQ.data?.items ?? []
  const ingredients = ingredientsQ.data?.items ?? []
  const products = productsQ.data?.items ?? []
  const expenses = expensesQ.data?.items ?? []

  const monthRevenue = sales.reduce((s, x) => s + x.total_amount, 0)
  const monthExpenses = expenses.reduce((s, x) => s + x.amount, 0)
  const activeBatches = batches.filter((b) => b.status === 'en_proceso').length
  const lowStockIngredients = ingredients.filter((i) => i.stock_quantity <= i.min_stock_alert).length
  const lowStockProducts = products.filter((p) => p.stock_quantity <= p.min_stock_alert).length

  // Users by role
  const byRole = ROLE_LABELS
  const roleCounts = Object.entries(byRole).map(([role, label]) => ({
    label,
    count: users.filter((u) => u.role === role && u.is_active).length,
  }))

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Ventas del mes"
          value={formatCurrency(monthRevenue)}
          sub={`${sales.length} transacciones completadas`}
          icon={ShoppingCart}
          iconClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          loading={salesQ.isLoading}
        />
        <StatCard
          title="Gastos del mes"
          value={formatCurrency(monthExpenses)}
          sub={`${expenses.length} registros`}
          icon={Wallet}
          iconClass="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          loading={expensesQ.isLoading}
        />
        <StatCard
          title="Lotes activos"
          value={activeBatches}
          sub={`${batches.filter((b) => b.status === 'completado').length} completados en total`}
          icon={Truck}
          iconClass="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          loading={batchesQ.isLoading}
        />
        <StatCard
          title="Usuarios activos"
          value={users.filter((u) => u.is_active).length}
          sub={`${users.filter((u) => !u.is_active).length} inactivos`}
          icon={Users}
          iconClass="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
          loading={usersQ.isLoading}
        />
        <StatCard
          title="Ingredientes con stock bajo"
          value={lowStockIngredients}
          sub={`De ${ingredients.length} ingredientes totales`}
          icon={Package}
          iconClass="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
          loading={ingredientsQ.isLoading}
        />
        <StatCard
          title="Productos con stock bajo"
          value={lowStockProducts}
          sub={`De ${products.length} productos activos`}
          icon={Package}
          iconClass="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          loading={productsQ.isLoading}
        />
      </div>

      {/* Users by role */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Usuarios por rol (activos)
        </h3>
        {usersQ.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {roleCounts.map(({ label, count }) => (
              <div
                key={label}
                className="rounded-lg border bg-card px-4 py-3 text-center"
              >
                <p className="text-2xl font-bold">{count}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
