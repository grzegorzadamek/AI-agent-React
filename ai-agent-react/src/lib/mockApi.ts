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

const mockAuthorizedEmails = new Set(['nakoniecdnia@gmail.com'])

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const buildMockUser = (email: string, name: string, avatar: string): UserProfile => ({
  id: `mock-${email}`,
  name,
  email,
  role: 'Product Designer',
  plan: 'Pro',
  avatar,
})

const createAccessToken = (email: string) => `mock-token-${btoa(email)}-${Math.random().toString(36).slice(2)}`

const extractBearerToken = (headers?: HeadersInit): string | null => {
  if (!headers) {
    return null
  }

  const headerBag = headers instanceof Headers ? headers : new Headers(headers)
  const authorization = headerBag.get('authorization') ?? headerBag.get('Authorization')

  if (!authorization?.startsWith('Bearer ')) {
    return null
  }

  return authorization.slice(7).trim()
}

export async function refreshAccessToken(input: { email: string; accessToken: string }): Promise<string> {
  const normalizedEmail = input.email.trim().toLowerCase()

  if (!normalizedEmail || !input.accessToken || !input.accessToken.startsWith('mock-token-')) {
    throw new Error('Invalid refresh payload')
  }

  await delay(250)

  return createAccessToken(normalizedEmail)
}

export async function authenticateUser(input: { email: string; idToken: string }): Promise<AuthResult> {
  const normalizedEmail = input.email.trim().toLowerCase()

  if (!normalizedEmail || !input.idToken) {
    throw new Error('Invalid authentication payload')
  }

  await delay(700)

  if (!mockAuthorizedEmails.has(normalizedEmail)) {
    return {
      authorized: false,
      user: null,
      accessToken: null,
      reason: 'FORBIDDEN',
    }
  }

  const user = buildMockUser(normalizedEmail, normalizedEmail.split('@')[0], normalizedEmail[0].toUpperCase())
  return {
    authorized: true,
    user,
    accessToken: createAccessToken(normalizedEmail),
  }
}

export async function fetchDashboardData(input: { accessToken: string; email: string; headers?: HeadersInit }): Promise<DashboardStats> {
  const normalizedEmail = input.email.trim().toLowerCase()
  const bearerToken = extractBearerToken(input.headers) ?? input.accessToken

  if (!bearerToken || !bearerToken.startsWith('mock-token-')) {
    throw new Error('Unauthorized')
  }

  if (!mockAuthorizedEmails.has(normalizedEmail)) {
    throw new Error('Forbidden')
  }

  await delay(600)

  return {
    projects: 12,
    tasks: 34,
    notifications: 7,
    completion: 84,
  }
}

export async function submitDashboardMessage(input: { message: string; email: string; accessToken: string }): Promise<{ ok: boolean; message: string }> {
  const normalizedEmail = input.email.trim().toLowerCase()

  if (!input.accessToken || !input.accessToken.startsWith('mock-token-')) {
    throw new Error('Unauthorized')
  }

  if (!mockAuthorizedEmails.has(normalizedEmail)) {
    throw new Error('Forbidden')
  }

  if (!input.message.trim()) {
    throw new Error('Message is required')
  }

  await delay(700)

  return {
    ok: true,
    message: `Wysłano do backendu: ${input.message.trim()}`,
  }
}
