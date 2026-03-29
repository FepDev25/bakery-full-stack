import { Navigate, Outlet } from 'react-router-dom'
import type { Role } from '@/features/auth/useAuthStore'
import { useAuthStore } from '@/features/auth/useAuthStore'

interface RoleGuardProps {
  allowed: Role[]
}

export function RoleGuard({ allowed }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user)

  if (!user || !allowed.includes(user.role)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}
