// src/app/api/dashboard/competitive-feed/route.ts
// ADVANCED AI-powered competitive intelligence dashboard

import { NextRequest, NextResponse } from 'next/server'
import { PostgreSQLService } from '@/lib/database-postgres'
import { RealCompetitiveScraping } from '@/lib/real-competitive-scraping'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

interface ProductAnalysisStrategy {
  total_products: number
  competitive_coverage_percentage: number
  diversity_score: number
  analysis_depth: 'surface' | 'standard' | 'deep'
  recommendation: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')
    const forceRefresh = searchParams.get('refresh') === 'true'
    const analysisDepth = searchParams.get('depth') || 'standard' // surface | standard | deep
    
    console.log(`👤 User ID: ${userId}, Analysis Depth: ${analysisDepth}, Force Refresh: ${forceRefresh}`)
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    console.log('>>> process.env:', process.env.ANTHROPIC_API_KEY ? 'ANTHROPIC_API_KEY is set' : 'ANTHROPIC_API_KEY is NOT set')
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ 
        error: 'AI not configured',
        message: 'ANTHROPIC_API_KEY required for competitive intelligence'
      }, { status: 500 })
    }

    // CHECK CACHE FIRST (unless force refresh requested)
    if (!forceRefresh) {
      const prisma = new (await import('@prisma/client')).PrismaClient()
      try {
        const cachedInsights = await prisma.aiInsight.findMany({
          where: {
            user_id: userId,
            analysis_depth: analysisDepth,
            expires_at: { gte: new Date() } // Not expired
          },
          orderBy: { generated_at: 'desc' }
        })

        if (cachedInsights.length > 0) {
          console.log(`✅ CACHE HIT: Returning ${cachedInsights.length} cached insights (${Math.round((Date.now() - cachedInsights[0].generated_at.getTime()) / 1000 / 60)} minutes old)`)

          // Update view count
          await prisma.aiInsight.updateMany({
            where: { id: { in: cachedInsights.map(i => i.id) } },
            data: {
              view_count: { increment: 1 },
              last_viewed_at: new Date()
            }
          })

          const formattedInsights = cachedInsights.map(insight => ({
            id: insight.id,
            type: insight.insight_type,
            priority: insight.priority,
            title: insight.title,
            ai_analysis: insight.ai_analysis,
            strategic_recommendations: insight.strategic_recommendations,
            immediate_actions: insight.immediate_actions,
            revenue_impact_estimate: insight.revenue_impact_estimate,
            confidence_score: insight.confidence_score,
            affected_products: insight.affected_products,
            competitors_involved: insight.competitors_involved,
            market_context: insight.market_context,
            urgency_timeline: insight.urgency_timeline,
            timestamp: insight.generated_at,
            cached: true,
            cache_age_minutes: Math.round((Date.now() - insight.generated_at.getTime()) / 1000 / 60)
          }))

          await prisma.$disconnect()

          // CRITICAL FIX: Generate portfolio_assessment from cached data
          const cachedDataContext = cachedInsights[0].data_snapshot as any
          const portfolioAssessmentFromCache = {
            health_score: cachedDataContext?.competitive_coverage_percentage > 50 ? 8 :
                         cachedDataContext?.competitive_coverage_percentage > 30 ? 6 : 5,
            ai_assessment: `Portfolio analysis based on ${cachedDataContext?.inventory_size || 0} products with ${cachedDataContext?.competitive_coverage_percentage || 0}% competitive coverage.`,
            top_threats: formattedInsights.filter((i: any) => i.priority === 'critical' || i.priority === 'high').slice(0, 3).map((i: any) => i.title),
            top_opportunities: formattedInsights.filter((i: any) => i.type === 'market_opportunity').slice(0, 3).map((i: any) => i.title),
            strategic_roadmap: ['Monitor competitive pricing', 'Expand coverage', 'Optimize pricing strategy']
          }

          return NextResponse.json({
            success: true,
            ai_insights: formattedInsights,
            portfolio_assessment: portfolioAssessmentFromCache,
            cached: true,
            generated_at: cachedInsights[0].generated_at,
            expires_at: cachedInsights[0].expires_at,
            data_context: cachedInsights[0].data_snapshot
          })
        }
      } catch (cacheError) {
        console.warn('Cache check failed, proceeding with fresh generation:', cacheError)
      } finally {
        await prisma.$disconnect()
      }
    }

    console.log('🔄 CACHE MISS or FORCE REFRESH: Generating fresh insights...')

    // ENHANCED: Get ALL user data for comprehensive analysis
    const [existingCompetitorData, userSKUs, recentAnalyses] = await Promise.all([
      PostgreSQLService.getCompetitorData(userId, 7), // Existing competitive data
      PostgreSQLService.getUserSKUs(userId), // ALL inventory products
      PostgreSQLService.getRecentAnalyses(userId, 3)
    ])

    if (userSKUs.length === 0) {
      return NextResponse.json({
        error: 'No inventory found',
        message: 'Upload your inventory to enable competitive intelligence',
        ai_insights: []
      }, { status: 400 })
    }

    // ADVANCED: Calculate comprehensive portfolio metrics
    const portfolioMetrics = analyzePortfolioDepth(userSKUs, existingCompetitorData)
    console.log(`📊 PORTFOLIO ANALYSIS:`, portfolioMetrics)

    // ENHANCED: Intelligent competitive data expansion
    let enhancedCompetitorData = existingCompetitorData
    const competitiveStrategy = determineCompetitiveStrategy(portfolioMetrics, analysisDepth, forceRefresh)
    
    if (competitiveStrategy.should_expand) {
      console.log(`🔄 EXPANDING competitive analysis: ${competitiveStrategy.reason}`)
      
      const targetProducts = selectStrategicProducts(
        userSKUs, 
        existingCompetitorData, 
        competitiveStrategy.target_count,
        analysisDepth
      )
      
      console.log(`🎯 Selected ${targetProducts.length} strategic products for competitive analysis`)
      
      // ADVANCED: Batch competitive data collection with retry logic
      const newCompetitorData = await collectCompetitiveDataAdvanced(
        targetProducts, 
        userId, 
        competitiveStrategy.max_per_product
      )
      
      enhancedCompetitorData = [...existingCompetitorData, ...newCompetitorData]
      
      console.log(`✅ Enhanced competitive dataset: ${enhancedCompetitorData.length} total prices`)
      console.log(`📈 Coverage improved: ${((enhancedCompetitorData.length / userSKUs.length) * 100).toFixed(1)}%`)
    }

    // ENHANCED: Advanced AI analysis with full context
    const aiInsights = await generateAdvancedAIIntelligence(
      enhancedCompetitorData,
      userSKUs,
      recentAnalyses,
      portfolioMetrics,
      analysisDepth
    )

    // ENHANCED: Strategic monitoring recommendations
    const monitoringRecommendations = await generateAdvancedMonitoringStrategy(
      userSKUs,
      enhancedCompetitorData,
      aiInsights
    )

    // ENHANCED: Comprehensive portfolio assessment
    const portfolioAssessment = await generateAdvancedPortfolioAssessment(
      userSKUs,
      enhancedCompetitorData,
      aiInsights,
      portfolioMetrics
    )

    // ADVANCED: Market opportunity detection
    const marketOpportunities = await detectMarketOpportunities(
      userSKUs,
      enhancedCompetitorData,
      aiInsights
    )

    // SAVE INSIGHTS TO CACHE (async, don't block response)
    const dataContext = {
      inventory_size: userSKUs.length,
      competitor_prices_analyzed: enhancedCompetitorData.length,
      competitive_coverage_percentage: Math.round((enhancedCompetitorData.length / userSKUs.length) * 100),
      unique_competitors: [...new Set(enhancedCompetitorData.map(c => c.competitor))].length,
      categories_analyzed: [...new Set(userSKUs.map(s => s.category))].length,
      brands_analyzed: [...new Set(userSKUs.filter(s => s.brand && s.brand !== 'Unknown').map(s => s.brand))].length,
      analysis_period: '7 days',
      total_revenue_at_risk: aiInsights.reduce((sum, i) => sum + Math.abs(i.revenue_impact_estimate), 0),
      auto_populated_data: enhancedCompetitorData.length > existingCompetitorData.length,
      new_competitive_data_points: enhancedCompetitorData.length - existingCompetitorData.length,
      portfolio_diversity_score: portfolioMetrics.diversity_score,
      analysis_strategy: competitiveStrategy,
      market_opportunity_count: marketOpportunities?.length || 0
    }

    const generatedAt = new Date()
    const expiresAt = new Date(generatedAt.getTime() + 15 * 60 * 1000) // 15 minutes cache

    // Save to database (don't await - fire and forget)
    const prisma = new (await import('@prisma/client')).PrismaClient()
    Promise.all(aiInsights.map(insight =>
      prisma.aiInsight.create({
        data: {
          id: insight.id,
          user_id: userId,
          insight_type: insight.type,
          priority: insight.priority,
          title: insight.title,
          ai_analysis: insight.ai_analysis,
          strategic_recommendations: insight.strategic_recommendations,
          immediate_actions: insight.immediate_actions,
          revenue_impact_estimate: insight.revenue_impact_estimate,
          confidence_score: insight.confidence_score,
          affected_products: insight.affected_products,
          competitors_involved: insight.competitors_involved,
          market_context: insight.market_context,
          urgency_timeline: insight.urgency_timeline,
          analysis_depth: analysisDepth,
          data_snapshot: dataContext,
          generated_at: generatedAt,
          expires_at: expiresAt
        }
      })
    )).then(() => {
      console.log(`💾 Saved ${aiInsights.length} insights to cache (expires in 15min)`)
      prisma.$disconnect()
    }).catch(err => {
      console.warn('Failed to cache insights:', err)
      prisma.$disconnect()
    })

    return NextResponse.json({
      success: true,
      analysis_depth: analysisDepth,
      ai_insights: aiInsights,
      monitoring_strategy: monitoringRecommendations,
      portfolio_assessment: portfolioAssessment,
      market_opportunities: marketOpportunities,

      // ENHANCED: Comprehensive data context
      data_context: dataContext,

      generated_at: generatedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      cached: false,
      powered_by: 'ai_advanced_competitive_intelligence'
    })

  } catch (error) {
    console.error('Advanced AI competitive intelligence error:', error)
    return NextResponse.json({
      error: 'Advanced AI competitive analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      fallback_available: true
    }, { status: 500 })
  }
}

/**
 * ADVANCED: Analyze portfolio depth and structure
 */
function analyzePortfolioDepth(userSKUs: any[], competitorData: any[]): ProductAnalysisStrategy {
  const totalProducts = userSKUs.length
  const competitiveCoverage = (competitorData.length / totalProducts) * 100
  
  // Calculate diversity metrics
  const categories = new Set(userSKUs.map(s => s.category))
  const brands = new Set(userSKUs.filter(s => s.brand && s.brand !== 'Unknown').map(s => s.brand))
  const priceRanges = {
    budget: userSKUs.filter(s => s.price < 20).length,
    mid: userSKUs.filter(s => s.price >= 20 && s.price < 50).length,
    premium: userSKUs.filter(s => s.price >= 50).length
  }
  
  const diversityScore = Math.min(100, (categories.size * 10) + (brands.size * 5) + 
    (Object.values(priceRanges).filter(count => count > 0).length * 10))
  
  let analysisDepth: 'surface' | 'standard' | 'deep' = 'standard'
  let recommendation = ''
  
  if (totalProducts < 50 && competitiveCoverage > 30) {
    analysisDepth = 'deep'
    recommendation = 'Small portfolio - deep analysis recommended'
  } else if (totalProducts > 200 || competitiveCoverage < 10) {
    analysisDepth = 'surface'
    recommendation = 'Large portfolio or low coverage - surface analysis for efficiency'
  } else {
    recommendation = 'Balanced portfolio - standard analysis appropriate'
  }
  
  return {
    total_products: totalProducts,
    competitive_coverage_percentage: Math.round(competitiveCoverage),
    diversity_score: Math.round(diversityScore),
    analysis_depth: analysisDepth,
    recommendation
  }
}

/**
 * ADVANCED: Determine competitive data expansion strategy
 */
function determineCompetitiveStrategy(
  metrics: ProductAnalysisStrategy, 
  requestedDepth: string, 
  forceRefresh: boolean
) {
  const coverage = metrics.competitive_coverage_percentage
  const totalProducts = metrics.total_products
  
  let should_expand = false
  let reason = ''
  let target_count = 0
  let max_per_product = 3
  
  if (forceRefresh) {
    should_expand = true
    reason = 'Force refresh requested'
    target_count = Math.min(25, totalProducts)
    max_per_product = 4
  } else if (coverage < 15) {
    should_expand = true
    reason = `Low competitive coverage (${coverage}%)`
    target_count = Math.min(20, Math.ceil(totalProducts * 0.2))
    max_per_product = 3
  } else if (coverage < 30 && requestedDepth === 'deep') {
    should_expand = true
    reason = 'Deep analysis requested with moderate coverage'
    target_count = Math.min(15, Math.ceil(totalProducts * 0.15))
    max_per_product = 4
  } else if (totalProducts > 100 && coverage < 25) {
    should_expand = true
    reason = 'Large portfolio needs better competitive coverage'
    target_count = 30
    max_per_product = 2
  }
  
  return {
    should_expand,
    reason,
    target_count,
    max_per_product
  }
}

/**
 * ADVANCED: Strategic product selection with diversity algorithms
 */
function selectStrategicProducts(
  allSKUs: any[], 
  existingCompetitorData: any[], 
  targetCount: number,
  analysisDepth: string
): any[] {
  // Get uncovered products
  const coveredSKUs = new Set(existingCompetitorData.map(c => c.sku))
  const uncoveredProducts = allSKUs.filter(sku => !coveredSKUs.has(sku.sku_code))
  
  if (uncoveredProducts.length === 0) {
    return []
  }
  
  const selected: any[] = []
  const usedSKUs = new Set<string>()
  
  // Strategy 1: Category diversity - select top product from each category
  const byCategory: { [key: string]: any[] } = {}
  uncoveredProducts.forEach(sku => {
    const category = sku.category || 'unknown'
    if (!byCategory[category]) byCategory[category] = []
    byCategory[category].push(sku)
  })
  
  Object.values(byCategory).forEach(categoryProducts => {
    if (selected.length >= targetCount) return
    
    const topProduct = categoryProducts
      .sort((a, b) => (b.price * (b.weekly_sales || 0)) - (a.price * (a.weekly_sales || 0)))[0]
    
    if (topProduct && !usedSKUs.has(topProduct.sku_code)) {
      selected.push(topProduct)
      usedSKUs.add(topProduct.sku_code)
    }
  })
  
  // Strategy 2: Brand diversity - major brands not yet covered
  const byBrand: { [key: string]: any[] } = {}
  uncoveredProducts
    .filter(sku => sku.brand && sku.brand !== 'Unknown' && !usedSKUs.has(sku.sku_code))
    .forEach(sku => {
      if (!byBrand[sku.brand]) byBrand[sku.brand] = []
      byBrand[sku.brand].push(sku)
    })
  
  Object.entries(byBrand)
    .sort(([, a], [, b]) => b.length - a.length) // Prioritize brands with more products
    .forEach(([brand, brandProducts]) => {
      if (selected.length >= targetCount) return
      
      const topProduct = brandProducts
        .sort((a, b) => (b.price * (b.weekly_sales || 0)) - (a.price * (a.weekly_sales || 0)))[0]
      
      if (!usedSKUs.has(topProduct.sku_code)) {
        selected.push(topProduct)
        usedSKUs.add(topProduct.sku_code)
      }
    })
  
  // Strategy 3: Revenue-based selection for remaining slots
  const remaining = uncoveredProducts
    .filter(sku => !usedSKUs.has(sku.sku_code))
    .sort((a, b) => {
      const aRevenue = a.price * (a.weekly_sales || 0)
      const bRevenue = b.price * (b.weekly_sales || 0)
      
      // For deep analysis, also consider inventory turnover
      if (analysisDepth === 'deep') {
        const aTurnover = (a.weekly_sales || 0) / Math.max(a.inventory_level || 1, 1)
        const bTurnover = (b.weekly_sales || 0) / Math.max(b.inventory_level || 1, 1)
        return (bRevenue + (bTurnover * 100)) - (aRevenue + (aTurnover * 100))
      }
      
      return bRevenue - aRevenue
    })
  
  for (const product of remaining) {
    if (selected.length >= targetCount) break
    selected.push(product)
    usedSKUs.add(product.sku_code)
  }
  
  console.log(`🎯 STRATEGIC SELECTION COMPLETE:`)
  console.log(`- Selected: ${selected.length} products`)
  console.log(`- Categories: ${new Set(selected.map(p => p.category)).size}`)
  console.log(`- Brands: ${new Set(selected.map(p => p.brand)).size}`)
  
  return selected.slice(0, targetCount)
}

/**
 * ADVANCED: Collect competitive data with enhanced error handling and retry logic
 */
async function collectCompetitiveDataAdvanced(
  targetProducts: any[], 
  userId: string, 
  maxPerProduct: number
): Promise<any[]> {
  const newCompetitorPrices: any[] = []
  const failedProducts: string[] = []
  let successCount = 0
  
  for (let i = 0; i < targetProducts.length; i++) {
    const sku = targetProducts[i]
    
    try {
      const searchTerm = `${sku.brand || ''} ${sku.subcategory || sku.category}`.trim()
      console.log(`[${i + 1}/${targetProducts.length}] Analyzing: ${searchTerm}`)
      
      // Enhanced search with retry logic
      let prices: any[] = []
      let retryCount = 0
      const maxRetries = 2
      
      while (retryCount <= maxRetries && prices.length === 0) {
        try {
          prices = await RealCompetitiveScraping.scrapeRealCompetitorPrices(
            searchTerm,
            sku.category,
            maxPerProduct,
            false
          )
          
          if (prices.length === 0 && retryCount < maxRetries) {
            // Try with simplified search term
            const simplifiedTerm = sku.brand || sku.category
            console.log(`🔄 Retry ${retryCount + 1}: Simplified search for "${simplifiedTerm}"`)
            
            prices = await RealCompetitiveScraping.scrapeRealCompetitorPrices(
              simplifiedTerm,
              sku.category,
              maxPerProduct,
              false
            )
          }
        } catch (retryError) {
          console.log(`⚠️ Retry ${retryCount + 1} failed for ${sku.sku_code}`)
        }
        
        retryCount++
      }
      
      if (prices.length > 0) {
        const competitorPricesWithContext = prices.map(price => ({
          ...price,
          sku: sku.sku_code,
          our_price: sku.price,
          price_difference: price.competitor_price - sku.price,
          price_difference_percentage: ((price.competitor_price - sku.price) / sku.price) * 100
        }))
        
        // Save to database
        await PostgreSQLService.saveCompetitorPrices(userId, competitorPricesWithContext)
        newCompetitorPrices.push(...competitorPricesWithContext)
        successCount++
        
        console.log(`✅ Found ${prices.length} competitor prices for ${sku.sku_code}`)
      } else {
        failedProducts.push(sku.sku_code)
        console.log(`❌ No competitive data found for ${sku.sku_code}`)
      }
      
      // Smart rate limiting - adjust based on success rate
      const successRate = successCount / (i + 1)
      const delay = successRate > 0.7 ? 1200 : successRate > 0.4 ? 1800 : 2500
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Stop early if we have sufficient data
      if (newCompetitorPrices.length >= 25) {
        console.log(`🎯 Sufficient competitive data collected (${newCompetitorPrices.length} prices)`)
        break
      }
      
    } catch (productError) {
      console.error(`❌ Critical error analyzing ${sku.sku_code}:`, productError)
      failedProducts.push(sku.sku_code)
      continue
    }
  }
  
  console.log(`📊 COMPETITIVE DATA COLLECTION COMPLETE:`)
  console.log(`- Success: ${successCount} products`)
  console.log(`- Failed: ${failedProducts.length} products`)
  console.log(`- Total prices: ${newCompetitorPrices.length}`)
  
  return newCompetitorPrices
}

/**
 * ENHANCED: Advanced AI intelligence with comprehensive analysis
 */
async function generateAdvancedAIIntelligence(
  competitorData: any[],
  userSKUs: any[],
  recentAnalyses: any[],
  portfolioMetrics: ProductAnalysisStrategy,
  analysisDepth: string
): Promise<AIInsight[]> {
  
  // ENHANCED: Comprehensive market analysis with advanced metrics
  const advancedMarketAnalysis = {
    portfolio_overview: {
      total_products: userSKUs.length,
      categories: [...new Set(userSKUs.map(s => s.category))],
      average_price: userSKUs.reduce((sum, s) => sum + s.price, 0) / userSKUs.length,
      price_distribution: {
        budget: userSKUs.filter(s => s.price < 20).length,
        mid_range: userSKUs.filter(s => s.price >= 20 && s.price < 50).length,
        premium: userSKUs.filter(s => s.price >= 50).length
      },
      total_inventory_value: userSKUs.reduce((sum, s) => sum + (s.price * (s.inventory_level || 0)), 0),
      velocity_analysis: {
        fast_movers: userSKUs.filter(s => (s.weekly_sales || 0) > 5).length,
        moderate_movers: userSKUs.filter(s => (s.weekly_sales || 0) > 1 && (s.weekly_sales || 0) <= 5).length,
        slow_movers: userSKUs.filter(s => (s.weekly_sales || 0) <= 1).length
      },
      brand_concentration: {
        total_brands: new Set(userSKUs.filter(s => s.brand && s.brand !== 'Unknown').map(s => s.brand)).size,
        top_brand_share: (() => {
          const brandCounts = userSKUs.reduce((acc: Record<string, number>, sku) => {
            const brand = sku.brand || 'Unknown'
            acc[brand] = (acc[brand] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          
          const counts = Object.values(brandCounts)
          const maxCount = counts.length > 0 ? Math.max(...counts) : 0
          return userSKUs.length > 0 ? Math.round((maxCount / userSKUs.length) * 100) : 0
        })()
      }
    },
    
    competitive_landscape: {
      coverage_analysis: {
        total_competitor_prices: competitorData.length,
        coverage_percentage: (competitorData.length / userSKUs.length) * 100,
        categories_covered: new Set(competitorData.map(c => {
          const sku = userSKUs.find(s => s.sku_code === c.sku)
          return sku?.category || 'unknown'
        })).size
      },
      unique_competitors: [...new Set(competitorData.map(c => c.competitor))],
      price_variance_analysis: {
        significantly_underpriced: competitorData.filter(c => c.price_difference_percentage < -20),
        moderately_underpriced: competitorData.filter(c => c.price_difference_percentage >= -20 && c.price_difference_percentage < -10),
        competitively_priced: competitorData.filter(c => Math.abs(c.price_difference_percentage) <= 10),
        moderately_overpriced: competitorData.filter(c => c.price_difference_percentage > 10 && c.price_difference_percentage <= 20),
        significantly_overpriced: competitorData.filter(c => c.price_difference_percentage > 20)
      },
      threat_assessment: {
        major_competitive_threats: competitorData.filter(c => c.price_difference_percentage > 15),
        stock_out_opportunities: competitorData.filter(c => !c.availability),
        promotional_pressure: competitorData.filter(c => c.promotional).length
      }
    },
    
    strategic_context: {
      analysis_depth: analysisDepth,
      portfolio_diversity_score: portfolioMetrics.diversity_score,
      market_position_strength: calculateMarketPositionStrength(competitorData),
      revenue_concentration: calculateRevenueConcentration(userSKUs),
      competitive_intelligence_maturity: calculateIntelligenceMaturity(competitorData, userSKUs)
    }
  }

  const enhancedPrompt = `You are the world's leading alcohol retail competitive intelligence analyst with access to advanced market data. Analyze this comprehensive portfolio and competitive landscape to provide 4-7 CRITICAL strategic insights.

COMPREHENSIVE MARKET ANALYSIS:
${JSON.stringify(advancedMarketAnalysis, null, 2)}

ANALYSIS REQUIREMENTS:
- Analysis Depth: ${analysisDepth.toUpperCase()}
- Portfolio Size: ${userSKUs.length} products
- Competitive Coverage: ${Math.round((competitorData.length / userSKUs.length) * 100)}%
- Focus on revenue impact £2000+ monthly for critical insights
- Consider both direct competitive threats and broader market opportunities
- Account for portfolio diversity and brand positioning

For each strategic insight, provide:
1. Comprehensive threat/opportunity analysis with market context
2. Specific revenue impact estimates with confidence intervals
3. Immediate tactical actions with clear timelines
4. Strategic recommendations for long-term competitive advantage
5. Risk assessment and mitigation strategies

Return as JSON array with 4-7 insights:
[
  {
    "type": "competitive_threat" | "market_opportunity" | "pricing_strategy" | "strategic_alert",
    "priority": "critical" | "high" | "medium" | "low",
    "title": "Specific actionable title with numbers",
    "ai_analysis": "Detailed strategic analysis with specific market context and competitive dynamics",
    "strategic_recommendations": ["Long-term strategic recommendation 1", "Strategic recommendation 2"],
    "immediate_actions": ["Action 1 with specific timeline and target", "Action 2 with measurable outcome"],
    "revenue_impact_estimate": 8500,
    "confidence_score": 0.85,
    "affected_products": ["Product1", "Product2"],
    "competitors_involved": ["Competitor1", "Competitor2"],
    "market_context": "Detailed explanation of market conditions and competitive dynamics",
    "urgency_timeline": "Within 48 hours" | "Within 1 week" | "Within 2 weeks"
  }
]

Prioritize insights that address:
1. Significant pricing misalignments (>£1000 monthly impact)
2. Market opportunities with low competitive coverage
3. Category-level strategic positioning
4. Competitive threats to high-value products
5. Portfolio optimization opportunities`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 6000,
      temperature: 0, // Deterministic for consistent insights
      messages: [{ role: 'user', content: enhancedPrompt }]
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    
    if (jsonMatch) {
      const rawInsights = JSON.parse(jsonMatch[0])
      
      return rawInsights.map((insight: any, index: number) => ({
        id: `ai-insight-${Date.now()}-${index}`,
        type: insight.type || 'strategic_alert',
        priority: insight.priority || 'medium',
        title: insight.title || `Strategic Insight ${index + 1}`,
        ai_analysis: insight.ai_analysis || '',
        strategic_recommendations: insight.strategic_recommendations || [],
        immediate_actions: insight.immediate_actions || [],
        revenue_impact_estimate: insight.revenue_impact_estimate || 0,
        confidence_score: insight.confidence_score || 0.8,
        affected_products: insight.affected_products || [],
        competitors_involved: insight.competitors_involved || [],
        market_context: insight.market_context || '',
        urgency_timeline: insight.urgency_timeline || 'Within 1 week',
        timestamp: new Date()
      }))
    }

  } catch (error) {
    console.error('Advanced AI competitive analysis failed:', error)
  }

  // Enhanced fallback insights
  return generateAdvancedFallbackInsights(competitorData, userSKUs, portfolioMetrics)
}

/**
 * ENHANCED: Advanced monitoring strategy with AI-driven prioritization
 */
async function generateAdvancedMonitoringStrategy(
  userSKUs: any[],
  competitorData: any[],
  insights: AIInsight[]
): Promise<any> {
  
  const enhancedPrompt = `As an alcohol retail competitive intelligence expert, create an advanced monitoring strategy for this portfolio:

PORTFOLIO METRICS:
- Total Products: ${userSKUs.length}
- Current Competitive Coverage: ${competitorData.length} prices tracked
- Strategic Insights Generated: ${insights.length}
- High-Priority Alerts: ${insights.filter(i => i.priority === 'critical' || i.priority === 'high').length}

STRATEGIC REQUIREMENTS:
1. Identify the 15 highest-priority products for intensive monitoring
2. Recommend competitor prioritization strategy
3. Define monitoring frequency based on business impact
4. Set intelligent alert thresholds for different product categories
5. Suggest automation opportunities

Consider:
- Revenue impact potential
- Competitive vulnerability
- Market volatility
- Seasonal factors
- Alert fatigue prevention

Provide specific recommendations with £ thresholds, timing intervals, and automation rules.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0, // Deterministic for consistent results
      messages: [{ role: 'user', content: enhancedPrompt }]
    })

    const analysis = response.content[0].type === 'text' ? response.content[0].text : ''
    
    // Enhanced product prioritization
    const prioritizedProducts = userSKUs
      .map(sku => {
        const competitiveRisk = competitorData.filter(c => c.sku === sku.sku_code).length
        const revenueImpact = sku.price * (sku.weekly_sales || 0)
        const insightMentions = insights.filter(i => i.affected_products.includes(sku.sku_code)).length
        
        return {
          ...sku,
          priority_score: revenueImpact + (competitiveRisk * 500) + (insightMentions * 1000)
        }
      })
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 15)
    
    return {
      ai_strategy: analysis,
      priority_products: prioritizedProducts.map(p => ({
        sku: p.sku_code,
        priority_score: Math.round(p.priority_score),
        monitoring_frequency: p.priority_score > 5000 ? 'every_4_hours' : p.priority_score > 2000 ? 'daily' : 'weekly'
      })),
      competitor_priorities: [...new Set(competitorData.map(c => c.competitor))]
        .map(competitor => ({
          competitor,
          price_count: competitorData.filter(c => c.competitor === competitor).length,
          priority: competitorData.filter(c => c.competitor === competitor).length > 3 ? 'high' : 'medium'
        }))
        .sort((a, b) => b.price_count - a.price_count),
      
      alert_thresholds: {
        critical_price_change: 15,
        medium_price_change: 8,
        stock_alert: true,
        new_competitor_threshold: 2,
        price_volatility_threshold: 25
      },
      
      automation_recommendations: {
        auto_price_alerts: true,
        competitor_stock_monitoring: true,
        market_share_tracking: true,
        seasonal_adjustment_alerts: true
      }
    }

  } catch (error) {
    console.error('Advanced monitoring strategy failed:', error)
    return {
      ai_strategy: 'Monitor high-value, competitively vulnerable products more frequently',
      priority_products: userSKUs.slice(0, 15).map(s => ({ sku: s.sku_code, priority_score: 1000 })),
      recommended_frequency: 'Daily for top 15, weekly for others',
      alert_thresholds: { critical_price_change: 10 }
    }
  }
}

/**
 * ENHANCED: Advanced portfolio assessment with comprehensive health metrics
 */
async function generateAdvancedPortfolioAssessment(
  userSKUs: any[],
  competitorData: any[],
  insights: AIInsight[],
  portfolioMetrics: ProductAnalysisStrategy
): Promise<any> {
  
  const comprehensiveMetrics = {
    portfolio_structure: {
      total_products: userSKUs.length,
      diversity_score: portfolioMetrics.diversity_score,
      competitive_coverage: Math.round((competitorData.length / userSKUs.length) * 100),
      brand_concentration_risk: calculateBrandConcentration(userSKUs)
    },
    
    competitive_health: {
      critical_insights: insights.filter(i => i.priority === 'critical').length,
      high_priority_insights: insights.filter(i => i.priority === 'high').length,
      total_revenue_impact: insights.reduce((sum, i) => sum + Math.abs(i.revenue_impact_estimate), 0),
      competitive_threats: insights.filter(i => i.type === 'competitive_threat').length,
      market_opportunities: insights.filter(i => i.type === 'market_opportunity').length
    },
    
    pricing_analysis: {
      overpriced_products: competitorData.filter(c => c.price_difference_percentage > 15).length,
      underpriced_products: competitorData.filter(c => c.price_difference_percentage < -15).length,
      competitively_priced: competitorData.filter(c => Math.abs(c.price_difference_percentage) <= 15).length,
      pricing_volatility: calculatePricingVolatility(competitorData)
    },
    
    operational_metrics: {
      inventory_efficiency: calculateInventoryEfficiency(userSKUs),
      sales_velocity_distribution: calculateVelocityDistribution(userSKUs),
      category_performance: calculateCategoryPerformance(userSKUs)
    }
  }

  const advancedPrompt = `Provide a comprehensive executive assessment of this alcohol retail portfolio's competitive health:

COMPREHENSIVE PORTFOLIO METRICS:
${JSON.stringify(comprehensiveMetrics, null, 2)}

ASSESSMENT REQUIREMENTS:
1. Overall competitive health score (1-10) with detailed justification
2. Top 3 immediate strategic threats with revenue impact
3. Top 3 market opportunities with growth potential
4. Executive summary with specific actionable recommendations
5. Risk assessment and mitigation priorities
6. Strategic roadmap recommendations

Focus on:
- Competitive positioning strength
- Portfolio optimization opportunities
- Revenue protection and growth strategies
- Operational efficiency improvements
- Risk mitigation priorities

Provide direct, actionable insights for C-level decision making.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0, // Deterministic for consistent results
      messages: [{ role: 'user', content: advancedPrompt }]
    })

    const assessment = response.content[0].type === 'text' ? response.content[0].text : ''
    
    return {
      health_score: calculateAdvancedHealthScore(comprehensiveMetrics),
      ai_assessment: assessment,
      metrics: comprehensiveMetrics,
      strategic_priorities: {
        immediate_actions: insights.filter(i => i.priority === 'critical').length,
        medium_term_opportunities: insights.filter(i => i.type === 'market_opportunity').length,
        competitive_threats: insights.filter(i => i.type === 'competitive_threat').length
      },
      generated_at: new Date().toISOString()
    }

  } catch (error) {
    console.error('Advanced portfolio assessment failed:', error)
    return {
      health_score: 7,
      ai_assessment: 'Advanced portfolio analysis requires AI integration',
      metrics: comprehensiveMetrics
    }
  }
}

/**
 * ADVANCED: Market opportunity detection
 */
async function detectMarketOpportunities(
  userSKUs: any[],
  competitorData: any[],
  insights: AIInsight[]
): Promise<any[]> {
  
  const opportunities: any[] = []
  
  // Gap analysis - categories with low competitive coverage
  const categoryAnalysis = userSKUs.reduce((acc: any, sku) => {
    const category = sku.category || 'unknown'
    if (!acc[category]) {
      acc[category] = { total: 0, covered: 0, revenue: 0 }
    }
    acc[category].total++
    acc[category].revenue += sku.price * (sku.weekly_sales || 0)
    
    if (competitorData.some(c => c.sku === sku.sku_code)) {
      acc[category].covered++
    }
    
    return acc
  }, {})
  
  Object.entries(categoryAnalysis).forEach(([category, data]: [string, any]) => {
    const coverage = (data.covered / data.total) * 100
    if (coverage < 30 && data.revenue > 1000) {
      opportunities.push({
        type: 'competitive_intelligence_gap',
        category,
        opportunity: `${category} category under-monitored`,
        coverage_percentage: Math.round(coverage),
        revenue_at_stake: Math.round(data.revenue),
        recommended_action: 'Expand competitive monitoring'
      })
    }
  })
  
  // Price opportunity analysis
  const underPricedProducts = competitorData
    .filter(c => c.price_difference_percentage < -15)
    .map(c => {
      const sku = userSKUs.find(s => s.sku_code === c.sku)
      return {
        type: 'pricing_opportunity',
        sku: c.sku,
        current_price: c.our_price,
        market_price: c.competitor_price,
        opportunity_value: Math.abs(c.price_difference) * (sku?.weekly_sales || 0) * 52,
        recommended_action: 'Consider strategic price increase'
      }
    })
    .sort((a, b) => b.opportunity_value - a.opportunity_value)
    .slice(0, 5)
  
  opportunities.push(...underPricedProducts)
  
  return opportunities
}

/**
 * HELPER FUNCTIONS for advanced calculations
 */

function calculateMarketPositionStrength(competitorData: any[]): number {
  if (competitorData.length === 0) return 50
  
  const competitivelyPriced = competitorData.filter(c => Math.abs(c.price_difference_percentage) <= 10).length
  const underpriced = competitorData.filter(c => c.price_difference_percentage < -10).length
  
  return Math.round(((competitivelyPriced + underpriced) / competitorData.length) * 100)
}

function calculateRevenueConcentration(userSKUs: any[]): number {
  const revenues = userSKUs.map(sku => sku.price * (sku.weekly_sales || 0)).sort((a, b) => b - a)
  const totalRevenue = revenues.reduce((sum, rev) => sum + rev, 0)
  const top20PercentRevenue = revenues.slice(0, Math.ceil(revenues.length * 0.2)).reduce((sum, rev) => sum + rev, 0)
  
  return totalRevenue > 0 ? Math.round((top20PercentRevenue / totalRevenue) * 100) : 0
}

function calculateIntelligenceMaturity(competitorData: any[], userSKUs: any[]): number {
  const coverage = (competitorData.length / userSKUs.length) * 100
  const competitorDiversity = new Set(competitorData.map(c => c.competitor)).size
  const dataFreshness = competitorData.filter(c => 
    new Date(c.last_updated || 0) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length / competitorData.length * 100
  
  return Math.round((coverage * 0.4) + (Math.min(competitorDiversity * 10, 50) * 0.3) + (dataFreshness * 0.3))
}

function calculateBrandConcentration(userSKUs: any[]): number {
  const brandCounts = userSKUs.reduce((acc: Record<string, number>, sku) => {
    const brand = sku.brand || 'Unknown'
    acc[brand] = (acc[brand] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const counts = Object.values(brandCounts)
  const maxBrandCount = counts.length > 0 ? Math.max(...counts) : 0
  return userSKUs.length > 0 ? Math.round((maxBrandCount / userSKUs.length) * 100) : 0
}

function calculatePricingVolatility(competitorData: any[]): number {
  if (competitorData.length === 0) return 0
  
  const percentageChanges = competitorData.map(c => Math.abs(c.price_difference_percentage))
  const avgVolatility = percentageChanges.reduce((sum, change) => sum + change, 0) / percentageChanges.length
  
  return Math.round(avgVolatility)
}

function calculateInventoryEfficiency(userSKUs: any[]): number {
  const withInventory = userSKUs.filter(sku => sku.inventory_level && sku.weekly_sales)
  if (withInventory.length === 0) return 50
  
  const turnoverRates = withInventory.map(sku => 
    Math.min((sku.weekly_sales * 52) / sku.inventory_level, 10)
  )
  const avgTurnover = turnoverRates.reduce((sum, rate) => sum + rate, 0) / turnoverRates.length
  
  return Math.round(avgTurnover * 10)
}

function calculateVelocityDistribution(userSKUs: any[]): any {
  return {
    fast: userSKUs.filter(s => (s.weekly_sales || 0) > 5).length,
    medium: userSKUs.filter(s => (s.weekly_sales || 0) > 1 && (s.weekly_sales || 0) <= 5).length,
    slow: userSKUs.filter(s => (s.weekly_sales || 0) <= 1).length
  }
}

function calculateCategoryPerformance(userSKUs: any[]): any {
  const categoryMetrics = userSKUs.reduce((acc: any, sku) => {
    const category = sku.category || 'unknown'
    if (!acc[category]) {
      acc[category] = { count: 0, revenue: 0, avgPrice: 0 }
    }
    acc[category].count++
    acc[category].revenue += sku.price * (sku.weekly_sales || 0)
    return acc
  }, {})
  
  Object.keys(categoryMetrics).forEach(category => {
    categoryMetrics[category].avgPrice = categoryMetrics[category].revenue / categoryMetrics[category].count
  })
  
  return categoryMetrics
}

function calculateAdvancedHealthScore(metrics: any): number {
  let score = 10
  
  // Coverage penalty
  if (metrics.portfolio_structure.competitive_coverage < 20) score -= 3
  else if (metrics.portfolio_structure.competitive_coverage < 40) score -= 1
  
  // Critical insights penalty
  if (metrics.competitive_health.critical_insights > 3) score -= 2
  else if (metrics.competitive_health.critical_insights > 1) score -= 1
  
  // Pricing issues penalty
  const totalPriced = metrics.pricing_analysis.overpriced_products + 
                     metrics.pricing_analysis.underpriced_products + 
                     metrics.pricing_analysis.competitively_priced
  
  if (totalPriced > 0) {
    const issueRate = (metrics.pricing_analysis.overpriced_products + metrics.pricing_analysis.underpriced_products) / totalPriced
    if (issueRate > 0.4) score -= 2
    else if (issueRate > 0.2) score -= 1
  }
  
  // Brand concentration risk
  if (metrics.portfolio_structure.brand_concentration_risk > 60) score -= 1
  
  return Math.max(1, Math.min(10, Math.round(score)))
}

/**
 * ENHANCED: Advanced fallback insights with comprehensive analysis
 */
function generateAdvancedFallbackInsights(
  competitorData: any[], 
  userSKUs: any[], 
  portfolioMetrics: ProductAnalysisStrategy
): AIInsight[] {
  const insights: AIInsight[] = []
  
  // Advanced overpricing analysis
  const overpriced = competitorData.filter(c => c.price_difference_percentage > 20)
  if (overpriced.length > 0) {
    const revenueAtRisk = overpriced.reduce((sum, c) => {
      const sku = userSKUs.find(s => s.sku_code === c.sku)
      return sum + (sku ? sku.price * (sku.weekly_sales || 0) * 52 * 0.15 : 0) // 15% revenue risk
    }, 0)
    
    insights.push({
      id: `advanced-overpriced-${Date.now()}`,
      type: 'competitive_threat',
      priority: 'critical',
      title: `${overpriced.length} Products Critically Overpriced - £${Math.round(revenueAtRisk).toLocaleString()} Annual Risk`,
      ai_analysis: `Critical pricing misalignment detected across ${overpriced.length} products with average overprice of ${Math.round(overpriced.reduce((sum, c) => sum + c.price_difference_percentage, 0) / overpriced.length)}%. This represents significant competitive vulnerability with estimated annual revenue risk of £${Math.round(revenueAtRisk).toLocaleString()}.`,
      strategic_recommendations: [
        'Implement dynamic pricing strategy for competitive products',
        'Establish competitor price monitoring for vulnerable SKUs',
        'Review supplier terms for cost reduction opportunities'
      ],
      immediate_actions: [
        'Review and adjust pricing for top 5 overpriced products within 48 hours',
        'Set up automated competitor price alerts for all affected products',
        'Contact suppliers for cost negotiation on highest-impact products'
      ],
      revenue_impact_estimate: Math.round(revenueAtRisk),
      confidence_score: 0.9,
      affected_products: overpriced.slice(0, 5).map(c => c.sku),
      competitors_involved: [...new Set(overpriced.map(c => c.competitor))],
      market_context: 'Multiple competitors consistently offering lower prices indicates systematic pricing misalignment',
      urgency_timeline: 'Within 48 hours',
      timestamp: new Date()
    })
  }
  
  // Portfolio coverage opportunity
  if (portfolioMetrics.competitive_coverage_percentage < 25) {
    insights.push({
      id: `coverage-opportunity-${Date.now()}`,
      type: 'market_opportunity',
      priority: 'high',
      title: `Competitive Intelligence Gap - Only ${portfolioMetrics.competitive_coverage_percentage}% Coverage`,
      ai_analysis: `Significant competitive intelligence gap identified. Current monitoring covers only ${portfolioMetrics.competitive_coverage_percentage}% of ${userSKUs.length} product portfolio, leaving potential revenue optimization opportunities undetected.`,
      strategic_recommendations: [
        'Expand competitive monitoring to cover top 50% of revenue-generating products',
        'Implement automated competitor price tracking',
        'Establish category-based monitoring priorities'
      ],
      immediate_actions: [
        'Select top 20 revenue products for immediate competitive analysis',
        'Set up monitoring for major competitors in each category',
        'Schedule weekly competitive intelligence reviews'
      ],
      revenue_impact_estimate: 5000,
      confidence_score: 0.8,
      affected_products: userSKUs.slice(0, 10).map(s => s.sku_code),
      competitors_involved: [],
      market_context: `Large portfolio with limited competitive oversight creates blind spots in pricing strategy`,
      urgency_timeline: 'Within 2 weeks',
      timestamp: new Date()
    })
  }
  
  return insights
}