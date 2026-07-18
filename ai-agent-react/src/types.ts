export type AuthStep = 'idle' | 'redirecting' | 'authenticating' | 'success'
export type CallbackStatus = 'processing' | 'error'
export type AccessDeniedReason = 'forbidden' | 'session-expired'

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

export type AuthResult = {
  authorized: boolean
  user: UserProfile | null
  accessToken: string | null
  reason?: string
}

export type SubmitStatus = {
  type: 'idle' | 'success' | 'error'
  text: string
}
