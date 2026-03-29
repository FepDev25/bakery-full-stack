import { apiClient } from './client'
import type { PaginatedResponse } from '@/components/shared/DataTable'

export type SaleStatus = 'completada' | 'cancelada'
export type PaymentMethod =
  | 'efectivo'
  | 'tarjeta_debito'
  | 'tarjeta_credito'
  | 'transferencia'
  | 'qr'

export interface SaleItemResponse {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit: string
  unit_price: number
  subtotal: number
  created_at: string
}

export interface SaleResponse {
  id: string
  sale_number: string
  user_id: string
  customer_id: string | null
  payment_method: PaymentMethod
  notes: string | null
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  status: SaleStatus
  sale_date: string
  created_at: string
}

export interface SaleWithItemsResponse extends SaleResponse {
  items: SaleItemResponse[]
}

export interface SaleItemCreate {
  product_id: string
  quantity: number
}

export interface SaleCreate {
  items: SaleItemCreate[]
  payment_method: PaymentMethod
  customer_id?: string | null
  notes?: string | null
  discount_amount?: number
}

export async function listSales(params?: {
  page?: number
  pageSize?: number
  from_date?: string
  to_date?: string
}) {
  const { data } = await apiClient.get<PaginatedResponse<SaleResponse>>('/api/v1/sales', {
    params: {
      page: params?.page ?? 1,
      page_size: params?.pageSize ?? 20,
      from_date: params?.from_date ?? undefined,
      to_date: params?.to_date ?? undefined,
    },
  })
  return data
}

export async function getSale(id: string) {
  const { data } = await apiClient.get<SaleWithItemsResponse>(`/api/v1/sales/${id}`)
  return data
}

export async function createSale(body: SaleCreate) {
  const { data } = await apiClient.post<SaleWithItemsResponse>('/api/v1/sales', body)
  return data
}

export async function cancelSale(id: string) {
  const { data } = await apiClient.post<SaleResponse>(`/api/v1/sales/${id}/cancel`)
  return data
}
