import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/features/auth/useAuthStore'
import type { Role } from '@/features/auth/useAuthStore'

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  cajero: 'Cajero',
  panadero: 'Panadero',
  contador: 'Contador',
}

export function Header() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      {/* Greeting */}
      <p className="text-sm font-medium text-foreground">
        {user?.full_name ? (
          <>
            Hola, <span className="text-primary">{user.full_name.split(' ')[0]}</span>
          </>
        ) : (
          'Bienvenido'
        )}
      </p>

      {/* Right side: role badge + logout */}
      <div className="flex items-center gap-3">
        {user?.role && (
          <Badge variant="secondary" className="hidden sm:flex font-medium capitalize">
            {ROLE_LABEL[user.role]}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="gap-1.5 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Salir</span>
        </Button>
      </div>
    </header>
  )
}
