// src/app/api/monitoring/route.ts
// Enhanced monitoring with AI product prioritization

import { NextRequest, NextResponse } from 'next/server'
import { RealCompetitiveScraping } from '@/lib/real-competitive-scraping'
import { PostgreSQLService } from '@/lib/database-postgres'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

interface MonitoringRequest {
  userId: string
  products?: {
    sku: string
    product: string
    category: string
    currentPrice: number
  }[]
  intervalMinutes?: number
  maxRetailersPerCheck?: number
  maxProductsToMonitor?: number
  useAIOptimization?: boolean
}

// Start monitoring for a user's products
export async function POST(request: NextRequest) {
  try {
    const { 
      userId, 
      products, 
      intervalMinutes = 240, // 4 hours default (more reasonable)
      maxRetailersPerCheck = 3,
      maxProductsToMonitor = 15, // Reasonable limit
      useAIOptimization = true
    }: MonitoringRequest = await request.json()
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID required' 
      }, { status: 400 })
    }

    console.log(`🎯 Starting INTELLIGENT monitoring for user ${userId}`)
    
    let productsToMonitor: any[] = []
    
    // If specific products provided, use those
    if (products && products.length > 0) {
      productsToMonitor = products.slice(0, maxProductsToMonitor)
      console.log(`Using provided products: ${productsToMonitor.length}`)
    } else {
      // INTELLIGENT PRODUCT SELECTION: Get all user's inventory
      console.log(`🧠 Using AI to select priority products from full inventory`)
      const allUserSKUs = await PostgreSQLService.getUserSKUs(userId)
      
      if (allUserSKUs.length === 0) {
        return NextResponse.json({
          error: 'No inventory found',
          message: 'Upload inventory CSV to enable competitive monitoring'
        }, { status: 400 })
      }
      
      console.log(`Found ${allUserSKUs.length} total SKUs in inventory`)
      
      if (useAIOptimization && process.env.ANTHROPIC_API_KEY) {
        // Use AI to intelligently select priority products
        productsToMonitor = await selectPriorityProductsWithAI(
          allUserSKUs, 
          maxProductsToMonitor,
          userId
        )
      } else {
        // Fallback: Basic prioritization by revenue impact
        productsToMonitor = selectPriorityProductsBasic(allUserSKUs, maxProductsToMonitor)
      }
    }
    
    if (productsToMonitor.length === 0) {
      return NextResponse.json({
        error: 'No suitable products found for monitoring',
        message: 'Products need price and sales data for competitive monitoring'
      }, { status: 400 })
    }
    
    console.log(`📊 Selected ${productsToMonitor.length} priority products for monitoring`)

    // Note: Real-time monitoring is disabled for production stability
    // TODO: Implement proper background job system for real-time monitoring
    // await RealCompetitiveScraping.startRealTimeMonitoring(...)

    console.log(`⚠️ Real-time monitoring is currently disabled`)

    // Save monitoring configuration to database with priority products
    await PostgreSQLService.saveMonitoringConfig(userId, {
      products: productsToMonitor.map(p => p.sku || p.sku_code),
      intervalMinutes,
      maxRetailersPerCheck,
      startedAt: new Date(),
      isActive: true,
      priorityProducts: productsToMonitor, // Store the prioritized products
      selectionMethod: useAIOptimization ? 'claude_ai' : 'basic_revenue',
      totalInventorySize: (await PostgreSQLService.getUserSKUs(userId)).length
    })

    // Calculate estimated costs
    const dailyChecks = (24 * 60) / intervalMinutes
    const estimatedMonthlyCost = productsToMonitor.length * dailyChecks * 30 * 0.01 // Rough SERP API cost

    return NextResponse.json({
      success: true,
      message: `Intelligent monitoring started for ${productsToMonitor.length} priority products`,
      
      selection_details: {
        total_inventory_products: (await PostgreSQLService.getUserSKUs(userId)).length,
        selected_for_monitoring: productsToMonitor.length,
        selection_method: useAIOptimization ? 'Claude AI Optimization' : 'Basic Revenue Ranking',
        priority_products: productsToMonitor.slice(0, 5).map(p => ({
          sku: p.sku || p.sku_code,
          product: p.product_name || p.product || 'Unknown',
          category: p.category,
          revenue_priority_score: p.revenue_priority_score || (p.price * (p.weekly_sales || 0))
        }))
      },
      
      config: {
        productsCount: productsToMonitor.length,
        intervalMinutes,
        maxRetailersPerCheck,
        totalRetailersAvailable: 17,
        estimatedMonthlyCost: `$${estimatedMonthlyCost.toFixed(2)}`
      },
      
      startedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Enhanced monitoring start error:', error)
    return NextResponse.json({
      error: 'Failed to start intelligent monitoring',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * CLAUDE AI INTELLIGENT PRODUCT SELECTION
 * Analyzes entire inventory and selects most strategically important products
 */
async function selectPriorityProductsWithAI(
  allSKUs: any[], 
  maxProducts: number,
  userId: string
): Promise<any[]> {
  
  try {
    console.log(`🧠 Claude AI analyzing ${allSKUs.length} products for strategic monitoring`)
    
    // Prepare portfolio analysis for Claude
    const portfolioAnalysis = {
      total_products: allSKUs.length,
      categories: [...new Set(allSKUs.map(s => s.category))],
      
      // Revenue analysis
      revenue_metrics: {
        total_inventory_value: allSKUs.reduce((sum, s) => sum + (s.price * s.inventory_level), 0),
        avg_price: allSKUs.reduce((sum, s) => sum + s.price, 0) / allSKUs.length,
        high_value_products: allSKUs.filter(s => s.price > 50).length,
        fast_movers: allSKUs.filter(s => s.weekly_sales > 3).length
      },
      
      // Product samples for Claude to analyze
      sample_products: allSKUs
        .sort((a, b) => (b.price * (b.weekly_sales || 0)) - (a.price * (a.weekly_sales || 0)))
        .slice(0, 25) // Top 25 by revenue for Claude to analyze
        .map(sku => ({
          sku: sku.sku_code,
          product_name: sku.product_name || 'Unknown',
          brand: sku.brand || 'Unknown',
          category: sku.category,
          price: sku.price,
          weekly_sales: sku.weekly_sales || 0,
          inventory_level: sku.inventory_level || 0,
          revenue_impact: sku.price * (sku.weekly_sales || 0),
          weeks_of_stock: (sku.weekly_sales || 0) > 0 ? (sku.inventory_level || 0) / (sku.weekly_sales || 0) : 999
        }))
    }
    
    const prompt = `You are an expert alcohol retail competitive intelligence strategist. Analyze this inventory and select the ${maxProducts} MOST STRATEGIC products for competitive price monitoring.

PORTFOLIO ANALYSIS:
${JSON.stringify(portfolioAnalysis, null, 2)}

SELECTION CRITERIA (in priority order):
1. High revenue impact (price × weekly_sales)
2. Competitive vulnerability (premium products competitors might undercut)
3. Fast-moving products where price changes matter most
4. Seasonal relevance (products approaching peak seasons)
5. Brand recognition (products likely found at competitors)

Select ${maxProducts} products and provide strategic reasoning for each selection.

Return as JSON array:
[
  {
    "sku": "PRODUCT-SKU-001",
    "strategic_priority": "critical",
    "selection_reasoning": "High revenue impact (£X/week) + premium positioning vulnerable to competitor undercutting",
    "revenue_impact": 500,
    "competitive_risk_level": "high",
    "monitoring_urgency": "immediate"
  }
]

Focus on products where competitive intelligence will have the highest business impact. Be specific about WHY each product was selected.`

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 3000,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    
    if (jsonMatch) {
      const claudeSelections = JSON.parse(jsonMatch[0])
      
      // Map Claude's selections back to actual SKU data
      const prioritizedProducts = claudeSelections
        .map((selection: any) => {
          const matchingSKU = allSKUs.find(sku => 
            sku.sku_code === selection.sku || 
            sku.product_name?.includes(selection.sku) ||
            sku.brand?.includes(selection.sku)
          )
          
          if (matchingSKU) {
            return {
              ...matchingSKU,
              claude_priority: selection.strategic_priority,
              claude_reasoning: selection.selection_reasoning,
              revenue_priority_score: selection.revenue_impact,
              competitive_risk: selection.competitive_risk_level,
              monitoring_urgency: selection.monitoring_urgency,
              product: `${matchingSKU.brand || ''} ${matchingSKU.subcategory || matchingSKU.category}`.trim()
            }
          }
          return null
        })
        .filter(Boolean)
        .slice(0, maxProducts)
      
      console.log(`✅ Claude selected ${prioritizedProducts.length} strategic products`)
      return prioritizedProducts
      
    } else {
      throw new Error('Failed to parse Claude AI product selection')
    }
    
  } catch (error) {
    console.error('❌ Claude product selection failed:', error)
    
    // Fallback to basic selection
    console.log('🔄 Falling back to basic product selection')
    return selectPriorityProductsBasic(allSKUs, maxProducts)
  }
}

/**
 * BASIC PRODUCT PRIORITIZATION (fallback when Claude unavailable)
 */
function selectPriorityProductsBasic(allSKUs: any[], maxProducts: number): any[] {
  return allSKUs
    .filter(sku => sku.price > 0 && sku.weekly_sales > 0) // Must have price and sales data
    .map(sku => ({
      ...sku,
      revenue_priority_score: sku.price * sku.weekly_sales,
      product: `${sku.brand || ''} ${sku.subcategory || sku.category}`.trim()
    }))
    .sort((a, b) => b.revenue_priority_score - a.revenue_priority_score) // Sort by revenue impact
    .slice(0, maxProducts)
}

// Get monitoring status (enhanced)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID required' 
      }, { status: 400 })
    }

    const [dbConfig, totalSKUs] = await Promise.all([
      PostgreSQLService.getMonitoringConfig(userId),
      PostgreSQLService.getUserSKUs(userId).then(skus => skus.length)
    ])

    return NextResponse.json({
      success: true,
      status: {
        isActive: false, // Real-time monitoring disabled
        activeProducts: 0,
        totalRetailers: 0,
        lastCheck: new Date().toISOString(),
        
        // Enhanced status information
        portfolio_coverage: {
          total_inventory_products: totalSKUs,
          products_being_monitored: dbConfig?.products?.length || 0,
          coverage_percentage: totalSKUs > 0 ? Math.round((dbConfig?.products?.length || 0) / totalSKUs * 100) : 0,
          selection_method: dbConfig?.selectionMethod || 'unknown'
        },
        
        config: dbConfig
      }
    })

  } catch (error) {
    console.error('Enhanced monitoring status error:', error)
    return NextResponse.json({
      error: 'Failed to get monitoring status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Stop monitoring (same as before)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID required' 
      }, { status: 400 })
    }

    // Stop the monitoring
    // Note: Real-time monitoring is disabled for production stability
    // RealCompetitiveScraping.stopRealTimeMonitoring()
    console.log(`⚠️ Real-time monitoring stop disabled`)

    // Update database
    await PostgreSQLService.updateMonitoringConfig(userId, { isActive: false })

    return NextResponse.json({
      success: true,
      message: 'Intelligent monitoring stopped'
    })

  } catch (error) {
    console.error('Enhanced monitoring stop error:', error)
    return NextResponse.json({
      error: 'Failed to stop monitoring',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}