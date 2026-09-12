import { describe, expect, it } from 'vitest'
import { signTokens, verifyAccessToken, verifyRefreshToken } from './tokenService.js'

describe('tokenService', () => {
  const payload = {
    sub: 'google-user-1',
    email: 'user@example.com',
    role: 'Product Designer',
    plan: 'Pro',
    avatar: 'U',
  }

  it('signs and verifies access and refresh tokens', () => {
    const tokens = signTokens(payload)
    const accessToken = verifyAccessToken(tokens.accessToken)
    const refreshToken = verifyRefreshToken(tokens.refreshToken)

    expect(accessToken).toMatchObject(payload)
    expect(refreshToken).toMatchObject({ sub: payload.sub, email: payload.email })
    expect(refreshToken.jti).toEqual(expect.any(String))
    expect(refreshToken.exp).toEqual(expect.any(Number))
  })
})
