import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ChevronRight, Minus, Plus, ShoppingCart, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { listCustomers } from '@/api/customers'
import { listProducts, type ProductResponse } from '@/api/catalog'
import { createSale, type PaymentMethod } from '@/api/sales'
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
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/format'

// Tipos internos del carrito
interface CartItem {
  product: ProductResponse
  quantity: number
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  tarjeta_debito: 'Tarjeta débito',
  tarjeta_credito: 'Tarjeta crédito',
  transferencia: 'Transferencia',
  qr: 'QR',
}

const LOYALTY_RATIO = Number(import.meta.env.VITE_LOYALTY_POINTS_RATIO ?? 10)

// Step 1: Selección de productos
function StepProductos({
  cart,
  onCartChange,
  onNext,
}: {
  cart: CartItem[]
  onCartChange: (cart: CartItem[]) => void
  onNext: () => void
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () => listProducts({ page, search: search || undefined }),
  })

  const cartTotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0)

  const setQty = (product: ProductResponse, qty: number) => {
    if (qty <= 0) {
      onCartChange(cart.filter((i) => i.product.id !== product.id))
    } else {
      const existing = cart.find((i) => i.product.id === product.id)
      if (existing) {
        onCartChange(cart.map((i) => i.product.id === product.id ? { ...i, quantity: qty } : i))
      } else {
        onCartChange([...cart, { product, quantity: qty }])
      }
    }
  }

  const cartQty = (id: string) => cart.find((i) => i.product.id === id)?.quantity ?? 0

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Lista de productos */}
      <div className="lg:col-span-2 space-y-4">
        <Input
          placeholder="Buscar producto…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          autoFocus
        />

        {isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              {data?.items.map((product) => {
                const qty = cartQty(product.id)
                const stockLow = qty > product.stock_quantity

                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-lg border bg-card p-3 gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-primary font-semibold">
                        {formatCurrency(product.price)}
                        <span className="text-muted-foreground font-normal"> / {product.unit}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Stock: {product.stock_quantity} {product.unit}
                      </p>
                      {stockLow && (
                        <p className="flex items-center gap-1 text-xs text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          Stock insuficiente
                        </p>
                      )}
                    </div>
                    {/* +/- controls */}
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setQty(product, qty - 1)}
                        disabled={qty === 0}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">{qty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setQty(product, qty + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Paginación */}
            {(data?.total_pages ?? 1) > 1 && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Anterior
                </Button>
                <span className="text-muted-foreground">{page} / {data?.total_pages}</span>
                <Button variant="ghost" size="sm" disabled={page >= (data?.total_pages ?? 1)} onClick={() => setPage(p => p + 1)}>
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Resumen carrito */}
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">Carrito</span>
          {cart.length > 0 && (
            <Badge variant="secondary" className="ml-auto">{cart.length}</Badge>
          )}
        </div>

        {cart.length === 0 ? (
          <p className="text-sm text-muted-foreground">Agregá productos al carrito.</p>
        ) : (
          <div className="flex-1 space-y-2 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.product.id} className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => setQty(item.product, 0)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Quitar del carrito"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <span className="flex-1 truncate">{item.product.name}</span>
                <span className="text-muted-foreground">×{item.quantity}</span>
                <span className="font-medium">
                  {formatCurrency(item.product.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto space-y-3 border-t pt-3">
          <div className="flex justify-between font-semibold">
            <span>Subtotal</span>
            <span>{formatCurrency(cartTotal)}</span>
          </div>
          <Button
            className="w-full"
            disabled={cart.length === 0 || cart.some((i) => i.quantity > i.product.stock_quantity)}
            onClick={onNext}
          >
            Continuar <ChevronRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Step 2: Cierre de venta
function StepCierre({
  cart,
  onBack,
  onSuccess,
}: {
  cart: CartItem[]
  onBack: () => void
  onSuccess: (saleId: string) => void
}) {
  const qc = useQueryClient()
  const [customerId, setCustomerId] = useState<string>('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo')
  const [notes, setNotes] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)

  const { data: customers } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => listCustomers({ pageSize: 100 }),
  })

  const filteredCustomers = useMemo(() => {
    if (!customers) return []
    const q = customerSearch.toLowerCase()
    if (!q) return customers.items
    return customers.items.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false),
    )
  }, [customers, customerSearch])

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const total = Math.max(0, subtotal - discountAmount)
  const loyaltyPoints = customerId ? Math.floor(total / LOYALTY_RATIO) : 0

  const createMutation = useMutation({
    mutationFn: () =>
      createSale({
        items: cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        payment_method: paymentMethod,
        customer_id: customerId || null,
        notes: notes || null,
        discount_amount: discountAmount,
      }),
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      if (loyaltyPoints > 0) {
        toast.success(`Venta #${sale.sale_number} creada. +${loyaltyPoints} puntos al cliente.`)
      } else {
        toast.success(`Venta #${sale.sale_number} creada.`)
      }
      onSuccess(sale.id)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? 'No se pudo crear la venta.')
    },
  })

  const selectedCustomer = customers?.items.find((c) => c.id === customerId)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Formulario */}
      <div className="space-y-5">
        {/* Cliente opcional */}
        <div className="space-y-1.5">
          <Label>Cliente (opcional)</Label>
          <Input
            placeholder="Buscar por nombre o email…"
            value={customerSearch}
            onChange={(e) => { setCustomerSearch(e.target.value); setCustomerId('') }}
          />
          {customerSearch && filteredCustomers.length > 0 && !customerId && (
            <div className="max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md">
              {filteredCustomers.slice(0, 8).map((c) => (
                <button
                  key={c.id}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => {
                    setCustomerId(c.id)
                    setCustomerSearch(c.name)
                  }}
                >
                  <span>{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.loyalty_points} pts
                  </span>
                </button>
              ))}
            </div>
          )}
          {selectedCustomer && (
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-sm">
              <span className="font-medium">{selectedCustomer.name}</span>
              <Badge variant="secondary" className="ml-auto text-xs">
                {selectedCustomer.loyalty_points} pts actuales
              </Badge>
              <button onClick={() => { setCustomerId(''); setCustomerSearch('') }} className="text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Método de pago */}
        <div className="space-y-1.5">
          <Label>Método de pago *</Label>
          <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PAYMENT_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Descuento */}
        <div className="space-y-1.5">
          <Label htmlFor="discount">Descuento ($)</Label>
          <Input
            id="discount"
            type="number"
            min="0"
            step="0.01"
            value={discountAmount || ''}
            onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
          />
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Input
            id="notes"
            placeholder="Observaciones de la venta…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Resumen final */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Resumen de venta</h3>

        <div className="space-y-1 text-sm">
          {cart.map((item) => (
            <div key={item.product.id} className="flex justify-between">
              <span className="text-muted-foreground">
                {item.product.name} ×{item.quantity}
              </span>
              <span>{formatCurrency(item.product.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Descuento</span>
              <span className="text-emerald-600">- {formatCurrency(discountAmount)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Puntos de fidelidad */}
        {customerId && loyaltyPoints > 0 && (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            El cliente acumulará <strong>+{loyaltyPoints} puntos</strong> con esta compra.
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <Button
            className="w-full"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? 'Creando venta…' : 'Confirmar venta'}
          </Button>
          <Button variant="ghost" className="w-full" onClick={onBack}>
            Volver al carrito
          </Button>
        </div>
      </div>
    </div>
  )
}

// Page principal
export default function CreateSaleFlow() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [cart, setCart] = useState<CartItem[]>([])

  const handleSuccess = () => {
    navigate('/app/ventas', { replace: true })
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Nueva venta</h2>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className={step === 1 ? 'font-semibold text-primary' : 'text-muted-foreground'}>
            1. Productos
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className={step === 2 ? 'font-semibold text-primary' : 'text-muted-foreground'}>
            2. Cierre
          </span>
        </div>
      </div>

      {step === 1 ? (
        <StepProductos cart={cart} onCartChange={setCart} onNext={() => setStep(2)} />
      ) : (
        <StepCierre cart={cart} onBack={() => setStep(1)} onSuccess={handleSuccess} />
      )}
    </div>
  )
}
