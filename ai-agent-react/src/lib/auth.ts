import { AUTH_USER_KEY, authStorage } from '../utils/authStorage'
import type { UserProfile } from '../types'

type GoogleJwtPayload = {
  sub?: string
  email?: string
  name?: string
  given_name?: string
  family_name?: string
  nonce?: string
}

const normalizeString = (value: string) => value.trim()

const buildStringFromParts = (parts: Array<string | undefined>) =>
  parts.filter(Boolean).join(' ').trim()

export const buildGoogleOAuthUrl = () => {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(
    /\/$/,
    '',
  )

  if (!apiBaseUrl) {
    throw new Error('Missing VITE_API_BASE_URL')
  }

  return `${apiBaseUrl}/auth/google/login`
}

export const decodeGoogleIdToken = (idToken: string): GoogleJwtPayload => {
  const payload = idToken.split('.')[1] ?? ''
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
  const decoded = decodeURIComponent(
    atob(normalized)
      .split('')
      .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join(''),
  )

  return JSON.parse(decoded) as GoogleJwtPayload
}

export const buildMockUserProfile = (payload: GoogleJwtPayload): UserProfile => {
  const email = normalizeString(payload.email ?? 'unknown@example.com')
  const name =
    buildStringFromParts([payload.given_name, payload.family_name]) || payload.name || 'Google User'
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return {
    id: payload.sub ?? email,
    name,
    email,
    role: 'Product Designer',
    plan: 'Pro',
    avatar: initials || 'G',
  }
}

export const getStoredAuthUser = (): string | null => authStorage.read(AUTH_USER_KEY)

export const persistAuthSession = (user: UserProfile) => {
  authStorage.write(AUTH_USER_KEY, JSON.stringify(user))
}
