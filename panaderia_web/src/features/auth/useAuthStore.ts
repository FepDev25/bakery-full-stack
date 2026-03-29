import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'admin' | 'cajero' | 'panadero' | 'contador'

export interface AuthUser {
  id: string
  email: string
  full_name: string
  role: Role
  is_active: boolean
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  // Actions
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: AuthUser) => void
  login: (accessToken: string, refreshToken: string, user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      login: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user }),

      logout: () => {
        set({ accessToken: null, refreshToken: null, user: null })
        // Redirección manejada por el router (ProtectedRoute detecta token null)
        window.location.href = '/login'
      },
    }),
    {
      name: 'panaderia-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
)
