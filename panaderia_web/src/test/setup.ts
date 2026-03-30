import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './msw/server'

// Levanta el servidor MSW antes de todos los tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
})

// Resetea los handlers tras cada test para evitar contaminación entre tests
afterEach(() => {
  cleanup()
  server.resetHandlers()
  // Limpia localStorage para evitar que el auth store persista entre tests
  localStorage.clear()
})

// Cierra el servidor al terminar
afterAll(() => {
  server.close()
})
