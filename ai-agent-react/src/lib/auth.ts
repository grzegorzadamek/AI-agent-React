import { AUTH_USER_KEY, ACCESS_TOKEN_KEY, OAUTH_NONCE_KEY, OAUTH_STATE_KEY, authStorage } from '../utils/authStorage'
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

const buildStringFromParts = (parts: Array<string | undefined>) => parts.filter(Boolean).join(' ').trim()

export const buildGoogleOAuthUrl = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/callback`

  if (!clientId) {
    throw new Error('Missing VITE_GOOGLE_CLIENT_ID')
  }

  const state = `demo-state-${Math.random().toString(36).slice(2)}`
  const nonce = `google-${Math.random().toString(36).slice(2)}`

  authStorage.write(OAUTH_STATE_KEY, state)
  authStorage.write(OAUTH_NONCE_KEY, nonce)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'id_token',
    scope: 'openid profile email',
    state,
    nonce,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
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
  const name = buildStringFromParts([payload.given_name, payload.family_name]) || payload.name || 'Google User'
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

export const validateGoogleCallback = (idToken: string, state: string) => {
  const payload = decodeGoogleIdToken(idToken)
  const expectedState = authStorage.read(OAUTH_STATE_KEY)
  const expectedNonce = authStorage.read(OAUTH_NONCE_KEY)
  const receivedNonce = payload.nonce

  authStorage.remove(OAUTH_STATE_KEY)
  authStorage.remove(OAUTH_NONCE_KEY)

  return {
    payload,
    isValid: expectedState === state && expectedNonce === receivedNonce,
  }
}

export const getStoredAuthUser = (): string | null => authStorage.read(AUTH_USER_KEY)

export const getStoredAccessToken = (): string | null => authStorage.read(ACCESS_TOKEN_KEY)

export const persistAuthSession = (user: UserProfile, token: string) => {
  authStorage.write(AUTH_USER_KEY, JSON.stringify(user))
  authStorage.write(ACCESS_TOKEN_KEY, token)
}
