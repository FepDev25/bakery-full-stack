import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CategorySection } from './CategorySection'
import { IngredientSection } from './IngredientSection'
import { ProductSection } from './ProductSection'
import { RecipeSection } from './RecipeSection'

export default function CatalogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Catálogo</h2>
        <p className="text-sm text-muted-foreground">
          Administrá productos, categorías, ingredientes y recetas.
        </p>
      </div>

      <Tabs defaultValue="productos">
        <TabsList className="mb-4">
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
          <TabsTrigger value="ingredientes">Ingredientes</TabsTrigger>
          <TabsTrigger value="recetas">Recetas</TabsTrigger>
        </TabsList>

        <TabsContent value="productos">
          <ProductSection />
        </TabsContent>
        <TabsContent value="categorias">
          <CategorySection />
        </TabsContent>
        <TabsContent value="ingredientes">
          <IngredientSection />
        </TabsContent>
        <TabsContent value="recetas">
          <RecipeSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
