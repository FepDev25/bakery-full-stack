import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type CategoryResponse,
} from '@/api/catalog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Schema
const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
})
type CategoryForm = z.infer<typeof categorySchema>

// Form modal
function CategoryModal({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: CategoryResponse | null
}) {
  const qc = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryForm>({ resolver: zodResolver(categorySchema) })

  useEffect(() => {
    if (open) {
      reset({ name: editing?.name ?? '', description: editing?.description ?? '' })
    }
  }, [open, editing, reset])

  const onSubmit = async (values: CategoryForm) => {
    if (editing) {
      await updateCategory(editing.id, values)
    } else {
      await createCategory(values)
    }
    await qc.invalidateQueries({ queryKey: ['categories'] })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Nombre *</Label>
            <Input id="cat-name" {...register('name')} autoFocus />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-desc">Descripción</Label>
            <Input id="cat-desc" {...register('description')} />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Main section
export function CategorySection() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryResponse | null>(null)
  const [deleting, setDeleting] = useState<CategoryResponse | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => listCategories(1, 100),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onMutate: async (id) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: ['categories'] })
      const prev = qc.getQueryData(['categories'])
      qc.setQueryData(['categories'], (old: typeof data) =>
        old ? { ...old, items: old.items.filter((c) => c.id !== id) } : old,
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['categories'], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })

  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (cat: CategoryResponse) => { setEditing(cat); setModalOpen(true) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data ? `${data.total} categorías` : ''}
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> Nueva categoría
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border bg-card">
          {data?.items.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay categorías. Creá la primera.
            </p>
          )}
          {data?.items.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{cat.name}</p>
                  {!cat.is_active && (
                    <Badge variant="secondary" className="text-xs">Inactiva</Badge>
                  )}
                </div>
                {cat.description && (
                  <p className="truncate text-xs text-muted-foreground">{cat.description}</p>
                )}
              </div>
              <div className="ml-4 flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" aria-label={`Editar ${cat.name}`} onClick={() => openEdit(cat)}>
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Eliminar ${cat.name}`}
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleting(cat)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CategoryModal open={modalOpen} onOpenChange={setModalOpen} editing={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => { if (!v) setDeleting(null) }}
        title="Eliminar categoría"
        description={`¿Eliminar "${deleting?.name}"? Los productos de esta categoría perderán su categoría.`}
        confirmLabel="Eliminar"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) {
            deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
          }
        }}
      />
    </div>
  )
}
