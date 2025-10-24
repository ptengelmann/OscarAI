// src/components/ui/visual-ai-insights.tsx
'use client'

import React, { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadialBarChart, RadialBar
} from 'recharts'
import {
  AlertTriangle, TrendingUp, Target, Brain, Clock, DollarSign,
  Package, Users, ChevronDown, ChevronUp, Zap, Shield, Activity
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

interface VisualAIInsightsProps {
  insights: AIInsight[]
}

export function VisualAIInsights({ insights }: VisualAIInsightsProps) {
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null)
  const [filterPriority, setFilterPriority] = useState<string>('all')

  // Filter insights by priority
  const filteredInsights = filterPriority === 'all'
    ? insights
    : insights.filter(i => i.priority === filterPriority)

  // Sort by priority and revenue impact
  const sortedInsights = [...filteredInsights].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (priorityDiff !== 0) return priorityDiff
    return Math.abs(b.revenue_impact_estimate) - Math.abs(a.revenue_impact_estimate)
  })

  // Summary statistics
  const summary = {
    total: insights.length,
    critical: insights.filter(i => i.priority === 'critical').length,
    high: insights.filter(i => i.priority === 'high').length,
    totalRevenue: insights.reduce((sum, i) => sum + Math.abs(i.revenue_impact_estimate), 0),
    opportunities: insights.filter(i => i.type === 'market_opportunity').length,
    threats: insights.filter(i => i.type === 'competitive_threat').length
  }

  // Priority distribution data for pie chart
  const priorityData = [
    { name: 'Critical', value: summary.critical, color: '#ef4444' },
    { name: 'High', value: summary.high, color: '#f59e0b' },
    { name: 'Medium', value: insights.filter(i => i.priority === 'medium').length, color: '#eab308' },
    { name: 'Low', value: insights.filter(i => i.priority === 'low').length, color: '#22c55e' }
  ].filter(d => d.value > 0)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'competitive_threat':
        return <Shield className="h-5 w-5" />
      case 'market_opportunity':
        return <TrendingUp className="h-5 w-5" />
      case 'pricing_strategy':
        return <DollarSign className="h-5 w-5" />
      default:
        return <Brain className="h-5 w-5" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'from-red-500/20 to-red-600/20 border-red-500/30'
      case 'high':
        return 'from-orange-500/20 to-orange-600/20 border-orange-500/30'
      case 'medium':
        return 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30'
      default:
        return 'from-green-500/20 to-green-600/20 border-green-500/30'
    }
  }

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500/20 text-red-300 border-red-500/50'
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/50'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
      default:
        return 'bg-green-500/20 text-green-300 border-green-500/50'
    }
  }

  const getUrgencyColor = (timeline: string) => {
    if (timeline.includes('48 hours') || timeline.includes('immediately')) return 'text-red-400'
    if (timeline.includes('1 week')) return 'text-orange-400'
    return 'text-yellow-400'
  }

  return (
    <div className="space-y-6">

      {/* Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <Brain className="h-8 w-8 text-purple-400" />
            <span className="text-3xl font-bold text-white">{summary.total}</span>
          </div>
          <div className="text-sm text-white/60">Total Insights</div>
        </div>

        <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <span className="text-3xl font-bold text-red-300">{summary.critical}</span>
          </div>
          <div className="text-sm text-white/60">Critical Alerts</div>
        </div>

        <div className="bg-white/5 border border-white/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-8 w-8 text-green-400" />
            <span className="text-3xl font-bold text-white">${(summary.totalRevenue / 1000).toFixed(0)}K</span>
          </div>
          <div className="text-sm text-white/60">Total Impact</div>
        </div>

        <div className="bg-white/5 border border-white/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <Target className="h-8 w-8 text-blue-400" />
            <div className="text-right">
              <div className="text-lg font-bold text-green-400">+{summary.opportunities}</div>
              <div className="text-lg font-bold text-red-400">-{summary.threats}</div>
            </div>
          </div>
          <div className="text-sm text-white/60">Opportunities vs Threats</div>
        </div>
      </div>

      {/* Priority Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/20 rounded-lg p-6">
          <h3 className="text-xl font-light text-white mb-4">Priority Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Impact Breakdown */}
        <div className="bg-white/5 border border-white/20 rounded-lg p-6">
          <h3 className="text-xl font-light text-white mb-4">Revenue Impact by Insight</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedInsights.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="title"
                  stroke="rgba(255,255,255,0.5)"
                  tick={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => `$${(value / 1000).toFixed(1)}K`}
                />
                <Bar
                  dataKey="revenue_impact_estimate"
                  fill="#8b5cf6"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex items-center space-x-4">
        <span className="text-sm text-white/60">Filter by Priority:</span>
        {['all', 'critical', 'high', 'medium', 'low'].map((priority) => (
          <button
            key={priority}
            onClick={() => setFilterPriority(priority)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterPriority === priority
                ? 'bg-white text-black'
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </button>
        ))}
      </div>

      {/* Insight Cards */}
      <div className="space-y-4">
        {sortedInsights.map((insight) => (
          <div
            key={insight.id}
            className={`bg-gradient-to-br ${getPriorityColor(insight.priority)} border rounded-lg overflow-hidden transition-all duration-300 ${
              expandedInsight === insight.id ? 'ring-2 ring-white/20' : ''
            }`}
          >
            {/* Card Header */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4 flex-1">
                  <div className={`w-12 h-12 ${getPriorityBadgeColor(insight.priority).replace('border', 'border-2')} rounded-lg flex items-center justify-center`}>
                    {getTypeIcon(insight.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full border ${getPriorityBadgeColor(insight.priority)}`}>
                        {insight.priority}
                      </span>
                      <span className="text-xs text-white/50 capitalize">
                        {insight.type.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{insight.title}</h3>
                    <p className="text-sm text-white/70 line-clamp-2">{insight.ai_analysis}</p>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedInsight(expandedInsight === insight.id ? null : insight.id)}
                  className="ml-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {expandedInsight === insight.id ? (
                    <ChevronUp className="h-5 w-5 text-white/70" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-white/70" />
                  )}
                </button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <DollarSign className="h-4 w-4 text-green-400" />
                    <span className="text-xs text-white/50">Revenue Impact</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    ${(Math.abs(insight.revenue_impact_estimate) / 1000).toFixed(1)}K
                  </div>
                </div>

                <div className="bg-black/20 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <Activity className="h-4 w-4 text-blue-400" />
                    <span className="text-xs text-white/50">Confidence</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {(insight.confidence_score * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="bg-black/20 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <Package className="h-4 w-4 text-purple-400" />
                    <span className="text-xs text-white/50">Products</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {insight.affected_products.length}
                  </div>
                </div>

                <div className="bg-black/20 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <Clock className={`h-4 w-4 ${getUrgencyColor(insight.urgency_timeline)}`} />
                    <span className="text-xs text-white/50">Timeline</span>
                  </div>
                  <div className={`text-sm font-bold ${getUrgencyColor(insight.urgency_timeline)}`}>
                    {insight.urgency_timeline}
                  </div>
                </div>
              </div>

              {/* Confidence Score Visual */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/50">Confidence Score</span>
                  <span className="text-xs font-bold text-white">{(insight.confidence_score * 100).toFixed(0)}%</span>
                </div>
                <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${
                      insight.confidence_score >= 0.8 ? 'bg-green-500' :
                      insight.confidence_score >= 0.6 ? 'bg-yellow-500' :
                      'bg-orange-500'
                    }`}
                    style={{ width: `${insight.confidence_score * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedInsight === insight.id && (
              <div className="border-t border-white/10 bg-black/20 p-6 space-y-6">

                {/* AI Analysis */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Brain className="h-5 w-5 text-purple-400" />
                    <h4 className="text-lg font-semibold text-white">AI Strategic Analysis</h4>
                  </div>
                  <p className="text-white/70 leading-relaxed">{insight.ai_analysis}</p>
                </div>

                {/* Market Context */}
                {insight.market_context && (
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <Target className="h-5 w-5 text-blue-400" />
                      <h4 className="text-lg font-semibold text-white">Market Context</h4>
                    </div>
                    <p className="text-white/70 leading-relaxed">{insight.market_context}</p>
                  </div>
                )}

                {/* Strategic Recommendations */}
                {insight.strategic_recommendations.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <TrendingUp className="h-5 w-5 text-green-400" />
                      <h4 className="text-lg font-semibold text-white">Strategic Recommendations</h4>
                    </div>
                    <ul className="space-y-2">
                      {insight.strategic_recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start space-x-3">
                          <div className="w-6 h-6 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-green-300">{idx + 1}</span>
                          </div>
                          <span className="text-white/70 leading-relaxed">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Immediate Actions */}
                {insight.immediate_actions.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <Zap className="h-5 w-5 text-yellow-400" />
                      <h4 className="text-lg font-semibold text-white">Immediate Actions Required</h4>
                    </div>
                    <ul className="space-y-2">
                      {insight.immediate_actions.map((action, idx) => (
                        <li key={idx} className="flex items-start space-x-3">
                          <div className="w-6 h-6 bg-yellow-500/20 border border-yellow-500/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Zap className="h-3 w-3 text-yellow-300" />
                          </div>
                          <span className="text-white/70 leading-relaxed">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Affected Products & Competitors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insight.affected_products.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <Package className="h-4 w-4 text-purple-400" />
                        <h5 className="text-sm font-semibold text-white">Affected Products</h5>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {insight.affected_products.slice(0, 5).map((product, idx) => (
                          <span key={idx} className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white/70">
                            {product}
                          </span>
                        ))}
                        {insight.affected_products.length > 5 && (
                          <span className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white/70">
                            +{insight.affected_products.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {insight.competitors_involved.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <Users className="h-4 w-4 text-orange-400" />
                        <h5 className="text-sm font-semibold text-white">Competitors Involved</h5>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {insight.competitors_involved.map((competitor, idx) => (
                          <span key={idx} className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white/70">
                            {competitor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        ))}
      </div>

      {sortedInsights.length === 0 && (
        <div className="bg-white/5 border border-white/20 rounded-lg p-12 text-center">
          <Brain className="h-16 w-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-light text-white mb-2">No insights available</h3>
          <p className="text-white/60">Upload your inventory to start receiving AI-powered competitive intelligence</p>
        </div>
      )}

    </div>
  )
}
