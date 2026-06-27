import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { LoginPage } from './components/LoginPage'
import { DashboardPage } from './components/DashboardPage'
import { CallbackPage } from './components/CallbackPage'
import { AccessDeniedPage } from './components/AccessDeniedPage'
import { authenticateUser, fetchDashboardData, refreshAccessToken, type UserProfile } from './lib/mockApi'

type AuthStep = 'idle' | 'redirecting' | 'authenticating' | 'success'

const STORAGE_KEY = 'ai-agent-auth-user'
const ACCESS_TOKEN_KEY = 'ai-agent-access-token'
const SESSION_TTL_MS = 15 * 60 * 1000
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000
const SESSION_TIMESTAMP_KEY = 'ai-agent-session-timestamp'
const OAUTH_STATE_KEY = 'ai-agent-oauth-state'
const OAUTH_NONCE_KEY = 'ai-agent-oauth-nonce'

const readSessionValue = (key: string) => {
  if (typeof window === 'undefined') {
    return null
  }

  return window.sessionStorage.getItem(key)
}

const writeSessionValue = (key: string, value: string) => {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(key, value)
}

const removeSessionValue = (key: string) => {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(key)
}

const isSessionValid = () => {
  if (typeof window === 'undefined') {
    return false
  }

  const timestamp = window.sessionStorage.getItem(SESSION_TIMESTAMP_KEY)
  if (!timestamp) {
    return false
  }

  const age = Date.now() - Number(timestamp)
  return age < SESSION_TTL_MS
}

const buildGoogleOAuthUrl = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/callback`

  if (!clientId) {
    throw new Error('Missing VITE_GOOGLE_CLIENT_ID')
  }

  const state = `demo-state-${Math.random().toString(36).slice(2)}`
  const nonce = `google-${Math.random().toString(36).slice(2)}`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'id_token',
    scope: 'openid profile email',
    state,
    prompt: 'select_account',
    nonce,
  })

  writeSessionValue(OAUTH_STATE_KEY, state)
  writeSessionValue(OAUTH_NONCE_KEY, nonce)

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

const decodeGoogleUser = (idToken: string) => {
  const payload = idToken.split('.')[1]
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
  const decoded = decodeURIComponent(
    atob(normalized)
      .split('')
      .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join(''),
  )
  return JSON.parse(decoded) as {
    sub?: string
    email?: string
    name?: string
    given_name?: string
    family_name?: string
    nonce?: string
  }
}

function App() {
  const [authUser, setAuthUser] = useState<UserProfile | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }

    const storedValue = readSessionValue(STORAGE_KEY)
    return storedValue ? (JSON.parse(storedValue) as UserProfile) : null
  })
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }

    return readSessionValue(ACCESS_TOKEN_KEY)
  })
  const [authStep, setAuthStep] = useState<AuthStep>('idle')
  const [callbackStatus, setCallbackStatus] = useState<'processing' | 'error'>('processing')
  const [authorizationStatus, setAuthorizationStatus] = useState<'pending' | 'authorized' | 'forbidden'>('pending')
  const [sessionNotice, setSessionNotice] = useState<string | null>(null)
  const [accessDeniedEmail, setAccessDeniedEmail] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const hashParams = useMemo(() => new URLSearchParams(location.hash.replace(/^#/, '')), [location.hash])

  const clearSession = (reason: 'expired' | 'logout' = 'expired') => {
    setAuthUser(null)
    setAccessToken(null)
    setAuthorizationStatus('pending')
    setAuthStep('idle')
    setSessionNotice(
      reason === 'expired'
        ? 'Twoja sesja wygasła z powodu bezczynności lub upłynięcia czasu. Zaloguj się ponownie, aby kontynuować.'
        : null,
    )
    setAccessDeniedEmail(null)
    removeSessionValue(STORAGE_KEY)
    removeSessionValue(ACCESS_TOKEN_KEY)
    removeSessionValue(SESSION_TIMESTAMP_KEY)
    removeSessionValue(OAUTH_STATE_KEY)
    removeSessionValue(OAUTH_NONCE_KEY)
    queryClient.clear()
  }

  const touchSession = () => {
    writeSessionValue(SESSION_TIMESTAMP_KEY, String(Date.now()))
  }

  useEffect(() => {
    if (!isSessionValid()) {
      if (authUser || accessToken) {
        clearSession('expired')
        if (location.pathname === '/dashboard') {
          navigate('/access-denied', { replace: true })
        }
      }

      return
    }

    if (authUser && accessToken) {
      setAuthorizationStatus('authorized')
    }
  }, [accessToken, authUser, location.pathname, navigate])

  useEffect(() => {
    if (!authUser || !accessToken || !isSessionValid()) {
      return undefined
    }

    let timeoutId: number | undefined

    const resetInactivityTimer = () => {
      touchSession()
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        clearSession('expired')
        navigate('/access-denied', { replace: true })
      }, INACTIVITY_TIMEOUT_MS)
    }

    const events: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach((event) => window.addEventListener(event, resetInactivityTimer, { passive: true }))
    resetInactivityTimer()

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetInactivityTimer))
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [authUser, accessToken, navigate])

  const loginMutation = useMutation({
    mutationFn: async () => {
      clearSession('logout')
      setAuthStep('redirecting')
      const oauthUrl = buildGoogleOAuthUrl()
      window.location.assign(oauthUrl)
      return null
    },
    onError: () => {
      setAuthStep('idle')
    },
  })

  const dashboardQuery = useQuery({
    queryKey: ['dashboard-stats', authUser?.email, accessToken],
    queryFn: () => {
      if (!authUser || !accessToken) {
        throw new Error('Missing auth context')
      }

      return refreshAccessToken({ accessToken, email: authUser.email }).then(async (refreshedToken) => {
        const headers = new Headers()
        headers.set('Authorization', `Bearer ${refreshedToken}`)

        setAccessToken(refreshedToken)
        writeSessionValue(ACCESS_TOKEN_KEY, refreshedToken)
        touchSession()
        return fetchDashboardData({ accessToken: refreshedToken, email: authUser.email, headers })
      })
    },
    enabled: Boolean(authUser && accessToken),
    staleTime: 60_000,
    retry: false,
  })

  const handleGoogleLogin = () => {
    if (loginMutation.isPending) {
      return
    }

    try {
      loginMutation.mutate()
    } catch (error) {
      setAuthStep('idle')
      console.error(error)
    }
  }

  useEffect(() => {
    const idToken = hashParams.get('id_token')
    const error = hashParams.get('error')
    const state = hashParams.get('state')

    if (location.pathname === '/auth/callback' && idToken && state) {
      setAuthStep('authenticating')
      setCallbackStatus('processing')

      const timeout = window.setTimeout(() => {
        const googleUserData = decodeGoogleUser(idToken)
        const expectedState = readSessionValue(OAUTH_STATE_KEY)
        const expectedNonce = readSessionValue(OAUTH_NONCE_KEY)
        const receivedNonce = googleUserData.nonce

        if (expectedState !== state || expectedNonce !== receivedNonce) {
          setCallbackStatus('error')
          setAuthStep('idle')
          removeSessionValue(OAUTH_STATE_KEY)
          removeSessionValue(OAUTH_NONCE_KEY)
          navigate('/access-denied', { replace: true })
          return
        }

        removeSessionValue(OAUTH_STATE_KEY)
        removeSessionValue(OAUTH_NONCE_KEY)

        const email = googleUserData.email || 'unknown@example.com'
        const name = [googleUserData.given_name, googleUserData.family_name].filter(Boolean).join(' ').trim() || googleUserData.name || 'Google User'
        const initials = name
          .split(' ')
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()

        const user: UserProfile = {
          id: googleUserData.sub || email,
          name,
          email,
          role: 'Product Designer',
          plan: 'Pro',
          avatar: initials || 'G',
        }

        setAuthStep('authenticating')

        void (async () => {
          try {
            const result = await authenticateUser({ email, idToken })

            if (!result.authorized || !result.user || !result.accessToken) {
              setAuthUser(null)
              setAccessToken(null)
              setAuthorizationStatus('forbidden')
              setAuthStep('success')
              setAccessDeniedEmail(email)
              removeSessionValue(STORAGE_KEY)
              removeSessionValue(ACCESS_TOKEN_KEY)
              removeSessionValue(SESSION_TIMESTAMP_KEY)
              removeSessionValue(OAUTH_STATE_KEY)
              removeSessionValue(OAUTH_NONCE_KEY)
              navigate('/access-denied', { replace: true })
              return
            }

            const authenticatedUser = {
              ...user,
              ...result.user,
            }

            setAuthUser(authenticatedUser)
            setAccessToken(result.accessToken)
            setAuthorizationStatus('authorized')
            setAuthStep('success')
            writeSessionValue(STORAGE_KEY, JSON.stringify(authenticatedUser))
            writeSessionValue(ACCESS_TOKEN_KEY, result.accessToken)
            touchSession()
            navigate('/dashboard', { replace: true })
          } catch (error) {
            setAuthUser(null)
            setAccessToken(null)
            setAuthorizationStatus('forbidden')
            setAuthStep('success')
            setAccessDeniedEmail(email)
            removeSessionValue(STORAGE_KEY)
            removeSessionValue(ACCESS_TOKEN_KEY)
            removeSessionValue(SESSION_TIMESTAMP_KEY)
            removeSessionValue(OAUTH_STATE_KEY)
            removeSessionValue(OAUTH_NONCE_KEY)
            navigate('/access-denied', { replace: true })
            console.error(error)
          }
        })()
      }, 900)

      return () => window.clearTimeout(timeout)
    }

    if (location.pathname === '/auth/callback') {
      setCallbackStatus(error ? 'error' : 'error')
    }
  }, [hashParams, location.pathname, navigate])

  const handleLogout = () => {
    clearSession('logout')
    navigate('/')
  }

  const isDashboardAccessible = Boolean(authUser && accessToken && authorizationStatus === 'authorized' && isSessionValid())

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LoginPage
            onLogin={handleGoogleLogin}
            isLoading={loginMutation.isPending}
            authStep={authStep}
            sessionNotice={sessionNotice}
          />
        }
      />
      <Route
        path="/auth/callback"
        element={<CallbackPage status={callbackStatus} />}
      />
      <Route
        path="/dashboard"
        element={
          isDashboardAccessible ? (
            dashboardQuery.isError ? (
              <AccessDeniedPage email={authUser?.email ?? accessDeniedEmail ?? undefined} />
            ) : (
              <DashboardPage
                user={authUser!}
                stats={dashboardQuery.data}
                isLoading={dashboardQuery.isLoading}
                onLogout={handleLogout}
                accessToken={accessToken}
              />
            )
          ) : (
            <AccessDeniedPage email={authUser?.email ?? accessDeniedEmail ?? undefined} />
          )
        }
      />
      <Route
        path="/access-denied"
        element={authUser || sessionNotice || accessDeniedEmail ? <AccessDeniedPage email={authUser?.email ?? accessDeniedEmail ?? undefined} reason={sessionNotice ? 'session-expired' : 'forbidden'} /> : <Navigate to="/" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
