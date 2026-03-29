import { apiClient } from './client'
import type { Role } from '@/features/auth/useAuthStore'

// Types

export interface UserResponse {
  id: string
  email: string
  full_name: string
  role: Role
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

// User management (admin only)

export async function listUsers(params?: {
  skip?: number
  limit?: number
  is_active?: boolean | null
  search?: string
}) {
  const { data } = await apiClient.get<UserResponse[]>('/api/v1/users', {
    params: {
      skip: params?.skip ?? 0,
      limit: params?.limit ?? 100,
      is_active: params?.is_active ?? undefined,
      search: params?.search || undefined,
    },
  })
  return data
}

export async function createUser(body: {
  email: string
  full_name: string
  role: Role
  password: string
}) {
  const { data } = await apiClient.post<UserResponse>('/api/v1/users', body)
  return data
}

export async function updateUser(
  id: string,
  body: Partial<{
    email: string | null
    full_name: string | null
    role: Role | null
    is_active: boolean | null
  }>,
) {
  const { data } = await apiClient.patch<UserResponse>(`/api/v1/users/${id}`, body)
  return data
}

export async function deleteUser(id: string) {
  await apiClient.delete(`/api/v1/users/${id}`)
}

// Password change (any authenticated user on their own ID)

export async function changePassword(
  userId: string,
  body: { current_password: string; new_password: string },
) {
  await apiClient.patch(`/api/v1/users/${userId}/password`, body)
}
