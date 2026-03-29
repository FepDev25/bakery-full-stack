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

export async function listCustomers(params?: { page?: number; pageSize?: number }) {
  const { data } = await apiClient.get<PaginatedResponse<CustomerResponse>>('/api/v1/customers', {
    params: { page: params?.page ?? 1, page_size: params?.pageSize ?? 100 },
  })
  return data
}
