import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import type { AuthTokens, SessionPayload } from '../types.js'

const ACCESS_TTL = '15m'
const REFRESH_TTL = '7d'

export const signTokens = (payload: SessionPayload): AuthTokens => ({
  accessToken: jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TTL,
  }),
  refreshToken: jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      jti: randomUUID(),
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: REFRESH_TTL,
    },
  ),
})

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as SessionPayload

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as {
    sub: string
    email: string
    jti: string
    iat?: number
    exp?: number
  }
