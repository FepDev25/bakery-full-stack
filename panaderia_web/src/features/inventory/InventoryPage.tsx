import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PurchaseSection from './PurchaseSection'
import StockSection from './StockSection'
import SupplierSection from './SupplierSection'

export default function InventoryPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Inventario</h2>
        <p className="text-sm text-muted-foreground">
          Stock de ingredientes, compras y proveedores.
        </p>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="compras">Compras</TabsTrigger>
          <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4">
          <StockSection />
        </TabsContent>

        <TabsContent value="compras" className="mt-4">
          <PurchaseSection />
        </TabsContent>

        <TabsContent value="proveedores" className="mt-4">
          <SupplierSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
