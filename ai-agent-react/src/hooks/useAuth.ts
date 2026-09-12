import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchDashboardStatsWithFallback, refreshAccessToken } from '../lib/apiClient'
import {
  ACCESS_TOKEN_KEY,
  authStorage,
} from '../utils/authStorage'
import {
  buildGoogleOAuthUrl,
  getStoredAccessToken,
  getStoredAuthUser,
  getStoredRefreshToken,
  persistAuthSession,
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
    queryKey: ['dashboard-stats', authUser?.email],
    queryFn: async () => {
      if (!authUser || !accessToken) {
        throw new Error('Missing auth context')
      }

      const refreshToken = getStoredRefreshToken()
      if (!refreshToken) {
        throw new Error('Missing refresh token')
      }

      const refreshedSession = await refreshAccessToken(refreshToken)
      setAccessToken(refreshedSession.accessToken)
      authStorage.write(ACCESS_TOKEN_KEY, refreshedSession.accessToken)
      persistAuthSession(authUser, refreshedSession.accessToken, refreshedSession.refreshToken)
      touchSession()

      return fetchDashboardStatsWithFallback(refreshedSession.accessToken)
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
    if (location.pathname === '/access-denied') {
      const email = new URLSearchParams(location.search).get('email')
      if (email) {
        setAccessDeniedEmail(email)
      }
      return undefined
    }

    if (location.pathname !== '/auth/callback') {
      return undefined
    }

    const params = new URLSearchParams(location.search)
    const error = params.get('error')
    const accessToken = params.get('accessToken') ?? params.get('access_token')
    const refreshToken = params.get('refreshToken') ?? params.get('refresh_token')
    const encodedUser = params.get('user')

    if (error) {
      setCallbackStatus('error')
      setAuthStep('idle')
      return undefined
    }

    if (!accessToken || !refreshToken || !encodedUser) {
      return undefined
    }

    setAuthStep('authenticating')
    setCallbackStatus('processing')

    try {
      const authenticatedUser = JSON.parse(decodeURIComponent(encodedUser)) as UserProfile

      setAuthUser(authenticatedUser)
      setAccessToken(accessToken)
      setAuthStep('success')
      setAccessDeniedEmail(null)
      persistAuthSession(authenticatedUser, accessToken, refreshToken)
      touchSession()
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      navigate('/dashboard', { replace: true })
    } catch (fetchError) {
      clearSession('logout')
      setCallbackStatus('error')
      setAuthStep('idle')
      navigate('/access-denied', { replace: true })
      console.error(fetchError)
    }

    return undefined
  }, [clearSession, location.pathname, location.search, navigate, queryClient, touchSession])

  const handleLogout = useCallback(async () => {
    const activeToken = getStoredAccessToken()

    if (activeToken) {
      try {
        await fetch(`${(import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/$/, '')}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeToken}`,
          },
        })
      } catch {
        console.warn('Logout request failed, continuing with client-side cleanup.')
      }
    }

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
