import { apiClient } from './client'
import type { PaginatedResponse } from '@/components/shared/DataTable'

export type BatchStatus = 'en_proceso' | 'completado' | 'descartado'

export interface ProductionBatchResponse {
  id: string
  product_id: string
  user_id: string
  quantity_produced: number
  unit: string
  ingredient_cost: number
  status: BatchStatus
  production_date: string
  notes: string | null
  created_at: string
  updated_at: string
}

export async function listBatches(params?: { page?: number; pageSize?: number }) {
  const { data } = await apiClient.get<PaginatedResponse<ProductionBatchResponse>>(
    '/api/v1/production-batches',
    { params: { page: params?.page ?? 1, page_size: params?.pageSize ?? 20 } },
  )
  return data
}

export async function getBatch(id: string) {
  const { data } = await apiClient.get<ProductionBatchResponse>(
    `/api/v1/production-batches/${id}`,
  )
  return data
}

export async function createBatch(body: {
  product_id: string
  quantity_produced: number
  unit: string
  production_date: string
  notes?: string | null
}) {
  const { data } = await apiClient.post<ProductionBatchResponse>(
    '/api/v1/production-batches',
    body,
  )
  return data
}

export async function completeBatch(id: string) {
  const { data } = await apiClient.post<ProductionBatchResponse>(
    `/api/v1/production-batches/${id}/complete`,
  )
  return data
}

export async function discardBatch(id: string) {
  const { data } = await apiClient.post<ProductionBatchResponse>(
    `/api/v1/production-batches/${id}/discard`,
  )
  return data
}
