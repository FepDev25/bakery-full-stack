import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { cancelSale, getSale } from '@/api/sales'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { useState } from 'react'

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta_debito: 'Tarjeta débito',
  tarjeta_credito: 'Tarjeta crédito',
  transferencia: 'Transferencia',
  qr: 'QR',
}

interface SaleDetailSheetProps {
  saleId: string | null
  onOpenChange: (open: boolean) => void
}

export function SaleDetailSheet({ saleId, onOpenChange }: SaleDetailSheetProps) {
  const qc = useQueryClient()
  const [confirmCancel, setConfirmCancel] = useState(false)

  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => getSale(saleId!),
    enabled: !!saleId,
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelSale(saleId!),
    onSuccess: () => {
      toast.success('Venta cancelada. El stock fue revertido.')
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['sale', saleId] })
      qc.invalidateQueries({ queryKey: ['products'] })
      setConfirmCancel(false)
    },
    onError: () => toast.error('No se pudo cancelar la venta.'),
  })

  return (
    <>
      <Sheet open={!!saleId} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sale ? (
            <>
              <SheetHeader className="mb-4">
                <div className="flex items-center justify-between gap-2">
                  <SheetTitle className="font-mono text-base">#{sale.sale_number}</SheetTitle>
                  <StatusBadge status={sale.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(sale.sale_date)}
                </p>
              </SheetHeader>

              {/* Items */}
              <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
                {sale.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span>
                      {item.quantity} × <span className="font-medium">{item.product_id.slice(0, 8)}…</span>
                    </span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Totales */}
              <div className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(sale.subtotal)}</span>
                </div>
                {sale.discount_amount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Descuento</span>
                    <span>- {formatCurrency(sale.discount_amount)}</span>
                  </div>
                )}
                {sale.tax_amount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Impuestos</span>
                    <span>{formatCurrency(sale.tax_amount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(sale.total_amount)}</span>
                </div>
              </div>

              {/* Metadata */}
              <div className="mt-5 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Método de pago</span>
                  <Badge variant="secondary" className="font-normal">
                    {PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}
                  </Badge>
                </div>
                {sale.customer_id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="font-medium">{sale.customer_id.slice(0, 8)}…</span>
                  </div>
                )}
                {sale.notes && (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Notas</span>
                    <p className="rounded bg-muted px-2 py-1 text-xs">{sale.notes}</p>
                  </div>
                )}
              </div>

              {/* Acción cancelar */}
              {sale.status === 'completada' && (
                <div className="mt-6">
                  <Button
                    variant="outline"
                    className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmCancel(true)}
                  >
                    Cancelar venta
                  </Button>
                </div>
              )}
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancelar venta"
        description="Esta acción revertirá el stock de todos los productos de la venta. No se puede deshacer."
        confirmLabel="Sí, cancelar venta"
        isLoading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
      />
    </>
  )
}
