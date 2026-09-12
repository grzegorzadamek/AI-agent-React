import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ApiError, submitDashboardMessageToApi } from '../lib/apiClient'
import type { SubmitStatus } from '../types'

export function useDashboardMessage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>({ type: 'idle', text: '' })

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) {
      setSubmitStatus({ type: 'error', text: t('message.emptyError') })
      return
    }

    setIsSubmitting(true)
    setSubmitStatus({ type: 'idle', text: '' })

    try {
      const submittedMessage = message.trim()
      await submitDashboardMessageToApi(submittedMessage)
      setSubmitStatus({
        type: 'success',
        text: t('message.submitSuccess', { message: submittedMessage }),
      })
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
        text:
          error instanceof ApiError && error.status === 401
            ? t('message.sessionError')
            : t('message.genericError'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [message, queryClient, t])

  return {
    message,
    setMessage,
    isSubmitting,
    submitStatus,
    handleSubmit,
  }
}
