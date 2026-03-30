/**
 * Handlers MSW v2 — réplica completa del contrato de docs/openapi.yaml.
 *
 * Organización:
 *   auth · catalog · sales · customers · production · inventory · finance · admin
 *
 * Para override en tests individuales:
 *   server.use(http.post(`${BASE}/api/v1/auth/login`, () => HttpResponse.json({}, { status: 401 })))
 */
import { http, HttpResponse } from 'msw'

import {
  mockBatches,
  mockCategories,
  mockCustomers,
  mockExpenses,
  mockIngredients,
  mockPurchases,
  mockRecipes,
  mockSaleWithItems,
  mockSales,
  mockSuppliers,
  mockTokens,
  mockProducts,
  mockUsers,
  paginated,
} from './fixtures'

const BASE = 'http://localhost:8000'

// ── Auth ───────────────────────────────────────────────────────────────────

const authHandlers = [
  http.post(`${BASE}/api/v1/auth/login`, async ({ request }) => {
    const body = await request.json() as { email?: string; password?: string }
    if (body.email === 'invalid@example.com' || body.password === 'wrong') {
      return HttpResponse.json({ detail: 'Credenciales incorrectas' }, { status: 401 })
    }
    return HttpResponse.json(mockTokens)
  }),

  http.post(`${BASE}/api/v1/auth/refresh`, async ({ request }) => {
    const body = await request.json() as { refresh_token?: string }
    if (!body.refresh_token || body.refresh_token === 'expired-refresh-token') {
      return HttpResponse.json({ detail: 'Token inválido o expirado' }, { status: 401 })
    }
    return HttpResponse.json(mockTokens)
  }),

  http.get(`${BASE}/api/v1/auth/me`, ({ request }) => {
    const auth = request.headers.get('Authorization')
    if (!auth || !auth.startsWith('Bearer ')) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }
    return HttpResponse.json(mockUsers.admin)
  }),
]

// ── Catalog: Categorías ────────────────────────────────────────────────────

const categoriesHandlers = [
  http.get(`${BASE}/api/v1/categories`, () => {
    return HttpResponse.json(paginated(mockCategories))
  }),

  http.post(`${BASE}/api/v1/categories`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(
      { ...mockCategories[0], id: 'cat-new-0000-0000-000000000099', ...body },
      { status: 201 },
    )
  }),

  http.patch(`${BASE}/api/v1/categories/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    const cat = mockCategories.find((c) => c.id === params.id) ?? mockCategories[0]
    return HttpResponse.json({ ...cat, ...body })
  }),

  http.delete(`${BASE}/api/v1/categories/:id`, () => {
    return new HttpResponse(null, { status: 204 })
  }),
]

// ── Catalog: Productos ─────────────────────────────────────────────────────

const productsHandlers = [
  http.get(`${BASE}/api/v1/products`, () => {
    return HttpResponse.json(paginated(mockProducts))
  }),

  http.post(`${BASE}/api/v1/products`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(
      { ...mockProducts[0], id: 'prod-new-0000-0000-000000000099', ...body },
      { status: 201 },
    )
  }),

  http.put(`${BASE}/api/v1/products/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    const product = mockProducts.find((p) => p.id === params.id) ?? mockProducts[0]
    return HttpResponse.json({ ...product, ...body })
  }),

  http.delete(`${BASE}/api/v1/products/:id`, () => {
    return new HttpResponse(null, { status: 204 })
  }),
]

// ── Catalog: Ingredientes ──────────────────────────────────────────────────

const ingredientsHandlers = [
  http.get(`${BASE}/api/v1/ingredients`, () => {
    return HttpResponse.json(paginated(mockIngredients))
  }),

  http.post(`${BASE}/api/v1/ingredients`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(
      { ...mockIngredients[0], id: 'ingr-new-0000-0000-000000000099', ...body },
      { status: 201 },
    )
  }),

  http.put(`${BASE}/api/v1/ingredients/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    const ingr = mockIngredients.find((i) => i.id === params.id) ?? mockIngredients[0]
    return HttpResponse.json({ ...ingr, ...body })
  }),

  http.delete(`${BASE}/api/v1/ingredients/:id`, () => {
    return new HttpResponse(null, { status: 204 })
  }),
]

// ── Catalog: Recetas ───────────────────────────────────────────────────────

const recipesHandlers = [
  http.get(`${BASE}/api/v1/recipes`, () => {
    return HttpResponse.json(paginated(mockRecipes))
  }),

  http.get(`${BASE}/api/v1/recipes/product/:productId`, ({ params }) => {
    const recipes = mockRecipes.filter((r) => r.product_id === params.productId)
    return HttpResponse.json(recipes)
  }),

  http.get(`${BASE}/api/v1/recipes/:id/production-cost`, () => {
    return HttpResponse.json({
      product_id: 'prod-0000-0000-0000-000000000001',
      ingredient_cost: 225,
      recipe_quantity: 1,
    })
  }),

  http.post(`${BASE}/api/v1/recipes`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(
      { ...mockRecipes[0], id: 'rec-new-0000-0000-000000000099', ...body },
      { status: 201 },
    )
  }),

  http.delete(`${BASE}/api/v1/recipes/:id`, () => {
    return new HttpResponse(null, { status: 204 })
  }),
]

// ── Clientes ───────────────────────────────────────────────────────────────

const customersHandlers = [
  http.get(`${BASE}/api/v1/customers`, () => {
    return HttpResponse.json(paginated(mockCustomers))
  }),

  http.get(`${BASE}/api/v1/customers/:id`, ({ params }) => {
    const cust = mockCustomers.find((c) => c.id === params.id) ?? mockCustomers[0]
    return HttpResponse.json(cust)
  }),

  http.post(`${BASE}/api/v1/customers`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(
      { ...mockCustomers[0], id: 'cust-new-0000-0000-000000000099', ...body },
      { status: 201 },
    )
  }),

  http.patch(`${BASE}/api/v1/customers/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    const cust = mockCustomers.find((c) => c.id === params.id) ?? mockCustomers[0]
    return HttpResponse.json({ ...cust, ...body })
  }),

  http.delete(`${BASE}/api/v1/customers/:id`, () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${BASE}/api/v1/customers/:id/redeem-points`, async ({ request }) => {
    const body = await request.json() as { points: number }
    return HttpResponse.json({
      customer_id: mockCustomers[0].id,
      points_redeemed: body.points,
      discount_amount: body.points * 0.1,
      remaining_points: mockCustomers[0].loyalty_points - body.points,
    })
  }),
]

// ── Ventas ─────────────────────────────────────────────────────────────────

const salesHandlers = [
  http.get(`${BASE}/api/v1/sales`, () => {
    return HttpResponse.json(paginated(mockSales))
  }),

  http.get(`${BASE}/api/v1/sales/:id`, ({ params }) => {
    if (params.id === mockSaleWithItems.id) {
      return HttpResponse.json(mockSaleWithItems)
    }
    return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
  }),

  http.post(`${BASE}/api/v1/sales`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(
      { ...mockSaleWithItems, id: 'sale-new-0000-0000-000000000099', ...body },
      { status: 201 },
    )
  }),

  http.post(`${BASE}/api/v1/sales/:id/cancel`, ({ params }) => {
    const sale = mockSales.find((s) => s.id === params.id) ?? mockSales[0]
    return HttpResponse.json({ ...sale, status: 'cancelada' })
  }),
]

// ── Producción ─────────────────────────────────────────────────────────────

const productionHandlers = [
  http.get(`${BASE}/api/v1/production-batches`, () => {
    return HttpResponse.json(paginated(mockBatches))
  }),

  http.get(`${BASE}/api/v1/production-batches/:id`, ({ params }) => {
    const batch = mockBatches.find((b) => b.id === params.id) ?? mockBatches[0]
    return HttpResponse.json(batch)
  }),

  http.post(`${BASE}/api/v1/production-batches`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(
      { ...mockBatches[0], id: 'batch-new-0000-0000-000000000099', status: 'en_proceso', ...body },
      { status: 201 },
    )
  }),

  http.post(`${BASE}/api/v1/production-batches/:id/complete`, ({ params }) => {
    const batch = mockBatches.find((b) => b.id === params.id) ?? mockBatches[0]
    return HttpResponse.json({ ...batch, status: 'completado' })
  }),

  http.post(`${BASE}/api/v1/production-batches/:id/discard`, ({ params }) => {
    const batch = mockBatches.find((b) => b.id === params.id) ?? mockBatches[0]
    return HttpResponse.json({ ...batch, status: 'descartado' })
  }),
]

// ── Inventario: Proveedores ────────────────────────────────────────────────

const suppliersHandlers = [
  http.get(`${BASE}/api/v1/suppliers`, () => {
    return HttpResponse.json(paginated(mockSuppliers))
  }),

  http.post(`${BASE}/api/v1/suppliers`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(
      { ...mockSuppliers[0], id: 'supp-new-0000-0000-000000000099', ...body },
      { status: 201 },
    )
  }),

  http.patch(`${BASE}/api/v1/suppliers/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    const supp = mockSuppliers.find((s) => s.id === params.id) ?? mockSuppliers[0]
    return HttpResponse.json({ ...supp, ...body })
  }),

  http.delete(`${BASE}/api/v1/suppliers/:id`, () => {
    return new HttpResponse(null, { status: 204 })
  }),
]

// ── Inventario: Compras ────────────────────────────────────────────────────

const purchasesHandlers = [
  http.get(`${BASE}/api/v1/ingredient-purchases`, () => {
    return HttpResponse.json(paginated(mockPurchases))
  }),

  http.get(`${BASE}/api/v1/ingredient-purchases/by-supplier/:supplierId`, () => {
    return HttpResponse.json(paginated(mockPurchases))
  }),

  http.get(`${BASE}/api/v1/ingredient-purchases/by-ingredient/:ingredientId`, () => {
    return HttpResponse.json(paginated(mockPurchases))
  }),

  http.post(`${BASE}/api/v1/ingredient-purchases`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(
      { ...mockPurchases[0], id: 'purch-new-0000-0000-000000000099', ...body },
      { status: 201 },
    )
  }),
]

// ── Finanzas: Gastos ───────────────────────────────────────────────────────

const expensesHandlers = [
  http.get(`${BASE}/api/v1/expenses`, () => {
    return HttpResponse.json(paginated(mockExpenses))
  }),

  http.post(`${BASE}/api/v1/expenses`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(
      { ...mockExpenses[0], id: 'exp-new-0000-0000-000000000099', ...body },
      { status: 201 },
    )
  }),

  http.patch(`${BASE}/api/v1/expenses/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    const exp = mockExpenses.find((e) => e.id === params.id) ?? mockExpenses[0]
    return HttpResponse.json({ ...exp, ...body })
  }),

  http.delete(`${BASE}/api/v1/expenses/:id`, () => {
    return new HttpResponse(null, { status: 204 })
  }),
]

// ── Admin: Usuarios ────────────────────────────────────────────────────────

const usersHandlers = [
  http.get(`${BASE}/api/v1/users`, () => {
    return HttpResponse.json(Object.values(mockUsers))
  }),

  http.get(`${BASE}/api/v1/users/:id`, ({ params }) => {
    const user = Object.values(mockUsers).find((u) => u.id === params.id)
    if (!user) return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    return HttpResponse.json(user)
  }),

  http.post(`${BASE}/api/v1/users`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(
      { ...mockUsers.cajero, id: 'user-new-000-0000-000000000099', ...body },
      { status: 201 },
    )
  }),

  http.patch(`${BASE}/api/v1/users/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    const user = Object.values(mockUsers).find((u) => u.id === params.id) ?? mockUsers.admin
    return HttpResponse.json({ ...user, ...body })
  }),

  http.delete(`${BASE}/api/v1/users/:id`, () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.patch(`${BASE}/api/v1/users/:id/password`, () => {
    return new HttpResponse(null, { status: 204 })
  }),
]

// ── Exporta todos los handlers combinados ──────────────────────────────────

export const handlers = [
  ...authHandlers,
  ...categoriesHandlers,
  ...productsHandlers,
  ...ingredientsHandlers,
  ...recipesHandlers,
  ...customersHandlers,
  ...salesHandlers,
  ...productionHandlers,
  ...suppliersHandlers,
  ...purchasesHandlers,
  ...expensesHandlers,
  ...usersHandlers,
]

// Exporta grupos individuales para override granular en tests
export {
  authHandlers,
  categoriesHandlers,
  productsHandlers,
  ingredientsHandlers,
  recipesHandlers,
  customersHandlers,
  salesHandlers,
  productionHandlers,
  suppliersHandlers,
  purchasesHandlers,
  expensesHandlers,
  usersHandlers,
}
