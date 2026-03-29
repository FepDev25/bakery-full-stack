import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { listProducts } from '@/api/catalog'
import { completeBatch, discardBatch, getBatch } from '@/api/production'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'

// Parsear el detail del error 400 del backend
function parseBackendError(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  if (typeof detail === 'string') return detail
  return 'Ocurrió un error inesperado.'
}

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [confirmComplete, setConfirmComplete] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const { data: batch, isLoading } = useQuery({
    queryKey: ['batch', id],
    queryFn: () => getBatch(id!),
    enabled: !!id,
  })

  const { data: products } = useQuery({
    queryKey: ['products', 1, ''],
    queryFn: () => listProducts({ page: 1, pageSize: 100 }),
  })

  const productName =
    products?.items.find((p) => p.id === batch?.product_id)?.name ?? '—'

  const completeMutation = useMutation({
    mutationFn: () => completeBatch(id!),
    onSuccess: () => {
      // RN-002: completar lote suma stock al producto — avisar con toast
      toast.success(`Lote completado. El stock de "${productName}" fue actualizado.`)
      qc.invalidateQueries({ queryKey: ['batch', id] })
      qc.invalidateQueries({ queryKey: ['batches'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      setConfirmComplete(false)
    },
    onError: (err) => {
      // Regla crítica: 400 = ingredientes insuficientes → mostrar mensaje del backend
      toast.error(parseBackendError(err))
      setConfirmComplete(false)
    },
  })

  const discardMutation = useMutation({
    mutationFn: () => discardBatch(id!),
    onSuccess: () => {
      // RN-008: descartar consume ingredientes sin sumar stock
      toast.info('Lote descartado. Los ingredientes fueron consumidos sin sumar stock.')
      qc.invalidateQueries({ queryKey: ['batch', id] })
      qc.invalidateQueries({ queryKey: ['batches'] })
      setConfirmDiscard(false)
    },
    onError: (err) => {
      toast.error(parseBackendError(err))
      setConfirmDiscard(false)
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!batch) return null

  const isActionable = batch.status === 'en_proceso'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/produccion')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight">{productName}</h2>
            <StatusBadge status={batch.status} />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Lote creado el {formatDateTime(batch.created_at)}
          </p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Cantidad producida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{batch.quantity_produced}</p>
            <p className="text-xs text-muted-foreground">{batch.unit}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Costo de ingredientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(batch.ingredient_cost)}</p>
            <p className="text-xs text-muted-foreground">
              {batch.ingredient_cost > 0
                ? formatCurrency(batch.ingredient_cost / batch.quantity_produced) + ' / unidad'
                : 'Sin costo registrado'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Fecha de producción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatDate(batch.production_date)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Estado
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <StatusBadge status={batch.status} />
          </CardContent>
        </Card>
      </div>

      {/* Notas */}
      {batch.notes && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <p className="mb-1 font-medium text-muted-foreground">Notas</p>
          <p>{batch.notes}</p>
        </div>
      )}

      <Separator />

      {/* Acciones — solo si está en proceso */}
      {isActionable ? (
        <div className="space-y-3">
          <h3 className="font-semibold">Acciones del lote</h3>
          <p className="text-sm text-muted-foreground">
            Completar el lote suma el stock al producto. Descartarlo consume los ingredientes
            sin sumar stock.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              className="gap-2"
              onClick={() => setConfirmComplete(true)}
              disabled={completeMutation.isPending || discardMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4" />
              Completar lote
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/5"
              onClick={() => setConfirmDiscard(true)}
              disabled={completeMutation.isPending || discardMutation.isPending}
            >
              <XCircle className="h-4 w-4" />
              Descartar lote
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Este lote está <strong>{batch.status}</strong> y ya no puede modificarse.
        </div>
      )}

      {/* ConfirmDialogs */}
      <ConfirmDialog
        open={confirmComplete}
        onOpenChange={setConfirmComplete}
        title="Completar lote"
        description={`¿Completar el lote de "${productName}"? Se sumarán ${batch.quantity_produced} ${batch.unit} al stock del producto.`}
        confirmLabel="Completar"
        variant="default"
        isLoading={completeMutation.isPending}
        onConfirm={() => completeMutation.mutate()}
      />

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Descartar lote"
        description={`¿Descartar el lote de "${productName}"? Los ingredientes ya fueron consumidos pero NO se sumará stock al producto. Esta acción no se puede deshacer.`}
        confirmLabel="Descartar lote"
        isLoading={discardMutation.isPending}
        onConfirm={() => discardMutation.mutate()}
      />
    </div>
  )
}
