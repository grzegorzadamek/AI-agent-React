import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { submitDashboardMessageWithFallback } from '../lib/apiClient'
import type { SubmitStatus } from '../types'

type UseDashboardMessageArgs = {
  accessToken?: string | null
}

export function useDashboardMessage({ accessToken }: UseDashboardMessageArgs) {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>({ type: 'idle', text: '' })

  const handleSubmit = useCallback(async () => {
    if (!accessToken) {
      setSubmitStatus({ type: 'error', text: 'Brak tokena sesji.' })
      return
    }

    if (!message.trim()) {
      setSubmitStatus({ type: 'error', text: 'Wpisz wiadomość przed wysłaniem.' })
      return
    }

    setIsSubmitting(true)
    setSubmitStatus({ type: 'idle', text: '' })

    try {
      const result = await submitDashboardMessageWithFallback(accessToken, message)
      setSubmitStatus({ type: 'success', text: result.message })
      setMessage('')
      // refresh dashboard stats to reflect updated progress
      try {
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      } catch {
        /* ignore */
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Wystąpił błąd podczas wysyłania.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [accessToken, message, queryClient])

  return {
    message,
    setMessage,
    isSubmitting,
    submitStatus,
    handleSubmit,
  }
}
