import { useState } from 'react'
import { submitDashboardMessage } from '../lib/mockApi'

type UseDashboardMessageArgs = {
  accessToken?: string | null
  email: string
}

export function useDashboardMessage({ accessToken, email }: UseDashboardMessageArgs) {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{ type: 'idle' | 'success' | 'error'; text: string }>({
    type: 'idle',
    text: '',
  })

  const handleSubmit = async () => {
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
      const result = await submitDashboardMessage({
        message,
        email,
        accessToken,
      })

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
  }

  return {
    message,
    setMessage,
    isSubmitting,
    submitStatus,
    handleSubmit,
  }
}
