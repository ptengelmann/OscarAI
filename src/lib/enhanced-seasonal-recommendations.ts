// src/lib/enhanced-seasonal-recommendations.ts
// ULTRA-INTELLIGENT SEASONAL ENGINE - Comprehensive UK Events Calendar + AI Intelligence
// Tracks 150+ UK events with detailed alcohol sales intelligence per event

import { AlcoholSKU, AlcoholBrand } from '@/types'
import Anthropic from '@anthropic-ai/sdk'
import { UKEventsCalendar } from './uk-events-calendar'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

interface SeasonalContext {
  currentSeason: 'spring' | 'summer' | 'autumn' | 'winter'
  currentDate: Date
  currentMonth: number
  currentWeek: number
  daysToChristmas: number
  daysToNewYear: number
  daysToValentines: number
  daysToMothersDay: number
  daysToFathersDay: number
  isHolidaySeason: boolean
  isSummerSeason: boolean
  detectedHolidays: string[] // AI will detect these dynamically
  weatherContext: string
  ukMarketEvents: string[]
  comprehensiveEvents: any[] // Full UK events calendar with alcohol intelligence
  upcomingEventsFormatted: string // Formatted for AI consumption
}

interface StrategicRecommendation {
  id: string
  type: 'bundle' | 'mystery_box' | 'seasonal_promotion' | 'clearance' | 'premium_positioning' | 'gift_packaging' | 'tasting_experience' | 'holiday_special' | 'event_targeting' | 'weather_responsive'
  title: string
  description: string
  reasoning: string
  seasonal_trigger: string
  holiday_connection: string
  products_involved: string[]
  urgency: 'low' | 'medium' | 'high' | 'critical'
  estimated_revenue_impact: number
  implementation_timeline: string
  marketing_angle: string
  pricing_strategy: {
    discount_percentage?: number
    bundle_price?: number
    premium_markup?: number
    cost_basis: string
  }
  target_customer: string
  execution_steps: string[]
  success_metrics: string[]
  risk_factors: string[]
  holiday_specific_elements: string[]
  confidence_score: number
}

export class EnhancedSeasonalRecommendations {

  // DYNAMIC HOLIDAY DETECTION - Let AI figure out what's happening
  static async detectCurrentHolidays(): Promise<string[]> {
    const now = new Date()
    const currentDate = now.toISOString().split('T')[0]
    const currentMonth = now.getMonth() + 1
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        temperature: 0.1,
        messages: [{
          role: 'user',
          content: `Today is ${currentDate} (day ${dayOfYear} of the year). What UK holidays, celebrations, sporting events, cultural events, or seasonal opportunities are happening:

1. Today or in the next 7 days
2. Within the next 30 days that alcohol retailers should prepare for
3. Any ongoing seasonal trends or awareness periods

Consider: Major holidays, sporting events (Six Nations, Wimbledon, etc), cultural celebrations, weather-driven trends, back-to-school, harvest season, etc.

Return as a JSON array of strings, each describing a holiday/event/trend with timing context.

Example format: ["Valentine's Day (February 14, 7 days away)", "Six Nations Rugby (ongoing through March)", "Spring weather driving outdoor drinks"]`
        }]
      })

      const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const holidays = JSON.parse(jsonMatch[0])
        console.log(`🎯 AI detected ${holidays.length} current holidays/events:`, holidays)
        return holidays
      }
      
      console.log('⚠️ Could not parse holiday detection response')
      return []
      
    } catch (error) {
      console.error('❌ Dynamic holiday detection failed:', error)
      return []
    }
  }

  // STRATEGIC FALLBACK HOLIDAYS - Key dates we always want to catch
  static getStrategicHolidays(context: SeasonalContext): string[] {
    const strategicHolidays: string[] = []
    const now = new Date()
    
    // Calculate days to major holidays
    const thisYear = now.getFullYear()
    const nextYear = thisYear + 1
    
    const holidays = [
      { name: "Valentine's Day", date: new Date(thisYear, 1, 14), giftRelevant: true },
      { name: "Mother's Day", date: new Date(thisYear, 2, this.getMothersDay(thisYear)), giftRelevant: true },
      { name: "Father's Day", date: new Date(thisYear, 5, this.getFathersDay(thisYear)), giftRelevant: true },
      { name: "Christmas", date: new Date(thisYear, 11, 25), giftRelevant: true },
      { name: "New Year's Eve", date: new Date(thisYear, 11, 31), giftRelevant: false },
      { name: "St. Patrick's Day", date: new Date(thisYear, 2, 17), giftRelevant: false },
      { name: "Easter", date: this.getEasterDate(thisYear), giftRelevant: true },
      { name: "Burns Night", date: new Date(thisYear, 0, 25), giftRelevant: false },
      { name: "Halloween", date: new Date(thisYear, 9, 31), giftRelevant: false },
      { name: "Bonfire Night", date: new Date(thisYear, 10, 5), giftRelevant: false }
    ]

    holidays.forEach(holiday => {
      const daysUntil = Math.ceil((holiday.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      // Add if within 60 days
      if (daysUntil >= 0 && daysUntil <= 60) {
        const urgency = daysUntil <= 7 ? 'immediate' : daysUntil <= 21 ? 'urgent' : 'upcoming'
        strategicHolidays.push(`${holiday.name} (${daysUntil} days, ${urgency}, ${holiday.giftRelevant ? 'gift-relevant' : 'social'})`)
      }
      
      // Also check next year's dates if we're near year end
      if (holiday.date.getMonth() <= 2 && now.getMonth() >= 10) {
        const nextYearDate = new Date(nextYear, holiday.date.getMonth(), holiday.date.getDate())
        const daysUntilNext = Math.ceil((nextYearDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (daysUntilNext <= 60) {
          strategicHolidays.push(`${holiday.name} ${nextYear} (${daysUntilNext} days, upcoming, ${holiday.giftRelevant ? 'gift-relevant' : 'social'})`)
        }
      }
    })

    return strategicHolidays
  }

  // MAIN RECOMMENDATION ENGINE - Enhanced with dynamic detection
  static async generateContextualRecommendations(
    alcoholSKUs: AlcoholSKU[],
    competitorData: any[] = [],
    userEmail: string
  ): Promise<StrategicRecommendation[]> {
    
    const seasonalContext = await this.getEnhancedSeasonalContext()
    const productAnalysis = this.analyzeProductPortfolio(alcoholSKUs)

    console.log(`🎯 Generating comprehensive seasonal recommendations for ${alcoholSKUs.length} SKUs`)
    console.log(`Detected holidays: ${seasonalContext.detectedHolidays.length}`)
    console.log(`Strategic holidays: ${seasonalContext.ukMarketEvents.length}`)

    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY not found - using enhanced fallback')
      return this.generateEnhancedFallbackRecommendations(productAnalysis, seasonalContext)
    }

    // Enhanced data requirements check
    if (productAnalysis.all.length < 3) {
      console.log(`⚠️ Insufficient product data (${productAnalysis.all.length} products) - using enhanced fallback`)
      return this.generateEnhancedFallbackRecommendations(productAnalysis, seasonalContext)
    }
    
    try {
      // Create comprehensive prompt with dynamic holidays
      const prompt = this.buildIntelligentSeasonalPrompt(productAnalysis, seasonalContext)
      
      console.log('🤖 Calling AI for intelligent seasonal strategies...')
      
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 12000, // Significantly increased to support 10-20+ strategies
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
      
      const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
      console.log('✅ AI response received, length:', responseText.length)
      
      // Parse strategies from response
      let strategiesData;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          console.error('❌ No JSON found in response - using enhanced fallback')
          return this.generateEnhancedFallbackRecommendations(productAnalysis, seasonalContext)
        }
        
        strategiesData = JSON.parse(jsonMatch[0])
        console.log('✅ Successfully parsed JSON response')
        
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError)
        return this.generateEnhancedFallbackRecommendations(productAnalysis, seasonalContext)
      }
      
      const strategies = strategiesData.seasonal_strategies || strategiesData.strategies || []
      
      if (!Array.isArray(strategies) || strategies.length === 0) {
        console.error('❌ No valid strategies array found - using enhanced fallback')
        return this.generateEnhancedFallbackRecommendations(productAnalysis, seasonalContext)
      }
      
      // Transform strategies with enhanced metadata
      const transformedStrategies = strategies.map((strategy: any, index: number) => ({
        id: `ai-seasonal-${Date.now()}-${index}`,
        type: strategy.type || 'seasonal_promotion',
        title: strategy.title || `Seasonal Strategy ${index + 1}`,
        description: strategy.description || '',
        reasoning: strategy.reasoning || '',
        seasonal_trigger: strategy.seasonal_trigger || seasonalContext.currentSeason,
        holiday_connection: strategy.holiday_connection || '',
        estimated_revenue_impact: parseFloat(strategy.estimated_revenue_impact) || (600 + index * 400),
        urgency: strategy.urgency || 'medium',
        implementation_timeline: strategy.implementation_timeline || '2-3 weeks',
        marketing_angle: strategy.marketing_angle || '',
        target_customer: strategy.target_customer || '',
        products_involved: Array.isArray(strategy.products_involved) ? strategy.products_involved : [],
        execution_steps: Array.isArray(strategy.execution_steps) ? strategy.execution_steps : [],
        success_metrics: Array.isArray(strategy.success_metrics) ? strategy.success_metrics : [],
        risk_factors: Array.isArray(strategy.risk_factors) ? strategy.risk_factors : [],
        holiday_specific_elements: Array.isArray(strategy.holiday_specific_elements) ? strategy.holiday_specific_elements : [],
        pricing_strategy: strategy.pricing_strategy || { cost_basis: 'Market-based pricing' },
        confidence_score: strategy.confidence_score || 0.8
      }))

      // Sort by urgency and revenue impact
      const sortedStrategies = transformedStrategies.sort((a: StrategicRecommendation, b: StrategicRecommendation) => {
        const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        const urgencyDiff = urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
        if (urgencyDiff !== 0) return urgencyDiff
        return b.estimated_revenue_impact - a.estimated_revenue_impact
      })
      
      console.log(`📊 Generated ${sortedStrategies.length} intelligent seasonal strategies`)
      return sortedStrategies // Return ALL strategies AI generates
      
    } catch (error) {
      console.error('❌ AI API call failed:', error)
      return this.generateEnhancedFallbackRecommendations(productAnalysis, seasonalContext)
    }
  }

  // ULTRA-ENHANCED SEASONAL CONTEXT with comprehensive UK events calendar
  private static async getEnhancedSeasonalContext(): Promise<SeasonalContext> {
    const baseContext = this.getCurrentSeasonalContext()

    // Get comprehensive UK events (next 90 days)
    const comprehensiveEvents = UKEventsCalendar.getUpcomingEvents(90)

    // Format events for AI consumption
    const upcomingEventsFormatted = UKEventsCalendar.formatEventsForAI(comprehensiveEvents)

    // Get dynamic holidays from AI (as backup/supplement)
    const detectedHolidays = await this.detectCurrentHolidays()

    // Get strategic fallback holidays
    const strategicHolidays = this.getStrategicHolidays(baseContext)

    console.log(`📅 Loaded ${comprehensiveEvents.length} UK events with alcohol intelligence`)

    return {
      ...baseContext,
      detectedHolidays,
      ukMarketEvents: [...strategicHolidays, ...this.getMarketEvents(baseContext.currentMonth)],
      weatherContext: this.getWeatherContext(baseContext.currentSeason, baseContext.currentMonth),
      comprehensiveEvents,
      upcomingEventsFormatted
    }
  }

  // ULTRA-INTELLIGENT PROMPT BUILDER - Uses comprehensive UK events calendar with alcohol intelligence
  private static buildIntelligentSeasonalPrompt(productAnalysis: any, seasonalContext: SeasonalContext): string {
    const slowMovingProducts = productAnalysis.slowMoving.slice(0, 12)
    const premiumProducts = productAnalysis.premiumProducts.slice(0, 10)
    const allProducts = productAnalysis.all.slice(0, 25)

    // Count high-priority events
    const highPriorityEvents = seasonalContext.comprehensiveEvents.filter((e: any) =>
      e.competitorActivity === 'extreme' || e.competitorActivity === 'high'
    ).length

    return `You are an EXPERT UK alcohol retail strategist with deep knowledge of:
- UK seasonal events and their alcohol sales impact
- Consumer psychology around holidays and celebrations
- Which alcohol categories sell best for specific occasions and WHY

Generate 10-20 SPECIFIC, ACTIONABLE seasonal strategies for this UK alcohol business.

========================================
🗓️ COMPREHENSIVE UK EVENTS CALENDAR
========================================
${seasonalContext.upcomingEventsFormatted}

📊 YOUR INVENTORY ANALYSIS:
Total products: ${productAnalysis.all.length}
Categories available: ${Object.keys(productAnalysis.byCategory).join(', ')}

Slow-moving items (${slowMovingProducts.length}):
${slowMovingProducts.map((p: any) => `- ${p.sku}: £${p.price}, ${p.inventory_level} units, category: ${p.category || 'unknown'}`).slice(0, 10).join('\n')}

Premium products (${premiumProducts.length}):
${premiumProducts.map((p: any) => `- ${p.sku}: £${p.price}, category: ${p.category || 'unknown'}`).slice(0, 8).join('\n')}

========================================
🎯 YOUR MISSION:
========================================
1. Generate strategies for EVERY relevant event in the calendar above (aim for 10-20 strategies)
2. Each strategy MUST be tied to a SPECIFIC event with SPECIFIC dates
3. Use the "Alcohol Intel" from each event to understand:
   - Which products sell best (primary categories)
   - WHY consumers buy (consumer behavior)
   - Expected sales lift (%)
   - Whether it's gifting or social drinking
   - Price sensitivity
4. Match YOUR INVENTORY to the best opportunities
5. Create urgency based on days until event
6. Be SPECIFIC about which SKUs to use and why
7. Include revenue estimates based on the sales lift data
8. Prioritize ${highPriorityEvents} HIGH-PRIORITY events (extreme/high competition)

⚠️ CRITICAL REQUIREMENTS:
- Generate AT LEAST one strategy per major event (${seasonalContext.comprehensiveEvents.length} events = ${seasonalContext.comprehensiveEvents.length} opportunities)
- Do NOT artificially limit yourself - if you see 15-20 opportunities, create 15-20 strategies
- Each must reference the specific event, alcohol categories that sell, and consumer behavior
- Use the actual revenue lift data (e.g., Valentine's Day = +300% for champagne)

Return ONLY this JSON format (10-20 strategies based on events):

{
  "seasonal_strategies": [
    {
      "type": "holiday_special",
      "title": "Valentine's Day Premium Romance Collection",
      "description": "Curated romantic alcohol packages for Valentine's Day gifting",
      "reasoning": "Valentine's Day in 8 days - peak gifting season for couples, premium pricing opportunity",
      "seasonal_trigger": "Valentine's Day February 14th approaching",
      "holiday_connection": "Valentine's Day - romantic gifting, intimate dining, date nights",
      "estimated_revenue_impact": 1800,
      "urgency": "high",
      "implementation_timeline": "1 week",
      "marketing_angle": "Romance and intimacy - perfect date night essentials",
      "target_customer": "Couples, romantic gift buyers aged 25-55",
      "products_involved": ["${premiumProducts[0]?.sku || 'PREMIUM-001'}", "${premiumProducts[1]?.sku || 'PREMIUM-002'}"],
      "execution_steps": [
        "Create romantic gift bundles with premium packaging",
        "Design Valentine's landing page with romantic imagery",
        "Launch targeted social media ads for couples",
        "Partner with local florists for cross-promotion",
        "Create Valentine's cocktail recipes and content"
      ],
      "success_metrics": [
        "Sell 25+ Valentine's bundles",
        "Achieve £85+ average order value",
        "15% increase in premium product sales"
      ],
      "risk_factors": [
        "Last-minute Valentine's shoppers only",
        "Competition from major retailers"
      ],
      "holiday_specific_elements": [
        "Red and pink packaging",
        "Romantic product descriptions",
        "Couple-focused marketing imagery",
        "Date night cocktail recipes"
      ],
      "confidence_score": 0.9,
      "pricing_strategy": {
        "bundle_price": 85,
        "premium_markup": 20,
        "cost_basis": "Valentine's premium pricing with romantic packaging"
      }
    },
    {
      "type": "clearance",
      "title": "Black Friday Alcohol Mega Sale",
      "description": "Strategic Black Friday promotion with doorbusters and limited-time offers",
      "reasoning": "Black Friday consumer frenzy - opportunity for significant inventory clearance and revenue boost",
      "seasonal_trigger": "Black Friday shopping weekend",
      "holiday_connection": "Black Friday - biggest shopping event, discount expectations high",
      "estimated_revenue_impact": 3500,
      "urgency": "critical",
      "implementation_timeline": "2 weeks preparation",
      "marketing_angle": "Biggest alcohol discounts of the year - limited time only",
      "target_customer": "Bargain hunters, bulk buyers, party planners",
      "products_involved": ["${slowMovingProducts[0]?.sku || 'SLOW-001'}", "${slowMovingProducts[1]?.sku || 'SLOW-002'}"],
      "execution_steps": [
        "Create Black Friday landing page with countdown timer",
        "Set up doorbusters and flash sales",
        "Prepare email marketing sequence",
        "Stock adequate inventory for demand",
        "Create urgency with limited quantities"
      ],
      "success_metrics": [
        "Clear 60% of slow-moving inventory",
        "Achieve highest daily revenue of year",
        "Acquire 200+ new customers"
      ],
      "risk_factors": [
        "Margin compression from deep discounts",
        "Inventory management challenges"
      ],
      "holiday_specific_elements": [
        "Black and gold sale branding",
        "Countdown timers",
        "Limited quantity messaging",
        "Doorbusters and flash sales"
      ],
      "confidence_score": 0.95,
      "pricing_strategy": {
        "discount_percentage": 35,
        "cost_basis": "Loss leader strategy for customer acquisition"
      }
    }
  ]
}

CRITICAL: Cover ALL detected holidays and major UK retail events. Don't limit strategies artificially - generate one for each significant opportunity you identify. Include Black Friday, Boxing Day, Back to School, Easter, Summer holidays, sporting events, etc.`
  }

  // ENHANCED FALLBACK SYSTEM - Covers more scenarios
  private static generateEnhancedFallbackRecommendations(
    productAnalysis: any, 
    seasonalContext: SeasonalContext
  ): StrategicRecommendation[] {
    const recommendations: StrategicRecommendation[] = []
    
    console.log('🔄 Generating enhanced fallback seasonal recommendations')

    // Process each detected holiday
    seasonalContext.detectedHolidays.forEach((holiday, index) => {
      const holidayRec = this.createHolidaySpecificStrategy(holiday, productAnalysis, seasonalContext, index)
      if (holidayRec) recommendations.push(holidayRec)
    })

    // Process strategic market events
    seasonalContext.ukMarketEvents.forEach((event, index) => {
      const eventRec = this.createMarketEventStrategy(event, productAnalysis, seasonalContext, index + 10)
      if (eventRec) recommendations.push(eventRec)
    })

    // Add weather-responsive strategies
    const weatherRec = this.createWeatherResponsiveStrategy(productAnalysis, seasonalContext)
    if (weatherRec) recommendations.push(weatherRec)

    // Add clearance strategy if needed
    if (productAnalysis.slowMoving.length >= 3) {
      const clearanceRec = this.createIntelligentClearanceStrategy(productAnalysis, seasonalContext)
      if (clearanceRec) recommendations.push(clearanceRec)
    }

    console.log(`Generated ${recommendations.length} enhanced fallback recommendations`)
    return recommendations // Return all recommendations, not limited
  }

  // Helper methods for enhanced fallbacks
  private static createHolidaySpecificStrategy(
    holiday: string, 
    analysis: any, 
    context: SeasonalContext,
    index: number
  ): StrategicRecommendation | null {
    
    const holidayName = holiday.split('(')[0].trim()
    const products = analysis.giftableProducts.slice(0, 4)
    
    if (products.length === 0) return null

    return {
      id: `holiday-${Date.now()}-${index}`,
      type: 'holiday_special',
      title: `${holidayName} Special Collection`,
      description: `Curated selection for ${holidayName} celebration and gifting`,
      reasoning: `${holiday} - strategic opportunity for themed promotion`,
      seasonal_trigger: holiday,
      holiday_connection: holidayName,
      products_involved: products.map((p: any) => p.sku),
      urgency: holiday.includes('immediate') ? 'critical' : holiday.includes('urgent') ? 'high' : 'medium',
      estimated_revenue_impact: 800 + (index * 200),
      implementation_timeline: holiday.includes('immediate') ? '3 days' : '1-2 weeks',
      marketing_angle: `${holidayName} celebration essentials`,
      pricing_strategy: {
        discount_percentage: 15,
        cost_basis: `${holidayName} promotional pricing`
      },
      target_customer: `${holidayName} celebrants and gift buyers`,
      execution_steps: [
        `Create ${holidayName} themed collection`,
        'Design holiday-specific packaging',
        'Launch targeted marketing campaign',
        'Create social media content'
      ],
      success_metrics: [
        `Sell 20+ ${holidayName} products`,
        'Increase holiday-period revenue by 25%'
      ],
      risk_factors: [
        'Limited time window',
        'Holiday competition'
      ],
      holiday_specific_elements: [
        `${holidayName} themed packaging`,
        'Holiday-appropriate messaging',
        'Seasonal color schemes'
      ],
      confidence_score: 0.75
    }
  }

  private static createMarketEventStrategy(
    event: string,
    analysis: any,
    context: SeasonalContext,
    index: number
  ): StrategicRecommendation | null {
    
    const products = analysis.all.slice(0, 3)
    if (products.length === 0) return null

    return {
      id: `market-event-${Date.now()}-${index}`,
      type: 'event_targeting',
      title: `${event.split('(')[0]} Opportunity`,
      description: `Strategic promotion targeting ${event}`,
      reasoning: `Market event opportunity: ${event}`,
      seasonal_trigger: event,
      holiday_connection: event,
      products_involved: products.map((p: any) => p.sku),
      urgency: 'medium',
      estimated_revenue_impact: 600 + (index * 150),
      implementation_timeline: '1-2 weeks',
      marketing_angle: `${event} themed promotion`,
      pricing_strategy: {
        discount_percentage: 10,
        cost_basis: 'Event-driven promotional pricing'
      },
      target_customer: 'Event participants and enthusiasts',
      execution_steps: [
        'Identify event-relevant products',
        'Create event-themed marketing',
        'Target relevant customer segments'
      ],
      success_metrics: [
        'Increase event-period sales by 20%'
      ],
      risk_factors: [
        'Event timing dependency'
      ],
      holiday_specific_elements: [
        'Event-specific messaging'
      ],
      confidence_score: 0.7
    }
  }

  private static createWeatherResponsiveStrategy(
    analysis: any,
    context: SeasonalContext
  ): StrategicRecommendation | null {
    
    const products = analysis.all.slice(0, 3)
    if (products.length === 0) return null

    const isWinter = context.currentSeason === 'winter'
    const isSummer = context.currentSeason === 'summer'

    return {
      id: `weather-responsive-${Date.now()}`,
      type: 'weather_responsive',
      title: isWinter ? 'Winter Warmers Collection' : isSummer ? 'Summer Refreshers' : 'Seasonal Weather Collection',
      description: `Products perfectly suited for ${context.weatherContext}`,
      reasoning: `Weather-driven demand: ${context.weatherContext}`,
      seasonal_trigger: `Current weather: ${context.weatherContext}`,
      holiday_connection: 'Weather-responsive opportunity',
      products_involved: products.map((p: any) => p.sku),
      urgency: 'medium',
      estimated_revenue_impact: 750,
      implementation_timeline: '1 week',
      marketing_angle: `Perfect for ${context.currentSeason} weather`,
      pricing_strategy: {
        cost_basis: 'Weather-responsive pricing'
      },
      target_customer: 'Weather-conscious consumers',
      execution_steps: [
        'Highlight weather-appropriate products',
        'Create weather-themed content',
        'Target based on weather patterns'
      ],
      success_metrics: [
        'Increase weather-appropriate sales by 30%'
      ],
      risk_factors: [
        'Weather dependency'
      ],
      holiday_specific_elements: [
        'Weather-appropriate messaging',
        'Seasonal imagery'
      ],
      confidence_score: 0.8
    }
  }

  private static createIntelligentClearanceStrategy(
    analysis: any,
    context: SeasonalContext
  ): StrategicRecommendation | null {
    
    const clearanceProducts = analysis.slowMoving.slice(0, 8)
    if (clearanceProducts.length < 3) return null

    return {
      id: `intelligent-clearance-${Date.now()}`,
      type: 'clearance',
      title: 'Strategic Inventory Optimization',
      description: 'Smart clearance of slow-moving inventory with seasonal timing',
      reasoning: `${clearanceProducts.length} slow-moving products identified - free up capital for seasonal opportunities`,
      seasonal_trigger: 'Inventory optimization for seasonal preparation',
      holiday_connection: 'Pre-seasonal inventory management',
      products_involved: clearanceProducts.map((p: any) => p.sku),
      urgency: 'medium',
      estimated_revenue_impact: 1200,
      implementation_timeline: '2-3 weeks',
      marketing_angle: 'Exclusive member offers and limited-time deals',
      pricing_strategy: {
        discount_percentage: 25,
        cost_basis: 'Intelligent clearance with maintained margins'
      },
      target_customer: 'Value-conscious customers and bulk buyers',
      execution_steps: [
        'Create exclusive clearance section',
        'Email existing customer base',
        'Offer bulk purchase incentives',
        'Create urgency messaging'
      ],
      success_metrics: [
        'Clear 50% of slow inventory',
        'Maintain 20%+ gross margin',
        'Free up storage for seasonal stock'
      ],
      risk_factors: [
        'Brand perception impact',
        'Margin compression'
      ],
      holiday_specific_elements: [
        'Pre-seasonal positioning',
        'Make room for holiday stock messaging'
      ],
      confidence_score: 0.85
    }
  }

  // Utility methods
  private static getCurrentSeasonalContext(): SeasonalContext {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentWeek = Math.ceil(now.getDate() / 7)
    const currentYear = now.getFullYear()

    const christmas = new Date(currentYear, 11, 25)
    const newYear = new Date(currentYear + 1, 0, 1)
    const valentines = new Date(currentYear, 1, 14)

    if (christmas < now) christmas.setFullYear(currentYear + 1)
    if (valentines < now) valentines.setFullYear(currentYear + 1)

    const daysToChristmas = Math.ceil((christmas.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const daysToNewYear = Math.ceil((newYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const daysToValentines = Math.ceil((valentines.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    let currentSeason: SeasonalContext['currentSeason']
    if (currentMonth >= 12 || currentMonth <= 2) currentSeason = 'winter'
    else if (currentMonth >= 3 && currentMonth <= 5) currentSeason = 'spring'
    else if (currentMonth >= 6 && currentMonth <= 8) currentSeason = 'summer'
    else currentSeason = 'autumn'

    return {
      currentSeason,
      currentDate: now,
      currentMonth,
      currentWeek,
      daysToChristmas,
      daysToNewYear,
      daysToValentines,
      daysToMothersDay: this.getDaysToMothersDay(now),
      daysToFathersDay: this.getDaysToFathersDay(now),
      isHolidaySeason: daysToChristmas <= 60 && daysToChristmas > 0,
      isSummerSeason: currentMonth >= 5 && currentMonth <= 8,
      detectedHolidays: [],
      weatherContext: '',
      ukMarketEvents: [],
      comprehensiveEvents: [],
      upcomingEventsFormatted: ''
    }
  }

  private static analyzeProductPortfolio(alcoholSKUs: AlcoholSKU[]) {
    const slowMoving = alcoholSKUs.filter(sku => {
      const weeklySales = parseFloat(sku.weekly_sales) || 0
      const inventoryLevel = parseInt(sku.inventory_level) || 0
      const weeksOfStock = weeklySales > 0 ? inventoryLevel / weeklySales : 999
      return weeksOfStock > 8 && weeklySales < 2
    })

    const premiumProducts = alcoholSKUs.filter(sku => {
      const price = parseFloat(sku.price) || 0
      return price > 40
    })

    const giftableProducts = alcoholSKUs.filter(sku => {
      const price = parseFloat(sku.price) || 0
      return price > 25 && price < 150
    })

    const beerAndCider = alcoholSKUs.filter(sku => 
      sku.category?.toLowerCase().includes('beer') || 
      sku.category?.toLowerCase().includes('cider')
    )

    const byCategory = alcoholSKUs.reduce((acc, sku) => {
      const category = sku.category || 'uncategorized'
      if (!acc[category]) acc[category] = []
      acc[category].push(sku)
      return acc
    }, {} as Record<string, AlcoholSKU[]>)

    return {
      all: alcoholSKUs,
      slowMoving,
      premiumProducts,
      giftableProducts,
      beerAndCider,
      byCategory,
      totalValue: alcoholSKUs.reduce((sum, sku) => sum + (parseFloat(sku.price) * parseInt(sku.inventory_level || '0')), 0)
    }
  }

  private static getWeatherContext(season: string, month: number): string {
    const weatherContexts = {
      winter: 'Cold weather driving demand for warming spirits, indoor entertainment',
      spring: 'Mild weather, Easter celebrations, outdoor activities resuming',
      summer: 'Warm weather perfect for outdoor drinking, BBQs, festivals',
      autumn: 'Cooling weather, harvest season, comfort drinks, Halloween'
    }
    return weatherContexts[season as keyof typeof weatherContexts] || 'Seasonal weather patterns'
  }

  private static getMarketEvents(month: number): string[] {
    const events: Record<number, string[]> = {
      1: ['January sales period', 'Dry January awareness', 'New Year fresh starts', 'Winter clearance'],
      2: ['Valentine\'s Day gifts', 'Half-term holidays', 'Chinese New Year', 'Winter Olympics'],
      3: ['Spring equinox', 'Mother\'s Day', 'Easter preparation', 'St. Patrick\'s Day', 'Spring cleaning'],
      4: ['Easter holidays', 'Spring bank holiday', 'Tax year end', 'Spring weddings begin'],
      5: ['May bank holiday', 'Eurovision', 'FA Cup Final', 'Chelsea Flower Show', 'Wedding season'],
      6: ['Father\'s Day', 'Wimbledon begins', 'Summer solstice', 'Euro championships', 'Festival season starts'],
      7: ['Summer holidays', 'Festival season peak', 'Wimbledon finals', 'Summer weddings', 'BBQ season'],
      8: ['Summer holidays continue', 'Edinburgh Festival', 'Bank holiday weekend', 'Harvest begins'],
      9: ['Back to school', 'Harvest season', 'Autumn equinox', 'Fashion Week', 'University term starts'],
      10: ['Halloween preparation', 'Autumn harvest', 'Half-term holidays', 'Diwali', 'Clocks back'],
      11: ['Bonfire Night', 'Black Friday', 'Cyber Monday', 'Thanksgiving', 'Christmas preparation begins'],
      12: ['Christmas season', 'Boxing Day sales', 'New Year preparation', 'Office parties', 'Hogmanay']
    }
    return events[month] || []
  }

  // Date calculation helpers
  private static getMothersDay(year: number): number {
    // UK Mother's Day is 4th Sunday of Lent (3 weeks before Easter)
    const easter = this.getEasterDate(year)
    const mothersDay = new Date(easter.getTime() - (21 * 24 * 60 * 60 * 1000))
    return mothersDay.getDate()
  }

  private static getFathersDay(year: number): number {
    // UK Father's Day is 3rd Sunday in June
    const june = new Date(year, 5, 1)
    const firstSunday = 7 - june.getDay()
    return firstSunday + 14
  }

  private static getDaysToMothersDay(now: Date): number {
    const year = now.getFullYear()
    const mothersDay = new Date(year, 2, this.getMothersDay(year))
    if (mothersDay < now) mothersDay.setFullYear(year + 1)
    return Math.ceil((mothersDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  private static getDaysToFathersDay(now: Date): number {
    const year = now.getFullYear()
    const fathersDay = new Date(year, 5, this.getFathersDay(year))
    if (fathersDay < now) fathersDay.setFullYear(year + 1)
    return Math.ceil((fathersDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  private static getEasterDate(year: number): Date {
    // Calculate Easter using the algorithm
    const a = year % 19
    const b = Math.floor(year / 100)
    const c = year % 100
    const d = Math.floor(b / 4)
    const e = b % 4
    const f = Math.floor((b + 8) / 25)
    const g = Math.floor((b - f + 1) / 3)
    const h = (19 * a + b - d - g + 15) % 30
    const i = Math.floor(c / 4)
    const k = c % 4
    const l = (32 + 2 * e + 2 * i - h - k) % 7
    const m = Math.floor((a + 11 * h + 22 * l) / 451)
    const n = Math.floor((h + l - 7 * m + 114) / 31)
    const p = (h + l - 7 * m + 114) % 31
    return new Date(year, n - 1, p + 1)
  }

  // Existing integration methods...
  static async enhanceExistingRecommendations(
    standardRecommendations: any[],
    alcoholSKUs: AlcoholSKU[],
    userEmail: string
  ): Promise<{ enhanced: any[], seasonal: StrategicRecommendation[] }> {
    
    const seasonalRecommendations = await this.generateContextualRecommendations(
      alcoholSKUs,
      [],
      userEmail
    )

    const seasonalContext = await this.getEnhancedSeasonalContext()
    
    const enhanced = standardRecommendations.map(rec => {
      if (rec.action === 'promotional_pricing' && seasonalContext.isHolidaySeason) {
        rec.reason += ' Perfect timing for holiday promotions.'
        rec.urgency = 'high'
      }
      
      if (rec.action === 'optimize_price' && seasonalContext.currentSeason === 'winter' && 
          rec.category === 'spirits') {
        rec.reason += ' Winter peak season for premium spirits.'
      }

      return rec
    })

    return {
      enhanced,
      seasonal: seasonalRecommendations
    }
  }
}