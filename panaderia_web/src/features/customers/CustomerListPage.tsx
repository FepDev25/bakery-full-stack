import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Eye, Loader2, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
  type CustomerResponse,
} from '@/api/customers'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

// Schema
const customerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
})
type CustomerForm = z.infer<typeof customerSchema>

// Drawer form
function CustomerDrawer({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: CustomerResponse | null
}) {
  const qc = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema) as Resolver<CustomerForm>,
  })

  useEffect(() => {
    if (open) {
      reset({
        name: editing?.name ?? '',
        email: editing?.email ?? '',
        phone: editing?.phone ?? '',
        address: editing?.address ?? '',
      })
    }
  }, [open, editing, reset])

  const onSubmit = async (values: CustomerForm) => {
    const body = {
      name: values.name,
      email: values.email || null,
      phone: values.phone || null,
      address: values.address || null,
    }
    if (editing) {
      await updateCustomer(editing.id, body)
      toast.success('Cliente actualizado.')
    } else {
      await createCustomer(body)
      toast.success('Cliente creado.')
    }
    await qc.invalidateQueries({ queryKey: ['customers'] })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="mb-6">
          <SheetTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Nombre *</Label>
            <Input id="c-name" {...register('name')} autoFocus />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-email">Email</Label>
            <Input id="c-email" type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-phone">Teléfono</Label>
            <Input id="c-phone" type="tel" {...register('phone')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-address">Dirección</Label>
            <Input id="c-address" {...register('address')} />
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

// Main page
export default function CustomerListPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerResponse | null>(null)
  const [deleting, setDeleting] = useState<CustomerResponse | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page],
    queryFn: () => listCustomers({ page }),
  })

  // Client-side search
  const filtered = search
    ? (data?.items ?? []).filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.email?.toLowerCase().includes(search.toLowerCase()) ?? false),
      )
    : (data?.items ?? [])

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['customers'] })
      const prev = qc.getQueryData(['customers', page])
      qc.setQueryData(['customers', page], (old: typeof data) =>
        old ? { ...old, items: old.items.filter((c) => c.id !== id) } : old,
      )
      return { prev }
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['customers', page], ctx.prev)
      toast.error('No se pudo eliminar el cliente.')
    },
    onSuccess: () => toast.success('Cliente eliminado.'),
    onSettled: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })

  const columns: ColumnDef<CustomerResponse, unknown>[] = [
    {
      header: 'Cliente',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          {row.original.email && (
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Teléfono',
      accessorKey: 'phone',
      cell: ({ getValue }) => (
        <span className="text-sm">{(getValue() as string | null) ?? '—'}</span>
      ),
    },
    {
      header: 'Puntos',
      accessorKey: 'loyalty_points',
      cell: ({ getValue }) => {
        const pts = getValue() as number
        return (
          <div className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-semibold">{pts}</span>
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
            onClick={() => navigate(`/app/clientes/${row.original.id}`)}
          >
            <Eye className="h-4 w-4" aria-label="Ver detalle" />
          </Button>
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Clientes</h2>
          <p className="text-sm text-muted-foreground">Gestión de clientes y fidelización.</p>
        </div>
        <Button onClick={() => { setEditing(null); setDrawerOpen(true) }}>
          <Plus className="mr-1.5 h-4 w-4" /> Nuevo cliente
        </Button>
      </div>

      <Input
        placeholder="Buscar por nombre o email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      <DataTable
        columns={columns}
        data={filtered}
        page={page}
        pageSize={20}
        total={data?.total ?? 0}
        totalPages={data?.total_pages ?? 1}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No hay clientes."
      />

      <CustomerDrawer open={drawerOpen} onOpenChange={setDrawerOpen} editing={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => { if (!v) setDeleting(null) }}
        title="Eliminar cliente"
        description={`¿Eliminar a "${deleting?.name}"? Se perderá su historial de puntos.`}
        confirmLabel="Eliminar"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
      />
    </div>
  )
}
