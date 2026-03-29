import { apiClient } from './client'
import type { PaginatedResponse } from '@/components/shared/DataTable'

export interface CustomerResponse {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  loyalty_points: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RedeemPointsResponse {
  discount_amount: number
  remaining_points: number
}

export async function listCustomers(params?: { page?: number; pageSize?: number }) {
  const { data } = await apiClient.get<PaginatedResponse<CustomerResponse>>('/api/v1/customers', {
    params: { page: params?.page ?? 1, page_size: params?.pageSize ?? 20 },
  })
  return data
}

export async function getCustomer(id: string) {
  const { data } = await apiClient.get<CustomerResponse>(`/api/v1/customers/${id}`)
  return data
}

export async function createCustomer(body: {
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
}) {
  const { data } = await apiClient.post<CustomerResponse>('/api/v1/customers', body)
  return data
}

export async function updateCustomer(
  id: string,
  body: Partial<{ name: string; phone: string | null; email: string | null; address: string | null }>,
) {
  const { data } = await apiClient.patch<CustomerResponse>(`/api/v1/customers/${id}`, body)
  return data
}

export async function deleteCustomer(id: string) {
  await apiClient.delete(`/api/v1/customers/${id}`)
}

export async function redeemPoints(id: string, points: number) {
  const { data } = await apiClient.post<RedeemPointsResponse>(
    `/api/v1/customers/${id}/redeem-points`,
    { points },
  )
  return data
}
