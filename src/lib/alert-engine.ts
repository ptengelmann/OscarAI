// src/lib/alert-engine.ts WITH THIS VERSION
// This fixes the export names and integrates with your smart_alerts table

import Anthropic from '@anthropic-ai/sdk'
import { PostgreSQLService } from './database-postgres'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface Alert {
  id: string
  rule_id: string
  sku: string
  category: string
  type: 'stockout' | 'overstock' | 'price_opportunity' | 'competitor_threat' | 'seasonal_prep' | 'demand_spike' | 'compliance' | 'expiration_risk'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  action_required: string
  impact: {
    revenue_at_risk?: number
    profit_opportunity?: number
    time_to_critical: number
    urgency: number // 1-10 scale
  }
  data: {
    current_stock: number
    predicted_demand: number
    weeks_of_stock: number
    confidence: number
    trend: 'increasing' | 'decreasing' | 'stable' | 'seasonal_increasing'
  }
  alcohol_context?: {
    abv?: number
    shelf_life_days?: number
    seasonal_peak?: string
    compliance_notes?: string[]
  }
  ai_recommendation?: {
    ai_analysis: string
    strategic_options: string[]
    risk_assessment: string
    implementation_priority: 'immediate' | 'urgent' | 'planned'
  }
  created_at: Date | string
  acknowledged: boolean
  resolved: boolean
  delivered_via: string[]
  metadata: Record<string, any>
}

export interface SmartAlert {
  id: string
  analysis_id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  recommendation: {
    ai_analysis: string
    strategic_options: string[]
    immediate_actions: string[]
    risk_level: string
    confidence_score: number
  }
  auto_generated: boolean
  requires_human: boolean
  escalation_path?: {
    conditions: string[]
    escalate_to: string
    timeline: string
  }
  acknowledged: boolean
  resolved: boolean
  auto_resolved: boolean
  created_at: Date
  resolved_at?: Date
}

// FIXED: Export both class names for compatibility
export class AlertEngine {
  
  /**
   * Generate real alcohol context for portfolio-level smart alerts
   */
  static generatePortfolioAlcoholContext(skuData: any[]): {
    seasonal_peak: string
    compliance_notes: string[]
    category_risk: string
  } {
    const categories = skuData.reduce((acc, sku) => {
      const category = sku.category || 'unknown'
      acc[category] = ((acc[category] as number) || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const totalSkus = skuData.length
    const categoryBreakdown = Object.entries(categories)
      .map(([cat, count]) => ({ category: cat, percentage: ((count as number) / totalSkus) * 100 }))
      .sort((a, b) => b.percentage - a.percentage)
    
    // Determine dominant seasonal peak based on portfolio composition
    let seasonalPeak = 'Year-round demand'
    const spiritsPercentage = categoryBreakdown.find(c => c.category === 'spirits')?.percentage || 0
    const beerPercentage = categoryBreakdown.find(c => c.category === 'beer')?.percentage || 0
    const winePercentage = categoryBreakdown.find(c => c.category === 'wine')?.percentage || 0
    
    if (spiritsPercentage > 40 && winePercentage > 20) {
      seasonalPeak = 'Holiday season (Nov-Jan) - Spirit & wine focused portfolio'
    } else if (spiritsPercentage > 50) {
      seasonalPeak = 'Holiday season (Nov-Jan) - Premium spirits portfolio'
    } else if (beerPercentage > 40) {
      seasonalPeak = 'Summer season (May-Aug) - Beer-focused portfolio'
    } else if (winePercentage > 40) {
      seasonalPeak = 'Holiday season (Oct-Jan) - Wine-focused portfolio'
    } else {
      seasonalPeak = `Mixed portfolio: ${categoryBreakdown.slice(0, 2).map(c => `${Math.round(c.percentage)}% ${c.category}`).join(', ')}`
    }
    
    // Generate real compliance notes based on portfolio composition
    const complianceNotes: string[] = []
    
    if (spiritsPercentage > 30) {
      complianceNotes.push('Premium spirits licensing required')
      complianceNotes.push('Age verification critical for spirits sales')
    }
    
    if (spiritsPercentage > 20 || winePercentage > 20) {
      complianceNotes.push('Import duty considerations for premium products')
    }
    
    // Check for high-ABV products
    const highAbvCount = skuData.filter(sku => parseFloat(sku.abv) > 40).length
    if (highAbvCount > totalSkus * 0.3) {
      complianceNotes.push(`High-proof spirits handling (${Math.round((highAbvCount/totalSkus)*100)}% of portfolio)`)
    }
    
    // Check for international products
    const internationalCount = skuData.filter(sku => 
      sku.origin_country && sku.origin_country !== 'UK'
    ).length
    if (internationalCount > totalSkus * 0.2) {
      complianceNotes.push(`International product compliance (${Math.round((internationalCount/totalSkus)*100)}% imported)`)
    }
    
    if (complianceNotes.length === 0) {
      complianceNotes.push('Standard UK alcohol retail compliance')
    }
    
    // Determine portfolio risk level
    const criticalStockCount = skuData.filter(sku => {
      const weeklySales = parseFloat(sku.weekly_sales) || 0
      const inventoryLevel = parseInt(sku.inventory_level) || 0
      return weeklySales > 0 && (inventoryLevel / weeklySales) < 2
    }).length
    
    let categoryRisk = 'low'
    const criticalPercentage = (criticalStockCount / totalSkus) * 100
    
    if (criticalPercentage > 30) categoryRisk = 'critical'
    else if (criticalPercentage > 15) categoryRisk = 'high'
    else if (criticalPercentage > 5) categoryRisk = 'medium'
    
    return {
      seasonal_peak: seasonalPeak,
      compliance_notes: complianceNotes,
      category_risk: categoryRisk
    }
  }
  
  /**
   * Generate alerts from analysis data - MAIN ENTRY POINT
   */
  static generateAlertsFromAnalysis(
    skuData: any[],
    demandForecasts: any[],
    competitorData: any[]
  ): Alert[] {
    console.log(`🚨 Generating alerts from ${skuData.length} SKUs`)
    
    const alerts: Alert[] = []
    
    skuData.forEach(sku => {
      const price = parseFloat(sku.price) || 0
      const weeklySales = parseFloat(sku.weekly_sales) || 0
      const inventoryLevel = parseInt(sku.inventory_level) || 0
      const weeksOfStock = weeklySales > 0 ? inventoryLevel / weeklySales : 999
      
      // Critical stockout alert
      if (weeksOfStock < 1 && weeklySales > 0) {
        alerts.push(this.createStockoutAlert(sku, weeksOfStock, 'critical'))
      }
      // High stockout alert  
      else if (weeksOfStock < 2 && weeklySales > 1) {
        alerts.push(this.createStockoutAlert(sku, weeksOfStock, 'high'))
      }
      // Medium stockout alert
      else if (weeksOfStock < 4 && weeklySales > 0.5) {
        alerts.push(this.createStockoutAlert(sku, weeksOfStock, 'medium'))
      }
      
      // Overstock alert
      if (weeksOfStock > 12 && inventoryLevel > 50) {
        alerts.push(this.createOverstockAlert(sku, weeksOfStock))
      }
      
      // Price opportunity
      if (price > 40 && weeklySales > 2) {
        alerts.push(this.createPriceOpportunityAlert(sku, price, weeklySales))
      }
    })
    
    return alerts.sort((a, b) => b.impact.urgency - a.impact.urgency)
  }

  /**
   * MAIN INTELLIGENT ALERT GENERATION with AI AI
   */
  static async generateIntelligentAlerts(
    skuData: any[],
    analysisId: string,
    userEmail: string
  ): Promise<{ alerts: Alert[], smart_alerts: SmartAlert[] }> {
    console.log(`🧠 Generating intelligent alerts with AI for ${skuData.length} SKUs`)
    
    try {
      // Generate base alerts
      const baseAlerts = this.generateAlertsFromAnalysis(skuData, [], [])
      console.log(`📊 Generated ${baseAlerts.length} base alerts`)
      
      // Enhance with AI if API key available
      let enhancedAlerts = baseAlerts
      if (process.env.ANTHROPIC_API_KEY) {
        enhancedAlerts = await this.enhanceAlertsWithAI(baseAlerts, skuData)
      }
      
      // Generate smart alerts for portfolio analysis
      const smartAlerts = await this.generateSmartAlertsForAnalysis(
        skuData,
        analysisId,
        enhancedAlerts
      )
      
      return {
        alerts: enhancedAlerts,
        smart_alerts: smartAlerts
      }
      
    } catch (error) {
      console.error('❌ Intelligent alert generation failed:', error)
      
      // Fallback to basic alerts
      const fallbackAlerts = this.generateAlertsFromAnalysis(skuData, [], [])
      const fallbackSmartAlerts = this.generateFallbackSmartAlerts(analysisId, fallbackAlerts)
      
      return {
        alerts: fallbackAlerts,
        smart_alerts: fallbackSmartAlerts
      }
    }
  }

  /**
   * CLAUDE AI ENHANCEMENT for alerts
   */
  private static async enhanceAlertsWithAI(
    baseAlerts: Alert[],
    skuData: any[]
  ): Promise<Alert[]> {
    
    if (!process.env.ANTHROPIC_API_KEY || baseAlerts.length === 0) {
      return baseAlerts
    }
    
    try {
      // Prepare critical alerts for AI analysis
      const criticalAlerts = baseAlerts
        .filter(alert => alert.severity === 'critical' || alert.severity === 'high')
        .slice(0, 5)
        .map(alert => ({
          sku: alert.sku,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          weeks_of_stock: alert.data.weeks_of_stock,
          weekly_sales: alert.data.predicted_demand / 4
        }))
      
      if (criticalAlerts.length === 0) {
        return baseAlerts
      }
      
      const prompt = `You are an expert alcohol inventory analyst. Enhance these critical alerts with strategic recommendations:

CRITICAL ALERTS:
${JSON.stringify(criticalAlerts, null, 2)}

For each alert, provide:
1. Strategic analysis of the root cause
2. 3-4 ranked action options
3. Risk assessment and timeline
4. Implementation priority

Return as JSON array:
[
  {
    "sku": "SKU-001",
    "ai_analysis": "Strategic analysis...",
    "strategic_options": ["Option 1", "Option 2", "Option 3"],
    "risk_assessment": "Risk timeline analysis",
    "implementation_priority": "immediate"
  }
]

Focus on alcohol industry specifics: seasonality, shelf life, compliance, competitor dynamics.`

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      })
      
      const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
      
      // Parse AI's response
      let claudeEnhancements: any[] = []
      try {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          claudeEnhancements = JSON.parse(jsonMatch[0])
        }
      } catch (parseError) {
        console.error('❌ Failed to parse AI response:', parseError)
        return baseAlerts
      }
      
      // Apply enhancements to base alerts
      const enhancedAlerts = baseAlerts.map(alert => {
        const enhancement = claudeEnhancements.find(e => e.sku === alert.sku)
        
        if (enhancement) {
          alert.ai_recommendation = {
            ai_analysis: enhancement.ai_analysis,
            strategic_options: enhancement.strategic_options || [],
            risk_assessment: enhancement.risk_assessment,
            implementation_priority: enhancement.implementation_priority || 'planned'
          }
          
          // Boost urgency for immediate priority items
          if (enhancement.implementation_priority === 'immediate') {
            alert.impact.urgency = Math.min(10, alert.impact.urgency + 2)
          }
        }
        
        return alert
      })
      
      console.log(`🧠 Enhanced ${claudeEnhancements.length} alerts with AI AI`)
      return enhancedAlerts
      
    } catch (error) {
      console.error('❌ AI enhancement failed:', error)
      return baseAlerts
    }
  }

  /**
   * SMART ALERTS for portfolio-level analysis
   */
  private static async generateSmartAlertsForAnalysis(
    skuData: any[],
    analysisId: string,
    alerts: Alert[]
  ): Promise<SmartAlert[]> {
    
    const smartAlerts: SmartAlert[] = []
    
    try {
      // Portfolio-level threshold alerts
      const criticalCount = alerts.filter(a => a.severity === 'critical').length
      const highCount = alerts.filter(a => a.severity === 'high').length
      
      if (criticalCount > 3) {
        smartAlerts.push({
          id: `smart-critical-${Date.now()}`,
          analysis_id: analysisId,
          type: 'portfolio_risk',
          severity: 'critical',
          message: `PORTFOLIO ALERT: ${criticalCount} critical inventory risks detected across your alcohol portfolio.`,
          recommendation: {
            ai_analysis: `Multiple critical stockouts detected requiring immediate management attention.`,
            strategic_options: [
              'Emergency inventory review meeting',
              'Activate backup supplier protocols',
              'Implement emergency cash flow measures'
            ],
            immediate_actions: [
              'Contact suppliers for emergency orders',
              'Review payment terms for urgent purchases',
              'Prioritize fast-moving critical items'
            ],
            risk_level: 'critical',
            confidence_score: 0.95
          },
          auto_generated: true,
          requires_human: true,
          escalation_path: {
            conditions: ['Unresolved after 2 hours'],
            escalate_to: 'operations_manager',
            timeline: '2 hours'
          },
          acknowledged: false,
          resolved: false,
          auto_resolved: false,
          created_at: new Date()
        })
      }
      
      // Category concentration risk
      const categories = [...new Set(skuData.map(s => s.category))]
      categories.forEach(category => {
        const categorySkus = skuData.filter(s => s.category === category)
        const lowStockCount = categorySkus.filter(s => {
          const weeklySales = parseFloat(s.weekly_sales) || 0
          const inventoryLevel = parseInt(s.inventory_level) || 0
          return weeklySales > 0 && (inventoryLevel / weeklySales) < 2
        }).length
        
        if (lowStockCount > categorySkus.length * 0.6 && categorySkus.length > 2) {
          smartAlerts.push({
            id: `smart-category-${category}-${Date.now()}`,
            analysis_id: analysisId,
            type: 'category_risk',
            severity: 'high',
            message: `CATEGORY ALERT: ${lowStockCount}/${categorySkus.length} ${category} products are critically low on stock.`,
            recommendation: {
              ai_analysis: `Systematic supply issue detected in ${category} category - potential supplier or demand forecasting problem.`,
              strategic_options: [
                `Bulk emergency order for ${category} category`,
                'Switch to alternative suppliers',
                'Investigate demand surge causes'
              ],
              immediate_actions: [
                `Contact ${category} suppliers immediately`,
                'Review sales trend for category',
                'Check for promotional impacts'
              ],
              risk_level: 'high',
              confidence_score: 0.9
            },
            auto_generated: true,
            requires_human: true,
            acknowledged: false,
            resolved: false,
            auto_resolved: false,
            created_at: new Date()
          })
        }
      })
      
      // Generate AI-powered portfolio insights if API available
      if (process.env.ANTHROPIC_API_KEY && skuData.length > 10) {
        const portfolioInsights = await this.generateAIPortfolioInsights(skuData, analysisId)
        smartAlerts.push(...portfolioInsights)
      }
      
      console.log(`⚡ Generated ${smartAlerts.length} smart alerts`)
      return smartAlerts
      
    } catch (error) {
      console.error('❌ Smart alert generation failed:', error)
      return this.generateFallbackSmartAlerts(analysisId, alerts)
    }
  }

  /**
   * CLAUDE PORTFOLIO INSIGHTS - Advanced analysis with ACTIONABLE recommendations
   */
  private static async generateAIPortfolioInsights(
    skuData: any[],
    analysisId: string
  ): Promise<SmartAlert[]> {
    
    try {
      // Enhanced portfolio analysis with specific metrics
      const portfolioAnalysis = {
        total_skus: skuData.length,
        categories: [...new Set(skuData.map(s => s.category))],
        total_inventory_value: skuData.reduce((sum, s) => sum + (parseFloat(s.price) * parseInt(s.inventory_level)), 0),
        fast_movers: skuData.filter(s => parseFloat(s.weekly_sales) > 3),
        slow_movers: skuData.filter(s => parseFloat(s.weekly_sales) < 1),
        high_value_items: skuData.filter(s => parseFloat(s.price) > 50),
        critical_stock: skuData.filter(s => {
          const weeklySales = parseFloat(s.weekly_sales) || 0
          const inventoryLevel = parseInt(s.inventory_level) || 0
          return weeklySales > 0 && (inventoryLevel / weeklySales) < 2
        }),
        category_breakdown: [...new Set(skuData.map(s => s.category))].map(cat => ({
          category: cat,
          count: skuData.filter(s => s.category === cat).length,
          avg_price: skuData.filter(s => s.category === cat).reduce((sum, s) => sum + parseFloat(s.price), 0) / skuData.filter(s => s.category === cat).length,
          total_value: skuData.filter(s => s.category === cat).reduce((sum, s) => sum + (parseFloat(s.price) * parseInt(s.inventory_level)), 0)
        }))
      }
      
      const prompt = `You are an expert alcohol inventory manager. Analyze this portfolio and generate 2-3 SPECIFIC, ACTIONABLE alerts with exact numbers and immediate steps.

PORTFOLIO DATA:
${JSON.stringify(portfolioAnalysis, null, 2)}

Generate alerts that are IMMEDIATELY ACTIONABLE with specific numbers, deadlines, and concrete steps. Focus on:
- Cash flow risks with exact £ amounts and timeframes
- Inventory imbalances with specific product counts and actions
- Category concentration risks with precise diversification steps

Each alert MUST include:
- Specific numbers (£ amounts, unit counts, percentages)
- Exact deadlines or timeframes
- Concrete next steps a manager can execute today

Return as JSON array (2-3 alerts max):
[
  {
    "type": "cash_flow_optimization",
    "severity": "high",
    "message": "Specific alert with exact numbers and deadlines",
    "ai_analysis": "Detailed analysis with specific recommendations",
    "strategic_options": ["Specific action 1 with numbers", "Specific action 2 with timeline", "Specific action 3 with targets"],
    "immediate_actions": ["Do X by tomorrow", "Contact Y within 2 days", "Order Z units by Friday"],
    "confidence_score": 0.9
  }
]

Make it sound like urgent, specific business advice with exact numbers and deadlines.`

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2500,
        temperature: 0.2, // Lower temperature for more focused, specific responses
        messages: [{ role: 'user', content: prompt }]
      })
      
      const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      
      if (jsonMatch) {
        const insights = JSON.parse(jsonMatch[0])
        
        return insights.map((insight: any, index: number) => ({
          id: `claude-portfolio-${Date.now()}-${index}`,
          analysis_id: analysisId,
          type: insight.type || 'portfolio_insight',
          severity: insight.severity || 'medium',
          message: insight.message,
          recommendation: {
            ai_analysis: insight.ai_analysis,
            strategic_options: insight.strategic_options || [],
            immediate_actions: insight.immediate_actions || [],
            risk_level: insight.severity || 'medium',
            confidence_score: insight.confidence_score || 0.9
          },
          auto_generated: true,
          requires_human: insight.severity === 'critical' || insight.severity === 'high',
          acknowledged: false,
          resolved: false,
          auto_resolved: false,
          created_at: new Date()
        }))
      }
      
    } catch (error) {
      console.error('❌ AI portfolio insights failed:', error)
    }
    
    return []
  }

  // Alert creation helpers (same as before but with better seasonal peak logic)
  private static createStockoutAlert(sku: any, weeksOfStock: number, severity: Alert['severity']): Alert {
    const daysToStockout = Math.max(1, Math.floor(weeksOfStock * 7))
    
    // Generate real seasonal peak based on category
    let seasonalPeak = 'Year-round demand'
    const category = sku.category?.toLowerCase() || 'unknown'
    
    if (category.includes('gin') || category.includes('vodka') || category === 'spirits') {
      seasonalPeak = 'Summer cocktails & Holiday season'
    } else if (category.includes('whisky') || category.includes('whiskey')) {
      seasonalPeak = 'Holiday season (Nov-Jan)'
    } else if (category.includes('beer')) {
      seasonalPeak = 'Summer season (May-Aug)'
    } else if (category.includes('wine')) {
      seasonalPeak = 'Holiday season (Oct-Jan)'
    } else if (category.includes('cider')) {
      seasonalPeak = 'Autumn season (Sep-Nov)'
    }
    
    return {
      id: `stockout-${sku.sku}-${Date.now()}`,
      rule_id: 'critical-stockout',
      sku: sku.sku,
      category: sku.category || 'unknown',
      type: 'stockout',
      severity,
      title: `${severity.toUpperCase()} STOCKOUT: ${sku.sku}`,
      message: `${sku.sku} will stockout in ${daysToStockout} days. Immediate reorder required.`,
      action_required: `EMERGENCY REORDER NOW - ${Math.ceil(parseFloat(sku.weekly_sales) * 8)} units recommended`,
      impact: {
        revenue_at_risk: Math.floor(parseFloat(sku.price) * parseFloat(sku.weekly_sales) * 4),
        time_to_critical: daysToStockout,
        urgency: severity === 'critical' ? 10 : severity === 'high' ? 8 : 6
      },
      data: {
        current_stock: parseInt(sku.inventory_level) || 0,
        predicted_demand: parseFloat(sku.weekly_sales) || 0,
        weeks_of_stock: weeksOfStock,
        confidence: 0.9,
        trend: 'decreasing'
      },
      alcohol_context: {
        abv: parseFloat(sku.abv) || undefined,
        shelf_life_days: parseInt(sku.shelf_life_days) || 365,
        seasonal_peak: seasonalPeak,
        compliance_notes: category === 'spirits' && parseFloat(sku.abv) > 40 ? 
          [`High-proof spirits (${parseFloat(sku.abv)}% ABV): Additional tax requirements`] : 
          ['Standard alcohol retail compliance']
      },
      created_at: new Date(),
      acknowledged: false,
      resolved: false,
      delivered_via: [],
      metadata: {
        generated_by: 'alert_engine',
        analysis_type: 'inventory_risk'
      }
    }
  }
  
  private static createOverstockAlert(sku: any, weeksOfStock: number): Alert {
    const category = sku.category?.toLowerCase() || 'unknown'
    let seasonalPeak = 'Year-round demand'
    
    if (category.includes('spirits')) {
      seasonalPeak = 'Holiday season (Nov-Jan)'
    } else if (category.includes('beer')) {
      seasonalPeak = 'Summer season (May-Aug)'
    } else if (category.includes('wine')) {
      seasonalPeak = 'Holiday season (Oct-Jan)'
    }
    
    return {
      id: `overstock-${sku.sku}-${Date.now()}`,
      rule_id: 'overstock-risk',
      sku: sku.sku,
      category: sku.category || 'unknown',
      type: 'overstock',
      severity: 'medium',
      title: `OVERSTOCK: ${sku.sku}`,
      message: `${sku.sku} has ${Math.floor(weeksOfStock)} weeks of stock. Consider promotional pricing.`,
      action_required: `REDUCE INVENTORY - Consider 15-20% promotional discount`,
      impact: {
        revenue_at_risk: Math.floor(parseFloat(sku.price) * parseInt(sku.inventory_level) * 0.1),
        time_to_critical: 30,
        urgency: 4
      },
      data: {
        current_stock: parseInt(sku.inventory_level) || 0,
        predicted_demand: parseFloat(sku.weekly_sales) || 0,
        weeks_of_stock: weeksOfStock,
        confidence: 0.8,
        trend: 'stable'
      },
      alcohol_context: {
        abv: parseFloat(sku.abv) || undefined,
        shelf_life_days: parseInt(sku.shelf_life_days) || 365,
        seasonal_peak: seasonalPeak,
        compliance_notes: ['Consider promotional pricing compliance', 'Monitor minimum pricing laws']
      },
      created_at: new Date(),
      acknowledged: false,
      resolved: false,
      delivered_via: [],
      metadata: {
        generated_by: 'alert_engine',
        analysis_type: 'inventory_optimization'
      }
    }
  }
  
  private static createPriceOpportunityAlert(sku: any, price: number, weeklySales: number): Alert {
    return {
      id: `price-opportunity-${sku.sku}-${Date.now()}`,
      rule_id: 'price-opportunity',
      sku: sku.sku,
      category: sku.category || 'unknown',
      type: 'price_opportunity',
      severity: 'high',
      title: `PRICING OPPORTUNITY: ${sku.sku}`,
      message: `${sku.sku} shows strong sales potential. Consider pricing optimization.`,
      action_required: `OPTIMIZE PRICING - Test 5-10% increase or create premium variant`,
      impact: {
        profit_opportunity: Math.floor(price * weeklySales * 0.1 * 12),
        time_to_critical: 0,
        urgency: 7
      },
      data: {
        current_stock: parseInt(sku.inventory_level) || 0,
        predicted_demand: weeklySales,
        weeks_of_stock: parseInt(sku.inventory_level) / weeklySales,
        confidence: 0.8,
        trend: 'increasing'
      },
      alcohol_context: {
        abv: parseFloat(sku.abv) || undefined,
        seasonal_peak: 'Strong performance indicates market acceptance',
        compliance_notes: ['Monitor competitive pricing', 'Consider premium positioning']
      },
      created_at: new Date(),
      acknowledged: false,
      resolved: false,
      delivered_via: [],
      metadata: {
        generated_by: 'alert_engine',
        analysis_type: 'pricing_optimization'
      }
    }
  }

  private static generateFallbackSmartAlerts(analysisId: string, alerts: Alert[]): SmartAlert[] {
    return [{
      id: `fallback-${Date.now()}`,
      analysis_id: analysisId,
      type: 'system_generated',
      severity: 'medium',
      message: `Analysis complete: ${alerts.length} alerts generated for review.`,
      recommendation: {
        ai_analysis: 'Standard alert analysis completed.',
        strategic_options: ['Review individual alerts', 'Prioritize by urgency'],
        immediate_actions: ['Check critical alerts first'],
        risk_level: 'medium',
        confidence_score: 0.7
      },
      auto_generated: true,
      requires_human: false,
      acknowledged: false,
      resolved: false,
      auto_resolved: false,
      created_at: new Date()
    }]
  }
}

// COMPATIBILITY: Also export as EnhancedAlertEngine for existing imports
export const EnhancedAlertEngine = AlertEngine