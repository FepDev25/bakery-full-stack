import { apiClient } from './client'
import type { PaginatedResponse } from '@/components/shared/DataTable'

// Types

export type ExpenseCategory =
  | 'alquiler'
  | 'servicios'
  | 'salarios'
  | 'mantenimiento'
  | 'marketing'
  | 'impuestos'
  | 'otros'

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  alquiler: 'Alquiler',
  servicios: 'Servicios',
  salarios: 'Salarios',
  mantenimiento: 'Mantenimiento',
  marketing: 'Marketing',
  impuestos: 'Impuestos',
  otros: 'Otros',
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'alquiler',
  'servicios',
  'salarios',
  'mantenimiento',
  'marketing',
  'impuestos',
  'otros',
]

export interface ExpenseResponse {
  id: string
  category: ExpenseCategory
  description: string
  amount: number
  expense_date: string
  invoice_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Expense CRUD

export async function listExpenses(params?: {
  page?: number
  pageSize?: number
  from_date?: string
  to_date?: string
}) {
  const { data } = await apiClient.get<PaginatedResponse<ExpenseResponse>>('/api/v1/expenses', {
    params: {
      page: params?.page ?? 1,
      page_size: params?.pageSize ?? 20,
      from_date: params?.from_date ?? undefined,
      to_date: params?.to_date ?? undefined,
    },
  })
  return data
}

export async function createExpense(body: {
  category: ExpenseCategory
  description: string
  amount: number
  expense_date: string
  invoice_number?: string | null
  notes?: string | null
}) {
  const { data } = await apiClient.post<ExpenseResponse>('/api/v1/expenses', body)
  return data
}

export async function updateExpense(
  id: string,
  body: Partial<{
    category: ExpenseCategory
    description: string
    amount: number
    expense_date: string
    invoice_number: string | null
    notes: string | null
  }>,
) {
  const { data } = await apiClient.patch<ExpenseResponse>(`/api/v1/expenses/${id}`, body)
  return data
}

export async function deleteExpense(id: string) {
  await apiClient.delete(`/api/v1/expenses/${id}`)
}
