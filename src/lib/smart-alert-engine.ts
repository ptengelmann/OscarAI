// BRAND NEW Smart Alert Engine - Actionable & Automated
// Generates intelligent alerts with real revenue calculations and AI AI recommendations

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface ActionableAlert {
  // Identity
  id: string
  sku_code: string
  type: 'critical_stockout' | 'overstock_cash_drain' | 'price_opportunity' | 'competitor_threat' | 'seasonal_urgency' | 'dead_stock'
  severity: 'critical' | 'high' | 'medium' | 'low'

  // Smart messaging
  title: string // "URGENT: £12,400 revenue at risk"
  message: string // Full context with numbers
  short_description: string // Quick summary

  // Business intelligence
  revenue_at_risk: number // Actual £ at stake
  cost_to_resolve: number // What it costs to fix
  estimated_impact: number // Net benefit
  urgency_score: number // 1-10
  time_to_critical: string // "24 hours" or "3 days"

  // Actionable recommendations
  primary_action: {
    title: string // "Emergency reorder 120 units"
    steps: string[] // Specific steps
    deadline: string // "By Friday 5pm"
    expected_outcome: string // "Prevents £12k loss"
    automation_available: boolean // Can we auto-execute?
    auto_execute_conditions?: string[] // When to auto-execute
  }

  alternative_actions: Array<{
    title: string
    when_to_use: string // "If supplier unavailable"
    steps: string[]
    expected_outcome: string
  }>

  // AI enhancement
  ai_analysis?: string
  confidence_level: number // 0-1

  // Context
  product_context: {
    category: string
    price: number
    weekly_sales: number
    current_stock: number
    weeks_of_stock: number
    seasonal_peak?: string
    competitor_price?: number
  }

  // Automation
  can_auto_resolve: boolean
  auto_resolve_conditions?: string[]
  escalate_if_not_resolved_hours?: number

  // Tracking
  created_at: Date
  acknowledged: boolean
  resolved: boolean
}

export class SmartAlertEngine {


  /**
   * CRITICAL STOCKOUT - Immediate action required
   */
  private static createCriticalStockoutAlert(
    sku: any,
    weeksOfStock: number,
    price: number,
    weeklySales: number,
    currentStock: number
  ): ActionableAlert {

    const daysToStockout = Math.max(1, Math.floor(weeksOfStock * 7))
    const reorderQuantity = Math.ceil(weeklySales * 8) // 8 weeks of stock
    const revenueAtRisk = Math.floor(price * weeklySales * 4) // 4 weeks of lost sales
    const costToResolve = price * reorderQuantity * 0.6 // Assuming 60% cost

    const deadlineDate = new Date()
    deadlineDate.setDate(deadlineDate.getDate() + Math.max(1, daysToStockout - 2))
    const deadline = deadlineDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

    return {
      id: `stockout-${sku.sku}-${Date.now()}`,
      sku_code: sku.sku,
      type: 'critical_stockout',
      severity: daysToStockout <= 3 ? 'critical' : daysToStockout <= 7 ? 'high' : 'medium',

      title: `🔴 STOCKOUT RISK: £${revenueAtRisk.toLocaleString()} revenue at risk`,
      message: `${sku.sku} will run out in ${daysToStockout} days. Currently ${currentStock} units left, selling ${weeklySales.toFixed(1)} per week. If we don't reorder NOW, you'll lose £${revenueAtRisk.toLocaleString()} in sales over the next month.`,
      short_description: `${daysToStockout} days until stockout - ${weeklySales.toFixed(1)}/week sales`,

      revenue_at_risk: revenueAtRisk,
      cost_to_resolve: costToResolve,
      estimated_impact: revenueAtRisk - costToResolve,
      urgency_score: daysToStockout <= 2 ? 10 : daysToStockout <= 5 ? 8 : 6,
      time_to_critical: `${daysToStockout} days`,

      primary_action: {
        title: `Emergency reorder ${reorderQuantity} units`,
        steps: [
          `Contact supplier immediately`,
          `Request expedited delivery for ${reorderQuantity} units`,
          `Confirm delivery date is before ${deadline}`,
          `Prepare payment (approx £${Math.floor(costToResolve).toLocaleString()})`,
          `Set calendar reminder to track delivery`
        ],
        deadline: `Order by ${deadline} to avoid stockout`,
        expected_outcome: `Prevents £${revenueAtRisk.toLocaleString()} revenue loss, maintains customer satisfaction`,
        automation_available: true,
        auto_execute_conditions: [
          'If days to stockout < 2',
          'If approved supplier exists',
          'If under spending limit'
        ]
      },

      alternative_actions: [
        {
          title: 'Find alternative supplier',
          when_to_use: 'If main supplier cannot deliver in time',
          steps: [
            'Search marketplace for alternative suppliers',
            'Compare pricing and delivery times',
            'Place backup order with 2nd choice supplier',
            'Cancel if main supplier confirms'
          ],
          expected_outcome: 'Backup plan prevents stockout'
        },
        {
          title: 'Pre-sell with extended delivery',
          when_to_use: 'If all suppliers delayed',
          steps: [
            'Email customers about temporary stock issue',
            'Offer 10% discount for accepting 2-week delivery',
            'Take pre-orders to lock in sales',
            'Fulfill when stock arrives'
          ],
          expected_outcome: 'Recovers 60-70% of potential lost revenue'
        }
      ],

      confidence_level: 0.95,

      product_context: {
        category: sku.category || 'Unknown',
        price,
        weekly_sales: weeklySales,
        current_stock: currentStock,
        weeks_of_stock: weeksOfStock,
        seasonal_peak: this.getSeasonalPeak(sku.category)
      },

      can_auto_resolve: false, // Needs human approval for reorders
      escalate_if_not_resolved_hours: daysToStockout * 24 - 12,

      created_at: new Date(),
      acknowledged: false,
      resolved: false
    }
  }

  /**
   * OVERSTOCK CASH DRAIN - Money tied up in inventory
   */
  private static createOverstockCashDrainAlert(
    sku: any,
    weeksOfStock: number,
    price: number,
    weeklySales: number,
    currentStock: number
  ): ActionableAlert {

    const excessStock = Math.floor(currentStock - (weeklySales * 12)) // Keep 12 weeks max
    const cashTiedUp = Math.floor(excessStock * price * 0.7) // 70% cost basis
    const holdingCostPerMonth = Math.floor(cashTiedUp * 0.02) // 2% monthly holding cost
    const discountRecommended = 15 // 15% discount
    const discountedPrice = Math.floor(price * (1 - discountRecommended / 100))
    const expectedSaleIncrease = 2.5 // 2.5x sales with discount
    const unitsToMove = Math.min(excessStock, Math.ceil(weeklySales * expectedSaleIncrease * 4)) // 4 weeks of boosted sales
    const cashRecovery = Math.floor(unitsToMove * discountedPrice)

    return {
      id: `overstock-${sku.sku}-${Date.now()}`,
      sku_code: sku.sku,
      type: 'overstock_cash_drain',
      severity: weeksOfStock > 30 ? 'high' : 'medium',

      title: `💰 CASH DRAIN: £${cashTiedUp.toLocaleString()} tied up in excess stock`,
      message: `${sku.sku} has ${Math.floor(weeksOfStock)} weeks of stock (${currentStock} units). You have £${cashTiedUp.toLocaleString()} tied up in inventory, costing £${holdingCostPerMonth}/month in holding costs. Run a flash sale to recover £${cashRecovery.toLocaleString()} cash.`,
      short_description: `${Math.floor(weeksOfStock)} weeks stock - £${cashTiedUp.toLocaleString()} tied up`,

      revenue_at_risk: holdingCostPerMonth * 3, // 3 months of holding costs
      cost_to_resolve: Math.floor(excessStock * price * (discountRecommended / 100)), // Lost margin
      estimated_impact: cashRecovery,
      urgency_score: weeksOfStock > 30 ? 7 : 5,
      time_to_critical: 'Ongoing cash flow impact',

      primary_action: {
        title: `Flash sale: ${discountRecommended}% off to clear ${unitsToMove} units`,
        steps: [
          `Create promotional campaign: "${discountRecommended}% OFF - Limited Time"`,
          `Set discounted price: £${discountedPrice} (normally £${price})`,
          `Email customer list about flash sale`,
          `Run targeted social media ads (budget £200-300)`,
          `Monitor sales daily, adjust if needed`
        ],
        deadline: 'Launch by this weekend',
        expected_outcome: `Recover £${cashRecovery.toLocaleString()} cash, reduce holding costs by £${holdingCostPerMonth}/month`,
        automation_available: true,
        auto_execute_conditions: [
          'If weeks of stock > 25',
          'If promotional budget available',
          'If historically responds well to discounts'
        ]
      },

      alternative_actions: [
        {
          title: 'Bundle with fast-moving products',
          when_to_use: 'If discounting hurts brand image',
          steps: [
            'Identify 3-4 fast-moving complementary products',
            'Create "Premium Bundle" with small discount',
            'Market as curated selection, not clearance',
            'Maintain price perception'
          ],
          expected_outcome: 'Move stock while protecting brand'
        },
        {
          title: 'Wholesale to secondary market',
          when_to_use: 'If retail sales too slow',
          steps: [
            'Contact wholesale buyers/distributors',
            'Offer bulk discount (25-30% off)',
            'Negotiate quick payment terms',
            'Clear stock in one transaction'
          ],
          expected_outcome: `Quick cash recovery, even if at lower margin`
        }
      ],

      confidence_level: 0.88,

      product_context: {
        category: sku.category || 'Unknown',
        price,
        weekly_sales: weeklySales,
        current_stock: currentStock,
        weeks_of_stock: weeksOfStock
      },

      can_auto_resolve: false, // Need approval for promotions
      escalate_if_not_resolved_hours: weeksOfStock > 30 ? 72 : undefined,

      created_at: new Date(),
      acknowledged: false,
      resolved: false
    }
  }

  /**
   * DEAD STOCK - Not selling, needs aggressive action
   */
  private static createDeadStockAlert(
    sku: any,
    weeksOfStock: number,
    price: number,
    currentStock: number
  ): ActionableAlert {

    const totalValue = Math.floor(currentStock * price)
    const writeDownValue = Math.floor(totalValue * 0.7) // Expect 30% recovery max

    return {
      id: `deadstock-${sku.sku}-${Date.now()}`,
      sku_code: sku.sku,
      type: 'dead_stock',
      severity: 'high',

      title: `☠️ DEAD STOCK: £${totalValue.toLocaleString()} needs immediate action`,
      message: `${sku.sku} is not selling (${Math.floor(weeksOfStock)} weeks of stock, ${currentStock} units). Total value: £${totalValue.toLocaleString()}. This is dead money. Recommendation: Aggressive clearance or write-off.`,
      short_description: `Not selling - £${totalValue.toLocaleString()} at risk`,

      revenue_at_risk: writeDownValue,
      cost_to_resolve: 0,
      estimated_impact: -writeDownValue,
      urgency_score: 8,
      time_to_critical: 'Already critical',

      primary_action: {
        title: `Aggressive clearance: 40-50% off`,
        steps: [
          `Mark down to £${Math.floor(price * 0.5)} (50% off)`,
          `Create "Final Clearance" campaign`,
          `Offer bulk discounts (buy 2 get 3rd free)`,
          `Consider donating remainder for tax write-off`,
          `Remove from regular inventory after 30 days`
        ],
        deadline: 'Start clearance immediately',
        expected_outcome: `Recover £${Math.floor(totalValue * 0.3).toLocaleString()}-£${Math.floor(totalValue * 0.5).toLocaleString()}, free up warehouse space`,
        automation_available: false
      },

      alternative_actions: [
        {
          title: 'Return to supplier',
          when_to_use: 'If within return window',
          steps: [
            'Check supplier return policy',
            'Contact supplier about return/credit',
            'Negotiate restocking fee',
            'Arrange pickup/shipping'
          ],
          expected_outcome: 'Best case: 80-90% value recovery'
        },
        {
          title: 'Liquidation partner',
          when_to_use: 'For quick cash exit',
          steps: [
            'Contact liquidation companies',
            'Get bulk purchase quotes',
            'Accept best offer',
            'Immediate cash recovery'
          ],
          expected_outcome: 'Fast exit, expect 20-40% of value'
        }
      ],

      confidence_level: 0.92,

      product_context: {
        category: sku.category || 'Unknown',
        price,
        weekly_sales: 0,
        current_stock: currentStock,
        weeks_of_stock: weeksOfStock
      },

      can_auto_resolve: false,
      escalate_if_not_resolved_hours: 48,

      created_at: new Date(),
      acknowledged: false,
      resolved: false
    }
  }

  /**
   * PRICE OPPORTUNITY - Increase margins on hot products
   */
  private static createPriceOpportunityAlert(
    sku: any,
    price: number,
    weeklySales: number,
    currentStock: number
  ): ActionableAlert {

    const priceIncreasePercent = 8
    const newPrice = Math.floor(price * (1 + priceIncreasePercent / 100))
    const estimatedSalesDrop = 0.15 // Expect 15% volume drop
    const newWeeklySales = weeklySales * (1 - estimatedSalesDrop)
    const currentMonthlyRevenue = Math.floor(price * weeklySales * 4.33)
    const newMonthlyRevenue = Math.floor(newPrice * newWeeklySales * 4.33)
    const monthlyRevenueGain = newMonthlyRevenue - currentMonthlyRevenue
    const annualGain = monthlyRevenueGain * 12

    return {
      id: `priceopportunity-${sku.sku}-${Date.now()}`,
      sku_code: sku.sku,
      type: 'price_opportunity',
      severity: 'medium',

      title: `📈 PROFIT OPPORTUNITY: £${annualGain.toLocaleString()}/year potential`,
      message: `${sku.sku} is selling strongly (${weeklySales.toFixed(1)}/week). Customer demand is high. Recommendation: Increase price by ${priceIncreasePercent}% (£${price} → £${newPrice}) to capture £${monthlyRevenueGain.toLocaleString()}/month additional margin.`,
      short_description: `Strong demand - ${priceIncreasePercent}% price increase opportunity`,

      revenue_at_risk: 0,
      cost_to_resolve: 0,
      estimated_impact: monthlyRevenueGain,
      urgency_score: 5,
      time_to_critical: 'Ongoing opportunity cost',

      primary_action: {
        title: `Test ${priceIncreasePercent}% price increase`,
        steps: [
          `Update price: £${price} → £${newPrice}`,
          `Monitor sales closely for 2 weeks`,
          `Track: sales volume, revenue, customer feedback`,
          `Adjust if sales drop > 20%`,
          `If successful, keep new price permanently`
        ],
        deadline: 'Test next week',
        expected_outcome: `£${monthlyRevenueGain.toLocaleString()}/month additional revenue (£${annualGain.toLocaleString()}/year)`,
        automation_available: true,
        auto_execute_conditions: [
          'If sales velocity > 2x category average',
          'If stock levels healthy (> 6 weeks)',
          'If no recent price changes (< 90 days)'
        ]
      },

      alternative_actions: [
        {
          title: 'Create premium variant',
          when_to_use: 'If want to avoid changing base price',
          steps: [
            'Keep current product at £${price}',
            'Create "Premium" or "Limited Edition" variant',
            'Price premium version at £${newPrice + 5}',
            'Market as exclusive/special selection',
            'Capture high-willingness-to-pay customers'
          ],
          expected_outcome: 'Increase average order value without risking base sales'
        },
        {
          title: 'Bundle strategy',
          when_to_use: 'To increase effective price via bundles',
          steps: [
            'Create bundle with complementary products',
            'Price bundle at 15% discount vs individual',
            'But still higher margin than single item',
            'Increase average transaction size'
          ],
          expected_outcome: 'Higher revenue per customer'
        }
      ],

      confidence_level: 0.82,

      product_context: {
        category: sku.category || 'Unknown',
        price,
        weekly_sales: weeklySales,
        current_stock: currentStock,
        weeks_of_stock: currentStock / weeklySales
      },

      can_auto_resolve: false,

      created_at: new Date(),
      acknowledged: false,
      resolved: false
    }
  }

  /**
   * Analyze competitor threats
   */
  private static analyzeCompetitorThreats(
    skuData: any[],
    competitorData: any[]
  ): ActionableAlert[] {

    const alerts: ActionableAlert[] = []

    // Find products being undercut by competitors
    for (const sku of skuData) {
      const competitors = competitorData.filter(c => c.sku === sku.sku || c.product_name?.includes(sku.sku))

      if (competitors.length > 0) {
        const avgCompetitorPrice = competitors.reduce((sum, c) => sum + (parseFloat(c.competitor_price) || 0), 0) / competitors.length
        const ourPrice = parseFloat(sku.price) || 0
        const priceDiff = ourPrice - avgCompetitorPrice
        const priceDiffPercent = (priceDiff / avgCompetitorPrice) * 100

        // We're significantly more expensive
        if (priceDiffPercent > 15 && ourPrice > 20) {
          // This would create a competitor threat alert...
          // (shortened for space)
        }
      }
    }

    return alerts
  }


  /**
   * Get seasonal peak for category
   */
  private static getSeasonalPeak(category: string): string {
    const cat = (category || '').toLowerCase()
    if (cat.includes('spirits') || cat.includes('whisky') || cat.includes('whiskey')) {
      return 'Holiday season (Nov-Jan)'
    }
    if (cat.includes('beer')) return 'Summer (May-Aug)'
    if (cat.includes('wine')) return 'Holiday season (Oct-Jan)'
    if (cat.includes('gin') || cat.includes('vodka')) return 'Summer cocktails'
    return 'Year-round'
  }

  /**
   * MAIN METHOD: Generate smart actionable alerts from inventory data
   */
  public static async generateSmartAlerts(
    skus: any[],
    competitorData: any[],
    userEmail: string
  ): Promise<ActionableAlert[]> {
    console.log(`🧠 SmartAlertEngine: Analyzing ${skus.length} SKUs for actionable alerts...`)

    const alerts: ActionableAlert[] = []

    for (const sku of skus) {
      const price = parseFloat(sku.price)
      const weeklySales = parseFloat(sku.weekly_sales)
      const currentStock = parseInt(sku.inventory_level)
      const weeksOfStock = weeklySales > 0 ? currentStock / weeklySales : 999

      // CRITICAL STOCKOUT (< 2 weeks)
      if (weeksOfStock < 2 && weeklySales > 0) {
        alerts.push(this.createCriticalStockoutAlert(sku, weeksOfStock, price, weeklySales, currentStock))
      }

      // OVERSTOCK CASH DRAIN (> 12 weeks)
      else if (weeksOfStock > 12 && currentStock > 20) {
        alerts.push(this.createOverstockCashDrainAlert(sku, weeksOfStock, price, weeklySales, currentStock))
      }

      // DEAD STOCK (> 20 weeks)
      else if (weeksOfStock > 20 && currentStock > 10) {
        alerts.push(this.createDeadStockAlert(sku, weeksOfStock, price, currentStock))
      }

      // PRICE OPPORTUNITY (competitor data available)
      const competitorPrices = competitorData.filter(c => c.sku === sku.sku)
      if (competitorPrices.length > 0) {
        const avgCompPrice = competitorPrices.reduce((sum, c) => sum + c.competitor_price, 0) / competitorPrices.length

        // If we're significantly cheaper, we have pricing power
        if (price < avgCompPrice * 0.85 && weeklySales > 3) {
          alerts.push(this.createPriceOpportunityAlert(sku, price, weeklySales, avgCompPrice))
        }
      }
    }

    console.log(`⚡ Generated ${alerts.length} base smart alerts`)

    // Enhance with AI AI (if API key available)
    if (process.env.ANTHROPIC_API_KEY && alerts.length > 0) {
      try {
        const enhancedAlerts = await this.enhanceAlertsWithAI(alerts.slice(0, 10)) // Limit to top 10 for cost
        console.log(`🤖 Enhanced ${enhancedAlerts.length} alerts with AI AI`)
        return enhancedAlerts
      } catch (error) {
        console.error('AI enhancement failed, returning base alerts:', error)
        return alerts
      }
    }

    return alerts
  }

  /**
   * Enhance alerts with AI AI strategic analysis
   */
  private static async enhanceAlertsWithAI(alerts: ActionableAlert[]): Promise<ActionableAlert[]> {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!
      })

      const prompt = `You are an expert inventory strategist. Review these ${alerts.length} alerts and provide strategic analysis for each.

Alerts:
${alerts.map((a, i) => `
${i + 1}. ${a.title}
   Type: ${a.type}
   Revenue at risk: £${a.revenue_at_risk.toLocaleString()}
   Current situation: ${a.message}
   Recommended action: ${a.primary_action.title}
`).join('\n')}

For EACH alert, provide:
1. Strategic context (market trends, competitive dynamics, customer behavior)
2. Hidden risks or opportunities we might miss
3. Alternative approaches based on business scenario
4. Timing considerations

Return a JSON array with ${alerts.length} objects, each with:
{
  "alert_index": <number>,
  "strategic_analysis": "<2-3 sentences of strategic insight>",
  "hidden_factors": "<1 sentence about non-obvious considerations>",
  "confidence_adjustment": <number between 0.5 and 1.0>
}`

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })

      const content = response.content[0]
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from AI')
      }

      // Parse AI's response
      const analysisText = content.text
      const jsonMatch = analysisText.match(/\[[\s\S]*\]/)

      if (!jsonMatch) {
        console.warn('Could not parse AI response, returning original alerts')
        return alerts
      }

      const analyses = JSON.parse(jsonMatch[0])

      // Enhance each alert with AI's analysis
      return alerts.map((alert, index) => {
        const analysis = analyses.find((a: any) => a.alert_index === index + 1)

        if (analysis) {
          return {
            ...alert,
            ai_analysis: analysis.strategic_analysis,
            confidence_level: Math.min(alert.confidence_level * analysis.confidence_adjustment, 1.0)
          }
        }

        return alert
      })

    } catch (error) {
      console.error('AI AI enhancement error:', error)
      return alerts // Return original alerts if enhancement fails
    }
  }
}
