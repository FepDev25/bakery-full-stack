import { apiClient } from './client'
import type { PaginatedResponse } from '@/components/shared/DataTable'
import type { IngredientUnit } from './catalog'

// Types

export interface SupplierResponse {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  tax_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface IngredientPurchaseResponse {
  id: string
  supplier_id: string
  ingredient_id: string
  user_id: string
  quantity: number
  unit: IngredientUnit
  unit_price: number
  total_amount: number
  purchase_date: string
  invoice_number: string | null
  notes: string | null
  created_at: string
}

// Suppliers

export async function listSuppliers(params?: { page?: number; pageSize?: number }) {
  const { data } = await apiClient.get<PaginatedResponse<SupplierResponse>>('/api/v1/suppliers', {
    params: { page: params?.page ?? 1, page_size: params?.pageSize ?? 100 },
  })
  return data
}

export async function createSupplier(body: {
  name: string
  contact_person?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  tax_id?: string | null
}) {
  const { data } = await apiClient.post<SupplierResponse>('/api/v1/suppliers', body)
  return data
}

export async function updateSupplier(
  id: string,
  body: Partial<{
    name: string
    contact_person: string | null
    phone: string | null
    email: string | null
    address: string | null
    tax_id: string | null
  }>,
) {
  const { data } = await apiClient.patch<SupplierResponse>(`/api/v1/suppliers/${id}`, body)
  return data
}

export async function deleteSupplier(id: string) {
  await apiClient.delete(`/api/v1/suppliers/${id}`)
}

// Ingredient Purchases

export async function listPurchases(params?: { page?: number; pageSize?: number }) {
  const { data } = await apiClient.get<PaginatedResponse<IngredientPurchaseResponse>>(
    '/api/v1/ingredient-purchases',
    { params: { page: params?.page ?? 1, page_size: params?.pageSize ?? 20 } },
  )
  return data
}

export async function listPurchasesBySupplier(supplierId: string, params?: { page?: number }) {
  const { data } = await apiClient.get<PaginatedResponse<IngredientPurchaseResponse>>(
    `/api/v1/ingredient-purchases/by-supplier/${supplierId}`,
    { params: { page: params?.page ?? 1, page_size: 20 } },
  )
  return data
}

export async function listPurchasesByIngredient(ingredientId: string, params?: { page?: number }) {
  const { data } = await apiClient.get<PaginatedResponse<IngredientPurchaseResponse>>(
    `/api/v1/ingredient-purchases/by-ingredient/${ingredientId}`,
    { params: { page: params?.page ?? 1, page_size: 20 } },
  )
  return data
}

export async function createPurchase(body: {
  supplier_id: string
  ingredient_id: string
  quantity: number
  unit: IngredientUnit
  unit_price: number
  purchase_date: string
  invoice_number?: string | null
  notes?: string | null
}) {
  const { data } = await apiClient.post<IngredientPurchaseResponse>(
    '/api/v1/ingredient-purchases',
    body,
  )
  return data
}
