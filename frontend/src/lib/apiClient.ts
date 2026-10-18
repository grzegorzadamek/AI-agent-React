import type { DashboardStats, UserProfile } from '../types'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(
  /\/$/,
  '',
)

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error?: {
    code: string
    message: string
  }
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const buildHeaders = () => {
  const headers = new Headers({
    'Content-Type': 'application/json',
  })

  return headers
}

const requestInit = (): RequestInit => ({
  credentials: 'include',
  headers: buildHeaders(),
})

type AuthRequestOptions = {
  refreshOnUnauthorized?: boolean
}

let refreshPromise: Promise<void> | null = null

const parseJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text()
  try {
    return text ? (JSON.parse(text) as T) : ({} as T)
  } catch {
    throw new Error('Invalid JSON response')
  }
}

const parseApiPayload = async <T>(response: Response): Promise<T> => {
  const payload = await parseJson<ApiEnvelope<T>>(response)

  if (!payload.success) {
    throw new Error(payload.error?.message ?? 'API request failed')
  }

  return payload.data
}

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const response = await requestWithAuth(`${apiBaseUrl}/dashboard`, {
    ...requestInit(),
    method: 'GET',
  })

  if (!response.ok) {
    throw new ApiError(`API error: ${response.status}`, response.status)
  }

  return parseApiPayload<DashboardStats>(response)
}

export const fetchCurrentUser = async () => {
  const response = await requestWithAuth(`${apiBaseUrl}/me`, requestInit(), {
    refreshOnUnauthorized: false,
  })
  if (!response.ok) {
    throw new ApiError(`API error: ${response.status}`, response.status)
  }

  return parseApiPayload<UserProfile>(response)
}

export const fetchPublicDashboardMessage = async (): Promise<string> => {
  const response = await fetch(`${apiBaseUrl}/public/message`, {
    ...requestInit(),
    method: 'GET',
  })

  if (!response.ok) {
    throw new ApiError(`API error: ${response.status}`, response.status)
  }

  const payload = await parseApiPayload<{ message: string }>(response)
  return payload.message
}

export const submitDashboardMessageToApi = async (message: string) => {
  const response = await requestWithAuth(`${apiBaseUrl}/dashboard/message`, {
    ...requestInit(),
    method: 'POST',
    body: JSON.stringify({ message }),
  })

  if (!response.ok) {
    throw new ApiError(`API error: ${response.status}`, response.status)
  }

  return parseApiPayload<{ ok: boolean; message: string; progress?: number }>(response)
}

export const refreshAccessToken = async () => {
  const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
    ...requestInit(),
    method: 'POST',
  })

  if (!response.ok) {
    throw new ApiError(`API error: ${response.status}`, response.status)
  }

  await parseApiPayload<{ expiresIn: number }>(response)
}

const refreshOnce = async () => {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

const requestWithAuth = async (
  url: string,
  init: RequestInit,
  options: AuthRequestOptions = {},
): Promise<Response> => {
  const response = await fetch(url, init)
  if (response.status !== 401 || options.refreshOnUnauthorized === false) {
    return response
  }

  await refreshOnce()
  return fetch(url, init)
}

export const logoutFromApi = async () => {
  await fetch(`${apiBaseUrl}/auth/logout`, {
    ...requestInit(),
    method: 'POST',
  })
}
