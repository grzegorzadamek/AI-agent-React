import type { Request, Response, NextFunction } from 'express'
import { randomBytes } from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'
import { z } from 'zod'
import { env } from '../config/env.js'
import { signTokens, verifyRefreshToken } from '../services/tokenService.js'
import { getUserByEmail, isEmailAllowed, upsertUser, saveDashboardMessageForUser, getDashboardStatsForUser } from '../services/userService.js'
import { AppError } from '../utils/errors.js'

const oauthClient = new OAuth2Client({
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  redirectUri: env.GOOGLE_REDIRECT_URI,
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

const messageSchema = z.object({
  message: z.string().min(1),
})

const buildUserProfile = (email: string, name: string) => ({
  id: `google-${email}`,
  name,
  email,
  role: 'Product Designer',
  plan: 'Pro',
  avatar: name.charAt(0).toUpperCase(),
})

export const googleLogin = (req: Request, res: Response) => {
  const state = randomBytes(16).toString('hex')
  const authUrl = oauthClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['openid', 'email', 'profile'],
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    state,
  })

  return res.redirect(authUrl)
}

export const googleCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = z.string().min(1).parse(req.query.code)
    const state = z.string().optional().parse(req.query.state) ?? ''
    const tokenResponse = await oauthClient.getToken(code)
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

    const callbackUrl = new URL(env.FRONTEND_URL)
    callbackUrl.pathname = '/auth/callback'
    callbackUrl.searchParams.set('accessToken', session.accessToken)
    callbackUrl.searchParams.set('refreshToken', session.refreshToken)
    callbackUrl.searchParams.set('user', encodeURIComponent(JSON.stringify(user)))

    return res.redirect(callbackUrl.toString())
  } catch (error) {
    return next(error)
  }
}

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body)
    const decoded = verifyRefreshToken(refreshToken)
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

    return res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 900,
      },
    })
  } catch (error) {
    return next(error)
  }
}

export const logout = async (req: Request, res: Response) => {
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

export const dashboardMessage = async (req: Request, res: Response) => {
  const parsed = messageSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Message is required',
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
}
