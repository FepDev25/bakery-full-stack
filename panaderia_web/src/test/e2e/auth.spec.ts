import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'

test.describe('Autenticación', () => {
  test('login exitoso como admin → redirige a /app/dashboard', async ({ page }) => {
    await loginAs(page, 'admin')
    await expect(page).toHaveURL(/\/app\/dashboard/)
    // La navegación principal debe ser visible
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible()
  })

  test('login fallido → mensaje de error visible', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name=email]', 'no-existe@fake.com')
    await page.fill('[name=password]', 'password-erronea')
    await page.click('button[type=submit]')

    await expect(page.getByText('Email o contraseña incorrectos.')).toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('acceso directo a /app/ventas sin sesión → redirige a /login', async ({ page }) => {
    await page.goto('/app/ventas')
    await expect(page).toHaveURL(/\/login/)
  })

  test('cajero intenta acceder a /app/catalogo → redirige a /403', async ({ page }) => {
    await loginAs(page, 'cajero')
    await page.goto('/app/catalogo')
    await expect(page).toHaveURL('/403')
    await expect(page.getByText('403')).toBeVisible()
    await expect(page.getByText(/permiso/i)).toBeVisible()
  })

  test('logout → redirige a /login → no puede volver con Back', async ({ page }) => {
    await loginAs(page, 'admin')
    await expect(page).toHaveURL(/\/app\//)

    // Cerrar sesión
    await page.getByLabel('Cerrar sesión').click()
    await expect(page).toHaveURL(/\/login/)

    // Intentar volver con el botón Atrás del navegador
    await page.goBack()
    // La ruta protegida debe redirigir de nuevo a /login (no hay token)
    await expect(page).toHaveURL(/\/login/)
  })
})
