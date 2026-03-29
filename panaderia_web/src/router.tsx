import { createBrowserRouter } from 'react-router-dom'

import AppShell from '@/components/layout/AppShell'
import LoginPage from '@/features/auth/LoginPage'

const Placeholder = ({ title }: { title: string }) => (
  <div className="flex h-full items-center justify-center text-muted-foreground">
    <p>{title} — próximamente</p>
  </div>
)

const NotFound = () => (
  <div className="flex h-screen flex-col items-center justify-center gap-2">
    <p className="text-4xl font-bold">404</p>
    <p className="text-muted-foreground">Página no encontrada.</p>
  </div>
)

const Forbidden = () => (
  <div className="flex h-screen flex-col items-center justify-center gap-2">
    <p className="text-4xl font-bold text-destructive">403</p>
    <p className="text-muted-foreground">No tenés permiso para acceder a esta sección.</p>
  </div>
)

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/403', element: <Forbidden /> },
  { path: '/404', element: <NotFound /> },
  {
    path: '/app',
    element: <AppShell />,
    children: [
      { index: true, element: <Placeholder title="Dashboard" /> },
      { path: 'dashboard', element: <Placeholder title="Dashboard" /> },
      { path: 'ventas/*', element: <Placeholder title="Ventas" /> },
      { path: 'produccion/*', element: <Placeholder title="Producción" /> },
      { path: 'finanzas/*', element: <Placeholder title="Finanzas" /> },
      { path: 'catalogo/*', element: <Placeholder title="Catálogo" /> },
      { path: 'admin/*', element: <Placeholder title="Admin" /> },
    ],
  },
  { path: '/', element: <Placeholder title="Inicio" /> },
  { path: '*', element: <NotFound /> },
])
