/**
 * Fixtures de datos mock que replican exactamente el contrato de docs/openapi.yaml.
 * Todos los IDs son UUIDs fijos para poder hacer assertions deterministas.
 */
import type { CategoryResponse, IngredientResponse, ProductResponse, RecipeResponse } from '@/api/catalog'
import type { CustomerResponse } from '@/api/customers'
import type { ExpenseResponse } from '@/api/finance'
import type { IngredientPurchaseResponse, SupplierResponse } from '@/api/inventory'
import type { ProductionBatchResponse } from '@/api/production'
import type { SaleResponse, SaleWithItemsResponse } from '@/api/sales'
import type { UserResponse } from '@/api/users'
import type { PaginatedResponse } from '@/components/shared/DataTable'

// ── Helper paginación ──────────────────────────────────────────────────────

export function paginated<T>(items: T[], overrides: Partial<PaginatedResponse<T>> = {}): PaginatedResponse<T> {
  return {
    items,
    total: items.length,
    page: 1,
    page_size: 20,
    total_pages: 1,
    ...overrides,
  }
}

// ── Auth tokens ───────────────────────────────────────────────────────────

export const mockTokens = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
}

// ── Usuarios ──────────────────────────────────────────────────────────────

export const mockUsers = {
  admin: {
    id: 'user-admin-0000-0000-000000000001',
    email: 'admin@panaderia.com',
    full_name: 'Admin Test',
    role: 'admin',
    is_active: true,
    last_login: '2026-01-15T10:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  } satisfies UserResponse,

  cajero: {
    id: 'user-cajero-000-0000-000000000002',
    email: 'cajero@panaderia.com',
    full_name: 'Cajero Test',
    role: 'cajero',
    is_active: true,
    last_login: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  } satisfies UserResponse,

  panadero: {
    id: 'user-panadero-00-0000-000000000003',
    email: 'panadero@panaderia.com',
    full_name: 'Panadero Test',
    role: 'panadero',
    is_active: true,
    last_login: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  } satisfies UserResponse,

  contador: {
    id: 'user-contador-0-0000-000000000004',
    email: 'contador@panaderia.com',
    full_name: 'Contador Test',
    role: 'contador',
    is_active: true,
    last_login: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  } satisfies UserResponse,
}

// ── Categorías ────────────────────────────────────────────────────────────

export const mockCategories: CategoryResponse[] = [
  {
    id: 'cat-00000000-0000-0000-000000000001',
    name: 'Panes',
    description: 'Panes artesanales',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'cat-00000000-0000-0000-000000000002',
    name: 'Facturas',
    description: null,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
]

// ── Productos ─────────────────────────────────────────────────────────────

export const mockProducts: ProductResponse[] = [
  {
    id: 'prod-0000-0000-0000-000000000001',
    name: 'Pan de campo',
    description: 'Pan artesanal de campo',
    price: 850,
    unit: 'unidad',
    min_stock_alert: 5,
    stock_quantity: 20,
    category_id: 'cat-00000000-0000-0000-000000000001',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'prod-0000-0000-0000-000000000002',
    name: 'Medialunas (x6)',
    description: null,
    price: 1200,
    unit: 'unidad',
    min_stock_alert: 10,
    stock_quantity: 3, // stock bajo — activa alerta
    category_id: 'cat-00000000-0000-0000-000000000002',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
]

// ── Ingredientes ──────────────────────────────────────────────────────────

export const mockIngredients: IngredientResponse[] = [
  {
    id: 'ingr-0000-0000-0000-000000000001',
    name: 'Harina 000',
    unit: 'kg',
    min_stock_alert: 5,
    stock_quantity: 25,
    unit_cost: 450,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'ingr-0000-0000-0000-000000000002',
    name: 'Levadura',
    unit: 'gramo',
    min_stock_alert: 200,
    stock_quantity: 100, // stock bajo
    unit_cost: 2.5,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
]

// ── Recetas ───────────────────────────────────────────────────────────────

export const mockRecipes: RecipeResponse[] = [
  {
    id: 'rec-00000000-0000-0000-000000000001',
    product_id: 'prod-0000-0000-0000-000000000001',
    ingredient_id: 'ingr-0000-0000-0000-000000000001',
    quantity: 0.5,
    unit: 'kg',
    created_at: '2025-01-01T00:00:00Z',
  },
]

// ── Clientes ──────────────────────────────────────────────────────────────

export const mockCustomers: CustomerResponse[] = [
  {
    id: 'cust-0000-0000-0000-000000000001',
    name: 'María García',
    phone: '11-1234-5678',
    email: 'maria@example.com',
    address: 'Rivadavia 1234',
    loyalty_points: 150,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'cust-0000-0000-0000-000000000002',
    name: 'Carlos López',
    phone: null,
    email: null,
    address: null,
    loyalty_points: 0,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
]

// ── Ventas ────────────────────────────────────────────────────────────────

export const mockSales: SaleResponse[] = [
  {
    id: 'sale-0000-0000-0000-000000000001',
    sale_number: 'VTA-0001',
    user_id: 'user-cajero-000-0000-000000000002',
    customer_id: 'cust-0000-0000-0000-000000000001',
    payment_method: 'efectivo',
    notes: null,
    subtotal: 850,
    discount_amount: 0,
    tax_amount: 0,
    total_amount: 850,
    status: 'completada',
    sale_date: '2026-01-15',
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'sale-0000-0000-0000-000000000002',
    sale_number: 'VTA-0002',
    user_id: 'user-cajero-000-0000-000000000002',
    customer_id: null,
    payment_method: 'tarjeta_debito',
    notes: null,
    subtotal: 2400,
    discount_amount: 0,
    tax_amount: 0,
    total_amount: 2400,
    status: 'cancelada',
    sale_date: '2026-01-15',
    created_at: '2026-01-15T11:00:00Z',
  },
]

export const mockSaleWithItems: SaleWithItemsResponse = {
  ...mockSales[0],
  items: [
    {
      id: 'si-000000-0000-0000-000000000001',
      sale_id: 'sale-0000-0000-0000-000000000001',
      product_id: 'prod-0000-0000-0000-000000000001',
      quantity: 1,
      unit: 'unidad',
      unit_price: 850,
      subtotal: 850,
      created_at: '2026-01-15T10:00:00Z',
    },
  ],
}

// ── Lotes de producción ───────────────────────────────────────────────────

export const mockBatches: ProductionBatchResponse[] = [
  {
    id: 'batch-0000-0000-0000-000000000001',
    product_id: 'prod-0000-0000-0000-000000000001',
    user_id: 'user-panadero-00-0000-000000000003',
    quantity_produced: 50,
    unit: 'unidad',
    ingredient_cost: 2250,
    status: 'en_proceso',
    production_date: '2026-01-15',
    notes: null,
    created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-01-15T08:00:00Z',
  },
  {
    id: 'batch-0000-0000-0000-000000000002',
    product_id: 'prod-0000-0000-0000-000000000002',
    user_id: 'user-panadero-00-0000-000000000003',
    quantity_produced: 30,
    unit: 'unidad',
    ingredient_cost: 1500,
    status: 'completado',
    production_date: '2026-01-14',
    notes: 'Lote completado sin problemas',
    created_at: '2026-01-14T08:00:00Z',
    updated_at: '2026-01-14T14:00:00Z',
  },
]

// ── Proveedores ───────────────────────────────────────────────────────────

export const mockSuppliers: SupplierResponse[] = [
  {
    id: 'supp-0000-0000-0000-000000000001',
    name: 'Molinos del Sur',
    contact_person: 'Juan Pérez',
    phone: '11-9876-5432',
    email: 'ventas@molinosdelsur.com',
    address: 'Av. San Martín 500',
    tax_id: '30-12345678-9',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
]

// ── Compras ───────────────────────────────────────────────────────────────

export const mockPurchases: IngredientPurchaseResponse[] = [
  {
    id: 'purch-000-0000-0000-000000000001',
    supplier_id: 'supp-0000-0000-0000-000000000001',
    ingredient_id: 'ingr-0000-0000-0000-000000000001',
    user_id: 'user-contador-0-0000-000000000004',
    quantity: 25,
    unit: 'kg',
    unit_price: 450,
    total_amount: 11250,
    purchase_date: '2026-01-10',
    invoice_number: 'FAC-0042',
    notes: null,
    created_at: '2026-01-10T09:00:00Z',
  },
]

// ── Gastos ────────────────────────────────────────────────────────────────

export const mockExpenses: ExpenseResponse[] = [
  {
    id: 'exp-00000-0000-0000-000000000001',
    category: 'alquiler',
    description: 'Alquiler enero 2026',
    amount: 120000,
    expense_date: '2026-01-01',
    invoice_number: null,
    notes: null,
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-01-01T10:00:00Z',
  },
  {
    id: 'exp-00000-0000-0000-000000000002',
    category: 'servicios',
    description: 'Electricidad enero',
    amount: 18000,
    expense_date: '2026-01-05',
    invoice_number: 'FAC-E-001',
    notes: null,
    created_at: '2026-01-05T12:00:00Z',
    updated_at: '2026-01-05T12:00:00Z',
  },
]
