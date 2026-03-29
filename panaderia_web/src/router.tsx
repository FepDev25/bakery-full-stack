import { createBrowserRouter, Navigate } from 'react-router-dom'

import AppShell from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleGuard } from '@/components/auth/RoleGuard'
import LoginPage from '@/features/auth/LoginPage'
import CatalogPage from '@/features/catalog/CatalogPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import CreateSaleFlow from '@/features/sales/CreateSaleFlow'
import SaleListPage from '@/features/sales/SaleListPage'
import CustomerDetailPage from '@/features/customers/CustomerDetailPage'
import CustomerListPage from '@/features/customers/CustomerListPage'
import BatchDetailPage from '@/features/production/BatchDetailPage'
import CreateBatchForm from '@/features/production/CreateBatchForm'
import ProductionListPage from '@/features/production/ProductionListPage'

const Placeholder = ({ title }: { title: string }) => (
  <div className="flex h-full items-center justify-center text-muted-foreground">
    <p>{title} — próximamente</p>
  </div>
)

const NotFound = () => (
  <div className="flex h-screen flex-col items-center justify-center gap-2">
    <p className="text-5xl font-bold text-foreground">404</p>
    <p className="text-muted-foreground">Página no encontrada.</p>
  </div>
)

const Forbidden = () => (
  <div className="flex h-screen flex-col items-center justify-center gap-2">
    <p className="text-5xl font-bold text-destructive">403</p>
    <p className="text-muted-foreground">No tenés permiso para acceder a esta sección.</p>
  </div>
)

export const router = createBrowserRouter([
  // Rutas públicas
  { path: '/login', element: <LoginPage /> },
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
          { path: 'dashboard', element: <DashboardPage /> },

          // Ventas — cajero + admin
          {
            element: <RoleGuard allowed={['cajero', 'admin']} />,
            children: [
              { path: 'ventas', element: <SaleListPage /> },
              { path: 'ventas/nueva', element: <CreateSaleFlow /> },
            ],
          },

          // Clientes — cajero + admin
          {
            element: <RoleGuard allowed={['cajero', 'admin']} />,
            children: [
              { path: 'clientes', element: <CustomerListPage /> },
              { path: 'clientes/:id', element: <CustomerDetailPage /> },
            ],
          },

          // Producción — panadero + admin
          {
            element: <RoleGuard allowed={['panadero', 'admin']} />,
            children: [
              { path: 'produccion', element: <ProductionListPage /> },
              { path: 'produccion/nuevo', element: <CreateBatchForm /> },
              { path: 'produccion/:id', element: <BatchDetailPage /> },
            ],
          },

          // Catálogo — admin
          {
            element: <RoleGuard allowed={['admin']} />,
            children: [{ path: 'catalogo/*', element: <CatalogPage /> }],
          },

          // Inventario — panadero + contador + admin
          {
            element: <RoleGuard allowed={['panadero', 'contador', 'admin']} />,
            children: [{ path: 'inventario/*', element: <Placeholder title="Inventario" /> }],
          },

          // Finanzas — contador + admin
          {
            element: <RoleGuard allowed={['contador', 'admin']} />,
            children: [{ path: 'finanzas/*', element: <Placeholder title="Finanzas" /> }],
          },

          // Admin — admin
          {
            element: <RoleGuard allowed={['admin']} />,
            children: [{ path: 'admin/*', element: <Placeholder title="Admin" /> }],
          },
        ],
      },
    ],
  },

  { path: '*', element: <NotFound /> },
])
