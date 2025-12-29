
import { render, screen, waitFor } from '@testing-library/react'

jest.mock('next/navigation', () => ({ useRouter: () => ({}) }))
jest.mock('@/components/ui/navbar', () => ({ Navbar: () => <nav>Navbar</nav> }))
jest.mock('@/components/ui/auth-modals', () => ({ AuthModal: () => <div>AuthModal</div> }))

const mockUser = { email: 'test@example.com' }
const mockStats = {
  total_actions: 10,
  completed_actions: 8,
  pending_actions: 1,
  failed_actions: 1,
  total_expected_impact: 1000,
  total_actual_impact: 900,
  success_rate: 0.8,
  avg_confidence: 0.9
}
const mockBreakdown = []
const mockRecentActions = []

describe('AnalyticsPage (integration)', () => {
  afterEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('renders analytics data for logged-in user', async () => {
    jest.resetModules()
    jest.doMock('@/contexts/UserContext', () => ({
      useUser: () => ({ user: mockUser, login: jest.fn(), isLoading: false })
    }))
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ stats: mockStats, breakdown: mockBreakdown, recent_actions: mockRecentActions })
      })
    ) as jest.Mock
    const { default: AnalyticsPage } = await import('@/app/analytics/page')
    render(<AnalyticsPage />)
    await waitFor(() => expect(screen.getByText('Impact Analytics')).toBeInTheDocument())
    expect(screen.getByText('Total Actions')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('8 completed')).toBeInTheDocument()
    expect(screen.getByText('Expected Impact')).toBeInTheDocument()
    expect(screen.getByText('£1,000')).toBeInTheDocument()
  })

  it('shows error state if fetch fails', async () => {
    jest.resetModules()
    jest.doMock('@/contexts/UserContext', () => ({
      useUser: () => ({ user: mockUser, login: jest.fn(), isLoading: false })
    }))
    global.fetch = jest.fn(() => Promise.resolve({ ok: false })) as jest.Mock
    const { default: AnalyticsPage } = await import('@/app/analytics/page')
    render(<AnalyticsPage />)
    await waitFor(() => expect(screen.getByText('Error Loading Analytics')).toBeInTheDocument())
  })
})
