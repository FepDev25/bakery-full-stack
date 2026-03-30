import type { Page } from '@playwright/test'

type Role = 'admin' | 'cajero' | 'panadero' | 'contador'

const CREDENTIALS: Record<Role, { email: string; password: string }> = {
  admin:    { email: 'admin@panaderia.com',    password: 'admin123' },
  cajero:   { email: 'cajero1@panaderia.com',  password: 'cajero123' },
  panadero: { email: 'panadero@panaderia.com', password: 'panadero123' },
  contador: { email: 'contador@panaderia.com', password: 'contador123' },
}

/**
 * Realiza el login con las credenciales del rol dado.
 * Espera hasta que la URL contenga /app/ para confirmar redirección exitosa.
 */
export async function loginAs(page: Page, role: Role): Promise<void> {
  const { email, password } = CREDENTIALS[role]
  await page.goto('/login')
  await page.fill('[name=email]', email)
  await page.fill('[name=password]', password)
  await page.click('button[type=submit]')
  await page.waitForURL(/\/app\//)
}
