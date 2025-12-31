import { PrismaClient } from '@prisma/client'
import type { CompetitorPrice } from '@/types'

// CRITICAL FIX: Proper global singleton to prevent prepared statement conflicts
declare global {
  var __prisma: PrismaClient | undefined
}

// Create singleton instance with connection pooling fix
let prisma: PrismaClient & any // Add 'any' to bypass TypeScript cache issues

const prismaOptions = {
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
} as any

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(prismaOptions) as any
} else {
  // In development, reuse connection to avoid prepared statement conflicts
  if (!global.__prisma) {
    global.__prisma = new PrismaClient(prismaOptions) as any
  }
  prisma = global.__prisma as any
}

// Export the singleton
export { prisma }

// Graceful shutdown handlers
if (typeof window === 'undefined') {
  const cleanup = async () => {
    try {
      await prisma.$disconnect()
      console.log('✅ Prisma disconnected gracefully')
    } catch (error) {
      console.error('❌ Error during Prisma disconnect:', error)
    }
  }

  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup) 
  process.on('beforeExit', cleanup)
}

export interface AnalysisData {
  uploadId: string
  fileName: string
  userId: string
  userEmail: string
  summary: any
  priceRecommendations: any[]
  inventoryAlerts: InventoryAlert[]
  smartAlerts: any[]
  competitorData: CompetitorPrice[]
  marketInsights: any[]
  processingTimeMs?: number
  seasonalStrategies?: any[]
  smart_alerts?: SmartAlert[] // New field for enhanced smart alerts
}

export interface InventoryAlert {
  sku: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskType: 'stockout' | 'overstock' | 'price_opportunity' | 'competitor_threat' | 'seasonal_prep' | 'demand_spike' | 'compliance' | 'expiration_risk' | 'expiration' | 'seasonal_shortage' | 'none'
  weeksOfStock: number
  priority: number
  message: string
  aiEnhanced?: boolean
  revenueAtRisk?: number
  alcoholContext?: {
    category?: string
    shelfLifeDays?: number
    seasonalPeak?: string
  }
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

export class PostgreSQLService {
  static getPriceRecommendations(userIdentifier: string, analysisId: string) {
    throw new Error('Method not implemented.')
  }
  
  static async getAnalysisById(analysisId: string, userIdentifier: string): Promise<any> {
    try {
      // First get the user
      const user = await this.getUserByEmail(userIdentifier)
      
      if (!user) {
        console.log(`User not found: ${userIdentifier}`)
        return null
      }
      
      // Get the analysis with all related data INCLUDING seasonal strategies
      const analysis = await prisma.analysis.findFirst({
        where: {
          upload_id: analysisId,
          user_id: user.id
        },
        include: {
          recommendations: true,
          alerts: true,
          competitor_data: true,
          seasonal_strategies: true,
          smart_alerts: true  // Include smart alerts
        }
      })
      
      return analysis
    } catch (error) {
      console.error(`Error fetching analysis ${analysisId}:`, error)
      return null
    }
  }

  // ENHANCED: Save analysis with smart alerts support
  static async saveAnalysis(analysisData: AnalysisData): Promise<string> {
    try {
      console.log(`💾 Saving analysis for user ${analysisData.userEmail}`)
      
      // Step 1: Ensure user exists
      let user = await prisma.user.findUnique({
        where: { email: analysisData.userEmail }
      })
      
      if (!user) {
        console.log(`Creating new user: ${analysisData.userEmail}`)
        user = await prisma.user.create({
          data: {
            email: analysisData.userEmail,
            name: analysisData.userEmail.split('@')[0],
            company: 'Demo Account',
            subscription_tier: 'free'
          }
        })
      }
      
      // Step 2: Save analysis record
      const analysis = await prisma.analysis.create({
        data: {
          upload_id: analysisData.uploadId,
          file_name: analysisData.fileName,
          uploaded_at: new Date(),
          processed_at: new Date(),
          user_id: user.id,
          total_skus: analysisData.summary.totalSKUs || 0,
          revenue_potential: analysisData.summary.totalRevenuePotential || 0,
          processing_time_ms: analysisData.processingTimeMs,
          analysis_type: 'standard',
          summary: analysisData.summary,
          column_mapping: {},
          market_insights: analysisData.marketInsights
        }
      })
      
      console.log(`✅ Analysis saved with ID: ${analysis.id}`)
      
      // Step 3: Save SKUs and recommendations
      if (analysisData.priceRecommendations.length > 0) {
        await this.saveSKUsAndRecommendations(
          user.id, 
          analysisData.uploadId,
          analysisData.priceRecommendations
        )
      }
      
      // Step 4: Save alerts
      if (analysisData.inventoryAlerts.length > 0) {
        await this.saveAlerts(user.id, analysisData.uploadId, analysisData.inventoryAlerts)
      }
      
      // Step 5: Save competitor data
      if (analysisData.competitorData.length > 0) {
        await this.saveCompetitorData(user.id, analysisData.uploadId, analysisData.competitorData)
      }
      
      // Step 6: Save seasonal strategies
      if (analysisData.seasonalStrategies && analysisData.seasonalStrategies.length > 0) {
        console.log(`🎄 Saving ${analysisData.seasonalStrategies.length} seasonal strategies`)
        await this.saveSeasonalStrategies(user.id, analysisData.uploadId, analysisData.seasonalStrategies)
      }
      
      return analysis.id
      
    } catch (error) {
      console.error('💥 PostgreSQL save error:', error)
      throw new Error(`Failed to save analysis: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // NEW: Enhanced save method with smart alerts
  static async saveAnalysisWithSmartAlerts(analysisData: AnalysisData & { 
    smart_alerts?: SmartAlert[] 
  }): Promise<string> {
    try {
      console.log(`💾 Saving analysis with smart alerts for user ${analysisData.userEmail}`)
      
      // First save the regular analysis
      const analysisId = await this.saveAnalysis(analysisData)
      
      // Then save smart alerts if provided
      if (analysisData.smart_alerts && analysisData.smart_alerts.length > 0) {
        await this.saveSmartAlerts(analysisData.smart_alerts, analysisData.uploadId, analysisData.userEmail)
      }
      
      console.log(`✅ Enhanced analysis save complete with ${analysisData.smart_alerts?.length || 0} smart alerts`)
      return analysisId
      
    } catch (error) {
      console.error('💥 Enhanced analysis save failed:', error)
      throw error
    }
  }


  /**
   * Get smart alerts for an analysis
   */
  static async getSmartAlertsForAnalysis(
    userIdOrEmail: string,
    analysisId: string
  ): Promise<SmartAlert[]> {
    try {
      console.log(`🔍 Getting smart alerts for analysis ${analysisId}`)
      
      const smartAlerts = await prisma.smartAlert.findMany({
        where: {
          analysis_id: analysisId
        },
        orderBy: [
          { severity: 'desc' },
          { created_at: 'desc' }
        ]
      })
      
      console.log(`📊 Found ${smartAlerts.length} smart alerts`)
      return smartAlerts as SmartAlert[]
      
    } catch (error) {
      console.error('❌ Error getting smart alerts:', error)
      return []
    }
  }

  /**
   * Update smart alert status
   */
  static async updateSmartAlertStatus(
    alertId: string,
    action: 'acknowledge' | 'resolve',
    userIdOrEmail: string
  ): Promise<boolean> {
    try {
      console.log(`🔄 Updating smart alert ${alertId} with action ${action}`)
      
      const updateData: any = {}
      
      if (action === 'acknowledge') {
        updateData.acknowledged = true
      } else if (action === 'resolve') {
        updateData.resolved = true
        updateData.resolved_at = new Date()
        updateData.acknowledged = true
      }
      
      await prisma.smartAlert.update({
        where: { id: alertId },
        data: updateData
      })
      
      console.log(`✅ Smart alert ${alertId} updated`)
      return true
      
    } catch (error) {
      console.error('❌ Error updating smart alert:', error)
      return false
    }
  }
  
  // Save SKUs and their recommendations
  private static async saveSKUsAndRecommendations(
    userId: string, 
    analysisId: string, 
    recommendations: any[]
  ): Promise<void> {
    try {
      console.log(`💾 Saving ${recommendations.length} SKUs and recommendations`)
      
      // Batch insert SKUs (upsert to handle duplicates)
      for (const rec of recommendations) {
        await prisma.sKU.upsert({
          where: {
            user_id_sku_code: {
              user_id: userId,
              sku_code: rec.sku
            }
          },
          update: {
            price: rec.currentPrice,
            weekly_sales: rec.weeklySales,
            inventory_level: rec.inventoryLevel,
            updated_at: new Date()
          },
          create: {
            sku_code: rec.sku,
            user_id: userId,
            product_name: rec.sku,
            category: rec.category || 'spirits',
            brand: rec.brand || 'Unknown',
            price: rec.currentPrice,
            weekly_sales: rec.weeklySales,
            inventory_level: rec.inventoryLevel,
            days_since_sale: Math.floor(rec.inventoryLevel / (rec.weeklySales || 0.1) * 7)
          }
        })
        
        // Save price recommendation
        if (rec.changePercentage !== 0) {
          await prisma.priceRecommendation.create({
            data: {
              analysis_id: analysisId,
              sku_code: rec.sku,
              user_id: userId,
              current_price: rec.currentPrice,
              recommended_price: rec.recommendedPrice,
              change_percentage: rec.changePercentage,
              confidence_score: rec.confidence || 0.7,
              reason: rec.reason,
              weekly_sales: rec.weeklySales,
              inventory_level: rec.inventoryLevel,
              revenue_impact: rec.revenueImpact || 0,
              creative_strategies: rec.creativeStrategy ? [rec.creativeStrategy] : [],
              risk_level: Math.abs(rec.changePercentage) > 15 ? 'high' : 'medium'
            }
          })
        }
      }
      
      console.log(`✅ Saved ${recommendations.length} SKUs and recommendations`)
      
    } catch (error) {
      console.error('Error saving SKUs:', error)
      throw error
    }
  }
  
  // Save inventory alerts with proper typing
  public static async saveAlerts(
    userId: string,
    analysisId: string,
    alerts: InventoryAlert[]
  ): Promise<void> {
    try {
      console.log(`💾 Saving ${alerts.length} alerts`)

      for (const alert of alerts) {
        await prisma.alert.create({
          data: {
            user_id: userId,
            analysis_id: analysisId,
            sku_code: alert.sku,
            type: alert.riskType || 'stockout',
            severity: alert.riskLevel,
            title: `${alert.riskLevel.toUpperCase()} Risk: ${alert.sku}`,
            message: alert.message,
            urgency_score: alert.priority || 5,
            revenue_at_risk: alert.revenueAtRisk || 0
          }
        })
      }

      console.log(`✅ Saved ${alerts.length} alerts`)

    } catch (error) {
      console.error('Error saving alerts:', error)
      throw error
    }
  }

  // Save SMART ACTIONABLE ALERTS with full recommendation structure
  public static async saveSmartAlerts(
    smartAlerts: any[],
    analysisId: string,
    userEmail: string
  ): Promise<void> {
    try {
      console.log(`💾 Saving ${smartAlerts.length} SMART ACTIONABLE alerts`)

      // Get user first
      const user = await prisma.user.findUnique({
        where: { email: userEmail }
      })

      if (!user) {
        console.error('User not found for smart alerts:', userEmail)
        return
      }

      for (const alert of smartAlerts) {
        await prisma.alert.create({
          data: {
            user_id: user.id,
            analysis_id: analysisId,
            sku_code: alert.sku_code,
            type: alert.type,
            severity: alert.severity,
            category: alert.product_context?.category || null,
            title: alert.title,
            message: alert.message,
            short_description: alert.short_description || null,

            // Actionable AI recommendations
            ai_recommendation: alert.primary_action || null,
            alternative_actions: alert.alternative_actions || null,
            estimated_impact: alert.estimated_impact,
            confidence_level: alert.confidence_level,

            // Business metrics
            urgency_score: alert.urgency_score,
            revenue_at_risk: alert.revenue_at_risk,
            cost_to_resolve: alert.cost_to_resolve,
            time_to_resolve: alert.time_to_critical ? parseInt(alert.time_to_critical.split(' ')[0]) : null,

            // Product context
            product_data: alert.product_context || null,

            // Automation flags
            can_auto_resolve: alert.can_auto_resolve || false,
            auto_resolve_conditions: alert.auto_resolve_conditions || null,
            escalate_after_hours: alert.escalate_if_not_resolved_hours || null,

            // AI analysis
            ai_insight: alert.ai_analysis || null,

            // Status flags
            acknowledged: false,
            resolved: false,
            snoozed: false
          }
        })
      }

      console.log(`✅ Saved ${smartAlerts.length} SMART ACTIONABLE alerts to database`)

    } catch (error) {
      console.error('Error saving smart alerts:', error)
      throw error
    }
  }
  
  // Save competitor pricing data
  private static async saveCompetitorData(
    userId: string, 
    analysisId: string, 
    competitorData: CompetitorPrice[]
  ): Promise<void> {
    try {
      console.log(`💾 Saving ${competitorData.length} competitor prices`)
      
      for (const comp of competitorData) {
        await prisma.competitorPrice.create({
          data: {
            sku_code: comp.sku,
            user_id: userId,
            analysis_id: analysisId,
            competitor: comp.competitor,
            competitor_price: comp.competitor_price,
            our_price: comp.our_price,
            price_difference: comp.price_difference,
            price_difference_pct: comp.price_difference_percentage,
            availability: comp.availability,
            product_name: comp.product_name,
            relevance_score: comp.relevance_score,
            scraping_success: true,
            scraping_method: 'api'
          }
        })
      }
      
      console.log(`✅ Saved ${competitorData.length} competitor prices`)
      
    } catch (error) {
      console.error('Error saving competitor data:', error)
      throw error
    }
  }
  
  // Get recent analyses from PostgreSQL
  static async getRecentAnalyses(userId: string, limit: number = 10): Promise<any[]> {
    try {
      console.log(`📊 Getting recent analyses for user: ${userId}`)
      
      // Get user first
      const user = await prisma.user.findUnique({
        where: { email: userId }
      })
      
      if (!user) {
        console.log(`User not found: ${userId}`)
        return []
      }
      
      const analyses = await prisma.analysis.findMany({
        where: { user_id: user.id },
        orderBy: { processed_at: 'desc' },
        take: limit,
        include: {
          recommendations: {
            take: 5,
            orderBy: { revenue_impact: 'desc' }
          },
          alerts: {
            take: 3,
            where: { resolved: false },
            orderBy: { urgency_score: 'desc' }
          },
          smart_alerts: true // Include smart alerts
        }
      })
      
      console.log(`📊 Found ${analyses.length} analyses`)
      
      return analyses.map((analysis: any) => ({
        _id: analysis.id,
        uploadId: analysis.upload_id,
        fileName: analysis.file_name,
        uploadedAt: analysis.uploaded_at.toISOString(),
        processedAt: analysis.processed_at.toISOString(),
        summary: analysis.summary,
        recommendations: analysis.recommendations,
        alerts: analysis.alerts,
        smartAlerts: analysis.smart_alerts // Include smart alerts in response
      }))
      
    } catch (error) {
      console.error('Error fetching analyses:', error)
      return []
    }
  }
  
  // Get dashboard statistics
  static async getDashboardStats(userId: string): Promise<any> {
    try {
      console.log(`📊 Getting dashboard stats for user: ${userId}`)
      
      const user = await prisma.user.findUnique({
        where: { email: userId }
      })
      
      if (!user) {
        return {
          totalAnalyses: 0,
          totalSKUs: 0,
          totalRevenuePotential: 0,
          avgSKUsPerAnalysis: 0,
          recentAnalyses: 0
        }
      }
      
      // Get aggregated stats
      const [analysisCount, skuCount, totalRevenue] = await Promise.all([
        prisma.analysis.count({ where: { user_id: user.id } }),
        prisma.sKU.count({ where: { user_id: user.id } }),
        prisma.analysis.aggregate({
          where: { user_id: user.id },
          _sum: { revenue_potential: true }
        })
      ])
      
      const stats = {
        totalAnalyses: analysisCount,
        totalSKUs: skuCount,
        totalRevenuePotential: totalRevenue._sum.revenue_potential || 0,
        avgSKUsPerAnalysis: analysisCount > 0 ? Math.round(skuCount / analysisCount) : 0,
        recentAnalyses: analysisCount
      }
      
      console.log(`📊 Dashboard stats:`, stats)
      return stats
      
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      return {
        totalAnalyses: 0,
        totalSKUs: 0,
        totalRevenuePotential: 0,
        avgSKUsPerAnalysis: 0,
        recentAnalyses: 0
      }
    }
  }
  
  // Get competitor data
  static async getCompetitorData(userId: string, days: number = 7): Promise<CompetitorPrice[]> {
    try {
      console.log(`🎯 Getting competitor data for user ${userId} from last ${days} days`)
      
      const user = await prisma.user.findUnique({
        where: { email: userId }
      })
      
      if (!user) return []
      
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      
      const competitorPrices = await prisma.competitorPrice.findMany({
        where: {
          user_id: user.id,
          last_updated: { gte: cutoffDate }
        },
        orderBy: { last_updated: 'desc' }
      })
      
      return competitorPrices.map((cp: any) => ({
        sku: cp.sku_code,
        competitor: cp.competitor,
        competitor_price: cp.competitor_price,
        our_price: cp.our_price,
        price_difference: cp.price_difference,
        price_difference_percentage: cp.price_difference_pct,
        availability: cp.availability,
        product_name: cp.product_name,
        relevance_score: cp.relevance_score,
        last_updated: cp.last_updated || new Date(),
        source: cp.source || 'api'
      }))
      
    } catch (error) {
      console.error('Competitor data fetch failed:', error)
      return []
    }
  }
  
  // Get slow-moving products for GPT-4 analysis
  static async getSlowMovingProducts(userId: string, thresholdWeeks: number = 4): Promise<any[]> {
    try {
      console.log(`🐌 Getting slow-moving products for user ${userId}`)
      
      const user = await prisma.user.findUnique({
        where: { email: userId }
      })
      
      if (!user) return []
      
      const slowMovers = await prisma.sKU.findMany({
        where: {
          user_id: user.id,
          weekly_sales: { lt: 1 },
          inventory_level: { gt: 10 }
        },
        orderBy: [
          { weekly_sales: 'asc' },
          { inventory_level: 'desc' }
        ],
        take: 20
      })
      
      return slowMovers.map((sku: any) => ({
        sku: sku.sku_code,
        category: sku.category,
        brand: sku.brand,
        inventory_level: sku.inventory_level,
        weeks_since_last_sale: sku.days_since_sale ? Math.floor(sku.days_since_sale / 7) : 4,
        price: sku.price,
        cost_price: sku.cost_price
      }))
      
    } catch (error) {
      console.error('Error fetching slow-moving products:', error)
      return []
    }
  }
  
  // Get user by email
  static async getUserByEmail(email: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });
      return user;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }
  
  // Get alerts for a specific analysis ID
  static async getAlertsForAnalysisId(userId: string, analysisId: string): Promise<any[]> {
    try {
      console.log(`🔍 Finding alerts for analysis ${analysisId} and user ${userId}`);
      
      const alerts = await prisma.alert.findMany({
        where: {
          user_id: userId,
          analysis_id: analysisId
        },
        include: {
          sku: true
        },
        orderBy: [
          { urgency_score: 'desc' },
          { created_at: 'desc' }
        ]
      });
      
      console.log(`📊 Found ${alerts.length} alerts for analysis ${analysisId}`);
      return alerts;
    } catch (error) {
      console.error(`Error getting alerts for analysis ${analysisId}:`, error);
      return [];
    }
  }
  
  // Get latest alerts for user
  static async getLatestAlerts(userId: string, limit: number = 10): Promise<any[]> {
    try {
      console.log(`🚨 Getting latest alerts for user: ${userId}`)
      
      const user = await prisma.user.findUnique({
        where: { email: userId }
      })
      
      if (!user) return []
      
      const alerts = await prisma.alert.findMany({
        where: { 
          user_id: user.id,
          resolved: false
        },
        orderBy: [
          { urgency_score: 'desc' },
          { created_at: 'desc' }
        ],
        take: limit,
        include: {
          sku: true
        }
      })
      
      return alerts.map((alert: any) => ({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        sku: alert.sku_code,
        urgency_score: alert.urgency_score,
        revenue_at_risk: alert.revenue_at_risk,
        acknowledged: alert.acknowledged,
        created_at: alert.created_at.toISOString(),
        product_name: alert.sku?.product_name
      }))
      
    } catch (error) {
      console.error('Error fetching alerts:', error)
      return []
    }
  }
  
  // Get alert statistics
  static async getAlertStatistics(userId: string): Promise<any> {
    try {
      console.log(`📈 Getting alert statistics for user: ${userId}`)
      
      const user = await prisma.user.findUnique({
        where: { email: userId }
      })
      
      if (!user) {
        return {
          totalAlerts: 0,
          criticalAlerts: 0,
          unreadAlerts: 0,
          resolvedAlerts: 0,
          acknowledgementRate: 0,
          resolutionRate: 0
        }
      }
      
      const [
        totalAlerts,
        criticalAlerts,
        unreadAlerts,
        resolvedAlerts,
        acknowledgedAlerts
      ] = await Promise.all([
        prisma.alert.count({ where: { user_id: user.id } }),
        prisma.alert.count({ where: { user_id: user.id, severity: 'critical' } }),
        prisma.alert.count({ where: { user_id: user.id, acknowledged: false } }),
        prisma.alert.count({ where: { user_id: user.id, resolved: true } }),
        prisma.alert.count({ where: { user_id: user.id, acknowledged: true } })
      ])
      
      return {
        totalAlerts,
        criticalAlerts,
        unreadAlerts,
        resolvedAlerts,
        acknowledgementRate: totalAlerts > 0 ? Math.round((acknowledgedAlerts / totalAlerts) * 100) : 0,
        resolutionRate: totalAlerts > 0 ? Math.round((resolvedAlerts / totalAlerts) * 100) : 0
      }
      
    } catch (error) {
      console.error('Error fetching alert statistics:', error)
      return {
        totalAlerts: 0,
        criticalAlerts: 0,
        unreadAlerts: 0,
        resolvedAlerts: 0,
        acknowledgementRate: 0,
        resolutionRate: 0
      }
    }
  }
  
  // Update alert status
  static async updateAlertStatus(
    alertId: string,
    status: 'acknowledged' | 'resolved' | 'snoozed',
    userId: string
  ): Promise<boolean> {
    try {
      console.log(`🔄 Updating alert ${alertId} status to ${status}`)
      
      const user = await prisma.user.findUnique({
        where: { email: userId }
      })
      
      if (!user) return false
      
      const updateData: any = {}
      
      if (status === 'acknowledged') {
        updateData.acknowledged = true
        updateData.acknowledged_at = new Date()
      } else if (status === 'resolved') {
        updateData.resolved = true
        updateData.resolved_at = new Date()
        updateData.acknowledged = true
        updateData.acknowledged_at = new Date()
      } else if (status === 'snoozed') {
        updateData.snoozed = true
        updateData.snooze_until = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
      
      await prisma.alert.update({
        where: { 
          id: alertId,
          user_id: user.id
        },
        data: updateData
      })
      
      console.log(`✅ Alert ${alertId} status updated to ${status}`)
      return true
      
    } catch (error) {
      console.error('Error updating alert status:', error)
      return false
    }
  }
  
  // Delete alert
  static async deleteAlert(alertId: string, userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: userId }
      })
      
      if (!user) return false
      
      await prisma.alert.delete({
        where: { 
          id: alertId,
          user_id: user.id
        }
      })
      
      return true
      
    } catch (error) {
      console.error('Error deleting alert:', error)
      return false
    }
  }

  // Delete analysis and all related data
  static async deleteAnalysis(analysisId: string, userId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting analysis ${analysisId} for user ${userId}`)
      
      const user = await prisma.user.findUnique({
        where: { email: userId }
      })
      
      if (!user) return false
      
      // Delete in correct order due to foreign key constraints
      await prisma.smartAlert.deleteMany({
        where: { analysis_id: analysisId }
      })
      
      await prisma.alert.deleteMany({
        where: { 
          analysis_id: analysisId,
          user_id: user.id
        }
      })
      
      await prisma.priceRecommendation.deleteMany({
        where: { 
          analysis_id: analysisId,
          user_id: user.id
        }
      })
      
      await prisma.competitorPrice.deleteMany({
        where: { 
          analysis_id: analysisId,
          user_id: user.id
        }
      })
      
      await prisma.seasonalStrategy.deleteMany({
        where: { 
          analysis_id: analysisId,
          user_id: user.id
        }
      })
      
      await prisma.analysis.delete({
        where: { 
          upload_id: analysisId,
          user_id: user.id
        }
      })
      
      console.log(`✅ Analysis ${analysisId} and all related data deleted`)
      return true
      
    } catch (error) {
      console.error('Error deleting analysis:', error)
      return false
    }
  }
  
  // Database health check
  static async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'down',
    connection: boolean,
    performance: { query_time_ms: number }
  }> {
    try {
      const startTime = Date.now()
      
      // Test basic connection
      await prisma.$queryRaw`SELECT 1 as test`
      
      const queryTime = Date.now() - startTime
      
      return {
        status: queryTime < 1000 ? 'healthy' : 'degraded',
        connection: true,
        performance: { query_time_ms: queryTime }
      }
    } catch (error) {
      console.error('Database health check failed:', error)
      return {
        status: 'down',
        connection: false,
        performance: { query_time_ms: 0 }
      }
    }
  }
  
  // Get all SKUs for a specific user
  static async getUserSKUs(userId: string): Promise<any[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: userId }
      })
      
      if (!user) return []
      
      const skus = await prisma.sKU.findMany({
        where: { user_id: user.id },
        orderBy: { weekly_sales: 'desc' },
        take: 1000
      })
      
      return skus.map((sku: any) => ({
        sku_code: sku.sku_code,
        product_name: sku.product_name,
        brand: sku.brand,
        category: sku.category,
        subcategory: sku.subcategory,
        price: sku.price,
        weekly_sales: sku.weekly_sales,
        inventory_level: sku.inventory_level
      }))
    } catch (error) {
      console.error('Error fetching user SKUs:', error)
      return []
    }
  }

  // Save competitor prices to database
  static async saveCompetitorPrices(userId: string, competitorPrices: any[]): Promise<boolean> {
    if (competitorPrices.length === 0) return true
    
    try {
      const user = await prisma.user.findUnique({
        where: { email: userId }
      })
      
      if (!user) return false
      
      for (const price of competitorPrices) {
        await prisma.competitorPrice.create({
          data: {
            sku_code: price.sku || 'unknown',
            user_id: user.id,
            competitor: price.competitor,
            competitor_price: price.competitor_price,
            our_price: price.our_price || 0,
            price_difference: price.price_difference || 0,
            price_difference_pct: price.price_difference_percentage || 0,
            availability: price.availability || false,
            product_name: price.product_name || null,
            relevance_score: price.relevance_score || 0.5,
            source_url: price.url || null,
            scraping_success: true,
            scraping_method: 'real_scraping'
          }
        })
      }
      
      console.log(`Saved ${competitorPrices.length} competitor prices`)
      return true
      
    } catch (error) {
      console.error('Error saving competitor prices:', error)
      return false
    }
  }

  /**
   * CRITICAL FIX: Save seasonal strategies with proper user ID handling
   */
  static async saveSeasonalStrategies(
    userIdOrEmail: string, 
    analysisId: string, 
    seasonalStrategies: any[]
  ): Promise<void> {
    try {
      console.log(`🎯 SAVING ${seasonalStrategies.length} seasonal strategies`)
      console.log(`Input: userIdOrEmail=${userIdOrEmail}, analysisId=${analysisId}`)
      
      if (!seasonalStrategies || seasonalStrategies.length === 0) {
        console.log('⚠️ No strategies to save')
        return
      }
      
      // Get the actual user ID - IMPROVED LOGIC
      let userId: string
      
      if (userIdOrEmail.includes('@')) {
        const user = await prisma.user.findUnique({
          where: { email: userIdOrEmail }
        })
        
        if (!user) {
          console.error(`❌ User not found for email: ${userIdOrEmail}`)
          throw new Error(`User not found: ${userIdOrEmail}`)
        }
        
        userId = user.id
        console.log(`✅ Found user ID ${userId} for email ${userIdOrEmail}`)
      } else {
        userId = userIdOrEmail
        console.log(`Using provided user ID: ${userId}`)
      }
      
      // Save each strategy with CORRECTED FIELD MAPPING
      let savedCount = 0
      let failedCount = 0
      
      for (const strategy of seasonalStrategies) {
        try {
          console.log(`💾 Saving strategy: ${strategy.title || 'Unnamed'}`)
          
          // FIXED: Proper field mapping to match Prisma schema
          const saved = await prisma.seasonalStrategy.create({
            data: {
              analysis_id: analysisId,
              user_id: userId,
              type: strategy.type || 'seasonal_promotion',
              title: strategy.title || 'Seasonal Strategy',
              description: strategy.description || '',
              reasoning: strategy.reasoning || '',
              seasonal_trigger: strategy.seasonal_trigger || '',
              estimated_revenue_impact: parseFloat(strategy.estimated_revenue_impact) || 0,
              urgency: strategy.urgency || 'medium',
              implementation_timeline: strategy.implementation_timeline || '',
              marketing_angle: strategy.marketing_angle || '',
              target_customer: strategy.target_customer || '',
              // FIXED: Ensure arrays are properly handled
              products_involved: Array.isArray(strategy.products_involved) ? strategy.products_involved : [],
              execution_steps: Array.isArray(strategy.execution_steps) ? strategy.execution_steps : [],
              success_metrics: Array.isArray(strategy.success_metrics) ? strategy.success_metrics : [],
              risk_factors: Array.isArray(strategy.risk_factors) ? strategy.risk_factors : [],
              // FIXED: Handle pricing_strategy object
              pricing_strategy: typeof strategy.pricing_strategy === 'object' ? strategy.pricing_strategy : {},
              ai_confidence: parseFloat(strategy.confidence_score) || 0.8,
              generated_by: 'enhanced_seasonal_engine',
              status: 'pending'
            }
          })
          
          console.log(`✅ Saved strategy with ID: ${saved.id}`)
          savedCount++
          
        } catch (strategyError) {
          console.error(`❌ Failed to save strategy "${strategy.title}":`, strategyError)
          // LOG THE SPECIFIC ERROR
          if (strategyError instanceof Error) {
            console.error(`Error details: ${strategyError.message}`)
          }
          failedCount++
        }
      }
      
      console.log(`📊 SEASONAL SAVE COMPLETE: ${savedCount} saved, ${failedCount} failed`)
      
      // IMPROVED: Only throw if ALL strategies failed
      if (savedCount === 0 && failedCount > 0) {
        throw new Error(`All ${failedCount} seasonal strategies failed to save`)
      }
      
    } catch (error) {
      console.error('❌ CRITICAL ERROR in saveSeasonalStrategies:', error)
      // IMPROVED: Re-throw with context so calling code knows it failed
      throw new Error(`Failed to save seasonal strategies: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get seasonal strategies - handles both email and user ID
   */
  static async getSeasonalStrategies(userIdOrEmail: string, analysisId: string): Promise<any[]> {
    try {
      console.log(`🔍 Getting seasonal strategies for user: ${userIdOrEmail}, analysis: ${analysisId}`)
      
      // Get the actual user ID
      let userId: string
      
      if (userIdOrEmail.includes('@')) {
        const user = await prisma.user.findUnique({
          where: { email: userIdOrEmail }
        })
        
        if (!user) {
          console.log(`❌ User not found: ${userIdOrEmail}`)
          return []
        }
        
        userId = user.id
      } else {
        userId = userIdOrEmail
      }
      
      const strategies = await prisma.seasonalStrategy.findMany({
        where: {
          user_id: userId,
          analysis_id: analysisId
        },
        orderBy: [
          { urgency: 'desc' },
          { estimated_revenue_impact: 'desc' }
        ]
      })
      
      console.log(`✅ Found ${strategies.length} seasonal strategies`)
      
      return strategies.map((strategy: any) => ({
        id: strategy.id,
        type: strategy.type,
        title: strategy.title,
        description: strategy.description,
        reasoning: strategy.reasoning,
        seasonal_trigger: strategy.seasonal_trigger,
        estimated_revenue_impact: strategy.estimated_revenue_impact,
        urgency: strategy.urgency,
        implementation_timeline: strategy.implementation_timeline,
        marketing_angle: strategy.marketing_angle,
        target_customer: strategy.target_customer,
        products_involved: strategy.products_involved || [],
        execution_steps: strategy.execution_steps || [],
        success_metrics: strategy.success_metrics || [],
        risk_factors: strategy.risk_factors || [],
        pricing_strategy: strategy.pricing_strategy || {},
        status: strategy.status,
        created_at: strategy.created_at
      }))
      
    } catch (error) {
      console.error('❌ Error getting seasonal strategies:', error)
      return []
    }
  }

  // Real-time monitoring configuration methods
  static async saveMonitoringConfig(userId: string, config: {
    products: string[]
    intervalMinutes: number
    maxRetailersPerCheck: number
    startedAt: Date
    isActive: boolean
    priorityProducts?: any[] // Add this
    selectionMethod?: string // Add this  
    totalInventorySize?: number // Add this

  }): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: userId }
      })
      
      if (!user) {
        throw new Error(`User not found: ${userId}`)
      }
      
      await prisma.systemMetric.create({
        data: {
          metric_name: 'monitoring_config',
          metric_value: config.intervalMinutes,
          metric_unit: 'minutes',
          user_id: user.id,
          collected_at: config.startedAt,
          retention_days: 30
        }
      })
      
      console.log(`Saved monitoring config for user ${userId}: ${config.products.length} products, ${config.intervalMinutes}min intervals`)
      
    } catch (error) {
      console.error('Error saving monitoring config:', error)
      throw error
    }
  }

  static async getMonitoringConfig(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: userId }
      })
      
      if (!user) return null
      
      const config = await prisma.systemMetric.findFirst({
        where: {
          metric_name: 'monitoring_config',
          user_id: user.id
        },
        orderBy: { collected_at: 'desc' }
      })
      
      if (!config) return null
      
      return {
        userId,
        products: [],
        intervalMinutes: config.metric_value,
        maxRetailersPerCheck: 3,
        startedAt: config.collected_at,
        isActive: true
      }
      
    } catch (error) {
      console.error('Error getting monitoring config:', error)
      return null
    }
  }

  static async updateMonitoringConfig(userId: string, updates: { isActive: boolean }): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: userId }
      })
      
      if (!user) {
        throw new Error(`User not found: ${userId}`)
      }
      
      await prisma.systemMetric.create({
        data: {
          metric_name: 'monitoring_status',
          metric_value: updates.isActive ? 1 : 0,
          metric_unit: 'boolean',
          user_id: user.id,
          retention_days: 30
        }
      })
      
      console.log(`Updated monitoring config for user ${userId}: isActive=${updates.isActive}`)
      
    } catch (error) {
      console.error('Error updating monitoring config:', error)
      throw error
    }
  }

  static async saveCompetitorPricesWithProduct(
    userId: string, 
    product: string, 
    competitorPrices: any[]
  ): Promise<void> {
    if (competitorPrices.length === 0) return
    
    try {
      const user = await prisma.user.findUnique({
        where: { email: userId }
      })
      
      if (!user) {
        throw new Error(`User not found: ${userId}`)
      }
      
      for (const price of competitorPrices) {
        await prisma.competitorPrice.create({
          data: {
            sku_code: price.sku || product.replace(/\s+/g, '-').toUpperCase(),
            user_id: user.id,
            competitor: price.competitor,
            competitor_price: price.competitor_price,
            our_price: price.our_price || 0,
            price_difference: price.price_difference || 0,
            price_difference_pct: price.price_difference_percentage || 0,
            availability: price.availability !== undefined ? price.availability : true,
            product_name: price.product_name || product,
            relevance_score: price.relevance_score || 0.5,
            source_url: price.url,
            scraping_success: true,
            scraping_method: 'real_scraping',
            last_updated: new Date()
          }
        })
      }
      
      console.log(`Saved ${competitorPrices.length} competitor prices for product: ${product}`)
      
    } catch (error) {
      console.error('Error saving competitor prices with product:', error)
      throw error
    }
  }

  // Disconnect database connection
  static async disconnect(): Promise<void> {
    await prisma.$disconnect()
  }
}