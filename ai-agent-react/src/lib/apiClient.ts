import type { DashboardStats, UserProfile } from '../types'
import { getStoredAuthUser } from './auth'
import { submitDashboardMessageFallback } from './mockClient'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(
  /\/$/,
  '',
)
const isRealBackendEnabled = Boolean(apiBaseUrl)

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

const buildHeaders = (accessToken?: string) => {
  const headers = new Headers({
    'Content-Type': 'application/json',
  })

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  return headers
}

const requestInit = (accessToken?: string): RequestInit => ({
  credentials: 'include',
  headers: buildHeaders(accessToken),
})

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

export const fetchDashboardStats = async (accessToken?: string): Promise<DashboardStats> => {
  if (!isRealBackendEnabled) {
    throw new Error('Real backend not configured')
  }

  const response = await fetch(`${apiBaseUrl}/dashboard`, {
    ...requestInit(accessToken),
    method: 'GET',
  })

  if (!response.ok) {
    throw new ApiError(`API error: ${response.status}`, response.status)
  }

  return parseApiPayload<DashboardStats>(response)
}

export const fetchCurrentUser = async () => {
  if (!isRealBackendEnabled) {
    throw new Error('Real backend not configured')
  }

  const response = await fetch(`${apiBaseUrl}/me`, requestInit())
  if (!response.ok) {
    throw new ApiError(`API error: ${response.status}`, response.status)
  }

  return parseApiPayload<UserProfile>(response)
}

export const fetchPublicDashboardMessage = async (): Promise<string> => {
  if (!isRealBackendEnabled) {
    return ''
  }

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
  if (!isRealBackendEnabled) {
    throw new Error('Real backend not configured')
  }

  const response = await fetch(`${apiBaseUrl}/dashboard/message`, {
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
  if (!isRealBackendEnabled) {
    throw new Error('Real backend not configured')
  }

  const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
    ...requestInit(),
    method: 'POST',
  })

  if (!response.ok) {
    throw new ApiError(`API error: ${response.status}`, response.status)
  }

  return parseApiPayload<{ accessToken: string; refreshToken: string; expiresIn: number }>(response)
}

export const logoutFromApi = async () => {
  if (!isRealBackendEnabled) {
    return
  }

  await fetch(`${apiBaseUrl}/auth/logout`, {
    ...requestInit(),
    method: 'POST',
  })
}

export const fetchDashboardStatsWithFallback = async (
  accessToken?: string,
): Promise<DashboardStats> => {
  return fetchDashboardStats(accessToken)
}

export const submitDashboardMessageWithFallback = async (message: string) => {
  if (!isRealBackendEnabled) {
    return submitDashboardMessageFallback('', getStoredAuthUser() ?? '', message)
  }

  return submitDashboardMessageToApi(message)
}

export const isRealBackendAvailable = isRealBackendEnabled
