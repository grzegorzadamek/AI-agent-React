import { act, render } from '@testing-library/react'
import { useEffect, useRef } from 'react'
import { vi, describe, expect, it } from 'vitest'
import { useDashboardMessage } from './useDashboardMessage'
import * as apiClient from '../lib/apiClient'

type HookResult = ReturnType<typeof useDashboardMessage>

function renderDashboardMessageHook(accessToken: string | null, email: string) {
  const resultRef = { current: null as HookResult | null }

  function TestComponent() {
    resultRef.current = useDashboardMessage({ accessToken, email })
    return null
  }

  render(<TestComponent />)
  return resultRef
}

describe('useDashboardMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when access token is missing', async () => {
    const result = renderDashboardMessageHook(null, 'test@example.com')

    await act(async () => {
      await result.current?.handleSubmit()
    })

    expect(result.current?.submitStatus).toEqual({ type: 'error', text: 'Brak tokena sesji.' })
  })

  it('returns error when message is empty', async () => {
    const result = renderDashboardMessageHook('token', 'test@example.com')

    await act(async () => {
      await result.current?.handleSubmit()
    })

    expect(result.current?.submitStatus).toEqual({ type: 'error', text: 'Wpisz wiadomość przed wysłaniem.' })
  })

  it('submits a message and clears the input on success', async () => {
    const mockResponse = { ok: true, message: 'Mock message sent' }
    vi.spyOn(apiClient, 'submitDashboardMessageWithFallback').mockResolvedValue(mockResponse)

    const result = renderDashboardMessageHook('token', 'test@example.com')

    await act(async () => {
      result.current?.setMessage('Hello from test')
    })

    await act(async () => {
      await result.current?.handleSubmit()
    })

    expect(apiClient.submitDashboardMessageWithFallback).toHaveBeenCalledWith('token', 'test@example.com', 'Hello from test')
    expect(result.current?.submitStatus).toEqual({ type: 'success', text: mockResponse.message })
    expect(result.current?.message).toBe('')
  })
})
