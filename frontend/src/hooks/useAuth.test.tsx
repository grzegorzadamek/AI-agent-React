import { act, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from './useAuth'
import * as authLib from '../lib/auth'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', hash: '' }),
  }
})

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  type MockMutationOptions = { mutationFn?: () => Promise<unknown> }

  return {
    ...actual,
    useMutation: (options: MockMutationOptions) => ({
      mutate: vi.fn(async () => {
        if (options?.mutationFn) {
          await options.mutationFn()
        }
      }),
      isPending: false,
    }),
    useQueryClient: () => ({ clear: vi.fn(), invalidateQueries: vi.fn() }),
    useQuery: () => ({ data: undefined, isLoading: false, isError: false }),
  }
})

vi.mock('../lib/apiClient', () => ({
  fetchCurrentUser: vi.fn(async () => ({
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'Product Designer',
    plan: 'Pro',
    avatar: 'TU',
  })),
  fetchDashboardStats: vi.fn(async () => ({
    projects: 1,
    tasks: 2,
    notifications: 3,
    completion: 50,
  })),
  refreshAccessToken: vi.fn(async () => ({
    accessToken: 'new-token',
    refreshToken: 'refresh-token',
    expiresIn: 900,
  })),
}))

vi.mock('../utils/authStorage', () => {
  const authStorage = {
    read: vi.fn(() => null),
    write: vi.fn(),
    remove: vi.fn(),
    clearSession: vi.fn(),
    isSessionValid: vi.fn(() => false),
    touchSession: vi.fn(),
  }

  return {
    authStorage,
    AUTH_USER_KEY: 'ai-agent-auth-user',
    ACCESS_TOKEN_KEY: 'ai-agent-access-token',
    REFRESH_TOKEN_KEY: 'ai-agent-refresh-token',
    SESSION_TTL_MS: 15 * 60 * 1000,
    SESSION_TIMESTAMP_KEY: 'ai-agent-session-timestamp',
    OAUTH_STATE_KEY: 'ai-agent-oauth-state',
    OAUTH_NONCE_KEY: 'ai-agent-oauth-nonce',
  }
})

type HookResult = ReturnType<typeof useAuth>

function renderUseAuth() {
  const resultRef = { current: null as HookResult | null }

  function TestComponent() {
    resultRef.current = useAuth()
    return null
  }

  render(<TestComponent />)
  return resultRef
}

describe('useAuth', () => {
  it('initializes without authenticated user', () => {
    const result = renderUseAuth()

    expect(result.current?.authUser).toBeNull()
    expect(result.current?.isDashboardAccessible).toBe(false)
  })

  it('calls buildGoogleOAuthUrl when login is triggered', () => {
    const buildGoogleOAuthUrl = vi
      .spyOn(authLib, 'buildGoogleOAuthUrl')
      .mockReturnValue('https://example.com')
    const result = renderUseAuth()

    act(() => {
      result.current?.handleGoogleLogin()
    })

    expect(buildGoogleOAuthUrl).toHaveBeenCalled()
  })
})
