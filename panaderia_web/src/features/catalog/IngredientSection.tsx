import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'

import {
  createIngredient,
  deleteIngredient,
  listIngredients,
  updateIngredient,
  type IngredientResponse,
  type IngredientUnit,
} from '@/api/catalog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
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
  kg: 'Kilogramo',
  gramo: 'Gramo',
  litro: 'Litro',
  ml: 'Mililitro',
  unidad: 'Unidad',
}

const ingredientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  unit: z.enum(['kg', 'gramo', 'litro', 'ml', 'unidad']),
  min_stock_alert: z.coerce.number().min(0),
})
type IngredientForm = z.infer<typeof ingredientSchema>

function IngredientDrawer({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: IngredientResponse | null
}) {
  const qc = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<IngredientForm>({
    resolver: zodResolver(ingredientSchema) as Resolver<IngredientForm>,
    defaultValues: { unit: 'kg', min_stock_alert: 0 },
  })

  useEffect(() => {
    if (open) {
      reset(
        editing
          ? { name: editing.name, unit: editing.unit, min_stock_alert: editing.min_stock_alert }
          : { unit: 'kg', min_stock_alert: 0, name: '' },
      )
    }
  }, [open, editing, reset])

  const onSubmit = async (values: IngredientForm) => {
    if (editing) {
      await updateIngredient(editing.id, values)
    } else {
      await createIngredient(values)
    }
    await qc.invalidateQueries({ queryKey: ['ingredients'] })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="mb-6">
          <SheetTitle>{editing ? 'Editar ingrediente' : 'Nuevo ingrediente'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="ing-name">Nombre *</Label>
            <Input id="ing-name" {...register('name')} autoFocus />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
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

          <div className="space-y-1.5">
            <Label htmlFor="ing-min-stock">Stock mínimo de alerta</Label>
            <Input id="ing-min-stock" type="number" step="0.001" min="0" {...register('min_stock_alert')} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" type="button" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export function IngredientSection() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<IngredientResponse | null>(null)
  const [deleting, setDeleting] = useState<IngredientResponse | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['ingredients', page],
    queryFn: () => listIngredients({ page }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteIngredient(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['ingredients'] })
      const prev = qc.getQueryData(['ingredients', page])
      qc.setQueryData(['ingredients', page], (old: typeof data) =>
        old ? { ...old, items: old.items.filter((i) => i.id !== id) } : old,
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['ingredients', page], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['ingredients'] }),
  })

  const columns: ColumnDef<IngredientResponse, unknown>[] = [
    {
      header: 'Ingrediente',
      accessorKey: 'name',
      cell: ({ getValue }) => <p className="font-medium">{getValue() as string}</p>,
    },
    {
      header: 'Unidad',
      accessorKey: 'unit',
      cell: ({ getValue }) => UNIT_LABELS[getValue() as IngredientUnit],
    },
    {
      header: 'Costo unitario',
      accessorKey: 'unit_cost',
      cell: ({ getValue }) => formatCurrency(getValue() as number),
    },
    {
      header: 'Stock',
      accessorKey: 'stock_quantity',
      cell: ({ row }) => {
        const { stock_quantity, min_stock_alert, unit } = row.original
        const low = stock_quantity <= min_stock_alert
        return (
          <div className="flex items-center gap-1.5">
            <span className={low ? 'font-semibold text-amber-600 dark:text-amber-400' : ''}>
              {stock_quantity} {unit}
            </span>
            {low && (
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-50 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
              >
                <AlertTriangle className="mr-1 h-3 w-3" />
                Stock bajo
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setEditing(row.original); setDrawerOpen(true) }}
          >
            <Pencil className="h-4 w-4" aria-label="Editar" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleting(row.original)}
          >
            <Trash2 className="h-4 w-4" aria-label="Eliminar" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing(null); setDrawerOpen(true) }}>
          <Plus className="mr-1.5 h-4 w-4" /> Nuevo ingrediente
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        page={page}
        pageSize={20}
        total={data?.total ?? 0}
        totalPages={data?.total_pages ?? 1}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No hay ingredientes."
      />

      <IngredientDrawer open={drawerOpen} onOpenChange={setDrawerOpen} editing={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => { if (!v) setDeleting(null) }}
        title="Eliminar ingrediente"
        description={`¿Eliminar "${deleting?.name}"? Esto afecta las recetas que lo usan.`}
        confirmLabel="Eliminar"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
      />
    </div>
  )
}
