import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { submitDashboardMessageToApi } from '../lib/apiClient'
import type { SubmitStatus } from '../types'

export function useDashboardMessage() {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>({ type: 'idle', text: '' })

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) {
      setSubmitStatus({ type: 'error', text: 'Wpisz wiadomość przed wysłaniem.' })
      return
    }

    setIsSubmitting(true)
    setSubmitStatus({ type: 'idle', text: '' })

    try {
      const result = await submitDashboardMessageToApi(message.trim())
      setSubmitStatus({ type: 'success', text: result.message })
      setMessage('')
      // refresh dashboard stats to reflect updated progress
      try {
        await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
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
  }, [message, queryClient])

  return {
    message,
    setMessage,
    isSubmitting,
    submitStatus,
    handleSubmit,
  }
}
