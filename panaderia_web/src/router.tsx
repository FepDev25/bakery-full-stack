import { lazy, Suspense, type ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import AppShell from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleGuard } from '@/components/auth/RoleGuard'
const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const CatalogPage = lazy(() => import('@/features/catalog/CatalogPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const CreateSaleFlow = lazy(() => import('@/features/sales/CreateSaleFlow'))
const SaleListPage = lazy(() => import('@/features/sales/SaleListPage'))
const CustomerDetailPage = lazy(() => import('@/features/customers/CustomerDetailPage'))
const CustomerListPage = lazy(() => import('@/features/customers/CustomerListPage'))
const BatchDetailPage = lazy(() => import('@/features/production/BatchDetailPage'))
const CreateBatchForm = lazy(() => import('@/features/production/CreateBatchForm'))
const ProductionListPage = lazy(() => import('@/features/production/ProductionListPage'))
const InventoryPage = lazy(() => import('@/features/inventory/InventoryPage'))
const FinancePage = lazy(() => import('@/features/finance/FinancePage'))
const AdminPage = lazy(() => import('@/features/admin/AdminPage'))

const NotFound = () => (
  <div className="flex h-screen flex-col items-center justify-center gap-2">
    <p className="text-foreground text-5xl font-bold">404</p>
    <p className="text-muted-foreground">Página no encontrada.</p>
  </div>
)

const RouteLoader = () => (
  <div className="text-muted-foreground flex h-[40vh] items-center justify-center text-sm">
    Cargando...
  </div>
)

const withSuspense = (Component: ComponentType) => (
  <Suspense fallback={<RouteLoader />}>
    <Component />
  </Suspense>
)

const Forbidden = () => (
  <div className="flex h-screen flex-col items-center justify-center gap-2">
    <p className="text-destructive text-5xl font-bold">403</p>
    <p className="text-muted-foreground">No tenés permiso para acceder a esta sección.</p>
  </div>
)

export const router = createBrowserRouter([
  // Rutas públicas
  { path: '/login', element: withSuspense(LoginPage) },
  { path: '/403', element: <Forbidden /> },
  { path: '/404', element: <NotFound /> },

  // Raíz: redirige al login
  { path: '/', element: <Navigate to="/login" replace /> },

  // Rutas protegidas
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/app',
        element: <AppShell />,
        children: [
          // Dashboard — todos los roles
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: withSuspense(DashboardPage) },

          // Ventas — cajero + admin
          {
            element: <RoleGuard allowed={['cajero', 'admin']} />,
            children: [
              { path: 'ventas', element: withSuspense(SaleListPage) },
              { path: 'ventas/nueva', element: withSuspense(CreateSaleFlow) },
            ],
          },

          // Clientes — cajero + admin
          {
            element: <RoleGuard allowed={['cajero', 'admin']} />,
            children: [
              { path: 'clientes', element: withSuspense(CustomerListPage) },
              { path: 'clientes/:id', element: withSuspense(CustomerDetailPage) },
            ],
          },

          // Producción — panadero + admin
          {
            element: <RoleGuard allowed={['panadero', 'admin']} />,
            children: [
              { path: 'produccion', element: withSuspense(ProductionListPage) },
              { path: 'produccion/nuevo', element: withSuspense(CreateBatchForm) },
              { path: 'produccion/:id', element: withSuspense(BatchDetailPage) },
            ],
          },

          // Catálogo — admin
          {
            element: <RoleGuard allowed={['admin']} />,
            children: [{ path: 'catalogo/*', element: withSuspense(CatalogPage) }],
          },

          // Inventario — panadero + contador + admin
          {
            element: <RoleGuard allowed={['panadero', 'contador', 'admin']} />,
            children: [{ path: 'inventario/*', element: withSuspense(InventoryPage) }],
          },

          // Finanzas — contador + admin
          {
            element: <RoleGuard allowed={['contador', 'admin']} />,
            children: [{ path: 'finanzas/*', element: withSuspense(FinancePage) }],
          },

          // Admin — admin
          {
            element: <RoleGuard allowed={['admin']} />,
            children: [{ path: 'admin/*', element: withSuspense(AdminPage) }],
          },
        ],
      },
    ],
  },

  { path: '*', element: <NotFound /> },
])
