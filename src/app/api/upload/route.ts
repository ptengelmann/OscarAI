// src/app/api/upload/route.ts - FIXED VERSION with Smart Alerts
import { NextRequest, NextResponse } from 'next/server'
import { parseCSVData, calculatePriceRecommendation, assessInventoryRisk, convertToAlcoholSKU } from '@/lib/utils'
import { PostgreSQLService } from '@/lib/database-postgres'
import { GPTCommerceIntelligence } from '@/lib/gpt-commerce-intelligence'
import { EnhancedSeasonalRecommendations } from '@/lib/enhanced-seasonal-recommendations'
import { AlertEngine } from '@/lib/alert-engine' // FIXED: Import corrected
import { AlcoholSKU, CompetitorPrice } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now()
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userEmail = formData.get('userEmail') as string
    const userId = formData.get('userId') as string
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!userEmail || !userId) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 })
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 })
    }

    console.log(`🍺 Processing file: ${file.name} for user: ${userEmail}`)

    const content = await file.text()
    const { headers, data } = parseCSVData(content)
    
    console.log('CSV Headers found:', headers)
    console.log('Total rows:', data.length)
    
    // Enhanced column mapping
    const columnVariations = {
      sku: ['sku', 'product_id', 'item_id', 'code', 'product_code', 'item_code'],
      price: ['price', 'unit_price', 'cost', 'retail_price', 'selling_price', 'current_price'],
      weekly_sales: ['weekly_sales', 'sales', 'units_sold', 'quantity_sold', 'weekly_units', 'weekly_qty', 'sales_per_week'],
      inventory_level: ['inventory_level', 'stock', 'inventory', 'stock_level', 'quantity', 'qty_on_hand', 'current_stock']
    }
    
    const actualColumns: Record<string, string> = {}
    for (const [standardName, variations] of Object.entries(columnVariations)) {
      const foundColumn = variations.find(variation => 
        headers.some(header => header.toLowerCase().trim() === variation.toLowerCase())
      )
      if (foundColumn) {
        actualColumns[standardName] = headers.find(h => h.toLowerCase().trim() === foundColumn.toLowerCase()) || foundColumn
      }
    }
    
    console.log('Column mapping:', actualColumns)
    
    const requiredColumns = ['sku', 'price', 'weekly_sales', 'inventory_level']
    const missingColumns = requiredColumns.filter(col => !actualColumns[col])
    
    if (missingColumns.length > 0) {
      return NextResponse.json({ 
        error: `Missing required columns: ${missingColumns.join(', ')}`,
        found: headers,
        required: requiredColumns,
        suggestions: 'Use column names like: sku, price, weekly_sales, inventory_level'
      }, { status: 400 })
    }

    // Process CSV data into AlcoholSKUs
    const alcoholSKUs: AlcoholSKU[] = []
    const processingErrors: string[] = []
    
    console.log('🔄 Converting CSV data to alcohol SKUs...')
    
    for (const row of data) {
      const sku = row[actualColumns.sku]
      const currentPrice = parseFloat(row[actualColumns.price]?.toString().replace(/[^\d.-]/g, '')) || 0
      const weeklySales = parseFloat(row[actualColumns.weekly_sales]?.toString().replace(/[^\d.-]/g, '')) || 0
      const inventoryLevel = parseFloat(row[actualColumns.inventory_level]?.toString().replace(/[^\d.-]/g, '')) || 0
      
      if (!sku || currentPrice <= 0) {
        processingErrors.push(`Invalid row: sku=${sku}, price=${currentPrice}`)
        continue
      }
      
      // Convert to alcohol SKU with intelligent categorization
      const alcoholSKU = convertToAlcoholSKU({
        sku,
        price: currentPrice.toString(),
        weekly_sales: weeklySales.toString(),
        inventory_level: inventoryLevel.toString(),
        // Pass through any additional CSV columns
        ...row
      })
      
      alcoholSKUs.push(alcoholSKU)
    }

    console.log(`✅ Processed ${alcoholSKUs.length} valid SKUs`)
    if (processingErrors.length > 0) {
      console.log(`⚠️ ${processingErrors.length} rows had errors`)
    }

    // Generate upload ID early so it can be used consistently
    const uploadId = uuidv4()

    // STEP 1: Identify slow-moving products for GPT-4 creative recommendations
    const slowMovingProducts = alcoholSKUs
      .filter(sku => parseFloat(sku.weekly_sales) < 1 && parseInt(sku.inventory_level) > 10)
      .map(sku => ({
        sku: sku.sku,
        category: sku.category,
        brand: sku.brand,
        inventory_level: parseInt(sku.inventory_level),
        weeks_since_last_sale: 4, // Estimate
        price: parseFloat(sku.price),
        cost_price: undefined
      }))

    console.log(`🎯 Found ${slowMovingProducts.length} slow-moving products for GPT-4 analysis`)

    // STEP 2: Generate GPT-4 Creative Recommendations (REAL AI)
    let creativeRecommendations: any[] = []
    let portfolioInsights: any = {}
    let gptProcessingTime = 0

    if (slowMovingProducts.length > 0) {
      console.log('🤖 Generating GPT-4 creative strategies...')
      const gptStartTime = Date.now()
      
      try {
        // Generate creative strategies like mystery boxes
        creativeRecommendations = await GPTCommerceIntelligence.generateCreativeRecommendations(
          slowMovingProducts,
          alcoholSKUs
        )
        
        // Generate portfolio-level insights
        portfolioInsights = await GPTCommerceIntelligence.generateInventoryInsights(
          alcoholSKUs,
          [] // Historical data from database would go here
        )
        
        gptProcessingTime = Date.now() - gptStartTime
        console.log(`✨ Generated ${creativeRecommendations.length} GPT-4 strategies in ${gptProcessingTime}ms`)
        
      } catch (gptError) {
        console.error('❌ GPT-4 analysis failed:', gptError)
        creativeRecommendations = []
        portfolioInsights = { 
          error: 'AI recommendations unavailable - check OpenAI API key',
          details: gptError instanceof Error ? gptError.message : 'Unknown GPT-4 error'
        }
      }
    }

    // STEP 2.5: Generate Enhanced Seasonal Recommendations
    console.log('🎄 Generating enhanced seasonal recommendations...')
    let seasonalStrategies: any[] = []
    let seasonalProcessingTime = 0

    try {
      const seasonalStartTime = Date.now()
      
      // Generate seasonal recommendations using the enhanced engine
      seasonalStrategies = await EnhancedSeasonalRecommendations.generateContextualRecommendations(
        alcoholSKUs,
        [], // Competitor data - would come from scraping
        userEmail
      )
      
      seasonalProcessingTime = Date.now() - seasonalStartTime
      console.log(`🎄 Generated ${seasonalStrategies.length} seasonal strategies in ${seasonalProcessingTime}ms`)
      
      // Save seasonal strategies to database immediately
      if (seasonalStrategies.length > 0) {
        try {
          await PostgreSQLService.saveSeasonalStrategies(userEmail, uploadId, seasonalStrategies)
          console.log(`✅ Saved ${seasonalStrategies.length} seasonal strategies to database`)
        } catch (saveError) {
          console.error('❌ Failed to save seasonal strategies:', saveError)
        }
      }
      
    } catch (seasonalError) {
      console.error('❌ Seasonal recommendation generation failed:', seasonalError)
      seasonalStrategies = []
    }

    // STEP 3: Generate standard price and inventory recommendations
    const priceRecommendations: any[] = []
    const inventoryAlerts: any[] = []
    let totalRevenuePotential = 0

    console.log('📊 Generating price and inventory recommendations...')

    for (const alcoholSKU of alcoholSKUs) {
      const currentPrice = parseFloat(alcoholSKU.price)
      const weeklySales = parseFloat(alcoholSKU.weekly_sales)
      const inventoryLevel = parseInt(alcoholSKU.inventory_level)
      
      // Generate price recommendation (no mocks - uses AI engine)
      const priceRec = calculatePriceRecommendation(
        currentPrice,
        weeklySales,
        inventoryLevel,
        alcoholSKU.sku,
        alcoholSKU,
        [] // Competitor prices would come from real scraping
      )
      
      // Calculate revenue impact
      const revenueImpact = (priceRec.recommendedPrice - priceRec.currentPrice) * weeklySales * 4
      totalRevenuePotential += revenueImpact
      
      // Check if this SKU is part of a creative strategy
      const creativeStrategy = creativeRecommendations.find(strategy => 
        strategy.products_involved && strategy.products_involved.includes(alcoholSKU.sku)
      )
      
      priceRecommendations.push({
        sku: alcoholSKU.sku,
        category: alcoholSKU.category,
        brand: alcoholSKU.brand,
        currentPrice,
        recommendedPrice: priceRec.recommendedPrice,
        changePercentage: priceRec.changePercentage,
        reason: priceRec.reason,
        confidence: priceRec.confidence,
        weeklySales,
        inventoryLevel,
        revenueImpact,
        hasCreativeStrategy: !!creativeStrategy,
        creativeStrategy: creativeStrategy || null,
        aiEnhanced: true
      })
      
      // Assess inventory risk
      const riskAssessment = assessInventoryRisk(inventoryLevel, weeklySales, alcoholSKU.sku, alcoholSKU)
      if (riskAssessment.riskType !== 'none') {
        inventoryAlerts.push(riskAssessment)
      }
    }

    // STEP 4: Generate AI-powered alerts with smart alerts - FIXED VERSION
    console.log('🚨 Generating AI-powered alerts with AI integration...')

    let smartAlerts: any[] = []
    try {
      const alertResults = await AlertEngine.generateIntelligentAlerts(
        alcoholSKUs,
        uploadId,
        userEmail
      )
      
      // Use the enhanced alerts with AI AI
      smartAlerts = alertResults.smart_alerts
      
      console.log(`⚡ Generated ${smartAlerts.length} smart alerts with AI AI`)
      
    } catch (alertError) {
      console.error('❌ AI alert generation failed:', alertError)
      
      // Fallback to basic generation
      const basicAlerts = AlertEngine.generateAlertsFromAnalysis(
        alcoholSKUs,
        priceRecommendations.map(rec => ({
          sku: rec.sku,
          analysis_id: uploadId,
          forecast: {
            predicted_demand: rec.weeklySales * 4,
            confidence_interval: { confidence_level: rec.confidence },
            trend: rec.changePercentage > 0 ? 'increasing' : 'decreasing'
          }
        })),
        []
      )
      
      // Convert basic alerts to smart alert format
      smartAlerts = basicAlerts.slice(0, 5).map(alert => ({
        id: `fallback-${alert.id}`,
        analysis_id: uploadId,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        recommendation: {
          ai_analysis: `Fallback analysis for ${alert.type} alert`,
          strategic_options: [alert.action_required],
          immediate_actions: [alert.action_required],
          risk_level: alert.severity,
          confidence_score: 0.7
        },
        auto_generated: true,
        requires_human: alert.severity === 'critical',
        acknowledged: false,
        resolved: false,
        auto_resolved: false,
        created_at: new Date()
      }))
      
      console.log(`🚨 Generated ${smartAlerts.length} fallback smart alerts`)
    }

    // STEP 5: Calculate seasonal revenue potential
    const seasonalRevenuePotential = seasonalStrategies.reduce((sum, strategy) => 
      sum + (strategy.estimated_revenue_impact || 0), 0
    )

    // STEP 6: Generate comprehensive summary with seasonal and smart alert metrics
    const summary = {
      totalSKUs: alcoholSKUs.length,
      slowMovingProducts: slowMovingProducts.length,
      creativeStrategiesGenerated: creativeRecommendations.length,
      alertsGenerated: smartAlerts.length,
      
      // Seasonal metrics
      seasonalStrategiesGenerated: seasonalStrategies.length,
      seasonalRevenuePotential: seasonalRevenuePotential,
      
      // Smart alerts metrics
      smartAlertsGenerated: smartAlerts.length,
      criticalSmartAlerts: smartAlerts.filter(a => a.severity === 'critical').length,
      
      priceIncreases: priceRecommendations.filter(r => r.changePercentage > 0).length,
      priceDecreases: priceRecommendations.filter(r => r.changePercentage < 0).length,
      noChange: priceRecommendations.filter(r => r.changePercentage === 0).length,
      
      highRiskSKUs: inventoryAlerts.filter(a => a.riskLevel === 'high').length,
      mediumRiskSKUs: inventoryAlerts.filter(a => a.riskLevel === 'medium').length,
      
      totalRevenuePotential: Math.round(totalRevenuePotential),
      
      // GPT-4 specific metrics
      aiPowered: creativeRecommendations.length > 0,
      gptProcessingTimeMs: gptProcessingTime,
      seasonalProcessingTimeMs: seasonalProcessingTime,
      
      // Category breakdown
      categoryBreakdown: generateCategoryBreakdown(priceRecommendations),
      
      portfolioHealth: {
        fastMovers: priceRecommendations.filter(r => r.weeklySales > 5).length,
        slowMovers: priceRecommendations.filter(r => r.weeklySales < 1).length,
        averageWeeksOfStock: priceRecommendations.reduce((sum, r) => 
          sum + (r.inventoryLevel / (r.weeklySales || 0.1)), 0) / priceRecommendations.length
      }
    }

    // STEP 7: Save to PostgreSQL with SMART ALERTS - ENHANCED VERSION
    const processingTime = Date.now() - startTime
    
    const analysisData = {
      uploadId,
      fileName: file.name,
      userId,
      userEmail,
      summary,
      priceRecommendations,
      inventoryAlerts: inventoryAlerts.slice(0, 20),
      smartAlerts: [], // Keep empty for backward compatibility
      competitorData: [], // Will be populated by real scraping
      marketInsights: Object.keys(portfolioInsights).length > 0 ? [portfolioInsights] : [],
      processingTimeMs: processingTime,
      seasonalStrategies: seasonalStrategies,
      smart_alerts: smartAlerts // Add the new field for smart alerts
    }

    let savedId: string | null = null
    let databaseError: string | null = null
    
    try {
      savedId = await PostgreSQLService.saveAnalysisWithSmartAlerts(analysisData)
      console.log(`✅ Analysis and ${smartAlerts.length} smart alerts saved to PostgreSQL with ID: ${savedId}`)
    } catch (dbError) {
      console.error('❌ Enhanced PostgreSQL save failed:', dbError)
      databaseError = dbError instanceof Error ? dbError.message : 'Database save failed'
    }

    console.log(`🎉 Analysis complete in ${processingTime}ms`)
    console.log(`📊 Generated ${priceRecommendations.length} recommendations`)
    console.log(`🤖 Created ${creativeRecommendations.length} GPT-4 strategies`)
    console.log(`⚡ Generated ${smartAlerts.length} smart alerts with AI AI`)
    console.log(`🎄 Generated ${seasonalStrategies.length} seasonal strategies`)

    return NextResponse.json({
      success: true,
      uploadId,
      savedToDatabase: !!savedId,
      databaseError,
      
      // Core results
      summary,
      priceRecommendations: priceRecommendations.slice(0, 50),
      inventoryAlerts: inventoryAlerts.slice(0, 20),
      
      // GPT-4 powered insights
      creativeStrategies: creativeRecommendations,
      portfolioInsights,
      
      // AI-powered alerts - ENHANCED
      smartAlerts: smartAlerts.slice(0, 10), // Preview for UI
      
      // Seasonal strategies
      seasonalStrategies: seasonalStrategies,
      
      // Metadata
      processedAt: new Date().toISOString(),
      processingTimeMs: processingTime,
      gptProcessingTimeMs: gptProcessingTime,
      seasonalProcessingTimeMs: seasonalProcessingTime,
      userId,
      userEmail,
      columnMapping: actualColumns,
      
      // Debug info
      debug: {
        totalRowsProcessed: data.length,
        validSKUsFound: alcoholSKUs.length,
        processingErrors: processingErrors.length,
        slowMovingProductsFound: slowMovingProducts.length,
        gptStrategiesGenerated: creativeRecommendations.length,
        smartAlertsGenerated: smartAlerts.length,
        seasonalStrategiesGenerated: seasonalStrategies.length,
        databaseUsed: 'PostgreSQL'
      }
    })

  } catch (error) {
    console.error('❌ Upload processing error:', error)
    return NextResponse.json({ 
      error: 'Failed to process file',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper function for category breakdown
function generateCategoryBreakdown(recommendations: any[]) {
  const breakdown = recommendations.reduce((acc, rec) => {
    const category = rec.category || 'unknown'
    if (!acc[category]) {
      acc[category] = {
        count: 0,
        totalRevenuePotential: 0,
        avgRevenuePotential: 0,
        slowMovers: 0,
        fastMovers: 0,
        avgWeeksOfStock: 0
      }
    }
    
    acc[category].count++
    acc[category].totalRevenuePotential += rec.revenueImpact || 0
    acc[category].avgWeeksOfStock += (rec.inventoryLevel / (rec.weeklySales || 0.1))
    
    if (rec.weeklySales < 1) {
      acc[category].slowMovers++
    } else if (rec.weeklySales > 5) {
      acc[category].fastMovers++
    }
    
    return acc
  }, {} as Record<string, any>)

  // Calculate averages
  Object.keys(breakdown).forEach(category => {
    const cat = breakdown[category]
    cat.avgRevenuePotential = cat.totalRevenuePotential / cat.count
    cat.avgWeeksOfStock = cat.avgWeeksOfStock / cat.count
  })

  return breakdown
}