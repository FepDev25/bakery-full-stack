/**
 * Servidor MSW para Node.js (Vitest).
 * Se configura en src/test/setup.ts.
 */
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
