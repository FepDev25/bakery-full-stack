/**
 * Tests E2E de control de acceso por rol.
 * Verifica que cada rol vea exactamente los módulos que le corresponden en el sidebar.
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'

test.describe('Control de acceso por rol', () => {
  test('admin ve todos los módulos en el sidebar', async ({ page }) => {
    await loginAs(page, 'admin')

    const nav = page.getByRole('navigation', { name: 'Navegación principal' })

    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Ventas' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Clientes' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Producción' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Catálogo' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Inventario' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Finanzas' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Admin' })).toBeVisible()
  })

  test('cajero no ve Producción, Catálogo, Finanzas ni Admin', async ({ page }) => {
    await loginAs(page, 'cajero')

    const nav = page.getByRole('navigation', { name: 'Navegación principal' })

    // Módulos visibles para cajero
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Ventas' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Clientes' })).toBeVisible()

    // Módulos ocultos para cajero
    await expect(nav.getByRole('link', { name: 'Producción' })).not.toBeVisible()
    await expect(nav.getByRole('link', { name: 'Catálogo' })).not.toBeVisible()
    await expect(nav.getByRole('link', { name: 'Inventario' })).not.toBeVisible()
    await expect(nav.getByRole('link', { name: 'Finanzas' })).not.toBeVisible()
    await expect(nav.getByRole('link', { name: 'Admin' })).not.toBeVisible()
  })

  test('panadero no ve Ventas, Clientes, Finanzas ni Admin', async ({ page }) => {
    await loginAs(page, 'panadero')

    const nav = page.getByRole('navigation', { name: 'Navegación principal' })

    // Módulos visibles para panadero
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Producción' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Inventario' })).toBeVisible()

    // Módulos ocultos para panadero
    await expect(nav.getByRole('link', { name: 'Ventas' })).not.toBeVisible()
    await expect(nav.getByRole('link', { name: 'Clientes' })).not.toBeVisible()
    await expect(nav.getByRole('link', { name: 'Catálogo' })).not.toBeVisible()
    await expect(nav.getByRole('link', { name: 'Finanzas' })).not.toBeVisible()
    await expect(nav.getByRole('link', { name: 'Admin' })).not.toBeVisible()
  })

  test('contador no ve Ventas, Clientes, Producción ni Admin (solo Inventario y Finanzas)', async ({ page }) => {
    await loginAs(page, 'contador')

    const nav = page.getByRole('navigation', { name: 'Navegación principal' })

    // Módulos visibles para contador
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Inventario' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Finanzas' })).toBeVisible()

    // Módulos ocultos para contador
    await expect(nav.getByRole('link', { name: 'Ventas' })).not.toBeVisible()
    await expect(nav.getByRole('link', { name: 'Clientes' })).not.toBeVisible()
    await expect(nav.getByRole('link', { name: 'Producción' })).not.toBeVisible()
    await expect(nav.getByRole('link', { name: 'Catálogo' })).not.toBeVisible()
    await expect(nav.getByRole('link', { name: 'Admin' })).not.toBeVisible()
  })
})
