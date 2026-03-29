import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { listIngredients, type IngredientUnit } from '@/api/catalog'
import {
  createPurchase,
  listPurchases,
  listPurchasesByIngredient,
  listPurchasesBySupplier,
  listSuppliers,
  type IngredientPurchaseResponse,
} from '@/api/inventory'
import { DataTable } from '@/components/shared/DataTable'
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
import { formatCurrency, formatDate } from '@/lib/format'

const UNIT_LABELS: Record<string, string> = {
  kg: 'kg', gramo: 'g', litro: 'L', ml: 'mL', unidad: 'u',
}

const UNITS: IngredientUnit[] = ['kg', 'gramo', 'litro', 'ml', 'unidad']

const purchaseSchema = z.object({
  supplier_id: z.string().min(1, 'Seleccioná un proveedor'),
  ingredient_id: z.string().min(1, 'Seleccioná un ingrediente'),
  quantity: z.coerce.number().positive('Debe ser mayor a 0'),
  unit: z.enum(['kg', 'gramo', 'litro', 'ml', 'unidad']),
  unit_price: z.coerce.number().positive('Debe ser mayor a 0'),
  purchase_date: z.string().min(1, 'La fecha es requerida'),
  invoice_number: z.string().optional(),
  notes: z.string().optional(),
})
type PurchaseForm = z.infer<typeof purchaseSchema>

export default function PurchaseSection() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [supplierFilter, setSupplierFilter] = useState<string>('')
  const [ingredientFilter, setIngredientFilter] = useState<string>('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)

  // Purchases query — switches endpoint based on active filter
  const { data, isLoading } = useQuery({
    queryKey: ['purchases', page, supplierFilter, ingredientFilter],
    queryFn: () => {
      if (supplierFilter) return listPurchasesBySupplier(supplierFilter, { page })
      if (ingredientFilter) return listPurchasesByIngredient(ingredientFilter, { page })
      return listPurchases({ page })
    },
  })

  // Supporting data for names + form selects
  const { data: suppliersPage } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => listSuppliers({ pageSize: 100 }),
  })
  const { data: ingredientsPage } = useQuery({
    queryKey: ['ingredients', 1],
    queryFn: () => listIngredients({ page: 1, pageSize: 100 }),
  })

  const supplierName = (id: string) =>
    suppliersPage?.items.find((s) => s.id === id)?.name ?? id.slice(0, 8) + '…'
  const ingredientName = (id: string) =>
    ingredientsPage?.items.find((i) => i.id === id)?.name ?? id.slice(0, 8) + '…'

  // Client-side date filter
  const filtered = (data?.items ?? []).filter((p) => {
    if (fromDate && p.purchase_date < fromDate) return false
    if (toDate && p.purchase_date > toDate) return false
    return true
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseForm>({
    resolver: zodResolver(purchaseSchema) as Resolver<PurchaseForm>,
    defaultValues: {
      purchase_date: new Date().toISOString().slice(0, 10),
      unit: 'kg',
      quantity: 1,
      unit_price: 0,
    },
  })

  const selectedIngredientId = watch('ingredient_id')
  const quantity = watch('quantity') || 0
  const unitPrice = watch('unit_price') || 0

  const createMutation = useMutation({
    mutationFn: (values: PurchaseForm) =>
      createPurchase({
        supplier_id: values.supplier_id,
        ingredient_id: values.ingredient_id,
        quantity: values.quantity,
        unit: values.unit,
        unit_price: values.unit_price,
        purchase_date: values.purchase_date,
        invoice_number: values.invoice_number || null,
        notes: values.notes || null,
      }),
    onSuccess: () => {
      toast.success('Compra registrada. El stock del ingrediente fue actualizado.')
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['ingredients'] })
      setSheetOpen(false)
      reset()
    },
    onError: () => toast.error('No se pudo registrar la compra.'),
  })

  const onSubmit = (values: PurchaseForm) => createMutation.mutate(values)

  const clearFilters = () => {
    setSupplierFilter('')
    setIngredientFilter('')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  const hasFilters = supplierFilter || ingredientFilter || fromDate || toDate

  const columns: ColumnDef<IngredientPurchaseResponse, unknown>[] = [
    {
      header: 'Fecha',
      accessorKey: 'purchase_date',
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
    {
      header: 'Ingrediente',
      accessorKey: 'ingredient_id',
      cell: ({ getValue }) => (
        <span className="font-medium">{ingredientName(getValue() as string)}</span>
      ),
    },
    {
      header: 'Proveedor',
      accessorKey: 'supplier_id',
      cell: ({ getValue }) => supplierName(getValue() as string),
    },
    {
      header: 'Cantidad',
      accessorKey: 'quantity',
      cell: ({ row }) =>
        `${row.original.quantity} ${UNIT_LABELS[row.original.unit] ?? row.original.unit}`,
    },
    {
      header: 'Precio unitario',
      accessorKey: 'unit_price',
      cell: ({ getValue }) => formatCurrency(getValue() as number),
    },
    {
      header: 'Total',
      accessorKey: 'total_amount',
      cell: ({ getValue }) => (
        <span className="font-semibold">{formatCurrency(getValue() as number)}</span>
      ),
    },
    {
      header: 'Factura',
      accessorKey: 'invoice_number',
      cell: ({ getValue }) => (getValue() as string | null) ?? '—',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Supplier filter */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Proveedor</Label>
          <Select
            value={supplierFilter || 'all'}
            onValueChange={(v) => {
              setSupplierFilter(v === 'all' ? '' : v)
              setIngredientFilter('')
              setPage(1)
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los proveedores</SelectItem>
              {suppliersPage?.items.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ingredient filter */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Ingrediente</Label>
          <Select
            value={ingredientFilter || 'all'}
            onValueChange={(v) => {
              setIngredientFilter(v === 'all' ? '' : v)
              setSupplierFilter('')
              setPage(1)
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los ingredientes</SelectItem>
              {ingredientsPage?.items.map((i) => (
                <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date range */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Desde</Label>
          <Input
            type="date"
            className="w-36"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Hasta</Label>
          <Input
            type="date"
            className="w-36"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1) }}
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}

        <div className="ml-auto">
          <Button onClick={() => setSheetOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Registrar compra
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        page={page}
        pageSize={20}
        total={data?.total ?? 0}
        totalPages={data?.total_pages ?? 1}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No hay compras registradas."
      />

      {/* Sheet: crear compra */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { setSheetOpen(o); if (!o) reset() }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Registrar compra</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Proveedor *</Label>
              <Select
                value={watch('supplier_id') ?? ''}
                onValueChange={(v) => setValue('supplier_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná un proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliersPage?.items.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.supplier_id && (
                <p className="text-xs text-destructive">{errors.supplier_id.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Ingrediente *</Label>
              <Select
                value={selectedIngredientId ?? ''}
                onValueChange={(v) => {
                  setValue('ingredient_id', v)
                  // Auto-fill unit from ingredient
                  const ing = ingredientsPage?.items.find((i) => i.id === v)
                  if (ing) setValue('unit', ing.unit)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná un ingrediente" />
                </SelectTrigger>
                <SelectContent>
                  {ingredientsPage?.items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.ingredient_id && (
                <p className="text-xs text-destructive">{errors.ingredient_id.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-qty">Cantidad *</Label>
                <Input id="p-qty" type="number" step="0.001" min="0.001" {...register('quantity')} />
                {errors.quantity && (
                  <p className="text-xs text-destructive">{errors.quantity.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Unidad *</Label>
                <Select
                  value={watch('unit') ?? 'kg'}
                  onValueChange={(v) => setValue('unit', v as IngredientUnit)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-price">Precio unitario *</Label>
                <Input id="p-price" type="number" step="0.01" min="0.01" {...register('unit_price')} />
                {errors.unit_price && (
                  <p className="text-xs text-destructive">{errors.unit_price.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-date">Fecha *</Label>
                <Input id="p-date" type="date" {...register('purchase_date')} />
                {errors.purchase_date && (
                  <p className="text-xs text-destructive">{errors.purchase_date.message}</p>
                )}
              </div>
            </div>

            {/* Total preview */}
            {quantity > 0 && unitPrice > 0 && (
              <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Total estimado</span>
                <span className="font-semibold">{formatCurrency(quantity * unitPrice)}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="p-invoice">N° de factura (opcional)</Label>
              <Input id="p-invoice" placeholder="FAC-0001" {...register('invoice_number')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-notes">Notas (opcional)</Label>
              <Input id="p-notes" placeholder="Observaciones…" {...register('notes')} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setSheetOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                Registrar compra
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
