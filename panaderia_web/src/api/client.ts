import axios, { type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/features/auth/useAuthStore'

// Cola de requests en espera mientras se refresca el token
type PendingRequest = {
  resolve: (value: string) => void
  reject: (reason: unknown) => void
}

let isRefreshing = false
let pendingQueue: PendingRequest[] = []

function processPendingQueue(error: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  pendingQueue = []
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// request interceptor
apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// response interceptor, manejo de 401 con refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean }

    // No intentar refresh en endpoints públicos de auth (login/refresh)
    const isPublicAuthEndpoint =
      original.url?.includes('/auth/login') || original.url?.includes('/auth/refresh')
    if (error.response?.status !== 401 || original._retry || isPublicAuthEndpoint) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Encolar el request hasta que el refresh resuelva
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            original.headers = {
              ...original.headers,
              Authorization: `Bearer ${token}`,
            }
            resolve(apiClient(original))
          },
          reject,
        })
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const { refreshToken, setTokens, logout } = useAuthStore.getState()

      if (!refreshToken) {
        logout()
        return Promise.reject(error)
      }

      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/auth/refresh`,
        { refresh_token: refreshToken },
        { headers: { 'Content-Type': 'application/json' } },
      )

      setTokens(data.access_token, data.refresh_token)
      processPendingQueue(null, data.access_token)

      original.headers = {
        ...original.headers,
        Authorization: `Bearer ${data.access_token}`,
      }
      return apiClient(original)
    } catch (refreshError) {
      processPendingQueue(refreshError, null)
      useAuthStore.getState().logout()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)
