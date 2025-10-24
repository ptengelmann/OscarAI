// src/app/intelligence/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Navbar } from '@/components/ui/navbar'
import { AuthModal } from '@/components/ui/auth-modals'
import { useUser } from '@/contexts/UserContext'
import { useRouter } from 'next/navigation'
import { VisualPortfolioHealth } from '@/components/ui/visual-portfolio-health'
import { VisualAIInsights } from '@/components/ui/visual-ai-insights'
import {
  Brain,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Loader2,
  Database,
  Activity
} from 'lucide-react'

interface CompetitiveIntelligenceData {
  success: boolean
  analysis_depth: string
  ai_insights: any[]
  monitoring_strategy: any
  portfolio_assessment: any
  market_opportunities: any[]
  data_context: any
  generated_at: string
  powered_by: string
}

export default function IntelligencePage() {
  const router = useRouter()
  const { user, login, isLoading: userLoading } = useUser()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')

  const [intelligenceData, setIntelligenceData] = useState<CompetitiveIntelligenceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDepth, setSelectedDepth] = useState<'surface' | 'standard' | 'deep'>('standard')

  // Auth handlers
  const handleLogin = () => {
    setAuthMode('login')
    setAuthModalOpen(true)
  }

  const handleSignup = () => {
    setAuthMode('signup')
    setAuthModalOpen(true)
  }

  const handleAuthSuccess = (userData: any) => {
    const fullUserData = {
      ...userData,
      company: userData.company || 'Demo Account',
      phone: userData.phone || '',
      location: userData.location || 'UK'
    }
    login(fullUserData)
    setAuthModalOpen(false)
  }

  const switchAuthMode = () => {
    setAuthMode(authMode === 'login' ? 'signup' : 'login')
  }

  // Fetch intelligence data
  const fetchIntelligenceData = async (forceRefresh = false) => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      if (forceRefresh) setRefreshing(true)
      else setLoading(true)

      const params = new URLSearchParams({
        userId: user.email,
        depth: selectedDepth,
        ...(forceRefresh && { refresh: 'true' })
      })

      const response = await fetch(`/api/dashboard/competitive-feed?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setIntelligenceData(data)
        setError(null)
      } else {
        setError(data.message || data.error || 'Failed to load intelligence data')
      }
    } catch (err) {
      console.error('Failed to fetch intelligence data:', err)
      setError('Failed to load competitive intelligence. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Fetch data on mount and when user changes
  useEffect(() => {
    if (user && !userLoading) {
      fetchIntelligenceData()
    } else if (!userLoading) {
      setLoading(false)
    }
  }, [user, userLoading, selectedDepth])

  // Handle manual refresh
  const handleRefresh = () => {
    fetchIntelligenceData(true)
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar onLogin={handleLogin} onSignup={handleSignup} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 text-purple-400 animate-spin mb-4" />
            <p className="text-white/60">Loading AI competitive intelligence...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar onLogin={handleLogin} onSignup={handleSignup} />

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          mode={authMode}
          onSwitchMode={switchAuthMode}
          onSuccess={handleAuthSuccess}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white/5 border border-white/20 rounded-lg p-12 text-center">
            <Brain className="h-20 w-20 text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl font-light text-white mb-4">
              AI-Powered Competitive Intelligence
            </h2>
            <p className="text-white/60 mb-8 max-w-2xl mx-auto">
              Get real-time strategic insights powered by advanced AI. Analyze your portfolio health,
              identify opportunities, and receive actionable recommendations.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={handleLogin}
                className="px-6 py-3 bg-white text-black font-medium rounded hover:bg-gray-100 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={handleSignup}
                className="px-6 py-3 bg-white/10 border border-white/20 text-white font-medium rounded hover:bg-white/15 transition-colors"
              >
                Create Account
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar onLogin={handleLogin} onSignup={handleSignup} />

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          mode={authMode}
          onSwitchMode={switchAuthMode}
          onSuccess={handleAuthSuccess}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-8 text-center">
            <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-2xl font-light text-white mb-2">Unable to Load Intelligence Data</h3>
            <p className="text-white/60 mb-6">{error}</p>
            {error.includes('No inventory') && (
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 bg-white text-black font-medium rounded hover:bg-gray-100 transition-colors"
              >
                Upload Inventory CSV
              </button>
            )}
            {!error.includes('No inventory') && (
              <button
                onClick={handleRefresh}
                className="px-6 py-3 bg-white text-black font-medium rounded hover:bg-gray-100 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar onLogin={handleLogin} onSignup={handleSignup} />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={switchAuthMode}
        onSuccess={handleAuthSuccess}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-light text-white">Live Competitive Intelligence</h1>
                  <p className="text-white/60">Powered by AI & Real-time Market Data</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Analysis Depth Selector */}
              <select
                value={selectedDepth}
                onChange={(e) => setSelectedDepth(e.target.value as any)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:border-white/40 focus:outline-none"
              >
                <option value="surface">Surface Analysis</option>
                <option value="standard">Standard Analysis</option>
                <option value="deep">Deep Analysis</option>
              </select>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-white/10 border border-white/20 rounded hover:bg-white/15 transition-colors disabled:opacity-50 text-white"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Analyzing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Status Bar */}
          {intelligenceData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-1">
                  <Database className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-white/50">Portfolio Size</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {intelligenceData.data_context?.inventory_size || 0}
                </div>
                <div className="text-xs text-white/50">Products</div>
              </div>

              <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-1">
                  <Activity className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-white/50">Coverage</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {intelligenceData.data_context?.competitive_coverage_percentage || 0}%
                </div>
                <div className="text-xs text-white/50">Monitored</div>
              </div>

              <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-1">
                  <Brain className="h-4 w-4 text-purple-400" />
                  <span className="text-xs text-white/50">AI Insights</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {intelligenceData.ai_insights?.length || 0}
                </div>
                <div className="text-xs text-white/50">Generated</div>
              </div>

              <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-1">
                  <Sparkles className="h-4 w-4 text-yellow-400" />
                  <span className="text-xs text-white/50">Analysis Depth</span>
                </div>
                <div className="text-lg font-bold text-white capitalize">
                  {intelligenceData.analysis_depth}
                </div>
                <div className="text-xs text-white/50">Mode</div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        {intelligenceData ? (
          <div className="space-y-8">

            {/* Portfolio Health Visualization */}
            <div>
              <VisualPortfolioHealth
                healthScore={intelligenceData.portfolio_assessment?.health_score || 7}
                portfolioAssessment={intelligenceData.portfolio_assessment}
                dataContext={intelligenceData.data_context}
              />
            </div>

            {/* AI Insights Visualization */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <Sparkles className="h-6 w-6 text-yellow-400" />
                <h2 className="text-3xl font-light text-white">Strategic Insights</h2>
              </div>
              <VisualAIInsights insights={intelligenceData.ai_insights || []} />
            </div>

            {/* Market Opportunities */}
            {intelligenceData.market_opportunities && intelligenceData.market_opportunities.length > 0 && (
              <div className="bg-white/5 border border-white/20 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <TrendingUp className="h-6 w-6 text-green-400" />
                  <h3 className="text-2xl font-light text-white">Market Opportunities</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {intelligenceData.market_opportunities.map((opp: any, idx: number) => (
                    <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <div className="text-sm font-semibold text-green-400 mb-2">{opp.type}</div>
                      <div className="text-white mb-2">{opp.opportunity || opp.category}</div>
                      {opp.revenue_at_stake && (
                        <div className="text-2xl font-bold text-white mb-1">
                          ${(opp.revenue_at_stake / 1000).toFixed(1)}K
                        </div>
                      )}
                      <div className="text-xs text-white/60">{opp.recommended_action}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generated Timestamp */}
            <div className="text-center text-xs text-white/40">
              Last updated: {new Date(intelligenceData.generated_at).toLocaleString()}
            </div>

          </div>
        ) : (
          <div className="bg-white/5 border border-white/20 rounded-lg p-12 text-center">
            <Brain className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-2xl font-light text-white mb-2">No Intelligence Data Available</h3>
            <p className="text-white/60">Upload your inventory to start receiving AI-powered insights</p>
          </div>
        )}

      </main>
    </div>
  )
}
