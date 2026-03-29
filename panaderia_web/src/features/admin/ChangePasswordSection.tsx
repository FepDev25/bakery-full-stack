import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { changePassword } from '@/api/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/features/auth/useAuthStore'

const schema = z
  .object({
    current_password: z.string().min(1, 'Ingresá tu contraseña actual'),
    new_password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm_password: z.string().min(1, 'Confirmá la nueva contraseña'),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  })
type ChangePasswordForm = z.infer<typeof schema>

export default function ChangePasswordSection() {
  const { user } = useAuthStore()
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(schema) as Resolver<ChangePasswordForm>,
  })

  const mutation = useMutation({
    mutationFn: (values: ChangePasswordForm) =>
      changePassword(user!.id, {
        current_password: values.current_password,
        new_password: values.new_password,
      }),
    onSuccess: () => {
      toast.success('Contraseña actualizada correctamente.')
      reset()
      setSuccess(true)
    },
    onError: () => {
      toast.error('No se pudo cambiar la contraseña. Verificá la contraseña actual.')
    },
  })

  const onSubmit = (values: ChangePasswordForm) => {
    setSuccess(false)
    mutation.mutate(values)
  }

  return (
    <div className="max-w-md space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          Cambiá tu contraseña de acceso. La nueva contraseña debe tener al menos 8 caracteres.
        </p>
        {user && (
          <p className="mt-1 text-sm">
            Usuario:{' '}
            <span className="font-medium">{user.full_name}</span>{' '}
            <span className="text-muted-foreground">({user.email})</span>
          </p>
        )}
      </div>

      <Separator />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="cp-current">Contraseña actual *</Label>
          <Input id="cp-current" type="password" autoComplete="current-password" {...register('current_password')} />
          {errors.current_password && (
            <p className="text-xs text-destructive">{errors.current_password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cp-new">Nueva contraseña *</Label>
          <Input id="cp-new" type="password" autoComplete="new-password" {...register('new_password')} />
          {errors.new_password && (
            <p className="text-xs text-destructive">{errors.new_password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cp-confirm">Confirmá la nueva contraseña *</Label>
          <Input id="cp-confirm" type="password" autoComplete="new-password" {...register('confirm_password')} />
          {errors.confirm_password && (
            <p className="text-xs text-destructive">{errors.confirm_password.message}</p>
          )}
        </div>

        {success && (
          <div className="flex items-center gap-2 rounded-md border border-green-400/50 bg-green-50 px-3 py-2.5 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Contraseña actualizada correctamente.
          </div>
        )}

        <Button type="submit" disabled={isSubmitting || mutation.isPending}>
          {(isSubmitting || mutation.isPending) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Cambiar contraseña
        </Button>
      </form>
    </div>
  )
}
