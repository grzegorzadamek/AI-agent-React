import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../utils/errors.js'
import { verifyAccessToken } from '../services/tokenService.js'
import { ACCESS_TOKEN_COOKIE, getCookie } from '../utils/sessionCookies.js'

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authorization = req.headers.authorization
  const accessToken = authorization?.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : getCookie(req.headers.cookie, ACCESS_TOKEN_COOKIE)

  if (!accessToken) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Missing or invalid bearer token'))
  }

  try {
    const payload = verifyAccessToken(accessToken)

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      plan: payload.plan,
      avatar: payload.avatar,
    }

    return next()
  } catch {
    return next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired session'))
  }
}
