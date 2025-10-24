// src/components/ui/visual-portfolio-health.tsx
'use client'

import React, { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadialBarChart, RadialBar, LineChart, Line, Area, AreaChart
} from 'recharts'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, DollarSign, Package, Target, Activity, Loader2 } from 'lucide-react'

interface PortfolioHealthProps {
  healthScore: number
  portfolioAssessment: any
  dataContext: any
}

// Chart wrapper with error boundary
function ChartWrapper({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const [chartError, setChartError] = useState(false)

  useEffect(() => {
    setChartError(false)
  }, [children])

  if (chartError) {
    return (
      <div className="bg-white/5 border border-white/20 rounded-lg p-6">
        <div className="mb-4">
          <h3 className="text-xl font-light text-white mb-1">{title}</h3>
          <p className="text-xs text-white/50">{description}</p>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center space-y-2">
            <AlertTriangle className="h-8 w-8 text-orange-400 mx-auto" />
            <p className="text-sm text-white/50">Chart temporarily unavailable</p>
          </div>
        </div>
      </div>
    )
  }

  try {
    return (
      <div className="bg-white/5 border border-white/20 rounded-lg p-6" style={{ userSelect: 'none' }}>
        <div className="mb-4">
          <h3 className="text-xl font-light text-white mb-1">{title}</h3>
          <p className="text-xs text-white/50">{description}</p>
        </div>
        {children}
      </div>
    )
  } catch (error) {
    console.error('Chart wrapper error:', error)
    setChartError(true)
    return null
  }
}

export function VisualPortfolioHealth({ healthScore, portfolioAssessment, dataContext }: PortfolioHealthProps) {
  // CRITICAL FIX: Add mounted state to prevent SSR/hydration issues with Recharts
  const [isMounted, setIsMounted] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    // Delay rendering charts until component is fully mounted on client
    const timer = setTimeout(() => {
      setIsMounted(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // Error boundary simulation
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Chart rendering error:', error)
      setHasError(true)
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  // Show loading state while mounting
  if (!isMounted) {
    return (
      <div className="space-y-6">
        <div className="bg-white/5 border border-white/20 rounded-lg p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 text-purple-400 animate-spin" />
            <p className="text-white/60 text-sm">Loading portfolio analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if something went wrong
  if (hasError) {
    return (
      <div className="space-y-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-400" />
            <div>
              <h3 className="text-lg font-medium text-red-300">Chart Rendering Error</h3>
              <p className="text-sm text-red-200 mt-1">Unable to display charts. Try refreshing the page.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Parse the AI assessment text to extract metrics
  const parseMetrics = () => {
    const assessment = portfolioAssessment?.ai_assessment || ''

    // Extract key numbers from text using regex
    const extractNumber = (pattern: RegExp) => {
      const match = assessment.match(pattern)
      return match ? parseInt(match[1].replace(/,/g, '')) : 0
    }

    return {
      fastMoving: extractNumber(/(\d+)\s+fast-moving products/i),
      diversityScore: extractNumber(/diversity score[:\s]+\(?(\d+)\)?/i),
      inventoryEfficiency: extractNumber(/inventory efficiency[:\s]+\(?(\d+)\)?/i),
      spiritsProducts: extractNumber(/(\d+)\s+products.*spirits/i),
      spiritsRevenue: extractNumber(/\$?([\d,]+)K?\s+revenue/i),
      underpricedProducts: extractNumber(/(\d+)\s+underpriced products/i),
      pricingVolatility: extractNumber(/pricing volatility[:\s]+\(?(\d+)\)?/i),
      competitiveCoverage: extractNumber(/(\d+)%\s+competitive coverage/i),
      revenueLeakage: extractNumber(/\$?([\d,]+)K?\s+.*(?:identified impact|revenue leakage)/i),
      spiritsConcentration: extractNumber(/(\d+)%\s+revenue dependence/i),
      revenueOpportunity: extractNumber(/\$?([\d,]+)K?-?[\d,]*K?\s+.*(?:revenue uplift|potential)/i)
    }
  }

  const metrics = parseMetrics()

  // Custom tooltip styling
  const customTooltipStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    padding: '12px',
    color: 'white',
    fontSize: '14px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
  }

  // Enhanced tooltip component with more details
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={customTooltipStyle}>
          <p className="font-semibold mb-2 text-white border-b border-white/20 pb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between space-x-4">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-white/70">{entry.name}:</span>
                </div>
                <span className="text-sm font-bold" style={{ color: entry.color }}>
                  {typeof entry.value === 'number' && entry.value > 100
                    ? entry.value.toLocaleString()
                    : entry.value}
                </span>
              </div>
            ))}
          </div>
          {/* Add percentage if applicable */}
          {payload[0]?.payload?.percentage && (
            <div className="mt-2 pt-2 border-t border-white/20 text-xs text-white/50">
              {payload[0].payload.percentage}% of total
            </div>
          )}
        </div>
      )
    }
    return null
  }

  // Enhanced tooltip for velocity chart
  const VelocityTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = velocityData.reduce((sum, item) => sum + item.count, 0)
      const percentage = ((payload[0].value / total) * 100).toFixed(1)

      return (
        <div style={customTooltipStyle}>
          <p className="font-semibold mb-2 text-white">{label} Products</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between space-x-4">
              <span className="text-xs text-white/70">Count:</span>
              <span className="text-lg font-bold" style={{ color: payload[0].fill }}>
                {payload[0].value}
              </span>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span className="text-xs text-white/70">% of Portfolio:</span>
              <span className="text-sm font-bold text-white">
                {percentage}%
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-white/20 text-xs text-white/50">
            {label === 'Fast-Moving' && '5+ units sold weekly'}
            {label === 'Moderate' && '1-5 units sold weekly'}
            {label === 'Slow-Moving' && '<1 unit sold weekly'}
          </div>
        </div>
      )
    }
    return null
  }

  // Enhanced tooltip for revenue chart
  const RevenueTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = Math.abs(payload[0].value)
      return (
        <div style={customTooltipStyle}>
          <p className="font-semibold mb-2 text-white">{label}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between space-x-4">
              <span className="text-xs text-white/70">Amount:</span>
              <span className="text-xl font-bold" style={{ color: payload[0].fill }}>
                ${value}K
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-white/20 text-xs text-white/50">
              {label === 'Opportunity' && 'Potential revenue from price increases'}
              {label === 'At Risk' && 'Revenue threatened by overpricing'}
              {label === 'Current' && 'Baseline revenue level'}
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // Health Score Gauge Data
  const healthGaugeData = [
    { name: 'Health', value: healthScore * 10, fill: healthScore >= 7 ? '#22c55e' : healthScore >= 5 ? '#f59e0b' : '#ef4444' }
  ]

  // Category Revenue Breakdown
  const categoryData = [
    { name: 'Spirits', value: metrics.spiritsConcentration || 75, color: '#8b5cf6' },
    { name: 'Wine', value: 15, color: '#ec4899' },
    { name: 'Beer', value: 7, color: '#f59e0b' },
    { name: 'RTD/Other', value: 3, color: '#3b82f6' }
  ]

  // Sales Velocity Distribution
  const velocityData = [
    { name: 'Fast-Moving', count: metrics.fastMoving || 98, fill: '#22c55e' },
    { name: 'Moderate', count: 45, fill: '#f59e0b' },
    { name: 'Slow-Moving', count: 32, fill: '#ef4444' }
  ]

  // Revenue Opportunity vs Risk
  const opportunityData = [
    { name: 'Current', value: 0, fill: '#6b7280' },
    { name: 'Opportunity', value: metrics.revenueOpportunity || 150, fill: '#22c55e' },
    { name: 'At Risk', value: -(metrics.revenueLeakage || 97), fill: '#ef4444' }
  ]

  // Key Metrics Cards
  const keyMetrics = [
    {
      label: 'Revenue Opportunity',
      value: `$${metrics.revenueOpportunity || 150}K`,
      change: '+20%',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20'
    },
    {
      label: 'Revenue at Risk',
      value: `$${metrics.revenueLeakage || 97}K`,
      change: '-12%',
      trend: 'down',
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20'
    },
    {
      label: 'Underpriced Products',
      value: metrics.underpricedProducts || 34,
      change: 'Critical',
      trend: 'warning',
      icon: DollarSign,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20'
    },
    {
      label: 'Fast-Moving Products',
      value: metrics.fastMoving || 98,
      change: '+15%',
      trend: 'up',
      icon: Activity,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20'
    }
  ]

  // Pricing Distribution
  const pricingData = [
    { category: 'Budget', count: 45, revenue: 12 },
    { category: 'Mid-Range', count: 78, revenue: 45 },
    { category: 'Premium', count: 52, revenue: 78 }
  ]

  // Risk Heat Map Data
  const riskData = [
    { area: 'Pricing', severity: metrics.pricingVolatility || 65, impact: 'High' },
    { area: 'Coverage', severity: 100 - (metrics.competitiveCoverage || 36), impact: 'High' },
    { area: 'Concentration', severity: metrics.spiritsConcentration || 75, impact: 'Medium' },
    { area: 'Inventory', severity: 100 - (metrics.inventoryEfficiency || 72), impact: 'Low' }
  ]

  const getRiskColor = (severity: number) => {
    if (severity >= 70) return '#ef4444'
    if (severity >= 50) return '#f59e0b'
    return '#22c55e'
  }

  return (
    <div className="space-y-6" style={{ userSelect: 'none' }}>
      {/* Data Source Indicator */}
      {dataContext && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <div>
                <span className="text-sm font-medium text-white">Analyzing Your Complete Portfolio</span>
                <p className="text-xs text-white/60 mt-1">
                  Data from all {dataContext.inventory_size} products across {dataContext.categories_analyzed} categories •
                  Last 7 days • {dataContext.brands_analyzed} brands tracked
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/50">Coverage</div>
              <div className="text-lg font-bold text-blue-400">{dataContext.competitive_coverage_percentage}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Simple Health Score Header */}
      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-white/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-light text-white mb-1">Portfolio Health Assessment</h2>
            <p className="text-sm text-white/50">AI-powered competitive intelligence analysis</p>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-xs text-white/50 mb-1">Overall Health</div>
                <div className={`text-6xl font-bold ${
                  healthScore >= 7 ? 'text-green-400' :
                  healthScore >= 5 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {healthScore}<span className="text-3xl text-white/40">/10</span>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-lg border ${
                healthScore >= 7 ? 'bg-green-500/20 border-green-500/50 text-green-400' :
                healthScore >= 5 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' :
                'bg-red-500/20 border-red-500/50 text-red-400'
              }`}>
                <div className="text-sm font-bold">
                  {healthScore >= 7 ? '✓ Healthy' : healthScore >= 5 ? '⚠ Moderate' : '✗ At Risk'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {keyMetrics.map((metric, index) => (
          <div key={index} className="bg-white/5 border border-white/20 rounded-lg p-6 hover:bg-white/8 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${metric.bgColor} rounded-lg flex items-center justify-center`}>
                <metric.icon className={`h-6 w-6 ${metric.color}`} />
              </div>
              {metric.trend === 'up' && <TrendingUp className="h-5 w-5 text-green-400" />}
              {metric.trend === 'down' && <TrendingDown className="h-5 w-5 text-red-400" />}
              {metric.trend === 'warning' && <AlertTriangle className="h-5 w-5 text-orange-400" />}
            </div>
            <div className="text-3xl font-bold text-white mb-1">{metric.value}</div>
            <div className="text-sm text-white/60 mb-2">{metric.label}</div>
            <div className={`text-xs font-medium ${
              metric.trend === 'up' ? 'text-green-400' :
              metric.trend === 'down' ? 'text-red-400' :
              'text-orange-400'
            }`}>
              {metric.change}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Category Revenue Breakdown (Donut Chart) */}
        <ChartWrapper title="Revenue by Category" description="Portfolio composition by revenue contribution">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {categoryData.map((cat, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                <span className="text-sm text-white/70">{cat.name}: {cat.value}%</span>
              </div>
            ))}
          </div>
        </ChartWrapper>

        {/* Sales Velocity Distribution */}
        <ChartWrapper title="Sales Velocity Distribution" description="Product count by sales performance (Fast: 5+ weekly, Moderate: 1-5, Slow: <1)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="rgba(255,255,255,0.5)"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: 'rgba(255,255,255,0.7)' }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: 'rgba(255,255,255,0.7)' }}
                />
                <Tooltip content={<VelocityTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {velocityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapper>

        {/* Revenue Opportunity vs Risk (Waterfall-style) */}
        <ChartWrapper title="Revenue Impact Analysis" description="Potential revenue gain vs revenue at risk from pricing issues">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={opportunityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="rgba(255,255,255,0.5)"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: 'rgba(255,255,255,0.7)' }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: 'rgba(255,255,255,0.7)' }}
                  label={{ value: '$K', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.5)' }}
                />
                <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {opportunityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-white/70">Potential Gain: ${metrics.revenueOpportunity || 150}K</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-white/70">At Risk: ${metrics.revenueLeakage || 97}K</span>
            </div>
          </div>
        </ChartWrapper>

        {/* Risk Heat Map */}
        <ChartWrapper title="Risk Assessment Heat Map" description="Current risk levels across key business areas (0-100 scale)">
          <div className="space-y-4">
            {riskData.map((risk, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{risk.area}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-white/60">{risk.impact} Impact</span>
                    <span className="text-xs font-bold" style={{ color: getRiskColor(risk.severity) }}>
                      {risk.severity}/100
                    </span>
                  </div>
                </div>
                <div className="relative h-8 bg-white/10 rounded-lg overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full rounded-lg transition-all duration-500"
                    style={{
                      width: `${risk.severity}%`,
                      backgroundColor: getRiskColor(risk.severity)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>✓ Low (0-50)</span>
              <span>⚠ Medium (50-70)</span>
              <span>✗ High (70+)</span>
            </div>
          </div>
        </ChartWrapper>

      </div>

      {/* Competitive Coverage Progress */}
      <div className="bg-white/5 border border-white/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-light text-white">Competitive Intelligence Coverage</h3>
          <span className="text-2xl font-bold text-white">{metrics.competitiveCoverage || dataContext?.competitive_coverage_percentage || 36}%</span>
        </div>
        <div className="relative h-4 bg-white/10 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000"
            style={{ width: `${metrics.competitiveCoverage || dataContext?.competitive_coverage_percentage || 36}%` }}
          ></div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-white/50">Products Monitored</div>
            <div className="text-xl font-bold text-white">{dataContext?.competitor_prices_analyzed || 127}</div>
          </div>
          <div>
            <div className="text-white/50">Total Portfolio</div>
            <div className="text-xl font-bold text-white">{dataContext?.inventory_size || 280}</div>
          </div>
          <div>
            <div className="text-white/50">Competitors Tracked</div>
            <div className="text-xl font-bold text-white">{dataContext?.unique_competitors || 12}</div>
          </div>
        </div>
      </div>

      {/* Pricing Distribution Analysis */}
      <ChartWrapper title="Portfolio Pricing Distribution" description="Revenue and product count across price segments">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pricingData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="category"
                stroke="rgba(255,255,255,0.5)"
                style={{ fontSize: '12px' }}
                tick={{ fill: 'rgba(255,255,255,0.7)' }}
              />
              <YAxis
                stroke="rgba(255,255,255,0.5)"
                style={{ fontSize: '12px' }}
                tick={{ fill: 'rgba(255,255,255,0.7)' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#8b5cf6"
                fillOpacity={1}
                fill="url(#revenueGradient)"
                name="Revenue ($K)"
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#ec4899"
                strokeWidth={2}
                name="Product Count"
                dot={{ fill: '#ec4899', r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-center space-x-6 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span className="text-white/70">Revenue</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-pink-500 rounded"></div>
            <span className="text-white/70">Product Count</span>
          </div>
        </div>
      </ChartWrapper>

    </div>
  )
}
