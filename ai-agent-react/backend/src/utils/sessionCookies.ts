import type { Response } from 'express'
import { env } from '../config/env.js'
import type { AuthTokens } from '../types.js'

export const ACCESS_TOKEN_COOKIE = 'ai_access_token'
export const REFRESH_TOKEN_COOKIE = 'ai_refresh_token'

const cookieOptions = (path: string, maxAge: number) =>
  `Max-Age=${maxAge}; Path=${path}; HttpOnly; SameSite=Lax${env.NODE_ENV === 'production' ? '; Secure' : ''}`

export const getCookie = (cookieHeader: string | undefined, name: string) => {
  const cookie = cookieHeader
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))

  if (!cookie) return null

  try {
    return decodeURIComponent(cookie.slice(name.length + 1))
  } catch {
    return null
  }
}

export const setSessionCookies = (res: Response, tokens: AuthTokens, clearOAuthState = false) => {
  const cookies = [
    `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(tokens.accessToken)}; ${cookieOptions('/api', 900)}`,
    `${REFRESH_TOKEN_COOKIE}=${encodeURIComponent(tokens.refreshToken)}; ${cookieOptions('/api/auth', 604800)}`,
  ]

  if (clearOAuthState) {
    cookies.push(clearOAuthStateCookie())
    cookies.push(clearOAuthVerifierCookie())
  }

  res.setHeader('Set-Cookie', cookies)
}

export const clearOAuthStateCookie = () =>
  `oauth_state=; Max-Age=0; Path=/api/auth; HttpOnly; SameSite=Lax${
    env.NODE_ENV === 'production' ? '; Secure' : ''
  }`

export const clearOAuthVerifierCookie = () =>
  `oauth_verifier=; Max-Age=0; Path=/api/auth; HttpOnly; SameSite=Lax${
    env.NODE_ENV === 'production' ? '; Secure' : ''
  }`

export const clearSessionCookies = (res: Response) => {
  res.setHeader('Set-Cookie', [
    `${ACCESS_TOKEN_COOKIE}=; ${cookieOptions('/api', 0)}`,
    `${REFRESH_TOKEN_COOKIE}=; ${cookieOptions('/api/auth', 0)}`,
  ])
}
