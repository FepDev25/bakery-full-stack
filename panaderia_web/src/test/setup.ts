import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './msw/server'
import { apiClient } from '@/api/client'

/**
 * Fuerza el adapter HTTP de Node.js en apiClient.
 *
 * Por qué es necesario:
 * jsdom expone globalThis.XMLHttpRequest, por lo que Axios v1.7+ selecciona el
 * adapter "xhr" (lista de preferencia: ['xhr', 'http', 'fetch']).
 * MSW setupServer parchea los módulos `http`/`https` de Node.js pero no el
 * XMLHttpRequest de jsdom, así que Axios+jsdom nunca llega a MSW.
 * Forzando adapter='http' todas las llamadas de apiClient pasan por el módulo
 * http de Node y MSW las intercepta correctamente.
 */
apiClient.defaults.adapter = 'http'

// Garantiza baseURL aunque import.meta.env no esté disponible en el entorno de test
if (!apiClient.defaults.baseURL) {
  apiClient.defaults.baseURL = 'http://localhost:8000'
}

// Previene navegación en window.location.href = '...' (p.ej. logout)
Object.defineProperty(window, 'location', {
  configurable: true,
  writable: true,
  value: { href: '' },
})

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  localStorage.clear()
})

afterAll(() => {
  server.close()
})
