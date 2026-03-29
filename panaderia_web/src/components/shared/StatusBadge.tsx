import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Valores exactos del backend
type SaleStatus = 'completada' | 'cancelada'
type BatchStatus = 'en_proceso' | 'completado' | 'descartado'
export type AppStatus = SaleStatus | BatchStatus

const STATUS_CONFIG: Record<
  AppStatus,
  { label: string; className: string }
> = {
  // Ventas
  completada: {
    label: 'Completada',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  cancelada: {
    label: 'Cancelada',
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400',
  },
  // Producción
  en_proceso: {
    label: 'En proceso',
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
  },
  completado: {
    label: 'Completado',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  descartado: {
    label: 'Descartado',
    className: 'bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-800 dark:text-stone-400',
  },
}

interface StatusBadgeProps {
  status: AppStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge
      variant="outline"
      className={cn('font-medium', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
