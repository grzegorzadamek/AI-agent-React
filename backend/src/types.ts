export type UserProfile = {
  id: string
  name: string
  email: string
  role: string
  plan: string
  avatar: string
}

export type DashboardStats = {
  projects: number
  tasks: number
  notifications: number
  completion: number
}

export type SessionPayload = {
  sub: string
  email: string
  role: string
  plan: string
  avatar: string
}

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}
