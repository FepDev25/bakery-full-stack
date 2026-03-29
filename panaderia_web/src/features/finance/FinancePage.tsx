import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ExpenseSection from './ExpenseSection'
import FinanceDashboard from './FinanceDashboard'
import SalesReport from './SalesReport'

export default function FinancePage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Finanzas</h2>
        <p className="text-sm text-muted-foreground">
          Métricas financieras, gastos y reportes de ventas.
        </p>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="gastos">Gastos</TabsTrigger>
          <TabsTrigger value="reporte">Reporte de ventas</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <FinanceDashboard />
        </TabsContent>

        <TabsContent value="gastos" className="mt-4">
          <ExpenseSection />
        </TabsContent>

        <TabsContent value="reporte" className="mt-4">
          <SalesReport />
        </TabsContent>
      </Tabs>
    </div>
  )
}
