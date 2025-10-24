// Smart Alerts Page - Sleek Black Minimalist Design
'use client'

import React, { useState, useEffect } from 'react'
import { Navbar } from '@/components/ui/navbar'
import { AuthModal } from '@/components/ui/auth-modals'
import { SmartAlertCard } from '@/components/ui/smart-alert-card'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import {
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Filter,
  Search,
  CheckCircle,
  Clock,
  DollarSign,
  Activity,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast, Toaster } from 'sonner'

interface SmartAlert {
  id: string
  sku_code: string
  type: 'critical_stockout' | 'overstock_cash_drain' | 'price_opportunity' | 'dead_stock' | 'seasonal_urgency' | 'competitor_threat'
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  message: string
  short_description?: string
  revenue_at_risk: number
  cost_to_resolve: number
  estimated_impact: number
  urgency_score: number
  time_to_resolve?: number
  ai_recommendation?: any
  alternative_actions?: any[]
  ai_insight?: string
  confidence_level: number
  product_data?: any
  can_auto_resolve: boolean
  auto_resolve_conditions?: string[]
  escalate_after_hours?: number
  acknowledged: boolean
  resolved: boolean
  snoozed: boolean
  created_at: string
}

export default function SmartAlertsPage() {
  const router = useRouter()
  const { user, login, isLoading } = useUser()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login')

  const [alerts, setAlerts] = useState<SmartAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'unresolved' | 'acknowledged' | 'resolved'>('unresolved')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch alerts
  useEffect(() => {
    if (user) {
      fetchAlerts()
    }
  }, [user])

  const fetchAlerts = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      console.log('Fetching smart alerts for user:', user.email)
      const response = await fetch(`/api/alerts/latest?userId=${user.email}&limit=50`)

      if (!response.ok) {
        throw new Error('Failed to fetch alerts')
      }

      const data = await response.json()

      if (data.success) {
        setAlerts(data.alerts || [])
        console.log(`✅ Loaded ${data.alerts.length} smart alerts`)
      } else {
        throw new Error(data.error || 'Failed to load alerts')
      }
    } catch (err) {
      console.error('Error fetching alerts:', err)
      setError(err instanceof Error ? err.message : 'Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    toast.loading('Refreshing alerts...')
    await fetchAlerts()
    setRefreshing(false)
    toast.success('Alerts refreshed successfully')
  }

  const handleAlertAction = async (alertId: string, action: 'execute' | 'snooze' | 'resolve' | 'acknowledge') => {
    try {
      console.log(`${action} alert:`, alertId)

      // Find the alert to show in toast
      const alert = alerts.find(a => a.id === alertId)
      const alertSKU = alert?.sku_code || 'Alert'

      // Show loading toast
      const toastId = toast.loading(`${action === 'execute' ? 'Executing' : action === 'acknowledge' ? 'Acknowledging' : action === 'resolve' ? 'Resolving' : 'Snoozing'} alert for ${alertSKU}...`)

      // Optimistic update for instant UI feedback
      setAlerts(prevAlerts =>
        prevAlerts.map(alert => {
          if (alert.id === alertId) {
            switch (action) {
              case 'acknowledge':
                return { ...alert, acknowledged: true }
              case 'resolve':
                return { ...alert, resolved: true, acknowledged: true }
              case 'snooze':
                return { ...alert, snoozed: true }
              case 'execute':
                return { ...alert, acknowledged: true }
              default:
                return alert
            }
          }
          return alert
        })
      )

      // Make API call to save to database
      const response = await fetch(`/api/alerts/${alertId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId: user?.email
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} alert`)
      }

      const data = await response.json()
      console.log(`✅ Alert ${action}d:`, data)

      // Show success toast with action details
      toast.success(
        `✓ Alert ${action}d successfully`,
        {
          id: toastId,
          description: getActionDescription(action, alertSKU, data),
          duration: 5000,
        }
      )

    } catch (error) {
      console.error(`Error ${action}ing alert:`, error)
      toast.error(
        `Failed to ${action} alert`,
        {
          description: error instanceof Error ? error.message : 'Please try again',
          duration: 5000,
        }
      )
      // Revert optimistic update on error
      await fetchAlerts()
    }
  }

  const getActionDescription = (action: string, sku: string, data: any) => {
    // Use detailed action results from API if available
    if (data?.details) {
      const nextSteps = data.details.next_steps?.slice(0, 3).join(' • ') || ''
      return `${data.details.what_happened} Next: ${nextSteps}`
    }

    // Fallback to simple descriptions
    const timestamp = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

    switch (action) {
      case 'execute':
        return `Action executed for ${sku} at ${timestamp}. Primary recommendation is being processed.`
      case 'acknowledge':
        return `Alert for ${sku} acknowledged at ${timestamp}. Awaiting further action.`
      case 'resolve':
        return `Alert for ${sku} resolved at ${timestamp}. Issue marked as complete.`
      case 'snooze':
        return `Alert for ${sku} snoozed until ${timestamp} tomorrow (24 hours).`
      default:
        return `Action completed for ${sku} at ${timestamp}.`
    }
  }

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    if (severityFilter !== 'all' && alert.severity !== severityFilter) {
      return false
    }

    if (statusFilter === 'unresolved' && alert.resolved) {
      return false
    }
    if (statusFilter === 'acknowledged' && !alert.acknowledged) {
      return false
    }
    if (statusFilter === 'resolved' && !alert.resolved) {
      return false
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        alert.title.toLowerCase().includes(search) ||
        alert.sku_code.toLowerCase().includes(search) ||
        alert.message.toLowerCase().includes(search)
      )
    }

    return true
  })

  // Calculate stats
  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical' && !a.resolved).length,
    unresolved: alerts.filter(a => !a.resolved).length,
    totalRevenueAtRisk: alerts
      .filter(a => !a.resolved)
      .reduce((sum, a) => sum + (a.revenue_at_risk || 0), 0),
    autoResolvable: alerts.filter(a => a.can_auto_resolve && !a.resolved).length
  }

  // Auth handling
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar
          onLogin={() => { setAuthMode('login'); setAuthModalOpen(true) }}
          onSignup={() => { setAuthMode('signup'); setAuthModalOpen(true) }}
        />
        <div className="flex items-center justify-center pt-32">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/40">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar
          onLogin={() => { setAuthMode('login'); setAuthModalOpen(true) }}
          onSignup={() => { setAuthMode('signup'); setAuthModalOpen(true) }}
        />
        <div className="flex items-center justify-center pt-32">
          <div className="text-center max-w-md">
            <AlertTriangle className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Authentication Required</h2>
            <p className="text-white/40 mb-6">Please log in to view your smart alerts</p>
            <button
              onClick={() => { setAuthMode('login'); setAuthModalOpen(true) }}
              className="px-6 py-3 bg-white text-black hover:bg-white/90 rounded-lg font-medium transition-colors"
            >
              Log In
            </button>
          </div>
        </div>
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          mode={authMode}
          onSwitchMode={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
          onSuccess={(userData) => {
            login({ ...userData, company: 'Demo', phone: '', location: 'UK' })
            setAuthModalOpen(false)
            router.push('/dashboard')
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar
        onLogin={() => { setAuthMode('login'); setAuthModalOpen(true) }}
        onSignup={() => { setAuthMode('signup'); setAuthModalOpen(true) }}
      />

      <div className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Activity className="h-8 w-8 text-white" />
              Smart Alerts
            </h1>
            <p className="text-white/40">Actionable, automated inventory intelligence</p>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Unresolved</p>
                  <p className="text-2xl font-bold text-white">{stats.unresolved}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-400/40" />
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Critical</p>
                  <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400/40" />
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Revenue at Risk</p>
                  <p className="text-2xl font-bold text-white">£{Math.round(stats.totalRevenueAtRisk / 1000)}k</p>
                </div>
                <DollarSign className="h-8 w-8 text-yellow-400/40" />
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Auto-resolvable</p>
                  <p className="text-2xl font-bold text-green-400">{stats.autoResolvable}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400/40" />
              </div>
            </div>
          </div>

          {/* Filters and search */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/5 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20" />
                <input
                  type="text"
                  placeholder="Search alerts by SKU, title, or description..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex gap-2 flex-wrap">
                <select
                  value={severityFilter}
                  onChange={e => setSeverityFilter(e.target.value as any)}
                  className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value="all">All Severity</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value="all">All Status</option>
                  <option value="unresolved">Unresolved</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="resolved">Resolved</option>
                </select>

                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Active filters summary */}
            <div className="mt-3 flex items-center gap-2 text-xs text-white/30">
              <Filter className="h-3.5 w-3.5" />
              <span>
                Showing {filteredAlerts.length} of {alerts.length} alerts
                {severityFilter !== 'all' && ` • Severity: ${severityFilter}`}
                {statusFilter !== 'all' && ` • Status: ${statusFilter}`}
                {searchTerm && ` • Search: "${searchTerm}"`}
              </span>
            </div>
          </div>

          {/* Alerts list */}
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white/40">Loading smart alerts...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-1">Error Loading Alerts</h3>
              <p className="text-sm text-white/60 mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-white text-black hover:bg-white/90 rounded-lg text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="bg-white/5 border border-white/5 rounded-lg p-12 text-center">
              <CheckCircle className="h-16 w-16 text-green-400/40 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchTerm || severityFilter !== 'all' || statusFilter !== 'all'
                  ? 'No alerts match your filters'
                  : 'No alerts to display'}
              </h3>
              <p className="text-white/40">
                {searchTerm || severityFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters or search terms'
                  : 'All clear! No actionable alerts at this time.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map(alert => (
                <SmartAlertCard
                  key={alert.id}
                  id={alert.id}
                  sku_code={alert.sku_code}
                  type={alert.type}
                  severity={alert.severity}
                  title={alert.title}
                  message={alert.message}
                  short_description={alert.short_description}
                  revenue_at_risk={alert.revenue_at_risk || 0}
                  cost_to_resolve={alert.cost_to_resolve || 0}
                  estimated_impact={alert.estimated_impact || 0}
                  urgency_score={alert.urgency_score || 5}
                  time_to_critical={alert.time_to_resolve ? `${alert.time_to_resolve} hours` : '48 hours'}
                  primary_action={alert.ai_recommendation || {
                    title: 'Review this alert',
                    steps: ['Check inventory levels', 'Contact supplier', 'Update forecast'],
                    deadline: 'ASAP',
                    expected_outcome: 'Resolve issue'
                  }}
                  alternative_actions={alert.alternative_actions}
                  ai_analysis={alert.ai_insight}
                  confidence_level={alert.confidence_level || 0.8}
                  product_context={alert.product_data}
                  can_auto_resolve={alert.can_auto_resolve}
                  auto_resolve_conditions={alert.auto_resolve_conditions}
                  escalate_if_not_resolved_hours={alert.escalate_after_hours}
                  acknowledged={alert.acknowledged}
                  resolved={alert.resolved}
                  snoozed={alert.snoozed}
                  onAction={handleAlertAction}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
        onSuccess={(userData) => {
          login({ ...userData, company: 'Demo', phone: '', location: 'UK' })
          setAuthModalOpen(false)
        }}
      />
      <Toaster
        position="bottom-right"
        theme="dark"
        richColors
        toastOptions={{
          style: {
            background: 'rgba(0, 0, 0, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white',
          },
        }}
      />
    </div>
  )
}
