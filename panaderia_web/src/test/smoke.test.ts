/**
 * Smoke test de infraestructura — verifica que Vitest globals, MSW server y
 * fixtures están correctamente configurados. Se puede eliminar cuando haya tests reales.
 */
import { server } from './msw/server'
import { mockTokens, mockUsers, mockCategories, paginated } from './msw/fixtures'

describe('Infraestructura de tests', () => {
  describe('Vitest globals', () => {
    it('describe / it / expect funcionan sin imports', () => {
      expect(1 + 1).toBe(2)
    })

    it('beforeAll / afterEach / afterAll están disponibles', () => {
      expect(typeof beforeAll).toBe('function')
      expect(typeof afterEach).toBe('function')
      expect(typeof afterAll).toBe('function')
    })
  })

  describe('MSW server', () => {
    it('el servidor arranca en beforeAll sin errores', () => {
      // Si llegamos aquí, server.listen() en setup.ts no tiró error
      expect(server).toBeDefined()
    })
  })

  describe('Fixtures', () => {
    it('mockTokens tiene la forma correcta del contrato de la API', () => {
      expect(mockTokens).toMatchObject({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
        token_type: 'bearer',
        expires_in: expect.any(Number),
      })
    })

    it('mockUsers cubre los 4 roles', () => {
      expect(mockUsers.admin.role).toBe('admin')
      expect(mockUsers.cajero.role).toBe('cajero')
      expect(mockUsers.panadero.role).toBe('panadero')
      expect(mockUsers.contador.role).toBe('contador')
    })

    it('paginated() construye una PaginatedResponse válida', () => {
      const result = paginated(mockCategories)
      expect(result.items).toHaveLength(mockCategories.length)
      expect(result.page).toBe(1)
      expect(result.total).toBe(mockCategories.length)
      expect(result.total_pages).toBe(1)
    })

    it('page en fixtures nunca es 0 ni negativo', () => {
      const result = paginated(mockCategories)
      expect(result.page).toBeGreaterThanOrEqual(1)
    })
  })
})
