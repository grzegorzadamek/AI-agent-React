import type { DashboardStats } from '../types'
import { getStoredAuthUser } from './auth'
import { submitDashboardMessageFallback } from './mockClient'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/$/, '')
const isRealBackendEnabled = Boolean(apiBaseUrl)

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error?: {
    code: string
    message: string
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

export const fetchDashboardStats = async (accessToken: string): Promise<DashboardStats> => {
  if (!isRealBackendEnabled) {
    throw new Error('Real backend not configured')
  }

  const response = await fetch(`${apiBaseUrl}/dashboard`, {
    method: 'GET',
    headers: buildHeaders(accessToken),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return parseApiPayload<DashboardStats>(response)
}

export const submitDashboardMessageToApi = async (accessToken: string, message: string) => {
  if (!isRealBackendEnabled) {
    throw new Error('Real backend not configured')
  }

  const response = await fetch(`${apiBaseUrl}/dashboard/message`, {
    method: 'POST',
    headers: buildHeaders(accessToken),
    body: JSON.stringify({ message }),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return parseApiPayload<{ ok: boolean; message: string; progress?: number }>(response)
}

export const refreshAccessToken = async (refreshToken: string) => {
  if (!isRealBackendEnabled) {
    throw new Error('Real backend not configured')
  }

  const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ refreshToken }),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return parseApiPayload<{ accessToken: string; refreshToken: string; expiresIn: number }>(response)
}

export const logoutFromApi = async (accessToken: string) => {
  if (!isRealBackendEnabled) {
    return
  }

  await fetch(`${apiBaseUrl}/auth/logout`, {
    method: 'POST',
    headers: buildHeaders(accessToken),
  })
}

export const fetchDashboardStatsWithFallback = async (accessToken: string): Promise<DashboardStats> => {
  return fetchDashboardStats(accessToken)
}

export const submitDashboardMessageWithFallback = async (accessToken: string, message: string) => {
  if (!isRealBackendEnabled) {
    return submitDashboardMessageFallback(accessToken, getStoredAuthUser() ?? '', message)
  }

  return submitDashboardMessageToApi(accessToken, message)
}

export const isRealBackendAvailable = isRealBackendEnabled
