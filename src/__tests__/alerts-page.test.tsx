import React from 'react'
// Mock next/navigation's useRouter and usePathname for Next.js App Router context
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => '/alerts',
}))
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import SmartAlertsPage from '../app/alerts/page'
import { useUser } from '@/contexts/UserContext'

jest.mock('@/contexts/UserContext')
jest.mock('sonner', () => ({ toast: { loading: jest.fn(), success: jest.fn() }, Toaster: () => null }))

global.fetch = jest.fn()

describe('SmartAlertsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state and then alerts', async () => {
    (useUser as jest.Mock).mockReturnValue({ user: { name: 'Test User', email: 'test@example.com' }, isLoading: false })
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, alerts: [
        { id: '1', sku_code: 'SKU1', type: 'critical_stockout', severity: 'critical', title: 'Test Alert', message: 'Test message', revenue_at_risk: 100, cost_to_resolve: 10, estimated_impact: 90, urgency_score: 10, confidence_level: 0.9, can_auto_resolve: false, acknowledged: false, resolved: false, snoozed: false, created_at: new Date().toISOString() }
      ] })
    })
    render(<SmartAlertsPage />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/Test Alert/)).toBeInTheDocument())
  })

  it('shows error state if fetch fails', async () => {
    (useUser as jest.Mock).mockReturnValue({ user: { name: 'Test User', email: 'test@example.com' }, isLoading: false })
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    render(<SmartAlertsPage />)
    await waitFor(() => expect(screen.getByText(/failed to fetch alerts/i)).toBeInTheDocument())
  })

  it('does not fetch alerts if no user', () => {
    (useUser as jest.Mock).mockReturnValue({ user: null, isLoading: false })
    render(<SmartAlertsPage />)
    expect(fetch).not.toHaveBeenCalled()
  })
})
