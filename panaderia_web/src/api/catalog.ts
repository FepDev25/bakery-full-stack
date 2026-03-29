import { apiClient } from './client'
import type { PaginatedResponse } from '@/components/shared/DataTable'

// Types

export interface CategoryResponse {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ProductUnit = 'unidad' | 'kg' | 'gramo' | 'docena' | 'media docena'
export type IngredientUnit = 'kg' | 'gramo' | 'litro' | 'ml' | 'unidad'

export interface ProductResponse {
  id: string
  name: string
  description: string | null
  price: number
  unit: ProductUnit
  min_stock_alert: number
  category_id: string
  stock_quantity: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface IngredientResponse {
  id: string
  name: string
  unit: IngredientUnit
  min_stock_alert: number
  stock_quantity: number
  unit_cost: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RecipeResponse {
  id: string
  product_id: string
  ingredient_id: string
  quantity: number
  unit: IngredientUnit
  created_at: string
}

export interface ProductionCostResponse {
  product_id: string
  cost_per_unit: number
  recipe_count: number
}

// Categories

export async function listCategories(page = 1, pageSize = 100) {
  const { data } = await apiClient.get<PaginatedResponse<CategoryResponse>>(
    '/api/v1/categories',
    { params: { page, page_size: pageSize } },
  )
  return data
}

export async function createCategory(body: { name: string; description?: string | null }) {
  const { data } = await apiClient.post<CategoryResponse>('/api/v1/categories', body)
  return data
}

export async function updateCategory(
  id: string,
  body: { name?: string; description?: string | null },
) {
  const { data } = await apiClient.put<CategoryResponse>(`/api/v1/categories/${id}`, body)
  return data
}

export async function deleteCategory(id: string) {
  await apiClient.delete(`/api/v1/categories/${id}`)
}

// Products

export async function listProducts(params?: {
  page?: number
  pageSize?: number
  search?: string
  is_active?: boolean
}) {
  const { data } = await apiClient.get<PaginatedResponse<ProductResponse>>('/api/v1/products', {
    params: {
      page: params?.page ?? 1,
      page_size: params?.pageSize ?? 20,
      search: params?.search ?? undefined,
      is_active: params?.is_active ?? true,
    },
  })
  return data
}

export async function createProduct(body: {
  name: string
  description?: string | null
  price: number
  unit?: ProductUnit
  min_stock_alert?: number
  category_id: string
}) {
  const { data } = await apiClient.post<ProductResponse>('/api/v1/products', body)
  return data
}

export async function updateProduct(
  id: string,
  body: Partial<{
    name: string
    description: string | null
    price: number
    unit: ProductUnit
    min_stock_alert: number
    category_id: string
  }>,
) {
  const { data } = await apiClient.put<ProductResponse>(`/api/v1/products/${id}`, body)
  return data
}

export async function deleteProduct(id: string) {
  await apiClient.delete(`/api/v1/products/${id}`)
}

// Ingredients

export async function listIngredients(params?: { page?: number; pageSize?: number }) {
  const { data } = await apiClient.get<PaginatedResponse<IngredientResponse>>(
    '/api/v1/ingredients',
    { params: { page: params?.page ?? 1, page_size: params?.pageSize ?? 20 } },
  )
  return data
}

export async function createIngredient(body: {
  name: string
  unit?: IngredientUnit
  min_stock_alert?: number
}) {
  const { data } = await apiClient.post<IngredientResponse>('/api/v1/ingredients', body)
  return data
}

export async function updateIngredient(
  id: string,
  body: Partial<{ name: string; unit: IngredientUnit; min_stock_alert: number }>,
) {
  const { data } = await apiClient.put<IngredientResponse>(`/api/v1/ingredients/${id}`, body)
  return data
}

export async function deleteIngredient(id: string) {
  await apiClient.delete(`/api/v1/ingredients/${id}`)
}

// Recipes

export async function listRecipesByProduct(productId: string) {
  const { data } = await apiClient.get<RecipeResponse[]>(
    `/api/v1/recipes/product/${productId}`,
  )
  return data
}

export async function getProductionCost(productId: string) {
  const { data } = await apiClient.get<ProductionCostResponse>(
    `/api/v1/recipes/product/${productId}/cost`,
  )
  return data
}

export async function addRecipeIngredient(body: {
  product_id: string
  ingredient_id: string
  quantity: number
  unit: IngredientUnit
}) {
  const { data } = await apiClient.post<RecipeResponse>('/api/v1/recipes', body)
  return data
}

export async function deleteRecipeIngredient(recipeId: string) {
  await apiClient.delete(`/api/v1/recipes/${recipeId}`)
}
