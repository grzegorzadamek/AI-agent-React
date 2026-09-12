import type { Request, Response, NextFunction } from 'express'
import { createHash, randomBytes } from 'node:crypto'
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library'
import { z } from 'zod'
import { env } from '../config/env.js'
import { signTokens, verifyRefreshToken } from '../services/tokenService.js'
import { isRefreshTokenRevoked, revokeRefreshToken } from '../services/sessionService.js'
import {
  getUserByEmail,
  isEmailAllowed,
  upsertUser,
  saveDashboardMessageForUser,
  getDashboardStatsForUser,
  getLatestDashboardMessage,
} from '../services/userService.js'
import { AppError } from '../utils/errors.js'
import {
  REFRESH_TOKEN_COOKIE,
  clearOAuthStateCookie,
  clearOAuthVerifierCookie,
  clearSessionCookies,
  getCookie,
  setSessionCookies,
} from '../utils/sessionCookies.js'

const oauthClient = new OAuth2Client({
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  redirectUri: env.GOOGLE_REDIRECT_URI,
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

const messageSchema = z.object({
  message: z.string().trim().min(1).max(500),
})

const buildUserProfile = (email: string, name: string) => ({
  id: `google-${email}`,
  name,
  email,
  role: 'Product Designer',
  plan: 'Pro',
  avatar: name.charAt(0).toUpperCase(),
})

const oauthStateCookie = (state: string, maxAge: number) =>
  `oauth_state=${encodeURIComponent(state)}; Max-Age=${maxAge}; Path=/api/auth; HttpOnly; SameSite=Lax${
    env.NODE_ENV === 'production' ? '; Secure' : ''
  }`

const oauthVerifierCookie = (verifier: string, maxAge: number) =>
  `oauth_verifier=${encodeURIComponent(verifier)}; Max-Age=${maxAge}; Path=/api/auth; HttpOnly; SameSite=Lax${
    env.NODE_ENV === 'production' ? '; Secure' : ''
  }`

export const googleLogin = (req: Request, res: Response) => {
  const state = randomBytes(16).toString('hex')
  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
  const authUrl = oauthClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['openid', 'email', 'profile'],
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
  })

  res.setHeader('Set-Cookie', [
    oauthStateCookie(state, 600),
    oauthVerifierCookie(codeVerifier, 600),
  ])
  return res.redirect(authUrl)
}

export const googleCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = z.string().min(1).parse(req.query.code)
    const state = z.string().min(1).parse(req.query.state)
    const expectedState = getCookie(req.headers.cookie, 'oauth_state')
    const codeVerifier = getCookie(req.headers.cookie, 'oauth_verifier')
    if (!expectedState || expectedState !== state || !codeVerifier) {
      throw new AppError(400, 'INVALID_OAUTH_STATE', 'OAuth state validation failed')
    }

    const tokenResponse = await oauthClient.getToken({ code, codeVerifier })
    const idToken = tokenResponse.tokens.id_token
    if (!idToken) {
      throw new AppError(401, 'UNAUTHORIZED', 'Google token exchange failed')
    }

    const ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload?.email || !payload.name) {
      throw new AppError(401, 'UNAUTHORIZED', 'Google profile is invalid')
    }

    const isAllowed = await isEmailAllowed(payload.email)
    if (!isAllowed) {
      res.setHeader('Set-Cookie', [clearOAuthStateCookie(), clearOAuthVerifierCookie()])
      const deniedUrl = new URL(env.FRONTEND_URL)
      deniedUrl.pathname = '/access-denied'
      deniedUrl.searchParams.set('email', payload.email)
      return res.redirect(deniedUrl.toString())
    }

    const user = buildUserProfile(payload.email, payload.name)
    await upsertUser(user)
    const session = signTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      avatar: user.avatar,
    })

    setSessionCookies(res, session, true)

    const callbackUrl = new URL(env.FRONTEND_URL)
    callbackUrl.pathname = '/auth/callback'

    return res.redirect(callbackUrl.toString())
  } catch (error) {
    return next(error)
  }
}

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = getCookie(req.headers.cookie, REFRESH_TOKEN_COOKIE)
    if (!refreshToken) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing refresh token')
    }

    refreshSchema.parse({ refreshToken })
    const decoded = verifyRefreshToken(refreshToken)
    if (await isRefreshTokenRevoked(refreshToken)) {
      throw new AppError(401, 'UNAUTHORIZED', 'Refresh token has been revoked')
    }

    const user = await getUserByEmail(decoded.email)

    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'User session not found')
    }

    const tokens = signTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      avatar: user.avatar,
    })
    await revokeRefreshToken(refreshToken, (decoded.exp ?? Math.floor(Date.now() / 1000)) * 1000)
    setSessionCookies(res, tokens)

    return res.json({
      success: true,
      data: {
        expiresIn: 900,
      },
    })
  } catch (error) {
    return next(error)
  }
}

export const logout = async (req: Request, res: Response) => {
  const refreshToken = getCookie(req.headers.cookie, REFRESH_TOKEN_COOKIE)
  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken)
      await revokeRefreshToken(refreshToken, (decoded.exp ?? Math.floor(Date.now() / 1000)) * 1000)
    } catch {
      // Clearing the cookies is still the correct logout result for an invalid token.
    }
  }

  clearSessionCookies(res)
  return res.status(204).send()
}

export const me = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: req.user,
  })
}

export const dashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user
    if (!user) {
      throw new AppError(403, 'FORBIDDEN', 'User is not authenticated')
    }

    // verify user exists / is allowed
    const exists = await getUserByEmail(user.email)
    if (!exists) {
      throw new AppError(403, 'FORBIDDEN', 'User is not allowed to access dashboard')
    }

    const stats = await getDashboardStatsForUser(user.email)

    return res.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    return next(error)
  }
}

export const dashboardMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = messageSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message must contain between 1 and 500 characters',
        },
      })
    }

    const user = req.user
    if (!user?.email) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      })
    }

    const saved = await saveDashboardMessageForUser(user.email, parsed.data.message)

    return res.json({
      success: true,
      data: {
        ok: true,
        message: `Wysłano do backendu: ${parsed.data.message}`,
        progress: saved.completion,
      },
    })
  } catch (error) {
    return next(error)
  }
}

export const publicDashboardMessage = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    const message = await getLatestDashboardMessage()

    return res.json({
      success: true,
      data: { message },
    })
  } catch (error) {
    return next(error)
  }
}
