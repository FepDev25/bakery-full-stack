/**
 * Tests E2E del flujo de producción.
 * Se ejecutan en serie: el primer test crea un lote, el segundo lo completa,
 * el tercero crea otro lote y lo descarta.
 *
 * Requiere backend corriendo en http://localhost:8000 con los seeds cargados.
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'

// URL del detalle del lote creado en el primer test
let batchUrl = ''

test.describe.serial('Producción — ciclo de vida de lotes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'panadero')
  })

  test('crea lote con receta → ingredientes calculados correctamente', async ({ page }) => {
    await page.goto('/app/produccion/nuevo')

    // Seleccionar producto Baguette (tiene receta configurada)
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Baguette' }).click()

    // Esperar a que carguen los ingredientes de la receta
    await expect(page.getByText('Harina 000')).toBeVisible({ timeout: 5000 })

    // Establecer cantidad = 10 unidades
    const qtyInput = page.locator('#b-qty')
    await qtyInput.fill('10')
    await qtyInput.press('Tab')

    // Verificar cálculo de ingredientes: receta × cantidad_del_lote
    // Harina 000: 0.250 kg × 10 = 2.500 kg
    await expect(page.getByText('2.500 kg')).toBeVisible()
    // Levadura Fresca: 0.008 kg × 10 = 0.080 kg
    await expect(page.getByText('0.080 kg')).toBeVisible()
    // Sal Fina: 0.005 kg × 10 = 0.050 kg
    await expect(page.getByText('0.050 kg')).toBeVisible()

    // Crear el lote
    await page.getByRole('button', { name: /crear lote/i }).click()

    // Redirige al detalle del lote (en proceso)
    await page.waitForURL(/\/app\/produccion\/[0-9a-f-]+$/, { timeout: 10000 })
    batchUrl = page.url()

    // El lote está en proceso → muestra botones de acción
    await expect(page.getByRole('button', { name: /completar lote/i })).toBeVisible()
  })

  test('completar lote → stock del producto aumenta (RN-002)', async ({ page }) => {
    await page.goto(batchUrl)

    // Esperar que cargue el detalle
    await expect(page.getByRole('button', { name: /completar lote/i })).toBeVisible()

    // Abrir dialog de confirmación
    await page.getByRole('button', { name: /completar lote/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: /completar lote/i })).toBeVisible()

    // Confirmar
    await dialog.getByRole('button', { name: /^completar$/i }).click()

    // Toast confirma actualización de stock (RN-002)
    const toast = page.locator('[data-sonner-toast]').first()
    await expect(toast).toBeVisible({ timeout: 8000 })
    await expect(toast).toContainText(/stock.*actualizado/i)

    // El lote ya no muestra botones de acción (ya no es en_proceso)
    await expect(page.getByRole('button', { name: /completar lote/i })).not.toBeVisible()
    await expect(page.getByText(/ya no puede modificarse/i)).toBeVisible()
  })

  test('descartar lote → stock NO aumenta pero ingredientes se consumen (RN-008)', async ({ page }) => {
    // Crear un nuevo lote para poder descartarlo
    await page.goto('/app/produccion/nuevo')

    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Pan Francés' }).click()

    await expect(page.getByText('Harina 000')).toBeVisible({ timeout: 5000 })

    // Crear con la cantidad mínima
    await page.getByRole('button', { name: /crear lote/i }).click()
    await page.waitForURL(/\/app\/produccion\/[0-9a-f-]+$/, { timeout: 10000 })

    // Descartar el lote
    await expect(page.getByRole('button', { name: /descartar lote/i })).toBeVisible()
    await page.getByRole('button', { name: /descartar lote/i }).click()

    // El dialog debe advertir sobre el impacto en ingredientes (RN-008)
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(/ingrediente/i)
    await expect(dialog).toContainText(/stock/i)

    // Confirmar el descarte
    await dialog.getByRole('button', { name: /descartar lote/i }).click()

    // Toast confirma descarte sin suma de stock (RN-008)
    const toast = page.locator('[data-sonner-toast]').first()
    await expect(toast).toBeVisible({ timeout: 8000 })
    await expect(toast).toContainText(/lote descartado/i)

    // El lote ya no muestra botones de acción
    await expect(page.getByRole('button', { name: /descartar lote/i })).not.toBeVisible()
    await expect(page.getByText(/ya no puede modificarse/i)).toBeVisible()
  })
})
