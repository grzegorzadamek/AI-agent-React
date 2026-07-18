import { fetchDashboardData, submitDashboardMessage } from './mockApi'
import type { DashboardStats } from '../types'

export const fetchDashboardStatsFallback = async (accessToken: string, email: string): Promise<DashboardStats> => {
  return fetchDashboardData({ accessToken, email })
}

export const submitDashboardMessageFallback = async (accessToken: string, email: string, message: string) => {
  return submitDashboardMessage({ accessToken, email, message })
}
