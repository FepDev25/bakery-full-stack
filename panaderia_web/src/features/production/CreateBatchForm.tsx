import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { listIngredients, listProducts, listRecipesByProduct } from '@/api/catalog'
import { createBatch } from '@/api/production'
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
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/format'

const UNIT_LABELS: Record<string, string> = {
  kg: 'kg', gramo: 'g', litro: 'L', ml: 'mL', unidad: 'u',
}

const batchSchema = z.object({
  product_id: z.string().min(1, 'Seleccioná un producto'),
  quantity_produced: z.coerce.number().positive('Debe ser mayor a 0'),
  production_date: z.string().min(1, 'La fecha es requerida'),
  notes: z.string().optional(),
})
type BatchForm = z.infer<typeof batchSchema>

export default function CreateBatchForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BatchForm>({
    resolver: zodResolver(batchSchema) as Resolver<BatchForm>,
    defaultValues: {
      production_date: new Date().toISOString().slice(0, 10),
      quantity_produced: 1,
    },
  })

  const selectedProductId = watch('product_id')
  const batchQty = watch('quantity_produced') || 0

  const { data: products } = useQuery({
    queryKey: ['products', 1, ''],
    queryFn: () => listProducts({ page: 1, pageSize: 100 }),
  })

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes', selectedProductId],
    queryFn: () => listRecipesByProduct(selectedProductId),
    enabled: !!selectedProductId,
  })

  const { data: ingredientsPage } = useQuery({
    queryKey: ['ingredients', 1],
    queryFn: () => listIngredients({ page: 1, pageSize: 100 }),
  })

  const selectedProduct = products?.items.find((p) => p.id === selectedProductId)

  // Sync unit from selected product
  useEffect(() => {
    if (selectedProduct) {
      setValue('quantity_produced', 1)
    }
  }, [selectedProduct, setValue])

  // Ingredientes necesarios = recipe_qty * batch_qty (calculado en cliente)
  const requiredIngredients = useMemo(() => {
    if (!ingredientsPage || !recipes.length) return []
    return recipes.map((rec) => {
      const ing = ingredientsPage.items.find((i) => i.id === rec.ingredient_id)
      const needed = rec.quantity * batchQty
      const hasStock = ing ? ing.stock_quantity >= needed : true
      return {
        id: rec.id,
        name: ing?.name ?? '—',
        needed,
        available: ing?.stock_quantity ?? 0,
        unit: UNIT_LABELS[rec.unit] ?? rec.unit,
        hasStock,
      }
    })
  }, [recipes, batchQty, ingredientsPage])

  const anyStockMissing = requiredIngredients.some((i) => !i.hasStock)

  // Parsear error 400 del backend para mostrar qué ingrediente falta
  const extractErrorMessage = (err: unknown): string => {
    const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
    if (typeof detail === 'string') return detail
    return 'No se pudo crear el lote. Verificá el stock de ingredientes.'
  }

  const createMutation = useMutation({
    mutationFn: (values: BatchForm) =>
      createBatch({
        product_id: values.product_id,
        quantity_produced: values.quantity_produced,
        unit: selectedProduct?.unit ?? 'unidad',
        production_date: values.production_date,
        notes: values.notes || null,
      }),
    onSuccess: (batch) => {
      toast.success(`Lote creado. Estado: En proceso.`)
      qc.invalidateQueries({ queryKey: ['batches'] })
      qc.invalidateQueries({ queryKey: ['ingredients'] })
      navigate(`/app/produccion/${batch.id}`, { replace: true })
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err))
    },
  })

  const onSubmit = (values: BatchForm) => createMutation.mutate(values)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Nuevo lote de producción</h2>
        <p className="text-sm text-muted-foreground">
          Los ingredientes se descuentan al iniciar el lote.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label>Producto *</Label>
            <Select
              value={selectedProductId ?? ''}
              onValueChange={(v) => setValue('product_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná un producto" />
              </SelectTrigger>
              <SelectContent>
                {products?.items.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.product_id && (
              <p className="text-xs text-destructive">{errors.product_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="b-qty">
                Cantidad a producir *
                {selectedProduct && (
                  <span className="ml-1 text-muted-foreground">({selectedProduct.unit})</span>
                )}
              </Label>
              <Input
                id="b-qty"
                type="number"
                step="0.001"
                min="0.001"
                {...register('quantity_produced')}
              />
              {errors.quantity_produced && (
                <p className="text-xs text-destructive">{errors.quantity_produced.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-date">Fecha de producción *</Label>
              <Input id="b-date" type="date" {...register('production_date')} />
              {errors.production_date && (
                <p className="text-xs text-destructive">{errors.production_date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="b-notes">Notas (opcional)</Label>
            <Input id="b-notes" placeholder="Observaciones del lote…" {...register('notes')} />
          </div>

          {anyStockMissing && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Stock insuficiente para producir esta cantidad. El backend rechazará la solicitud.
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              type="button"
              onClick={() => navigate('/app/produccion')}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
              {(isSubmitting || createMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Crear lote
            </Button>
          </div>
        </form>

        {/* Panel de ingredientes necesarios */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Ingredientes necesarios
          </h3>

          {!selectedProductId ? (
            <p className="text-sm text-muted-foreground">
              Seleccioná un producto para ver los ingredientes.
            </p>
          ) : recipes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este producto no tiene receta configurada.
            </p>
          ) : (
            <div className="divide-y divide-border rounded-lg border bg-card">
              {requiredIngredients.map((ing) => (
                <div
                  key={ing.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">{ing.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Disponible: {ing.available} {ing.unit}
                    </p>
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="font-mono text-xs"
                    >
                      {ing.needed.toFixed(3)} {ing.unit}
                    </Badge>
                    {!ing.hasStock && (
                      <Badge
                        variant="outline"
                        className="border-destructive/50 bg-destructive/5 text-xs text-destructive"
                      >
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Insuficiente
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Estimación de costo */}
          {selectedProductId && recipes.length > 0 && ingredientsPage && (
            <>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Costo estimado de ingredientes</span>
                <span className="font-semibold">
                  {formatCurrency(
                    requiredIngredients.reduce((sum, ing) => {
                      const ingData = ingredientsPage.items.find((i) => i.name === ing.name)
                      return sum + (ingData?.unit_cost ?? 0) * ing.needed
                    }, 0),
                  )}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
