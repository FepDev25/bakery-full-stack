/**
 * Tests E2E del flujo de ventas.
 * Se ejecutan en serie porque cada test depende del estado creado por el anterior.
 *
 * Flujo: crear venta → verificar stock → cancelar venta → verificar stock revertido
 *
 * Requiere backend corriendo en http://localhost:8000 con los seeds cargados.
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'

// Stock inicial de Baguette, capturado en el primer test y reutilizado en los siguientes
let stockAntesDeLaVenta = 0
const PRODUCT_NAME = 'Pan de Miga'

/** Navega a nueva venta y espera que la API de productos responda con 200. */
async function goToNuevaVenta(page: Parameters<typeof loginAs>[0]) {
  await page.goto('/app/ventas/nueva')
  await page.waitForResponse((r) => r.url().includes('/api/v1/products') && r.status() === 200, {
    timeout: 15000,
  })
}

test.describe.serial('Ventas — flujo completo', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'cajero')
  })

  test('cajero crea venta completa: producto → cierre → confirma → toast éxito', async ({
    page,
  }) => {
    await goToNuevaVenta(page)

    // Esperar a que el card del producto de prueba esté en el DOM
    const productCard = page.locator('.bg-card').filter({ hasText: PRODUCT_NAME }).first()
    await expect(productCard).toBeVisible({ timeout: 5000 })

    // Capturar el stock actual antes de la venta
    const stockText = await productCard.getByText(/Stock:/).textContent()
    stockAntesDeLaVenta = parseInt(stockText?.match(/Stock:\s*(\d+)/)?.[1] ?? '0')
    expect(stockAntesDeLaVenta).toBeGreaterThan(0)

    // Agregar 1 unidad al carrito (botón + es el último botón del card)
    await productCard.getByRole('button').last().click()

    // El botón "Continuar" debe habilitarse
    const continueBtn = page.getByRole('button', { name: /continuar/i })
    await expect(continueBtn).toBeEnabled()
    await continueBtn.click()

    // Step 2: Cierre — el método de pago por defecto es "Efectivo", sin cambios
    await expect(page.getByRole('button', { name: /confirmar venta/i })).toBeVisible()
    await page.getByRole('button', { name: /confirmar venta/i }).click()

    // Toast de éxito
    const toast = page.locator('[data-sonner-toast]').first()
    await expect(toast).toBeVisible({ timeout: 8000 })
    await expect(toast).toContainText(/creada/i)

    // Redirige al listado de ventas
    await expect(page).toHaveURL(/\/app\/ventas$/, { timeout: 10000 })
  })

  test('el stock del producto se reduce después de la venta', async ({ page }) => {
    await goToNuevaVenta(page)

    const productCard = page.locator('.bg-card').filter({ hasText: PRODUCT_NAME }).first()
    await expect(productCard).toBeVisible({ timeout: 5000 })

    const stockText = await productCard.getByText(/Stock:/).textContent()
    const stockActual = parseInt(stockText?.match(/Stock:\s*(\d+)/)?.[1] ?? '0')

    expect(stockActual).toBe(stockAntesDeLaVenta - 1)
  })

  test('cancelar venta → ConfirmDialog → confirmar → estado cambia a "cancelada"', async ({
    page,
  }) => {
    await page.goto('/app/ventas')

    // Esperar que cargue el listado
    await page.waitForResponse((r) => r.url().includes('/api/v1/sales') && r.status() === 200, {
      timeout: 10000,
    })

    // La venta más reciente debería estar al tope de la lista
    await page
      .getByRole('button', { name: /ver detalle/i })
      .first()
      .click()

    // El Sheet de detalle debe abrirse
    await expect(page.getByRole('dialog')).toBeVisible()

    // La venta debe estar en estado "completada" para poder cancelarla
    const cancelBtn = page.getByRole('button', { name: /cancelar venta/i })
    await expect(cancelBtn).toBeVisible()
    await cancelBtn.click()

    // ConfirmDialog de confirmación (RN-006)
    const confirmDialog = page.getByRole('dialog').filter({ hasText: /revertirá el stock/i })
    await expect(confirmDialog).toBeVisible()
    await confirmDialog.getByRole('button', { name: /cancelar venta/i }).click()

    // Toast de éxito
    const toast = page.locator('[data-sonner-toast]').first()
    await expect(toast).toContainText(/venta cancelada/i, { timeout: 8000 })
  })

  test('cancelar venta revierte el stock al valor original', async ({ page }) => {
    await goToNuevaVenta(page)

    const productCard = page.locator('.bg-card').filter({ hasText: PRODUCT_NAME }).first()
    await expect(productCard).toBeVisible({ timeout: 5000 })

    const stockText = await productCard.getByText(/Stock:/).textContent()
    const stockDespues = parseInt(stockText?.match(/Stock:\s*(\d+)/)?.[1] ?? '0')

    // El stock debe haber vuelto al valor original (cancelar revierte — RN-006)
    expect(stockDespues).toBe(stockAntesDeLaVenta)
  })
})
