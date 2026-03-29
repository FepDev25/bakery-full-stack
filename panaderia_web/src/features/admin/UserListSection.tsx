import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, PowerOff, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { createUser, listUsers, updateUser, type UserResponse } from '@/api/users'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Role } from '@/features/auth/useAuthStore'
import { useAuthStore } from '@/features/auth/useAuthStore'
import { formatDateTime } from '@/lib/format'

const ROLES: Role[] = ['admin', 'cajero', 'panadero', 'contador']

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  cajero: 'Cajero',
  panadero: 'Panadero',
  contador: 'Contador',
}

const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300',
  cajero: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300',
  panadero: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300',
  contador: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300',
}

// ── Create form ─────────────────────────────────────────────────────────────

const createSchema = z.object({
  email: z.string().email('Email inválido'),
  full_name: z.string().min(1, 'El nombre es requerido'),
  role: z.enum(['admin', 'cajero', 'panadero', 'contador']),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})
type CreateForm = z.infer<typeof createSchema>

// ── Edit form (role + active only) ─────────────────────────────────────────

const editSchema = z.object({
  full_name: z.string().min(1, 'El nombre es requerido'),
  role: z.enum(['admin', 'cajero', 'panadero', 'contador']),
})
type EditForm = z.infer<typeof editSchema>

// ── Component ───────────────────────────────────────────────────────────────

export default function UserListSection() {
  const qc = useQueryClient()
  const { user: me } = useAuthStore()

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', activeFilter],
    queryFn: () =>
      listUsers({
        is_active: activeFilter === 'all' ? undefined : activeFilter === 'active',
        limit: 200,
      }),
  })

  // Client-side search
  const filtered = search.trim()
    ? users.filter(
        (u) =>
          u.full_name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      )
    : users

  // ── Create mutation ─────────────────────────────────────────────────────

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema) as Resolver<CreateForm>,
    defaultValues: { role: 'cajero' },
  })

  const createMutation = useMutation({
    mutationFn: (values: CreateForm) =>
      createUser({
        email: values.email,
        full_name: values.full_name,
        role: values.role,
        password: values.password,
      }),
    onSuccess: () => {
      toast.success('Usuario creado.')
      qc.invalidateQueries({ queryKey: ['users'] })
      setCreateOpen(false)
      createForm.reset()
    },
    onError: () => toast.error('No se pudo crear el usuario. El email puede estar en uso.'),
  })

  // ── Edit mutation ───────────────────────────────────────────────────────

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema) as Resolver<EditForm>,
  })

  useEffect(() => {
    if (editingUser) {
      editForm.reset({ full_name: editingUser.full_name, role: editingUser.role })
    }
  }, [editingUser, editForm])

  const editMutation = useMutation({
    mutationFn: (values: EditForm) =>
      updateUser(editingUser!.id, { full_name: values.full_name, role: values.role }),
    onSuccess: () => {
      toast.success('Usuario actualizado.')
      qc.invalidateQueries({ queryKey: ['users'] })
      setEditingUser(null)
    },
    onError: () => toast.error('No se pudo actualizar el usuario.'),
  })

  // ── Toggle active mutation ──────────────────────────────────────────────

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateUser(id, { is_active }),
    onSuccess: (_, { is_active }) => {
      toast.success(is_active ? 'Usuario activado.' : 'Usuario desactivado.')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('No se pudo cambiar el estado del usuario.'),
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select
          value={activeFilter}
          onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>

        <Button className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Nuevo usuario
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No hay usuarios.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Último acceso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id} className={!u.is_active ? 'opacity-60' : undefined}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ROLE_COLORS[u.role]}>
                      {ROLE_LABELS[u.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.last_login ? formatDateTime(u.last_login) : '—'}
                  </TableCell>
                  <TableCell>
                    {u.is_active ? (
                      <Badge variant="outline" className="border-green-400/60 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${u.full_name}`}
                        onClick={() => setEditingUser(u)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={u.id === me?.id || toggleMutation.isPending}
                        aria-label={u.is_active ? `Desactivar ${u.full_name}` : `Activar ${u.full_name}`}
                        title={u.id === me?.id ? 'No podés desactivarte a vos mismo' : undefined}
                        className={u.is_active ? 'text-destructive hover:text-destructive' : 'text-emerald-600 hover:text-emerald-600'}
                        onClick={() => toggleMutation.mutate({ id: u.id, is_active: !u.is_active })}
                      >
                        <PowerOff className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Sheet: crear usuario */}
      <Sheet open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) createForm.reset() }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nuevo usuario</SheetTitle>
          </SheetHeader>

          <form
            onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))}
            className="mt-6 space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="u-name">Nombre completo *</Label>
              <Input id="u-name" {...createForm.register('full_name')} />
              {createForm.formState.errors.full_name && (
                <p className="text-xs text-destructive">{createForm.formState.errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-email">Email *</Label>
              <Input id="u-email" type="email" {...createForm.register('email')} />
              {createForm.formState.errors.email && (
                <p className="text-xs text-destructive">{createForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Rol *</Label>
              <Select
                value={createForm.watch('role') ?? 'cajero'}
                onValueChange={(v) => createForm.setValue('role', v as Role)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-pass">Contraseña inicial *</Label>
              <Input id="u-pass" type="password" {...createForm.register('password')} />
              {createForm.formState.errors.password && (
                <p className="text-xs text-destructive">{createForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createForm.formState.isSubmitting || createMutation.isPending}
              >
                Crear usuario
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Sheet: editar usuario */}
      <Sheet open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar usuario</SheetTitle>
          </SheetHeader>

          <form
            onSubmit={editForm.handleSubmit((v) => editMutation.mutate(v))}
            className="mt-6 space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="eu-name">Nombre completo *</Label>
              <Input id="eu-name" {...editForm.register('full_name')} />
              {editForm.formState.errors.full_name && (
                <p className="text-xs text-destructive">{editForm.formState.errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Rol *</Label>
              <Select
                value={editForm.watch('role') ?? 'cajero'}
                onValueChange={(v) => editForm.setValue('role', v as Role)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setEditingUser(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={editForm.formState.isSubmitting || editMutation.isPending}
              >
                Guardar cambios
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
