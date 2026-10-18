import { describe, expect, it, vi } from 'vitest'
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getCookie,
  setSessionCookies,
} from './sessionCookies.js'

describe('sessionCookies', () => {
  it('sets scoped HttpOnly access and refresh cookies', () => {
    const setHeader = vi.fn()
    setSessionCookies({ setHeader } as never, {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })

    const cookies = setHeader.mock.calls[0][1] as string[]
    expect(cookies[0]).toContain(`${ACCESS_TOKEN_COOKIE}=access-token`)
    expect(cookies[0]).toContain('Path=/api')
    expect(cookies[0]).toContain('HttpOnly')
    expect(cookies[1]).toContain(`${REFRESH_TOKEN_COOKIE}=refresh-token`)
    expect(cookies[1]).toContain('Path=/api/auth')
  })

  it('decodes a named cookie safely', () => {
    expect(getCookie('other=value; ai_access_token=encoded%20token', 'ai_access_token')).toBe(
      'encoded token',
    )
    expect(getCookie('ai_access_token=%invalid', 'ai_access_token')).toBeNull()
  })
})
