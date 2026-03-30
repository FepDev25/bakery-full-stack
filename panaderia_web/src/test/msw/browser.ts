/**
 * Worker MSW para el browser (Playwright con mocks de red).
 * Solo se usa si se configura el service worker en el app de testing.
 */
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
