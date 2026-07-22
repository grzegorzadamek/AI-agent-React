import { useCallback, useState } from 'react'
import { submitDashboardMessageWithFallback } from '../lib/apiClient'
import type { SubmitStatus } from '../types'

type UseDashboardMessageArgs = {
  accessToken?: string | null
  email: string
}

export function useDashboardMessage({ accessToken, email }: UseDashboardMessageArgs) {
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
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Wystąpił błąd podczas wysyłania.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [accessToken, email, message])

  return {
    message,
    setMessage,
    isSubmitting,
    submitStatus,
    handleSubmit,
  }
}
