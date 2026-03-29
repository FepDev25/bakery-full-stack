import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'

import {
  addRecipeIngredient,
  deleteRecipeIngredient,
  getProductionCost,
  listIngredients,
  listProducts,
  listRecipesByProduct,
  type IngredientUnit,
  type RecipeResponse,
} from '@/api/catalog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { formatCurrency } from '@/lib/format'

const UNIT_LABELS: Record<IngredientUnit, string> = {
  kg: 'kg', gramo: 'g', litro: 'L', ml: 'mL', unidad: 'u',
}

const recipeSchema = z.object({
  ingredient_id: z.string().min(1, 'Seleccioná un ingrediente'),
  quantity: z.coerce.number().positive('Debe ser mayor a 0'),
  unit: z.enum(['kg', 'gramo', 'litro', 'ml', 'unidad']),
})
type RecipeForm = z.infer<typeof recipeSchema>

function AddIngredientSheet({
  open,
  onOpenChange,
  productId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  productId: string
}) {
  const qc = useQueryClient()
  const { data: ings } = useQuery({
    queryKey: ['ingredients', 1],
    queryFn: () => listIngredients({ page: 1, pageSize: 100 }),
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RecipeForm>({
    resolver: zodResolver(recipeSchema) as Resolver<RecipeForm>,
    defaultValues: { unit: 'kg', quantity: 0 },
  })

  useEffect(() => {
    if (open) reset({ unit: 'kg', quantity: 0, ingredient_id: '' })
  }, [open, reset])

  // Sync unit from selected ingredient
  const selectedIngId = watch('ingredient_id')
  useEffect(() => {
    const ing = ings?.items.find((i) => i.id === selectedIngId)
    if (ing) setValue('unit', ing.unit)
  }, [selectedIngId, ings, setValue])

  const onSubmit = async (values: RecipeForm) => {
    await addRecipeIngredient({ ...values, product_id: productId })
    await qc.invalidateQueries({ queryKey: ['recipes', productId] })
    await qc.invalidateQueries({ queryKey: ['recipe-cost', productId] })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-sm">
        <SheetHeader className="mb-6">
          <SheetTitle>Agregar ingrediente a receta</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label>Ingrediente *</Label>
            <Select
              value={watch('ingredient_id')}
              onValueChange={(v) => setValue('ingredient_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná un ingrediente" />
              </SelectTrigger>
              <SelectContent>
                {ings?.items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} ({UNIT_LABELS[i.unit]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.ingredient_id && (
              <p className="text-xs text-destructive">{errors.ingredient_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rec-qty">Cantidad *</Label>
              <Input id="rec-qty" type="number" step="0.001" min="0" {...register('quantity')} />
              {errors.quantity && (
                <p className="text-xs text-destructive">{errors.quantity.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Unidad</Label>
              <Select
                value={watch('unit')}
                onValueChange={(v) => setValue('unit', v as IngredientUnit)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(UNIT_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" type="button" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Agregar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// Receta de un producto
function ProductRecipe({ productId }: { productId: string }) {
  const qc = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleting, setDeleting] = useState<RecipeResponse | null>(null)

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['recipes', productId],
    queryFn: () => listRecipesByProduct(productId),
  })

  const { data: cost } = useQuery({
    queryKey: ['recipe-cost', productId],
    queryFn: () => getProductionCost(productId),
    enabled: recipes.length > 0,
  })

  const { data: ings } = useQuery({
    queryKey: ['ingredients', 1],
    queryFn: () => listIngredients({ page: 1, pageSize: 100 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRecipeIngredient(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['recipes', productId] })
      const prev = qc.getQueryData(['recipes', productId])
      qc.setQueryData(['recipes', productId], (old: RecipeResponse[]) =>
        old.filter((r) => r.id !== id),
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['recipes', productId], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['recipes', productId] })
      qc.invalidateQueries({ queryKey: ['recipe-cost', productId] })
    },
  })

  const ingName = (id: string) => ings?.items.find((i) => i.id === id)?.name ?? '—'

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="divide-y divide-border rounded-lg border bg-card">
            {recipes.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sin ingredientes en la receta.
              </p>
            )}
            {recipes.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm font-medium">{ingName(rec.ingredient_id)}</span>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {rec.quantity} {UNIT_LABELS[rec.unit]}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleting(rec)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {cost && (
            <div className="flex items-center justify-between rounded-md bg-muted/50 px-4 py-2.5">
              <span className="text-sm text-muted-foreground">Costo de producción por unidad</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(cost.cost_per_unit)}
              </span>
            </div>
          )}

          <Button size="sm" variant="outline" onClick={() => setSheetOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Agregar ingrediente
          </Button>
        </>
      )}

      <AddIngredientSheet open={sheetOpen} onOpenChange={setSheetOpen} productId={productId} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => { if (!v) setDeleting(null) }}
        title="Quitar ingrediente"
        description={`¿Quitar "${ingName(deleting?.ingredient_id ?? '')}" de la receta?`}
        confirmLabel="Quitar"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
      />
    </div>
  )
}

// ── Main section ─────────────────────────────────────────────────────────────
export function RecipeSection() {
  const [selectedProductId, setSelectedProductId] = useState<string>('')

  const { data: products } = useQuery({
    queryKey: ['products', 1, ''],
    queryFn: () => listProducts({ page: 1, pageSize: 100 }),
  })

  return (
    <div className="space-y-5">
      <div className="max-w-xs space-y-1.5">
        <Label>Producto</Label>
        <Select value={selectedProductId} onValueChange={setSelectedProductId}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccioná un producto" />
          </SelectTrigger>
          <SelectContent>
            {products?.items.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProductId ? (
        <ProductRecipe productId={selectedProductId} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Seleccioná un producto para ver y editar su receta.
        </p>
      )}
    </div>
  )
}
