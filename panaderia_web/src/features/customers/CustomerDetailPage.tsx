import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowLeft, Gift, Loader2, Star } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { getCustomer, redeemPoints } from '@/api/customers'
import { listSales, type SaleResponse } from '@/api/sales'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { SaleDetailSheet } from '../sales/SaleDetailSheet'

const LOYALTY_RATIO = Number(import.meta.env.VITE_LOYALTY_POINTS_RATIO ?? 10)

// Redeem dialog
function RedeemDialog({
  open,
  onOpenChange,
  customerId,
  availablePoints,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  customerId: string
  availablePoints: number
}) {
  const qc = useQueryClient()
  const [pointsInput, setPointsInput] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const points = Math.max(0, parseInt(pointsInput, 10) || 0)
  const discountPreview = points / LOYALTY_RATIO
  const isValid = points > 0 && points <= availablePoints

  const redeemMutation = useMutation({
    mutationFn: () => redeemPoints(customerId, points),
    onSuccess: (result) => {
      toast.success(
        `Canje exitoso. Descuento: ${formatCurrency(result.discount_amount)}. Puntos restantes: ${result.remaining_points}.`,
      )
      qc.invalidateQueries({ queryKey: ['customer', customerId] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      setPointsInput('')
      setConfirmOpen(false)
      onOpenChange(false)
    },
    onError: () => toast.error('No se pudo realizar el canje.'),
  })

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Canjear puntos
            </DialogTitle>
            <DialogDescription>
              Disponibles: <strong>{availablePoints} puntos</strong>
              {' · '}
              Cada {LOYALTY_RATIO} puntos = {formatCurrency(1)} de descuento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="redeem-pts">Puntos a canjear</Label>
              <Input
                id="redeem-pts"
                type="number"
                min="1"
                max={availablePoints}
                value={pointsInput}
                onChange={(e) => setPointsInput(e.target.value)}
                autoFocus
              />
              {points > availablePoints && (
                <p className="text-xs text-destructive">
                  No podés canjear más de {availablePoints} puntos.
                </p>
              )}
            </div>

            {isValid && (
              <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                Descuento equivalente:{' '}
                <strong>{formatCurrency(discountPreview)}</strong>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button disabled={!isValid} onClick={() => setConfirmOpen(true)}>
              Canjear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirmar canje"
        description={`¿Canjear ${points} puntos por ${formatCurrency(discountPreview)} de descuento?`}
        confirmLabel="Confirmar canje"
        variant="default"
        isLoading={redeemMutation.isPending}
        onConfirm={() => redeemMutation.mutate()}
      />
    </>
  )
}

// Main page
export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [salesPage, setSalesPage] = useState(1)
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)

  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id!),
    enabled: !!id,
  })

  // Historial: cargamos ventas y filtramos por customer_id en cliente
  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['customer-sales', id, salesPage],
    queryFn: () => listSales({ page: salesPage, pageSize: 50 }),
    enabled: !!id,
  })

  const customerSales = salesData
    ? {
        ...salesData,
        items: salesData.items.filter((s) => s.customer_id === id),
      }
    : undefined

  const salesColumns: ColumnDef<SaleResponse, unknown>[] = [
    {
      header: 'N°',
      accessorKey: 'sale_number',
      cell: ({ getValue }) => (
        <span className="font-mono text-sm">{getValue() as string}</span>
      ),
    },
    {
      header: 'Fecha',
      accessorKey: 'sale_date',
      cell: ({ getValue }) => formatDateTime(getValue() as string),
    },
    {
      header: 'Total',
      accessorKey: 'total_amount',
      cell: ({ getValue }) => (
        <span className="font-semibold">{formatCurrency(getValue() as number)}</span>
      ),
    },
    {
      header: 'Estado',
      accessorKey: 'status',
      cell: ({ getValue }) => <StatusBadge status={getValue() as 'completada' | 'cancelada'} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => setSelectedSaleId(row.original.id)}
        >
          Ver detalle
        </Button>
      ),
    },
  ]

  if (loadingCustomer) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!customer) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/clientes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">{customer.name}</h2>
          <p className="text-sm text-muted-foreground">
            {customer.email ?? 'Sin email'} · {customer.phone ?? 'Sin teléfono'}
          </p>
        </div>
        {!customer.is_active && (
          <Badge variant="outline" className="ml-auto text-muted-foreground">Inactivo</Badge>
        )}
      </div>

      {/* Cards de info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Puntos de fidelidad */}
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Puntos de fidelidad
            </CardTitle>
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-bold text-foreground">{customer.loyalty_points}</p>
            <p className="text-xs text-muted-foreground">
              Equivalen a {formatCurrency(customer.loyalty_points / LOYALTY_RATIO)} en descuentos
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 dark:text-amber-400"
              disabled={customer.loyalty_points === 0}
              onClick={() => setRedeemOpen(true)}
            >
              <Gift className="mr-1.5 h-4 w-4" />
              Canjear puntos
            </Button>
          </CardContent>
        </Card>

        {/* Info personal */}
        <Card className="sm:col-span-1 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Información del cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Nombre</dt>
                <dd className="font-medium">{customer.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{customer.email ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Teléfono</dt>
                <dd className="font-medium">{customer.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Dirección</dt>
                <dd className="font-medium">{customer.address ?? '—'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Historial de compras */}
      <div className="space-y-3">
        <h3 className="font-semibold">Historial de compras</h3>
        <DataTable
          columns={salesColumns}
          data={customerSales?.items ?? []}
          page={salesPage}
          pageSize={50}
          total={customerSales?.total ?? 0}
          totalPages={salesData?.total_pages ?? 1}
          onPageChange={setSalesPage}
          isLoading={loadingSales}
          emptyMessage="Este cliente no tiene compras registradas."
        />
      </div>

      <RedeemDialog
        open={redeemOpen}
        onOpenChange={setRedeemOpen}
        customerId={id!}
        availablePoints={customer.loyalty_points}
      />

      <SaleDetailSheet
        saleId={selectedSaleId}
        onOpenChange={(open) => { if (!open) setSelectedSaleId(null) }}
      />
    </div>
  )
}
