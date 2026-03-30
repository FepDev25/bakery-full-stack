/**
 * Tests E2E de comportamiento responsive (mobile 375px).
 * En viewport <768px el sidebar desktop está oculto y se usa el drawer (Sheet).
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'

test.describe('Mobile — responsive', () => {
  // Usar viewport móvil para todos los tests de este bloque
  test.use({ viewport: { width: 375, height: 667 } })

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  test('viewport 375px → sidebar desktop no visible', async ({ page }) => {
    // El sidebar de desktop está wrapeado en un div con "hidden md:flex"
    // Por debajo de 768px no debe ser visible
    const desktopSidebar = page.locator('div.hidden.md\\:flex')
    await expect(desktopSidebar).not.toBeVisible()

    // Pero el botón hamburguesa SÍ debe ser visible
    await expect(page.getByLabel('Abrir menú')).toBeVisible()
  })

  test('botón hamburguesa → drawer se abre con la navegación', async ({ page }) => {
    // Antes de abrir: el nav del drawer no debe ser visible
    const sheet = page.getByRole('dialog')
    await expect(sheet).not.toBeVisible()

    // Abrir el drawer
    await page.getByLabel('Abrir menú').click()

    // El drawer (Sheet) debe aparecer con el nav
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible()

    // Los ítems del nav deben ser visibles dentro del drawer
    await expect(sheet.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(sheet.getByRole('link', { name: 'Ventas' })).toBeVisible()
  })

  test('click en NavLink dentro del drawer → drawer se cierra + navegación correcta', async ({ page }) => {
    // Abrir el drawer
    await page.getByLabel('Abrir menú').click()
    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible()

    // Hacer click en el link "Ventas" dentro del drawer
    await sheet.getByRole('link', { name: 'Ventas' }).click()

    // El drawer debe cerrarse
    await expect(sheet).not.toBeVisible()

    // Y la navegación debe haber ocurrido
    await expect(page).toHaveURL(/\/app\/ventas/)
  })
})
