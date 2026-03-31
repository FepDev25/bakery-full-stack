import {
  BotMessageSquare,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Warehouse,
  Settings,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/utils'
import type { Role } from '@/features/auth/useAuthStore'
import { useAuthStore } from '@/features/auth/useAuthStore'

interface NavItem {
  label: string
  to: string
  icon: React.ElementType
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/app/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'cajero', 'panadero', 'contador'],
  },
  {
    label: 'Ventas',
    to: '/app/ventas',
    icon: ShoppingCart,
    roles: ['cajero', 'admin'],
  },
  {
    label: 'Clientes',
    to: '/app/clientes',
    icon: Users,
    roles: ['cajero', 'admin'],
  },
  {
    label: 'Producción',
    to: '/app/produccion',
    icon: UtensilsCrossed,
    roles: ['panadero', 'admin'],
  },
  {
    label: 'Catálogo',
    to: '/app/catalogo',
    icon: Package,
    roles: ['admin'],
  },
  {
    label: 'Inventario',
    to: '/app/inventario',
    icon: Warehouse,
    roles: ['panadero', 'contador', 'admin'],
  },
  {
    label: 'Finanzas',
    to: '/app/finanzas',
    icon: TrendingUp,
    roles: ['contador', 'admin'],
  },
  {
    label: 'Admin',
    to: '/app/admin',
    icon: Settings,
    roles: ['admin'],
  },
  {
    label: 'Asistente AI',
    to: '/app/ai',
    icon: BotMessageSquare,
    roles: ['admin', 'cajero', 'panadero', 'contador'],
  },
]

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrador',
  cajero: 'Cajero',
  panadero: 'Panadero',
  contador: 'Contador',
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  // llamado cuando se hace click en un item (solo para mobile, para cerrar el sheet)
  onClose?: () => void
  // Si es true, el sidebar se comporta como en mobile (oculto por defecto, se muestra como un sheet)
  mobile?: boolean
}

export function Sidebar({ collapsed, onToggle, onClose, mobile = false }: SidebarProps) {
  const user = useAuthStore((s) => s.user)
  const role = user?.role

  const visibleItems = role
    ? NAV_ITEMS.filter((item) => item.roles.includes(role))
    : []

  const isCollapsed = !mobile && collapsed

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r border-border bg-sidebar transition-all duration-200',
        isCollapsed ? 'w-16' : 'w-56',
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-sidebar-border px-3',
          isCollapsed ? 'justify-center' : 'gap-2.5 px-4',
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-base shadow-sm">
          🥐
        </span>
        {!isCollapsed && (
          <span className="truncate font-bold tracking-tight text-sidebar-foreground">
            {import.meta.env.VITE_APP_NAME ?? 'Panadería'}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3" aria-label="Navegación principal">
        <ul className="space-y-0.5 px-2">
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                title={isCollapsed ? item.label : undefined}
                aria-label={item.label}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                    'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isActive &&
                      'bg-sidebar-primary/10 text-sidebar-primary font-semibold',
                    isCollapsed && 'justify-center px-2',
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Role pill at bottom */}
      {!isCollapsed && role && (
        <div className="shrink-0 border-t border-sidebar-border px-4 py-3">
          <p className="truncate text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wide">
            {ROLE_LABEL[role]}
          </p>
        </div>
      )}

      {/* Collapse toggle — desktop only */}
      {!mobile && (
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className={cn(
            'absolute -right-3 top-[3.25rem] z-10 flex h-6 w-6 items-center justify-center',
            'rounded-full border border-border bg-background text-muted-foreground shadow-sm',
            'hover:bg-accent hover:text-accent-foreground transition-colors',
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
      )}
    </aside>
  )
}
