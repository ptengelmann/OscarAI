// src/app/api/alerts/[analysisId]/route.ts - FIXED WITH REAL ALCOHOL CONTEXT
import { NextRequest, NextResponse } from 'next/server'
import { PostgreSQLService } from '@/lib/database-postgres'
import { AlertEngine } from '@/lib/alert-engine' // Import AlertEngine for real alcohol context

// Define proper types for better type safety
type SeverityLevel = 'critical' | 'high' | 'medium' | 'low'
type AlertSource = 'smart_alert' | 'regular_alert'
type AlertAction = 'acknowledge' | 'resolve' | 'snooze'

interface AlertImpact {
  revenue_at_risk: number
  profit_opportunity: number
  time_to_critical: number
  urgency: number
}

interface AlertData {
  current_stock: number
  predicted_demand: number
  weeks_of_stock: number
  confidence: number
  trend: string
}

interface AlcoholContext {
  abv: number | null
  shelf_life_days: number | null
  seasonal_peak: string
  compliance_notes: string[]
  category_risk: string
}

interface AIRecommendation {
  ai_analysis: string
  strategic_options: string[]
  risk_assessment: string
  implementation_priority: string
}

interface AlertMetadata {
  source: AlertSource
  analysis_id: string
  confidence_score: number
  auto_generated: boolean
  requires_human?: boolean
  escalation_path?: string
}

interface FormattedAlert {
  id: string
  rule_id: string
  sku: string
  category: string
  type: string
  severity: SeverityLevel
  title: string
  message: string
  action_required: string
  impact: AlertImpact
  data: AlertData
  alcohol_context: AlcoholContext
  ai_recommendation: AIRecommendation | null
  created_at: Date
  acknowledged: boolean
  resolved: boolean
  delivered_via: string[]
  metadata: AlertMetadata
}

export async function GET(
  request: NextRequest,
  { params }: { params: { analysisId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const userEmail = searchParams.get('userEmail')
    
    if (!userId && !userEmail) {
      return NextResponse.json({ 
        error: 'User authentication required' 
      }, { status: 401 })
    }
    
    const userIdentifier = userId || userEmail || ''
    const analysisId = params.analysisId
    
    console.log(`🔍 Getting alerts for analysis ${analysisId}, user: ${userIdentifier}`)
    
    // Get user
    const user = await PostgreSQLService.getUserByEmail(userIdentifier)
    
    if (!user) {
      console.log('User not found:', userIdentifier)
      return NextResponse.json({
        success: true,
        alerts: [],
        count: 0,
        analysisId,
        timestamp: new Date().toISOString()
      })
    }
    
    // Get BOTH regular alerts AND smart alerts
    const [regularAlerts, smartAlerts] = await Promise.all([
      PostgreSQLService.getAlertsForAnalysisId(user.id, analysisId),
      PostgreSQLService.getSmartAlertsForAnalysis(userIdentifier, analysisId)
    ])
    
    console.log(`📊 Found ${regularAlerts.length} regular alerts and ${smartAlerts.length} smart alerts`)
    
    // CRITICAL: Get the original portfolio data to generate real alcohol context
    let portfolioData: any[] = []
    try {
      // First try to get from analysis table
      const analysisResponse = await PostgreSQLService.getAnalysisById(analysisId, userIdentifier)
      if (analysisResponse?.skus) {
        portfolioData = Array.isArray(analysisResponse.skus) ? analysisResponse.skus : []
      }
      
      // If no SKUs in analysis, try to get from recommendations table
      if (portfolioData.length === 0) {
        try {
          const recommendations = await PostgreSQLService.getPriceRecommendations(userIdentifier, analysisId)
          if (Array.isArray(recommendations) && recommendations.length > 0) {
            portfolioData = recommendations.map((rec: any) => ({
              sku: rec.sku,
              category: rec.category || 'spirits',
              brand: rec.brand || 'Unknown',
              price: rec.currentPrice?.toString() || '0',
              weekly_sales: rec.weeklySales?.toString() || '0',
              inventory_level: rec.inventoryLevel?.toString() || '0',
              abv: rec.abv || 40
            }))
          }
        } catch (recError) {
          console.log('Could not fetch recommendations:', recError)
        }
      }
      
      console.log(`📊 Found ${portfolioData.length} SKUs for alcohol context generation`)
      
    } catch (error) {
      console.log('⚠️ Could not fetch portfolio data for alcohol context:', error)
    }
    
    // Generate real portfolio alcohol context
    const portfolioAlcoholContext = portfolioData.length > 0 
      ? AlertEngine.generatePortfolioAlcoholContext(portfolioData)
      : {
          seasonal_peak: 'Analysis not available',
          compliance_notes: ['Standard alcohol retail compliance'],
          category_risk: 'unknown'
        }
    
    // Format regular alerts with proper typing
    const formattedRegularAlerts: FormattedAlert[] = regularAlerts.map((alert: any) => ({
      id: alert.id,
      rule_id: `rule-${alert.type}`,
      sku: alert.sku_code || 'unknown',
      category: alert.sku?.category || alert.type,
      type: alert.type,
      severity: normalizeSeverity(alert.severity),
      title: alert.title,
      message: alert.message,
      action_required: generateActionFromType(alert.type),
      impact: {
        revenue_at_risk: alert.revenue_at_risk || 0,
        profit_opportunity: alert.profit_opportunity || 0,
        time_to_critical: alert.time_to_critical || 0,
        urgency: alert.urgency_score || 5
      },
      data: {
        current_stock: alert.sku?.inventory_level || 0,
        predicted_demand: alert.sku?.weekly_sales ? alert.sku.weekly_sales * 4 : 0,
        weeks_of_stock: alert.sku?.inventory_level && alert.sku?.weekly_sales ? 
          alert.sku.inventory_level / alert.sku.weekly_sales : 0,
        confidence: 0.8,
        trend: 'stable'
      },
      alcohol_context: {
        abv: alert.sku?.abv,
        shelf_life_days: alert.sku?.shelf_life_days || 365,
        seasonal_peak: getSeasonalPeak(alert.sku?.category || 'spirits'),
        compliance_notes: getComplianceNotes(alert.sku),
        category_risk: 'moderate'
      },
      ai_recommendation: null, // Regular alerts don't have AI recommendations
      created_at: new Date(alert.created_at),
      acknowledged: alert.acknowledged,
      resolved: alert.resolved,
      delivered_via: ['dashboard'],
      metadata: {
        source: 'regular_alert',
        analysis_id: analysisId,
        confidence_score: 0.8,
        auto_generated: true
      }
    }))
    
    // FIXED: Format smart alerts with REAL alcohol context from portfolio analysis
    const formattedSmartAlerts: FormattedAlert[] = smartAlerts.map((alert: any) => ({
      id: alert.id,
      rule_id: `smart-${alert.type}`,
      sku: 'PORTFOLIO', // Smart alerts are portfolio-level
      category: alert.type,
      type: alert.type,
      severity: normalizeSeverity(alert.severity),
      title: `SMART ALERT: ${alert.message.split(':')[0]}`,
      message: alert.message,
      action_required: alert.recommendation?.immediate_actions?.[0] || 'Review strategic recommendations',
      impact: {
        revenue_at_risk: 0,
        profit_opportunity: 0,
        time_to_critical: alert.requires_human ? 1 : 7,
        urgency: alert.severity === 'critical' ? 10 : alert.severity === 'high' ? 8 : 5
      },
      data: {
        current_stock: 0,
        predicted_demand: 0,
        weeks_of_stock: 999,
        confidence: alert.recommendation?.confidence_score || 0.8,
        trend: 'stable'
      },
      // FIXED: Use REAL alcohol context instead of placeholder garbage
      alcohol_context: {
        abv: null, // Portfolio level doesn't have single ABV
        shelf_life_days: null, // Portfolio level doesn't have single shelf life
        seasonal_peak: portfolioAlcoholContext.seasonal_peak, // REAL portfolio insights
        compliance_notes: portfolioAlcoholContext.compliance_notes, // REAL compliance requirements
        category_risk: portfolioAlcoholContext.category_risk // REAL risk assessment
      },
      // CRITICAL: This is what makes smart alerts special
      ai_recommendation: {
        ai_analysis: alert.recommendation?.ai_analysis || 'AI analysis not available',
        strategic_options: alert.recommendation?.strategic_options || [],
        risk_assessment: `Risk Level: ${alert.recommendation?.risk_level || 'medium'}`,
        implementation_priority: alert.requires_human ? 'immediate' : 'planned'
      },
      created_at: new Date(alert.created_at),
      acknowledged: alert.acknowledged,
      resolved: alert.resolved,
      delivered_via: ['dashboard'],
      metadata: {
        source: 'smart_alert',
        analysis_id: analysisId,
        confidence_score: alert.recommendation?.confidence_score || 0.8,
        auto_generated: alert.auto_generated,
        requires_human: alert.requires_human,
        escalation_path: alert.escalation_path
      }
    }))
    
    // COMBINE both types of alerts
    const allAlerts: FormattedAlert[] = [...formattedSmartAlerts, ...formattedRegularAlerts]
    
    // Sort by priority with proper type safety
    allAlerts.sort((a, b) => {
      // Smart alerts get priority
      if (a.metadata.source === 'smart_alert' && b.metadata.source !== 'smart_alert') return -1
      if (b.metadata.source === 'smart_alert' && a.metadata.source !== 'smart_alert') return 1
      
      // Then by severity with proper type safety
      const severityOrder: Record<SeverityLevel, number> = { 
        critical: 4, 
        high: 3, 
        medium: 2, 
        low: 1 
      }
      
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
      if (severityDiff !== 0) return severityDiff
      
      // Then by urgency
      return b.impact.urgency - a.impact.urgency
    })
    
    console.log(`🍷 Generated real alcohol context: "${portfolioAlcoholContext.seasonal_peak}"`)
    console.log(`📋 Real compliance notes: ${portfolioAlcoholContext.compliance_notes.join(', ')}`)
    
    return NextResponse.json({
      success: true,
      alerts: allAlerts,
      count: allAlerts.length,
      breakdown: {
        smart_alerts: formattedSmartAlerts.length,
        regular_alerts: formattedRegularAlerts.length,
        critical: allAlerts.filter(a => a.severity === 'critical').length,
        unread: allAlerts.filter(a => !a.acknowledged && !a.resolved).length
      },
      analysisId,
      timestamp: new Date().toISOString(),
      // DEBUG: Include portfolio alcohol context for verification
      debug_alcohol_context: portfolioAlcoholContext
    })
    
  } catch (error) {
    console.error('❌ Analysis alerts API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch analysis alerts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { analysisId: string } }
) {
  try {
    const body = await request.json()
    const { alertId, action, userId }: { 
      alertId: string
      action: AlertAction
      userId: string 
    } = body
    
    if (!alertId || !action || !userId) {
      return NextResponse.json({ 
        error: 'Missing required fields: alertId, action, userId' 
      }, { status: 400 })
    }
    
    const validActions: AlertAction[] = ['acknowledge', 'resolve', 'snooze']
    if (!validActions.includes(action)) {
      return NextResponse.json({ 
        error: 'Invalid action. Must be: acknowledge, resolve, or snooze' 
      }, { status: 400 })
    }
    
    console.log(`🔄 Updating alert ${alertId} to ${action} for user ${userId}`)
    
    // Try updating both regular alerts and smart alerts
    let success = false
    
    // Try regular alert first
    success = await PostgreSQLService.updateAlertStatus(
      alertId,
      action as 'acknowledged' | 'resolved' | 'snoozed',
      userId
    )
    
    // If not found in regular alerts, try smart alerts
    if (!success) {
      success = await PostgreSQLService.updateSmartAlertStatus(
        alertId,
        action as 'acknowledge' | 'resolve',
        userId
      )
    }
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: `Alert ${action}d successfully`,
        alertId,
        action,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({ 
        error: 'Failed to update alert status' 
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ Alert update API error:', error)
    return NextResponse.json({ 
      error: 'Failed to update alert',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { analysisId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const alertId = searchParams.get('alertId')
    const userId = searchParams.get('userId')
    
    if (!alertId || !userId) {
      return NextResponse.json({ 
        error: 'Missing required parameters: alertId, userId' 
      }, { status: 400 })
    }
    
    console.log(`🗑️ Deleting alert ${alertId} for user ${userId}`)
    
    // Try deleting from both tables
    let success = await PostgreSQLService.deleteAlert(alertId, userId)
    
    // If not found in regular alerts, try smart alerts (would need this method)
    // success = success || await PostgreSQLService.deleteSmartAlert(alertId, userId)
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Alert deleted successfully',
        alertId,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({ 
        error: 'Failed to delete alert' 
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ Alert delete API error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete alert',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to normalize severity to valid type
function normalizeSeverity(severity: any): SeverityLevel {
  const validSeverities: SeverityLevel[] = ['critical', 'high', 'medium', 'low']
  
  if (typeof severity === 'string' && validSeverities.includes(severity as SeverityLevel)) {
    return severity as SeverityLevel
  }
  
  // Default fallback
  return 'medium'
}

// Helper functions (same as before but with better typing)
function generateActionFromType(type: string): string {
  const actionMap: Record<string, string> = {
    'stockout': 'REORDER INVENTORY IMMEDIATELY',
    'overstock': 'IMPLEMENT PROMOTIONAL PRICING',
    'price_opportunity': 'ADJUST PRICING STRATEGY',
    'seasonal_prep': 'PREPARE FOR SEASONAL DEMAND',
    'competitor_threat': 'REVIEW COMPETITIVE POSITION',
    'compliance': 'REVIEW COMPLIANCE REQUIREMENTS',
    'expiration_risk': 'IMPLEMENT CLEARANCE STRATEGY'
  }
  
  return actionMap[type] || 'REVIEW AND TAKE ACTION'
}

function getSeasonalPeak(category: string): string {
  const peaks: Record<string, string> = {
    beer: 'Summer months (May-August)',
    wine: 'Holiday season (Oct-Jan)',
    spirits: 'Holiday season (Nov-Jan)',
    rtd: 'Summer season (Apr-Sep)',
    cider: 'Autumn months (Sep-Nov)'
  }
  return peaks[category] || 'Year-round demand'
}

function getComplianceNotes(sku: any): string[] {
  if (!sku) return ['Standard alcohol retail compliance']
  
  const notes: string[] = []
  
  if (sku.abv && sku.abv > 40) {
    notes.push(`High-proof spirits (${sku.abv}% ABV): Additional tax requirements`)
  }
  
  if (sku.origin_country && sku.origin_country !== 'UK') {
    notes.push(`Imported product: Import duties apply`)
  }
  
  if (notes.length === 0) {
    notes.push('Standard alcohol retail compliance')
  }
  
  return notes
}