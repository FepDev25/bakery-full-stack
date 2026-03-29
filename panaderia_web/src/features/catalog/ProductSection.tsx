import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'

import {
  createProduct,
  deleteProduct,
  listCategories,
  listProducts,
  updateProduct,
  type ProductResponse,
  type ProductUnit,
} from '@/api/catalog'
import { DataTable } from '@/components/shared/DataTable'
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

// Schema
const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  price: z.coerce.number().positive('Debe ser mayor a 0'),
  unit: z.enum(['unidad', 'kg', 'gramo', 'docena', 'media docena']),
  min_stock_alert: z.coerce.number().min(0),
  category_id: z.string().min(1, 'Seleccioná una categoría'),
})
type ProductForm = z.infer<typeof productSchema>

const UNIT_LABELS: Record<ProductUnit, string> = {
  unidad: 'Unidad',
  kg: 'Kilogramo',
  gramo: 'Gramo',
  docena: 'Docena',
  'media docena': 'Media docena',
}

// Drawer form
function ProductDrawer({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: ProductResponse | null
}) {
  const qc = useQueryClient()
  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: () => listCategories(1, 100) })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema) as Resolver<ProductForm>,
    defaultValues: { unit: 'unidad', min_stock_alert: 0 },
  })

  useEffect(() => {
    if (open) {
      reset(
        editing
          ? {
              name: editing.name,
              description: editing.description ?? '',
              price: editing.price,
              unit: editing.unit,
              min_stock_alert: editing.min_stock_alert,
              category_id: editing.category_id,
            }
          : { unit: 'unidad', min_stock_alert: 0, name: '', price: 0, category_id: '' },
      )
    }
  }, [open, editing, reset])

  const onSubmit = async (values: ProductForm) => {
    if (editing) {
      await updateProduct(editing.id, values)
    } else {
      await createProduct(values)
    }
    await qc.invalidateQueries({ queryKey: ['products'] })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="mb-6">
          <SheetTitle>{editing ? 'Editar producto' : 'Nuevo producto'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Nombre *</Label>
            <Input id="p-name" {...register('name')} autoFocus />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-desc">Descripción</Label>
            <Input id="p-desc" {...register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-price">Precio *</Label>
              <Input id="p-price" type="number" step="0.01" min="0" {...register('price')} />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Unidad</Label>
              <Select
                value={watch('unit')}
                onValueChange={(v) => setValue('unit', v as ProductUnit)}
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

          <div className="space-y-1.5">
            <Label htmlFor="p-stock-min">Stock mínimo de alerta</Label>
            <Input id="p-stock-min" type="number" step="0.01" min="0" {...register('min_stock_alert')} />
          </div>

          <div className="space-y-1.5">
            <Label>Categoría *</Label>
            <Select
              value={watch('category_id')}
              onValueChange={(v) => setValue('category_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná una categoría" />
              </SelectTrigger>
              <SelectContent>
                {cats?.items.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && (
              <p className="text-xs text-destructive">{errors.category_id.message}</p>
            )}
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

// Main section
export function ProductSection() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<ProductResponse | null>(null)
  const [deleting, setDeleting] = useState<ProductResponse | null>(null)

  const { data: cats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => listCategories(1, 100),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () => listProducts({ page, search: search || undefined }),
  })

  // Client-side filter by category (no backend param)
  const filtered = useMemo(() => {
    if (!data) return data
    if (categoryFilter === 'all') return data
    return { ...data, items: data.items.filter((p) => p.category_id === categoryFilter) }
  }, [data, categoryFilter])

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['products'] })
      const prev = qc.getQueryData(['products', page, search])
      qc.setQueryData(['products', page, search], (old: typeof data) =>
        old ? { ...old, items: old.items.filter((p) => p.id !== id) } : old,
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['products', page, search], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  const catName = (id: string) => cats?.items.find((c) => c.id === id)?.name ?? '—'

  const columns: ColumnDef<ProductResponse, unknown>[] = [
    {
      header: 'Producto',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{catName(row.original.category_id)}</p>
        </div>
      ),
    },
    {
      header: 'Precio',
      accessorKey: 'price',
      cell: ({ getValue }) => formatCurrency(getValue() as number),
    },
    {
      header: 'Stock',
      accessorKey: 'stock_quantity',
      cell: ({ row }) => {
        const { stock_quantity, min_stock_alert } = row.original
        const low = stock_quantity <= min_stock_alert
        return (
          <div className="flex items-center gap-1.5">
            <span className={low ? 'font-semibold text-amber-600' : ''}>
              {stock_quantity} {row.original.unit}
            </span>
            {low && (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-label="Stock bajo" />
            )}
          </div>
        )
      },
    },
    {
      header: 'Estado',
      accessorKey: 'is_active',
      cell: ({ getValue }) =>
        getValue() ? (
          <Badge variant="secondary" className="text-xs">Activo</Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground">Inactivo</Badge>
        ),
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
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar producto…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="max-w-xs"
        />
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {cats?.items.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="ml-auto"
          onClick={() => { setEditing(null); setDrawerOpen(true) }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Nuevo producto
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filtered?.items ?? []}
        page={page}
        pageSize={20}
        total={filtered?.total ?? 0}
        totalPages={filtered?.total_pages ?? 1}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No hay productos."
      />

      <ProductDrawer open={drawerOpen} onOpenChange={setDrawerOpen} editing={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => { if (!v) setDeleting(null) }}
        title="Eliminar producto"
        description={`¿Eliminar "${deleting?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
      />
    </div>
  )
}
