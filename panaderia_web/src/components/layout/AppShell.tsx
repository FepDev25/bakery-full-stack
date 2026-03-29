import { Outlet } from 'react-router-dom'

// por implementar
export default function AppShell() {
  return (
    <div className="flex h-screen bg-background">
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
