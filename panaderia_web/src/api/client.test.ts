/**
 * Unit tests para los interceptores de apiClient.
 * Usa un adapter custom en lugar de MSW porque Axios delega la lógica de
 * validateStatus/settle a los adapters nativos (http/xhr), no a dispatchRequest.
 * Un adapter custom debe replicar ese comportamiento lanzando AxiosError para
 * status >= 400, igual que lo hace axios/lib/core/settle.js internamente.
 */
import axios, { AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/features/auth/useAuthStore'

const BASE = 'http://localhost:8000'

// Captura el adapter original para restaurarlo después de cada test
const originalAdapter = apiClient.defaults.adapter

/**
 * Crea un adapter que replica el comportamiento de settle() de Axios:
 * - status 2xx → resuelve con AxiosResponse
 * - status 4xx/5xx → lanza AxiosError con la response adjunta
 */
function makeAdapter(
  status: number,
  data: unknown = null,
): (config: InternalAxiosRequestConfig) => Promise<AxiosResponse> {
  return async (config) => {
    const response: AxiosResponse = {
      data,
      status,
      statusText: String(status),
      headers: {},
      config,
      request: {},
    }

    const validate = config.validateStatus
    if (validate && !validate(status)) {
      // Replica settle.js de Axios — 4xx → ERR_BAD_REQUEST, 5xx → ERR_BAD_RESPONSE
      const code = status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST'
      throw new AxiosError(`Request failed with status code ${status}`, code, config, null, response)
    }

    return response
  }
}

beforeAll(() => {
  // Previene que jsdom lance al asignar window.location.href
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { href: '' },
  })
  // Garantiza que apiClient tenga baseURL aunque import.meta.env no esté disponible
  apiClient.defaults.baseURL = BASE
})

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null })
})

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  vi.restoreAllMocks()
})

// ── Request interceptor ───────────────────────────────────────────────────

describe('request interceptor', () => {
  it('añade Authorization: Bearer cuando hay accessToken', async () => {
    useAuthStore.setState({ accessToken: 'my-token-abc' })

    let capturedConfig: InternalAxiosRequestConfig | null = null
    apiClient.defaults.adapter = async (config) => {
      capturedConfig = config
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config, request: {} }
    }

    await apiClient.get('/api/v1/ping')

    const authHeader = capturedConfig!.headers.get?.('Authorization') ?? capturedConfig!.headers['Authorization']
    expect(String(authHeader)).toBe('Bearer my-token-abc')
  })

  it('omite el header Authorization cuando accessToken es null', async () => {
    useAuthStore.setState({ accessToken: null })

    let capturedConfig: InternalAxiosRequestConfig | null = null
    apiClient.defaults.adapter = async (config) => {
      capturedConfig = config
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config, request: {} }
    }

    await apiClient.get('/api/v1/ping')

    const authHeader = capturedConfig!.headers.get?.('Authorization') ?? capturedConfig!.headers['Authorization']
    expect(authHeader).toBeFalsy()
  })
})

// ── Response interceptor — 401 ────────────────────────────────────────────

describe('response interceptor — 401', () => {
  it('reintenta la request con el nuevo token tras refresh exitoso', async () => {
    useAuthStore.setState({ accessToken: 'expired-tok', refreshToken: 'valid-rf' })

    let callCount = 0
    apiClient.defaults.adapter = async (config) => {
      callCount++
      // Primera llamada: 401; retry: 200 con datos
      const status = callCount === 1 ? 401 : 200
      const data = callCount === 1 ? null : { ok: true }
      const response: AxiosResponse = { data, status, statusText: String(status), headers: {}, config, request: {} }
      const validate = config.validateStatus
      if (validate && !validate(status)) {
        throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, null, response)
      }
      return response
    }

    // Mock del axios.post interno que realiza el refresh de token
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        access_token: 'new-access-tok',
        refresh_token: 'new-refresh-tok',
        token_type: 'bearer',
        expires_in: 3600,
      },
    })

    const response = await apiClient.get('/api/v1/ping')

    expect(response.data).toEqual({ ok: true })
    expect(callCount).toBe(2)
    expect(useAuthStore.getState().accessToken).toBe('new-access-tok')
    expect(useAuthStore.getState().refreshToken).toBe('new-refresh-tok')
  })

  it('llama logout y rechaza cuando /auth/refresh devuelve error', async () => {
    const logoutSpy = vi.fn()
    vi.spyOn(useAuthStore, 'getState').mockReturnValue({
      ...useAuthStore.getState(),
      accessToken: 'expired-tok',
      refreshToken: 'bad-rf',
      logout: logoutSpy,
    })

    apiClient.defaults.adapter = makeAdapter(401)

    // El refresh también falla
    vi.spyOn(axios, 'post').mockRejectedValue(
      new AxiosError('Unauthorized', 'ERR_BAD_REQUEST'),
    )

    await expect(apiClient.get('/api/v1/ping')).rejects.toBeInstanceOf(Error)
    expect(logoutSpy).toHaveBeenCalledOnce()
  })

  it('no reintenta cuando el 401 viene del propio endpoint /auth/refresh', async () => {
    useAuthStore.setState({ accessToken: null, refreshToken: null })

    let callCount = 0
    apiClient.defaults.adapter = async (config) => {
      callCount++
      return makeAdapter(401)(config) // siempre 401
    }

    await expect(apiClient.post('/api/v1/auth/refresh', {})).rejects.toBeInstanceOf(Error)
    // No debe haber retry — isRefreshEndpoint es true
    expect(callCount).toBe(1)
  })

  it('llama logout cuando no hay refreshToken disponible', async () => {
    const logoutSpy = vi.fn()
    vi.spyOn(useAuthStore, 'getState').mockReturnValue({
      ...useAuthStore.getState(),
      accessToken: 'expired-tok',
      refreshToken: null,
      logout: logoutSpy,
    })

    apiClient.defaults.adapter = makeAdapter(401)

    await expect(apiClient.get('/api/v1/ping')).rejects.toBeInstanceOf(Error)
    expect(logoutSpy).toHaveBeenCalledOnce()
  })
})
