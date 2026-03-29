import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AdminOverview from './AdminOverview'
import ChangePasswordSection from './ChangePasswordSection'
import UserListSection from './UserListSection'

export default function AdminPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Administración</h2>
        <p className="text-sm text-muted-foreground">
          Gestión de usuarios, contraseñas y resumen del sistema.
        </p>
      </div>

      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="contrasena">Mi contraseña</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4">
          <AdminOverview />
        </TabsContent>

        <TabsContent value="usuarios" className="mt-4">
          <UserListSection />
        </TabsContent>

        <TabsContent value="contrasena" className="mt-4">
          <ChangePasswordSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
