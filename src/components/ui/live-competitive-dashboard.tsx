// src/components/ui/live-competitive-dashboard.tsx
// AI-powered live competitive intelligence dashboard

'use client'

import React, { useState, useEffect } from 'react'
import { 
  Brain, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Eye, 
  Play, 
  Pause, 
  RefreshCw,
  Clock,
  DollarSign,
  Zap,
  Shield,
  Crown,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react'

interface AIInsight {
  id: string
  type: 'strategic_alert' | 'market_opportunity' | 'competitive_threat' | 'pricing_strategy'
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  ai_analysis: string
  strategic_recommendations: string[]
  immediate_actions: string[]
  revenue_impact_estimate: number
  confidence_score: number
  affected_products: string[]
  competitors_involved: string[]
  market_context: string
  urgency_timeline: string
  timestamp: Date
}

interface MonitoringStatus {
  isActive: boolean
  activeProducts: number
  totalRetailers: number
  lastCheck: string
  config?: any
}

interface CompetitiveFeedData {
  ai_insights: AIInsight[]
  monitoring_strategy: any
  portfolio_assessment: any
  data_context: any
}

interface LiveCompetitiveDashboardProps {
  userId: string
  className?: string
}

export function LiveCompetitiveDashboard({ userId, className = '' }: LiveCompetitiveDashboardProps) {
  const [feedData, setFeedData] = useState<CompetitiveFeedData | null>(null)
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set())
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Auto-refresh competitive intelligence every 5 minutes
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (autoRefresh) {
      interval = setInterval(() => {
        fetchCompetitiveIntelligence(true)
      }, 5 * 60 * 1000) // 5 minutes
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, userId])

  // Initial load
  useEffect(() => {
    if (userId) {
      fetchCompetitiveIntelligence()
      fetchMonitoringStatus()
    }
  }, [userId])

  const fetchCompetitiveIntelligence = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    
    setError(null)

    try {
      const response = await fetch(`/api/dashboard/competitive-feed?userId=${encodeURIComponent(userId)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setFeedData(data)
      
    } catch (err) {
      console.error('Competitive intelligence fetch failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to load competitive intelligence')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchMonitoringStatus = async () => {
    try {
      const response = await fetch(`/api/monitoring?userId=${encodeURIComponent(userId)}`)
      
      if (response.ok) {
        const data = await response.json()
        setMonitoringStatus(data.status)
      }
    } catch (err) {
      console.error('Monitoring status fetch failed:', err)
    }
  }

  const toggleMonitoring = async () => {
    try {
      if (monitoringStatus?.isActive) {
        // Stop monitoring
        await fetch(`/api/monitoring?userId=${encodeURIComponent(userId)}`, {
          method: 'DELETE'
        })
      } else {
        // Start monitoring with top products
        if (!feedData?.data_context) return

        const topProducts = Array.from({ length: Math.min(10, feedData.data_context.inventory_size) }, (_, i) => ({
          sku: `TOP-PRODUCT-${i + 1}`,
          product: `Top Product ${i + 1}`,
          category: 'spirits',
          currentPrice: 25 + Math.random() * 50
        }))

        await fetch('/api/monitoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            products: topProducts,
            intervalMinutes: 240, // 4 hours
            maxRetailersPerCheck: 3
          })
        })
      }

      // Refresh status
      setTimeout(() => fetchMonitoringStatus(), 1000)
    } catch (err) {
      console.error('Toggle monitoring failed:', err)
    }
  }

  const toggleInsightExpansion = (insightId: string) => {
    setExpandedInsights(prev => {
      const newSet = new Set(prev)
      if (newSet.has(insightId)) {
        newSet.delete(insightId)
      } else {
        newSet.add(insightId)
      }
      return newSet
    })
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-400" />
      case 'high': return <TrendingUp className="h-5 w-5 text-orange-400" />
      case 'medium': return <Target className="h-5 w-5 text-yellow-400" />
      default: return <Eye className="h-5 w-5 text-white/60" />
    }
  }

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-400/30 bg-red-500/10'
      case 'high': return 'border-orange-400/30 bg-orange-500/10'
      case 'medium': return 'border-yellow-400/30 bg-yellow-500/10'
      default: return 'border-white/30 bg-white/5'
    }
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading AI competitive intelligence...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-400" />
            <h3 className="text-lg font-medium text-red-300">Competitive Intelligence Error</h3>
          </div>
          <p className="text-red-200 mb-4">{error}</p>
          <button
            onClick={() => fetchCompetitiveIntelligence()}
            className="text-red-300 hover:text-red-100 font-medium"
          >
            Retry Analysis
          </button>
        </div>
      </div>
    )
  }

  if (!feedData) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12 bg-white/5 border border-white/20 rounded-lg">
          <Brain className="h-12 w-12 mx-auto mb-4 text-white/40" />
          <p className="text-white/60">No competitive intelligence data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center">
            <Brain className="h-6 w-6 text-white/60" />
          </div>
          <div>
            <h2 className="text-2xl font-light text-white">Live Competitive Intelligence</h2>
            <p className="text-white/60 text-sm">Powered by AI</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Monitoring Toggle */}
          {monitoringStatus && (
            <div className="flex items-center space-x-2">
              <span className="text-white/60 text-sm">Live Monitoring:</span>
              <button
                onClick={toggleMonitoring}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  monitoringStatus.isActive
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/15'
                }`}
              >
                {monitoringStatus.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span>{monitoringStatus.isActive ? 'Active' : 'Inactive'}</span>
              </button>
            </div>
          )}
          
          {/* Refresh Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded transition-colors ${
                autoRefresh 
                  ? 'bg-green-500/20 text-green-300' 
                  : 'bg-white/10 text-white/60 hover:bg-white/15'
              }`}
              title={`Auto-refresh: ${autoRefresh ? 'On' : 'Off'}`}
            >
              <Activity className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => fetchCompetitiveIntelligence(true)}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 text-white border border-white/20 rounded hover:bg-white/15 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Portfolio Assessment */}
      {feedData.portfolio_assessment && (
        <div className="bg-white/5 border border-white/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white flex items-center space-x-2">
              <Shield className="h-5 w-5 text-white/60" />
              <span>Portfolio Health Assessment</span>
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-white/60">Health Score:</span>
              <span className={`text-xl font-bold ${
                feedData.portfolio_assessment.health_score >= 8 ? 'text-green-400' :
                feedData.portfolio_assessment.health_score >= 6 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {feedData.portfolio_assessment.health_score}/10
              </span>
            </div>
          </div>
          
          <div className="bg-white/5 border border-white/20 rounded p-4">
            <div className="text-white/80 text-sm leading-relaxed whitespace-pre-line">
              {feedData.portfolio_assessment.ai_assessment}
            </div>
          </div>
        </div>
      )}

      {/* AI Strategic Insights */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white flex items-center space-x-2">
            <Zap className="h-5 w-5 text-white/60" />
            <span>AI Strategic Insights</span>
          </h3>
          <span className="text-sm text-white/60">
            {feedData.ai_insights.length} insights • £{Math.round(feedData.data_context.total_revenue_at_risk).toLocaleString()} impact
          </span>
        </div>

        {feedData.ai_insights.length === 0 ? (
          <div className="text-center py-8 bg-white/5 border border-white/20 rounded-lg">
            <Brain className="h-12 w-12 mx-auto mb-3 text-white/30" />
            <p className="text-white/60">No strategic insights detected</p>
            <p className="text-sm text-white/50">Upload more inventory or wait for competitive data</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {feedData.ai_insights.map((insight) => {
              const isExpanded = expandedInsights.has(insight.id)
              const priorityStyle = getPriorityStyle(insight.priority)
              const priorityIcon = getPriorityIcon(insight.priority)
              
              return (
                <div key={insight.id} className={`border rounded-lg overflow-hidden hover:border-white/40 transition-colors ${priorityStyle}`}>
                  {/* Insight Header */}
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {priorityIcon}
                        <div>
                          <h4 className="font-medium text-white">{insight.title}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-white/60 uppercase">{insight.type.replace(/_/g, ' ')}</span>
                            <span className="text-xs text-white/40">•</span>
                            <span className="text-xs text-white/60">{insight.urgency_timeline}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-medium text-white">
                          £{Math.abs(insight.revenue_impact_estimate).toLocaleString()}
                        </div>
                        <div className="text-xs text-white/60">
                          {insight.confidence_score * 100}% confidence
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Insight Content */}
                  <div className="p-4 space-y-3">
                    <p className="text-white/80 text-sm leading-relaxed">
                      {insight.ai_analysis}
                    </p>
                    
                    {/* Affected Products & Competitors */}
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      {insight.affected_products.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <span className="text-white/60">Products:</span>
                          <span className="text-white/80">{insight.affected_products.slice(0, 3).join(', ')}</span>
                          {insight.affected_products.length > 3 && (
                            <span className="text-white/60">+{insight.affected_products.length - 3} more</span>
                          )}
                        </div>
                      )}
                      
                      {insight.competitors_involved.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <span className="text-white/60">Competitors:</span>
                          <span className="text-white/80">{insight.competitors_involved.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Expandable Details */}
                    <div className="border-t border-white/10 pt-3">
                      <button
                        onClick={() => toggleInsightExpansion(insight.id)}
                        className="flex items-center justify-between w-full text-left font-medium text-white hover:text-white/80 transition-colors"
                      >
                        <span>Strategic Actions</span>
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                      
                      {isExpanded && (
                        <div className="mt-3 space-y-4">
                          {/* Strategic Recommendations */}
                          {insight.strategic_recommendations.length > 0 && (
                            <div className="bg-white/5 border border-white/20 rounded p-3">
                              <h5 className="font-medium text-white/80 mb-2 flex items-center space-x-2">
                                <Crown className="h-4 w-4" />
                                <span>Strategic Recommendations:</span>
                              </h5>
                              <ul className="space-y-1">
                                {insight.strategic_recommendations.map((rec, idx) => (
                                  <li key={idx} className="flex items-start space-x-2">
                                    <div className="w-1 h-1 bg-white/60 rounded-full mt-2 flex-shrink-0" />
                                    <span className="text-sm text-white/70">{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Immediate Actions */}
                          {insight.immediate_actions.length > 0 && (
                            <div>
                              <h5 className="font-medium text-white/80 mb-2">Immediate Actions:</h5>
                              <div className="space-y-2">
                                {insight.immediate_actions.map((action, idx) => (
                                  <div key={idx} className="flex items-start space-x-2">
                                    <span className="w-5 h-5 bg-white/20 text-white/80 rounded-full flex items-center justify-center text-xs font-medium mt-0.5 flex-shrink-0">
                                      {idx + 1}
                                    </span>
                                    <span className="text-sm text-white/70">{action}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Market Context */}
                          {insight.market_context && (
                            <div className="bg-white/5 border border-white/20 rounded p-3">
                              <h5 className="font-medium text-white/80 mb-2">Market Context:</h5>
                              <p className="text-sm text-white/70">{insight.market_context}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Data Context Footer */}
      <div className="bg-white/5 border border-white/20 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
          <div>
            <div className="text-lg font-medium text-white">{feedData.data_context.inventory_size}</div>
            <div className="text-white/60">Products in Portfolio</div>
          </div>
          <div>
            <div className="text-lg font-medium text-white">{feedData.data_context.competitor_prices_analyzed}</div>
            <div className="text-white/60">Competitor Prices</div>
          </div>
          <div>
            <div className="text-lg font-medium text-white">{feedData.data_context.unique_competitors}</div>
            <div className="text-white/60">UK Retailers</div>
          </div>
          <div>
            <div className="text-lg font-medium text-green-400">
              {monitoringStatus?.isActive ? 'LIVE' : 'STATIC'}
            </div>
            <div className="text-white/60">Data Status</div>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-white/10 text-center">
          <p className="text-xs text-white/50">
            Last updated: {new Date().toLocaleTimeString()} • 
            Powered by AI & SERP API • 
            Analysis period: {feedData.data_context.analysis_period}
          </p>
        </div>
      </div>
    </div>
  )
}