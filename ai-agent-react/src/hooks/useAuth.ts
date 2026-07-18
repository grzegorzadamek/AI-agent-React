import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { authenticateUser, refreshAccessToken } from '../lib/mockApi'
import { fetchDashboardStatsWithFallback } from '../lib/apiClient'
import {
  ACCESS_TOKEN_KEY,
  authStorage,
} from '../utils/authStorage'
import {
  buildGoogleOAuthUrl,
  buildMockUserProfile,
  getStoredAccessToken,
  getStoredAuthUser,
  persistAuthSession,
  validateGoogleCallback,
} from '../lib/auth'
import type { UserProfile } from '../types'

type AuthStep = 'idle' | 'redirecting' | 'authenticating' | 'success'
type CallbackStatus = 'processing' | 'error'

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000

export function useAuth() {
  const [authUser, setAuthUser] = useState<UserProfile | null>(() => {
    const storedValue = getStoredAuthUser()
    return storedValue ? (JSON.parse(storedValue) as UserProfile) : null
  })

  const [accessToken, setAccessToken] = useState<string | null>(() => getStoredAccessToken())
  const [authStep, setAuthStep] = useState<AuthStep>('idle')
  const [callbackStatus, setCallbackStatus] = useState<CallbackStatus>('processing')
  const [sessionNotice, setSessionNotice] = useState<string | null>(null)
  const [accessDeniedEmail, setAccessDeniedEmail] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const hashParams = useMemo(() => new URLSearchParams(location.hash.replace(/^#/, '')), [location.hash])

  const clearSession = useCallback(
    (reason: 'expired' | 'logout' = 'expired') => {
      setAuthUser(null)
      setAccessToken(null)
      setAuthStep('idle')
      setSessionNotice(
        reason === 'expired'
          ? 'Twoja sesja wygasła z powodu bezczynności lub upłynięcia czasu. Zaloguj się ponownie, aby kontynuować.'
          : null,
      )
      setAccessDeniedEmail(null)
      authStorage.clearSession()
      queryClient.clear()
    },
    [queryClient],
  )

  const touchSession = useCallback(() => {
    authStorage.touchSession()
  }, [])

  useEffect(() => {
    if (!authStorage.isSessionValid()) {
      if (authUser || accessToken) {
        clearSession('expired')
        if (location.pathname === '/dashboard') {
          navigate('/access-denied', { replace: true })
        }
      }
      return
    }

    if (authUser && accessToken) {
      setAccessDeniedEmail(null)
    }
  }, [accessToken, authUser, clearSession, location.pathname, navigate])

  useEffect(() => {
    if (!authUser || !accessToken || !authStorage.isSessionValid()) {
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
  }, [authUser, accessToken, clearSession, navigate, touchSession])

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
    queryFn: async () => {
      if (!authUser || !accessToken) {
        throw new Error('Missing auth context')
      }

      const refreshedToken = await refreshAccessToken({ accessToken, email: authUser.email })
      setAccessToken(refreshedToken)
      authStorage.write(ACCESS_TOKEN_KEY, refreshedToken)
      touchSession()

      return fetchDashboardStatsWithFallback(refreshedToken, authUser.email)
    },
    enabled: Boolean(authUser && accessToken),
    staleTime: 60_000,
    retry: false,
  })

  const handleGoogleLogin = useCallback(() => {
    if (!loginMutation.isPending) {
      loginMutation.mutate()
    }
  }, [loginMutation])

  useEffect(() => {
    if (location.pathname !== '/auth/callback') {
      return undefined
    }

    const idToken = hashParams.get('id_token')
    const state = hashParams.get('state')
    const error = hashParams.get('error')

    if (error) {
      setCallbackStatus('error')
      setAuthStep('idle')
      return undefined
    }

    if (!idToken || !state) {
      return undefined
    }

    setAuthStep('authenticating')
    setCallbackStatus('processing')

    const timeoutId = window.setTimeout(() => {
      const { payload, isValid } = validateGoogleCallback(idToken, state)

      if (!isValid) {
        setCallbackStatus('error')
        setAuthStep('idle')
        navigate('/access-denied', { replace: true })
        return
      }

      const email = payload.email ?? 'unknown@example.com'
      const userFromPayload = buildMockUserProfile(payload)

      void (async () => {
        try {
          const result = await authenticateUser({ email, idToken })

          if (!result.authorized || !result.user || !result.accessToken) {
            clearSession('logout')
            setAccessDeniedEmail(email)
            setAuthStep('success')
            setCallbackStatus('error')
            navigate('/access-denied', { replace: true })
            return
          }

          const authenticatedUser = {
            ...userFromPayload,
            ...result.user,
          }

          setAuthUser(authenticatedUser)
          setAccessToken(result.accessToken)
          setAuthStep('success')
          setAccessDeniedEmail(null)
          persistAuthSession(authenticatedUser, result.accessToken)
          touchSession()
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
          navigate('/dashboard', { replace: true })
        } catch (fetchError) {
          clearSession('logout')
          setAccessDeniedEmail(email)
          setAuthStep('success')
          setCallbackStatus('error')
          navigate('/access-denied', { replace: true })
          console.error(fetchError)
        }
      })()
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [clearSession, hashParams, location.pathname, navigate, queryClient, touchSession])

  const handleLogout = useCallback(() => {
    clearSession('logout')
    navigate('/')
  }, [clearSession, navigate])

  const isDashboardAccessible = useMemo(
    () => Boolean(authUser && accessToken && authStorage.isSessionValid()),
    [accessToken, authUser],
  )

  return {
    authUser,
    accessToken,
    authStep,
    callbackStatus,
    sessionNotice,
    accessDeniedEmail,
    dashboardQuery,
    loginMutation,
    handleGoogleLogin,
    handleLogout,
    isDashboardAccessible,
  }
}
