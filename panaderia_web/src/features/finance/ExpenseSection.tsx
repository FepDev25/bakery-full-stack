import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  createExpense,
  deleteExpense,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  listExpenses,
  updateExpense,
  type ExpenseCategory,
  type ExpenseResponse,
} from '@/api/finance'
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
import { formatCurrency, formatDate } from '@/lib/format'

const expenseSchema = z.object({
  category: z.enum([
    'alquiler',
    'servicios',
    'salarios',
    'mantenimiento',
    'marketing',
    'impuestos',
    'otros',
  ]),
  description: z.string().min(1, 'La descripción es requerida'),
  amount: z.coerce.number().positive('Debe ser mayor a 0'),
  expense_date: z.string().min(1, 'La fecha es requerida'),
  invoice_number: z.string().optional(),
  notes: z.string().optional(),
})
type ExpenseForm = z.infer<typeof expenseSchema>

export default function ExpenseSection() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<ExpenseResponse | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ExpenseResponse | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', page, fromDate, toDate],
    queryFn: () =>
      listExpenses({
        page,
        pageSize: 20,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      }),
  })

  // Client-side category filter
  const filtered =
    categoryFilter === 'all'
      ? (data?.items ?? [])
      : (data?.items ?? []).filter((e) => e.category === categoryFilter)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema) as Resolver<ExpenseForm>,
    defaultValues: {
      expense_date: new Date().toISOString().slice(0, 10),
      category: 'otros',
    },
  })

  useEffect(() => {
    if (editing) {
      reset({
        category: editing.category,
        description: editing.description,
        amount: editing.amount,
        expense_date: editing.expense_date,
        invoice_number: editing.invoice_number ?? '',
        notes: editing.notes ?? '',
      })
    } else {
      reset({
        expense_date: new Date().toISOString().slice(0, 10),
        category: 'otros',
        description: '',
        amount: 0,
        invoice_number: '',
        notes: '',
      })
    }
  }, [editing, reset])

  const createMutation = useMutation({
    mutationFn: (values: ExpenseForm) =>
      createExpense({
        category: values.category,
        description: values.description,
        amount: values.amount,
        expense_date: values.expense_date,
        invoice_number: values.invoice_number || null,
        notes: values.notes || null,
      }),
    onSuccess: () => {
      toast.success('Gasto registrado.')
      qc.invalidateQueries({ queryKey: ['expenses'] })
      setSheetOpen(false)
    },
    onError: () => toast.error('No se pudo registrar el gasto.'),
  })

  const updateMutation = useMutation({
    mutationFn: (values: ExpenseForm) =>
      updateExpense(editing!.id, {
        category: values.category,
        description: values.description,
        amount: values.amount,
        expense_date: values.expense_date,
        invoice_number: values.invoice_number || null,
        notes: values.notes || null,
      }),
    onSuccess: () => {
      toast.success('Gasto actualizado.')
      qc.invalidateQueries({ queryKey: ['expenses'] })
      setSheetOpen(false)
      setEditing(null)
    },
    onError: () => toast.error('No se pudo actualizar el gasto.'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteExpense(confirmDelete!.id),
    onSuccess: () => {
      toast.success('Gasto eliminado.')
      qc.invalidateQueries({ queryKey: ['expenses'] })
      setConfirmDelete(null)
    },
    onError: () => {
      toast.error('No se pudo eliminar el gasto.')
      setConfirmDelete(null)
    },
  })

  const onSubmit = (values: ExpenseForm) => {
    if (editing) updateMutation.mutate(values)
    else createMutation.mutate(values)
  }

  const openCreate = () => {
    setEditing(null)
    setSheetOpen(true)
  }

  const openEdit = (expense: ExpenseResponse) => {
    setEditing(expense)
    setSheetOpen(true)
  }

  const hasFilters = categoryFilter !== 'all' || fromDate || toDate

  const clearFilters = () => {
    setCategoryFilter('all')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  const columns: ColumnDef<ExpenseResponse, unknown>[] = [
    {
      header: 'Fecha',
      accessorKey: 'expense_date',
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
    {
      header: 'Categoría',
      accessorKey: 'category',
      cell: ({ getValue }) => (
        <Badge variant="secondary">{EXPENSE_CATEGORY_LABELS[getValue() as ExpenseCategory]}</Badge>
      ),
    },
    {
      header: 'Descripción',
      accessorKey: 'description',
      cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span>,
    },
    {
      header: 'Monto',
      accessorKey: 'amount',
      cell: ({ getValue }) => (
        <span className="font-semibold">{formatCurrency(getValue() as number)}</span>
      ),
    },
    {
      header: 'Factura',
      accessorKey: 'invoice_number',
      cell: ({ getValue }) => (getValue() as string | null) ?? '—',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmDelete(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Categoría</Label>
          <Select
            value={categoryFilter}
            onValueChange={(v) => {
              setCategoryFilter(v as typeof categoryFilter)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {EXPENSE_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Desde</Label>
          <Input
            type="date"
            className="w-36"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Hasta</Label>
          <Input
            type="date"
            className="w-36"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value)
              setPage(1)
            }}
          />
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={clearFilters}
          >
            <X className="h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}

        <div className="ml-auto">
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> Nuevo gasto
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
        emptyMessage="No hay gastos registrados."
      />

      {/* Sheet crear/editar */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o)
          if (!o) setEditing(null)
        }}
      >
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Editar gasto' : 'Nuevo gasto'}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Categoría *</Label>
              <Select
                value={watch('category') ?? 'otros'}
                onValueChange={(v) => setValue('category', v as ExpenseCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {EXPENSE_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-xs text-destructive">{errors.category.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e-desc">Descripción *</Label>
              <Input id="e-desc" placeholder="Ej: Pago de alquiler enero" {...register('description')} />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="e-amount">Monto *</Label>
                <Input id="e-amount" type="number" step="0.01" min="0.01" {...register('amount')} />
                {errors.amount && (
                  <p className="text-xs text-destructive">{errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-date">Fecha *</Label>
                <Input id="e-date" type="date" {...register('expense_date')} />
                {errors.expense_date && (
                  <p className="text-xs text-destructive">{errors.expense_date.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e-invoice">N° de factura (opcional)</Label>
              <Input id="e-invoice" placeholder="FAC-0001" {...register('invoice_number')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e-notes">Notas (opcional)</Label>
              <Input id="e-notes" placeholder="Observaciones…" {...register('notes')} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setSheetOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
              >
                {editing ? 'Guardar cambios' : 'Registrar gasto'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Eliminar gasto"
        description={`¿Eliminar "${confirmDelete?.description}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  )
}
