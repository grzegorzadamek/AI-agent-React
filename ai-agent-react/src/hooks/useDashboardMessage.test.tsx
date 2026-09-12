import { act, render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, expect, it, beforeEach } from 'vitest'
import { useDashboardMessage } from './useDashboardMessage'
import * as apiClient from '../lib/apiClient'

type HookResult = ReturnType<typeof useDashboardMessage>

function renderDashboardMessageHook(accessToken: string | null) {
  const resultRef = { current: null as HookResult | null }
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  function TestComponent() {
    resultRef.current = useDashboardMessage({ accessToken })
    return null
  }

  render(
    <QueryClientProvider client={queryClient}>
      <TestComponent />
    </QueryClientProvider>,
  )
  return resultRef
}

describe('useDashboardMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when access token is missing', async () => {
    const result = renderDashboardMessageHook(null)

    await act(async () => {
      await result.current?.handleSubmit()
    })

    expect(result.current?.submitStatus).toEqual({ type: 'error', text: 'Brak tokena sesji.' })
  })

  it('returns error when message is empty', async () => {
    const result = renderDashboardMessageHook('token')

    await act(async () => {
      await result.current?.handleSubmit()
    })

    expect(result.current?.submitStatus).toEqual({
      type: 'error',
      text: 'Wpisz wiadomość przed wysłaniem.',
    })
  })

  it('submits a message and clears the input on success', async () => {
    const mockResponse = { ok: true, message: 'Mock message sent' }
    vi.spyOn(apiClient, 'submitDashboardMessageWithFallback').mockResolvedValue(mockResponse)

    const result = renderDashboardMessageHook('token')

    await act(async () => {
      result.current?.setMessage('Hello from test')
    })

    await act(async () => {
      await result.current?.handleSubmit()
    })

    expect(apiClient.submitDashboardMessageWithFallback).toHaveBeenCalledWith(
      'token',
      'Hello from test',
    )
    expect(result.current?.submitStatus).toEqual({ type: 'success', text: mockResponse.message })
    expect(result.current?.message).toBe('')
  })
})
