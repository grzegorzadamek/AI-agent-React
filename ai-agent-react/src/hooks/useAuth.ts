import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchCurrentUser, fetchDashboardStats, logoutFromApi } from '../lib/apiClient'
import { authStorage } from '../utils/authStorage'
import { buildGoogleOAuthUrl, getStoredAuthUser, persistAuthSession } from '../lib/auth'
import type { UserProfile } from '../types'

type AuthStep = 'idle' | 'redirecting' | 'authenticating' | 'success'
type CallbackStatus = 'processing' | 'error'

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000

export function useAuth() {
  const { t } = useTranslation()
  const [authUser, setAuthUser] = useState<UserProfile | null>(() => {
    const storedValue = getStoredAuthUser()
    if (!storedValue) return null
    try {
      return JSON.parse(storedValue) as UserProfile
    } catch {
      authStorage.clearSession()
      return null
    }
  })

  const [authStep, setAuthStep] = useState<AuthStep>('idle')
  const [callbackStatus, setCallbackStatus] = useState<CallbackStatus>('processing')
  const [sessionNotice, setSessionNotice] = useState<string | null>(null)
  const [accessDeniedEmail, setAccessDeniedEmail] = useState<string | null>(null)
  const [isSessionReady, setIsSessionReady] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  const clearSession = useCallback(
    (reason: 'expired' | 'logout' = 'expired') => {
      setAuthUser(null)
      setAuthStep('idle')
      setSessionNotice(reason === 'expired' ? t('auth.sessionExpired') : null)
      setAccessDeniedEmail(null)
      authStorage.clearSession()
      queryClient.clear()
    },
    [queryClient, t],
  )

  const touchSession = useCallback(() => {
    authStorage.touchSession()
  }, [])

  useEffect(() => {
    if (location.pathname === '/auth/callback') return undefined

    let cancelled = false
    void fetchCurrentUser()
      .then((user) => {
        if (cancelled) return
        persistAuthSession(user)
        touchSession()
        setAuthUser(user)
      })
      .catch(() => {
        if (!cancelled) clearSession('logout')
      })
      .finally(() => {
        if (!cancelled) setIsSessionReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [clearSession, location.pathname, touchSession])

  useEffect(() => {
    if (!authStorage.isSessionValid()) {
      if (authUser) {
        queueMicrotask(() => {
          clearSession('expired')
          if (location.pathname === '/dashboard') {
            navigate('/access-denied', { replace: true })
          }
        })
      }
      return
    }

    if (authUser) {
      queueMicrotask(() => setAccessDeniedEmail(null))
    }
  }, [authUser, clearSession, location.pathname, navigate])

  useEffect(() => {
    if (!authUser || !authStorage.isSessionValid()) {
      return undefined
    }

    let timeoutId: number | undefined
    let lastTouchAt = 0

    const resetInactivityTimer = () => {
      const now = Date.now()
      if (now - lastTouchAt >= 30_000) {
        lastTouchAt = now
        touchSession()
      }
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        clearSession('expired')
        navigate('/access-denied', { replace: true })
      }, INACTIVITY_TIMEOUT_MS)
    }

    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'keydown',
      'click',
      'scroll',
      'touchstart',
    ]
    events.forEach((event) =>
      window.addEventListener(event, resetInactivityTimer, { passive: true }),
    )
    resetInactivityTimer()

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetInactivityTimer))
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [authUser, clearSession, navigate, touchSession])

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
      if (!authUser) throw new Error(t('auth.missingContext'))

      const stats = await fetchDashboardStats()
      touchSession()
      return stats
    },
    enabled: Boolean(authUser && authStorage.isSessionValid()),
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
        queueMicrotask(() => setAccessDeniedEmail(email))
      }
      return undefined
    }

    if (location.pathname !== '/auth/callback') {
      return undefined
    }

    const error = new URLSearchParams(location.search).get('error')

    if (error) {
      queueMicrotask(() => {
        setCallbackStatus('error')
        setAuthStep('idle')
      })
      return undefined
    }

    queueMicrotask(() => {
      setAuthStep('authenticating')
      setCallbackStatus('processing')
    })

    void (async () => {
      try {
        const authenticatedUser = await fetchCurrentUser()
        persistAuthSession(authenticatedUser)
        touchSession()
        queueMicrotask(() => {
          setAuthUser(authenticatedUser)
          setAuthStep('success')
          setAccessDeniedEmail(null)
        })
        await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
        navigate('/dashboard', { replace: true })
      } catch (fetchError) {
        queueMicrotask(() => {
          clearSession('logout')
          setCallbackStatus('error')
          setAuthStep('idle')
          navigate('/access-denied', { replace: true })
        })
        console.error(fetchError)
      } finally {
        setIsSessionReady(true)
      }
    })()
  }, [clearSession, location.pathname, location.search, navigate, queryClient, touchSession])

  const handleLogout = useCallback(async () => {
    try {
      await logoutFromApi()
    } catch {
      console.warn('Logout request failed, continuing with client-side cleanup.')
    }

    clearSession('logout')
    navigate('/')
  }, [clearSession, navigate])

  const isDashboardAccessible = useMemo(
    () => Boolean(authUser && authStorage.isSessionValid()),
    [authUser],
  )

  return {
    authUser,
    authStep,
    callbackStatus,
    sessionNotice,
    accessDeniedEmail,
    dashboardQuery,
    loginMutation,
    handleGoogleLogin,
    handleLogout,
    isDashboardAccessible: isSessionReady && isDashboardAccessible,
    isSessionReady,
  }
}
