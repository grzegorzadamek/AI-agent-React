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
    vi.spyOn(apiClient, 'submitDashboardMessageToApi').mockRejectedValue(
      new apiClient.ApiError('API error: 401', 401),
    )
    const result = renderDashboardMessageHook()
    await act(async () => {
      result.current?.setMessage('Hello')
    })

    await act(async () => {
      await result.current?.handleSubmit()
    })

    expect(result.current?.submitStatus).toEqual({
      type: 'error',
      text: 'Sesja wygasła. Zaloguj się ponownie.',
    })
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
    vi.spyOn(apiClient, 'submitDashboardMessageToApi').mockResolvedValue(mockResponse)

    const result = renderDashboardMessageHook()

    await act(async () => {
      result.current?.setMessage('Hello from test')
    })

    await act(async () => {
      await result.current?.handleSubmit()
    })

    expect(apiClient.submitDashboardMessageToApi).toHaveBeenCalledWith('Hello from test')
    expect(result.current?.submitStatus).toEqual({
      type: 'success',
      text: `Wysłano do backendu: Hello from test`,
    })
    expect(result.current?.message).toBe('')
  })
})
