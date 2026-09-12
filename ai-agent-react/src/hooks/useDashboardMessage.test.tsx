import { act, render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, expect, it, beforeEach } from 'vitest'
import { useDashboardMessage } from './useDashboardMessage'
import * as apiClient from '../lib/apiClient'

type HookResult = ReturnType<typeof useDashboardMessage>

function renderDashboardMessageHook() {
  const resultRef = { current: null as HookResult | null }
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  function TestComponent() {
    resultRef.current = useDashboardMessage()
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

  it('returns API errors to the user', async () => {
    vi.spyOn(apiClient, 'submitDashboardMessageWithFallback').mockRejectedValue(
      new Error('Sesja wygasła.'),
    )
    const result = renderDashboardMessageHook()
    await act(async () => {
      result.current?.setMessage('Hello')
    })

    await act(async () => {
      await result.current?.handleSubmit()
    })

    expect(result.current?.submitStatus).toEqual({ type: 'error', text: 'Sesja wygasła.' })
  })

  it('returns error when message is empty', async () => {
    const result = renderDashboardMessageHook()

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

    const result = renderDashboardMessageHook()

    await act(async () => {
      result.current?.setMessage('Hello from test')
    })

    await act(async () => {
      await result.current?.handleSubmit()
    })

    expect(apiClient.submitDashboardMessageWithFallback).toHaveBeenCalledWith('Hello from test')
    expect(result.current?.submitStatus).toEqual({ type: 'success', text: mockResponse.message })
    expect(result.current?.message).toBe('')
  })
})
