import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  createSupplier,
  deleteSupplier,
  listSuppliers,
  updateSupplier,
  type SupplierResponse,
} from '@/api/inventory'
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
import { useAuthStore } from '@/features/auth/useAuthStore'

const supplierSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  tax_id: z.string().optional(),
})
type SupplierForm = z.infer<typeof supplierSchema>

export default function SupplierSection() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<SupplierResponse | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SupplierResponse | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => listSuppliers({ pageSize: 200 }),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema) as Resolver<SupplierForm>,
  })

  useEffect(() => {
    if (editing) {
      reset({
        name: editing.name,
        contact_person: editing.contact_person ?? '',
        phone: editing.phone ?? '',
        email: editing.email ?? '',
        address: editing.address ?? '',
        tax_id: editing.tax_id ?? '',
      })
    } else {
      reset({ name: '', contact_person: '', phone: '', email: '', address: '', tax_id: '' })
    }
  }, [editing, reset])

  const createMutation = useMutation({
    mutationFn: (values: SupplierForm) =>
      createSupplier({
        name: values.name,
        contact_person: values.contact_person || null,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        tax_id: values.tax_id || null,
      }),
    onSuccess: () => {
      toast.success('Proveedor creado.')
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setSheetOpen(false)
    },
    onError: () => toast.error('No se pudo crear el proveedor.'),
  })

  const updateMutation = useMutation({
    mutationFn: (values: SupplierForm) =>
      updateSupplier(editing!.id, {
        name: values.name,
        contact_person: values.contact_person || null,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        tax_id: values.tax_id || null,
      }),
    onSuccess: () => {
      toast.success('Proveedor actualizado.')
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setSheetOpen(false)
      setEditing(null)
    },
    onError: () => toast.error('No se pudo actualizar el proveedor.'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteSupplier(confirmDelete!.id),
    onSuccess: () => {
      toast.success('Proveedor eliminado.')
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setConfirmDelete(null)
    },
    onError: () => {
      toast.error('No se pudo eliminar el proveedor.')
      setConfirmDelete(null)
    },
  })

  const onSubmit = (values: SupplierForm) => {
    if (editing) updateMutation.mutate(values)
    else createMutation.mutate(values)
  }

  const openCreate = () => {
    setEditing(null)
    setSheetOpen(true)
  }

  const openEdit = (supplier: SupplierResponse) => {
    setEditing(supplier)
    setSheetOpen(true)
  }

  const columns: ColumnDef<SupplierResponse, unknown>[] = [
    {
      header: 'Nombre',
      accessorKey: 'name',
      cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span>,
    },
    {
      header: 'Contacto',
      accessorKey: 'contact_person',
      cell: ({ getValue }) => (getValue() as string | null) ?? '—',
    },
    {
      header: 'Teléfono',
      accessorKey: 'phone',
      cell: ({ getValue }) => (getValue() as string | null) ?? '—',
    },
    {
      header: 'Email',
      accessorKey: 'email',
      cell: ({ getValue }) => (getValue() as string | null) ?? '—',
    },
    {
      header: 'CUIT/RUT',
      accessorKey: 'tax_id',
      cell: ({ getValue }) => (getValue() as string | null) ?? '—',
    },
    {
      header: 'Estado',
      accessorKey: 'is_active',
      cell: ({ getValue }) =>
        getValue() ? (
          <Badge variant="outline" className="border-green-400/60 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">Activo</Badge>
        ) : (
          <Badge variant="secondary">Inactivo</Badge>
        ),
    },
    ...(isAdmin
      ? [
          {
            id: 'actions',
            header: '',
            cell: ({ row }: { row: { original: SupplierResponse } }) => (
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
          } as ColumnDef<SupplierResponse, unknown>,
        ]
      : []),
  ]

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> Nuevo proveedor
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        page={1}
        pageSize={200}
        total={data?.total ?? 0}
        totalPages={1}
        onPageChange={() => {}}
        isLoading={isLoading}
        emptyMessage="No hay proveedores registrados."
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
            <SheetTitle>{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-name">Nombre *</Label>
              <Input id="s-name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-contact">Persona de contacto</Label>
              <Input id="s-contact" {...register('contact_person')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-phone">Teléfono</Label>
                <Input id="s-phone" {...register('phone')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-tax">CUIT / RUT</Label>
                <Input id="s-tax" {...register('tax_id')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-email">Email</Label>
              <Input id="s-email" type="email" {...register('email')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-address">Dirección</Label>
              <Input id="s-address" {...register('address')} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setSheetOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
              >
                {editing ? 'Guardar cambios' : 'Crear proveedor'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Eliminar proveedor"
        description={`¿Eliminar a "${confirmDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  )
}
