import type { DashboardStats } from '../types'
import { fetchDashboardStatsFallback, submitDashboardMessageFallback } from './mockClient'

const isRealBackendEnabled = Boolean(import.meta.env.VITE_API_BASE_URL)
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

const buildHeaders = (accessToken: string) => {
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

export const fetchDashboardStats = async (accessToken: string, email: string): Promise<DashboardStats> => {
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

  return parseJson<DashboardStats>(response)
}

export const submitDashboardMessageToApi = async (accessToken: string, email: string, message: string) => {
  if (!isRealBackendEnabled) {
    throw new Error('Real backend not configured')
  }

  const response = await fetch(`${apiBaseUrl}/messages`, {
    method: 'POST',
    headers: buildHeaders(accessToken),
    body: JSON.stringify({ email, message }),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return parseJson<{ ok: boolean; message: string }>(response)
}

export const fetchDashboardStatsWithFallback = async (accessToken: string, email: string): Promise<DashboardStats> => {
  if (!isRealBackendEnabled) {
    return fetchDashboardStatsFallback(accessToken, email)
  }

  try {
    return await fetchDashboardStats(accessToken, email)
  } catch (error) {
    console.warn('Real backend failed, falling back to mock implementation.', error)
    return fetchDashboardStatsFallback(accessToken, email)
  }
}

export const submitDashboardMessageWithFallback = async (accessToken: string, email: string, message: string) => {
  if (!isRealBackendEnabled) {
    return submitDashboardMessageFallback(accessToken, email, message)
  }

  try {
    return await submitDashboardMessageToApi(accessToken, email, message)
  } catch (error) {
    console.warn('Real backend failed, falling back to mock implementation.', error)
    return submitDashboardMessageFallback(accessToken, email, message)
  }
}

export const isRealBackendAvailable = isRealBackendEnabled
