import { describe, expect, it } from 'vitest'
import { buildMockUserProfile, decodeGoogleIdToken } from './auth'

describe('auth helpers', () => {
  it('builds a mock user profile from Google payload', () => {
    const profile = buildMockUserProfile({
      sub: '123',
      email: 'test@example.com',
      given_name: 'Jane',
      family_name: 'Doe',
    })

    expect(profile).toEqual({
      id: '123',
      name: 'Jane Doe',
      email: 'test@example.com',
      role: 'Product Designer',
      plan: 'Pro',
      avatar: 'JD',
    })
  })

  it('decodes a JWT id token payload', () => {
    const wrapped =
      'eyJhbGciOiJIUzI1NiJ9.' +
      Buffer.from(JSON.stringify({ email: 'test@example.com', nonce: 'abc123' })).toString(
        'base64url',
      ) +
      '.signature'
    const payload = decodeGoogleIdToken(wrapped)

    expect(payload).toEqual({ email: 'test@example.com', nonce: 'abc123' })
  })
})
