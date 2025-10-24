// src/app/api/alerts/manage/route.ts - COMPLETE VERSION with Smart Alerts
import { NextRequest, NextResponse } from 'next/server'
import { PostgreSQLService } from '@/lib/database-postgres'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || searchParams.get('userEmail') || 'demo-user'
    
    console.log(`📊 Getting analysis management data for user: ${userId}`)
    
    // Get recent analyses with alert counts
    const analyses = await PostgreSQLService.getRecentAnalyses(userId, 100)
    
    // Enhanced analysis data with alert counts
    const analysesWithAlertCounts = await Promise.all(
      analyses.map(async (analysis: any) => {
        try {
          // Get user for database queries
          const user = await PostgreSQLService.getUserByEmail(userId)
          if (!user) {
            return {
              uploadId: analysis.uploadId,
              fileName: analysis.fileName,
              processedAt: analysis.processedAt,
              totalSKUs: analysis.summary?.totalSKUs || 0,
              alertCount: 0,
              criticalAlerts: 0,
              unreadAlerts: 0,
              resolvedAlerts: 0,
              hasSmartAlerts: false,
              regularAlertCount: 0,
              smartAlertCount: 0
            }
          }
          
          // Get alert counts from both tables
          const [regularAlerts, smartAlerts] = await Promise.all([
            PostgreSQLService.getAlertsForAnalysisId(user.id, analysis.uploadId),
            PostgreSQLService.getSmartAlertsForAnalysis(userId, analysis.uploadId)
          ])
          
          const allAlerts = [...regularAlerts, ...smartAlerts]
          
          return {
            uploadId: analysis.uploadId,
            fileName: analysis.fileName,
            processedAt: analysis.processedAt,
            totalSKUs: analysis.summary?.totalSKUs || 0,
            alertCount: allAlerts.length,
            criticalAlerts: allAlerts.filter((a: any) => a.severity === 'critical').length,
            unreadAlerts: allAlerts.filter((a: any) => !a.acknowledged && !a.resolved).length,
            resolvedAlerts: allAlerts.filter((a: any) => a.resolved).length,
            hasSmartAlerts: smartAlerts.length > 0,
            regularAlertCount: regularAlerts.length,
            smartAlertCount: smartAlerts.length
          }
        } catch (error) {
          console.error(`Error processing analysis ${analysis.uploadId}:`, error)
          return {
            uploadId: analysis.uploadId,
            fileName: analysis.fileName,
            processedAt: analysis.processedAt,
            totalSKUs: analysis.summary?.totalSKUs || 0,
            alertCount: 0,
            criticalAlerts: 0,
            unreadAlerts: 0,
            resolvedAlerts: 0,
            hasSmartAlerts: false,
            regularAlertCount: 0,
            smartAlertCount: 0,
            error: 'Failed to load alert counts'
          }
        }
      })
    )
    
    // Calculate totals
    const totals = analysesWithAlertCounts.reduce(
      (acc, analysis) => ({
        totalAnalyses: acc.totalAnalyses + 1,
        totalAlerts: acc.totalAlerts + analysis.alertCount,
        totalUnread: acc.totalUnread + analysis.unreadAlerts,
        totalCritical: acc.totalCritical + analysis.criticalAlerts,
        totalSKUs: acc.totalSKUs + analysis.totalSKUs,
        totalSmartAlerts: acc.totalSmartAlerts + analysis.smartAlertCount,
        totalRegularAlerts: acc.totalRegularAlerts + analysis.regularAlertCount
      }),
      { 
        totalAnalyses: 0, 
        totalAlerts: 0, 
        totalUnread: 0, 
        totalCritical: 0, 
        totalSKUs: 0,
        totalSmartAlerts: 0,
        totalRegularAlerts: 0
      }
    )
    
    return NextResponse.json({
      success: true,
      analyses: analysesWithAlertCounts,
      totals,
      features: {
        smartAlertsEnabled: true,
        realTimeAlerts: true,
        aiIntegration: !!process.env.ANTHROPIC_API_KEY
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error fetching analyses for management:', error)
    return NextResponse.json({
      error: 'Failed to fetch analyses',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const analysisId = searchParams.get('analysisId')
    const userId = searchParams.get('userId') || searchParams.get('userEmail') || 'demo-user'
    const deleteAll = searchParams.get('deleteAll') === 'true'
    
    if (deleteAll) {
      return NextResponse.json({
        error: 'Delete all analyses not implemented for safety'
      }, { status: 400 })
    }
    
    if (!analysisId) {
      return NextResponse.json({
        error: 'analysisId parameter required'
      }, { status: 400 })
    }
    
    console.log(`🗑️ Deleting analysis ${analysisId} for user ${userId}`)
    
    try {
      // Use the enhanced delete method that handles smart alerts
      const success = await PostgreSQLService.deleteAnalysis(analysisId, userId)
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Analysis and all related data (including smart alerts) deleted successfully',
          analysisId,
          deletedItems: [
            'Analysis record',
            'Regular alerts',
            'Smart alerts',
            'Price recommendations',
            'Competitor data',
            'Seasonal strategies'
          ],
          timestamp: new Date().toISOString()
        })
      } else {
        return NextResponse.json({
          error: 'Analysis not found or deletion failed'
        }, { status: 404 })
      }
      
    } catch (deleteError) {
      console.error('Error deleting analysis:', deleteError)
      return NextResponse.json({
        error: 'Failed to delete analysis',
        details: deleteError instanceof Error ? deleteError.message : 'Unknown error'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Error in delete request:', error)
    return NextResponse.json({
      error: 'Failed to process delete request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// BONUS: Add a PATCH method for bulk operations
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, analysisIds, userId, userEmail } = body
    
    const userIdentifier = userId || userEmail
    if (!userIdentifier) {
      return NextResponse.json({
        error: 'User authentication required'
      }, { status: 401 })
    }
    
    if (!action || !analysisIds || !Array.isArray(analysisIds)) {
      return NextResponse.json({
        error: 'Missing required fields: action, analysisIds (array)'
      }, { status: 400 })
    }
    
    console.log(`🔄 Bulk ${action} for ${analysisIds.length} analyses`)
    
    const results = {
      successful: [] as string[],
      failed: [] as string[]
    }
    
    for (const analysisId of analysisIds) {
      try {
        if (action === 'delete') {
          const success = await PostgreSQLService.deleteAnalysis(analysisId, userIdentifier)
          if (success) {
            results.successful.push(analysisId)
          } else {
            results.failed.push(analysisId)
          }
        } else if (action === 'acknowledge_all_alerts') {
          // Get all alerts for this analysis and acknowledge them
          const user = await PostgreSQLService.getUserByEmail(userIdentifier)
          if (user) {
            const [regularAlerts, smartAlerts] = await Promise.all([
              PostgreSQLService.getAlertsForAnalysisId(user.id, analysisId),
              PostgreSQLService.getSmartAlertsForAnalysis(userIdentifier, analysisId)
            ])
            
            // Acknowledge all regular alerts
            for (const alert of regularAlerts) {
              if (!alert.acknowledged) {
                await PostgreSQLService.updateAlertStatus(alert.id, 'acknowledged', userIdentifier)
              }
            }
            
            // Acknowledge all smart alerts
            for (const alert of smartAlerts) {
              if (!alert.acknowledged) {
                await PostgreSQLService.updateSmartAlertStatus(alert.id, 'acknowledge', userIdentifier)
              }
            }
            
            results.successful.push(analysisId)
          } else {
            results.failed.push(analysisId)
          }
        } else {
          results.failed.push(analysisId)
        }
      } catch (error) {
        console.error(`Bulk operation failed for ${analysisId}:`, error)
        results.failed.push(analysisId)
      }
    }
    
    return NextResponse.json({
      success: true,
      action,
      results,
      summary: {
        total: analysisIds.length,
        successful: results.successful.length,
        failed: results.failed.length
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error in bulk operation:', error)
    return NextResponse.json({
      error: 'Failed to process bulk operation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}