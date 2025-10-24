// Smart Alert Card - Modern, actionable alert UI
'use client'

import React, { useState } from 'react'
import {
  AlertTriangle,
  DollarSign,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Info,
  Package,
  History
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActionStep {
  title: string
  steps: string[]
  deadline: string
  expected_outcome: string
  automation_available?: boolean
  auto_execute_conditions?: string[]
}

interface AlternativeAction {
  title: string
  when_to_use: string
  steps: string[]
  expected_outcome: string
}

interface ProductContext {
  category: string
  price: number
  weekly_sales: number
  current_stock: number
  weeks_of_stock: number
  seasonal_peak?: string
  competitor_price?: number
}

interface SmartAlertCardProps {
  id: string
  sku_code: string
  type: 'critical_stockout' | 'overstock_cash_drain' | 'price_opportunity' | 'dead_stock' | 'seasonal_urgency' | 'competitor_threat'
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  message: string
  short_description?: string
  revenue_at_risk: number
  cost_to_resolve: number
  estimated_impact: number
  urgency_score: number
  time_to_critical: string
  primary_action: ActionStep
  alternative_actions?: AlternativeAction[]
  ai_analysis?: string
  confidence_level: number
  product_context?: ProductContext
  can_auto_resolve: boolean
  auto_resolve_conditions?: string[]
  escalate_if_not_resolved_hours?: number
  acknowledged?: boolean
  resolved?: boolean
  snoozed?: boolean
  onAction?: (alertId: string, action: 'execute' | 'snooze' | 'resolve' | 'acknowledge') => void
}

export function SmartAlertCard({
  id,
  sku_code,
  type,
  severity,
  title,
  message,
  short_description,
  revenue_at_risk,
  cost_to_resolve,
  estimated_impact,
  urgency_score,
  time_to_critical,
  primary_action,
  alternative_actions = [],
  ai_analysis,
  confidence_level,
  product_context,
  can_auto_resolve,
  auto_resolve_conditions = [],
  escalate_if_not_resolved_hours,
  acknowledged = false,
  resolved = false,
  snoozed = false,
  onAction
}: SmartAlertCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showAlternatives, setShowAlternatives] = useState(false)

  // Get severity color scheme - sleek black minimalist
  const getSeverityColors = () => {
    switch (severity) {
      case 'critical':
        return {
          border: 'border-red-500/30',
          bg: 'bg-black/40',
          header: 'bg-black/60',
          badge: 'bg-red-500/10 text-red-400 border-red-500/20',
          icon: 'text-red-400',
          accent: 'border-l-4 border-l-red-500'
        }
      case 'high':
        return {
          border: 'border-orange-500/30',
          bg: 'bg-black/40',
          header: 'bg-black/60',
          badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
          icon: 'text-orange-400',
          accent: 'border-l-4 border-l-orange-500'
        }
      case 'medium':
        return {
          border: 'border-yellow-500/30',
          bg: 'bg-black/40',
          header: 'bg-black/60',
          badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
          icon: 'text-yellow-400',
          accent: 'border-l-4 border-l-yellow-500'
        }
      default:
        return {
          border: 'border-blue-500/30',
          bg: 'bg-black/40',
          header: 'bg-black/60',
          badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          icon: 'text-blue-400',
          accent: 'border-l-4 border-l-blue-500'
        }
    }
  }

  const colors = getSeverityColors()

  // Get detailed explanation based on alert type
  const getExplanation = () => {
    const weeks = product_context?.weeks_of_stock || parseFloat(message.match(/(\d+\.?\d*)\s*weeks/i)?.[1] || '10')
    const weeklyDemand = product_context?.weekly_sales || parseInt(message.match(/predicts?\s+(\d+)\s+units/i)?.[1] || '10')
    const currentStock = product_context?.current_stock || Math.round(weeks * weeklyDemand)
    const price = product_context?.price || 25

    switch (type) {
      case 'overstock_cash_drain':
        const excessWeeks = Math.max(0, weeks - 12)
        const excessUnits = Math.floor(excessWeeks * weeklyDemand)
        const cashTiedUp = Math.floor(excessUnits * price * 0.7)
        const monthsToSell = (weeks / 4).toFixed(1)

        return (
          <>
            <p className="mb-2"><strong className="text-white">Current Situation:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>You have <strong className="text-white">{currentStock} units</strong> in stock</li>
              <li>Selling at <strong className="text-white">{weeklyDemand} units/week</strong></li>
              <li>Will take <strong className="text-white">{weeks.toFixed(1)} weeks ({monthsToSell} months)</strong> to sell through</li>
            </ul>

            <p className="mt-3 mb-2"><strong className="text-white">Why This is a Problem:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-yellow-400">Cash Tied Up:</strong> ~£{cashTiedUp.toLocaleString()} of your money is sitting on shelves instead of generating returns</li>
              <li><strong className="text-yellow-400">Storage Costs:</strong> You're paying warehouse rent, insurance, and handling for stock that's moving slowly</li>
              <li><strong className="text-yellow-400">Opportunity Cost:</strong> This cash could be used to buy faster-moving products with better margins</li>
              <li><strong className="text-yellow-400">Risk:</strong> Products can expire, go out of season, or lose value while sitting in storage</li>
            </ul>

            <p className="mt-3 mb-2"><strong className="text-white">Healthy Inventory Levels:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-green-400">✓ Ideal:</strong> 4-8 weeks of stock (enough buffer, not too much)</li>
              <li><strong className="text-yellow-400">⚠ Warning:</strong> 8-12 weeks (starting to get risky)</li>
              <li><strong className="text-red-400">✗ Problem:</strong> 12+ weeks (like yours at {weeks.toFixed(1)} weeks - <strong>too much!</strong>)</li>
            </ul>

            <p className="mt-3 text-blue-300">
              <strong>Bottom line:</strong> You need to clear {excessUnits} excess units to get back to healthy levels.
              A 15% discount promotion could recover ~£{Math.floor(excessUnits * price * 0.85).toLocaleString()} and free up warehouse space.
            </p>
          </>
        )

      case 'critical_stockout':
        const daysToStockout = Math.floor(weeks * 7)
        const weeksLostSales = Math.max(1, 4 - weeks)
        const lostUnits = Math.floor(weeksLostSales * weeklyDemand)

        return (
          <>
            <p className="mb-2"><strong className="text-white">Current Situation:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>You have <strong className="text-white">{currentStock} units</strong> left in stock</li>
              <li>Customers are buying <strong className="text-white">{weeklyDemand} units/week</strong></li>
              <li>You will <strong className="text-red-400">run out in {daysToStockout} days</strong></li>
            </ul>

            <p className="mt-3 mb-2"><strong className="text-white">Why This is Critical:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-red-400">Lost Sales:</strong> You'll lose ~{lostUnits} sales worth £{Math.floor(lostUnits * price).toLocaleString()} while out of stock</li>
              <li><strong className="text-red-400">Customer Loss:</strong> Customers will buy from competitors and may not come back</li>
              <li><strong className="text-red-400">Reputation Damage:</strong> Out-of-stock items hurt your brand reliability</li>
              <li><strong className="text-red-400">Margin Loss:</strong> You lose the profit margin on every missed sale (~30% = £{Math.floor(lostUnits * price * 0.3).toLocaleString()})</li>
            </ul>

            <p className="mt-3 mb-2"><strong className="text-white">What "Stockout" Costs You:</strong></p>
            <p className="ml-2">
              If a customer wants to buy this product and you don't have it:
              <br/>• They go to a competitor → <strong className="text-red-400">You lose the sale</strong>
              <br/>• They might buy their entire order there → <strong className="text-red-400">You lose multiple sales</strong>
              <br/>• They might switch permanently → <strong className="text-red-400">You lose a customer</strong>
            </p>

            <p className="mt-3 text-blue-300">
              <strong>Bottom line:</strong> Emergency reorder NOW. Even expedited shipping is cheaper than lost sales and customers.
            </p>
          </>
        )

      case 'price_opportunity':
        const competitorPrice = product_context?.competitor_price || price * 1.15
        const priceDiff = competitorPrice - price
        const priceIncrease = Math.round(priceDiff * 0.5) // Increase by 50% of the gap
        const newPrice = price + priceIncrease
        const annualGain = Math.floor(priceIncrease * weeklyDemand * 52)

        return (
          <>
            <p className="mb-2"><strong className="text-white">Current Situation:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Your price: <strong className="text-white">£{price.toFixed(2)}</strong></li>
              <li>Competitor average: <strong className="text-white">£{competitorPrice.toFixed(2)}</strong></li>
              <li>You're <strong className="text-green-400">£{priceDiff.toFixed(2)} cheaper</strong> ({Math.round(priceDiff / competitorPrice * 100)}% below market)</li>
            </ul>

            <p className="mt-3 mb-2"><strong className="text-white">Why This is an Opportunity:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-green-400">Pricing Power:</strong> You can increase price and still be competitive</li>
              <li><strong className="text-green-400">Hidden Margin:</strong> You're leaving money on the table with every sale</li>
              <li><strong className="text-green-400">Customer Perception:</strong> Being too cheap can make customers question quality</li>
              <li><strong className="text-green-400">Market Test:</strong> Competitors have validated that customers will pay more</li>
            </ul>

            <p className="mt-3 mb-2"><strong className="text-white">The Math:</strong></p>
            <p className="ml-2">
              If you increase to <strong className="text-green-400">£{newPrice.toFixed(2)}</strong> (still cheaper than competitors):
              <br/>• Extra £{priceIncrease.toFixed(2)} per unit
              <br/>• × {weeklyDemand} units/week = £{(priceIncrease * weeklyDemand).toFixed(2)}/week
              <br/>• × 52 weeks = <strong className="text-green-400">£{annualGain.toLocaleString()}/year additional profit</strong>
            </p>

            <p className="mt-3 text-blue-300">
              <strong>Bottom line:</strong> Test a small price increase. Monitor sales for 2 weeks. If volume stays stable, you've found free money.
            </p>
          </>
        )

      case 'dead_stock':
        const monthsOld = Math.floor(weeks / 4)

        return (
          <>
            <p className="mb-2"><strong className="text-white">Current Situation:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-white">{weeks.toFixed(1)} weeks</strong> of inventory ({monthsOld}+ months)</li>
              <li>Moving at only <strong className="text-white">{weeklyDemand} units/week</strong></li>
              <li>This is considered <strong className="text-red-400">"dead stock"</strong> - inventory that barely moves</li>
            </ul>

            <p className="mt-3 mb-2"><strong className="text-white">Why This is Serious:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-red-400">Wasted Capital:</strong> Money invested that's not returning profit</li>
              <li><strong className="text-red-400">Ongoing Costs:</strong> Storage fees, insurance, management time</li>
              <li><strong className="text-red-400">Depreciation:</strong> Product loses value over time (trends change, newer versions come out)</li>
              <li><strong className="text-red-400">Space Waste:</strong> Warehouse space could hold better products</li>
            </ul>

            <p className="mt-3 text-blue-300">
              <strong>Bottom line:</strong> Aggressive clearance needed. Recover what you can now before value drops to zero. Better to get 50% back than 0%.
            </p>
          </>
        )

      default:
        return (
          <p>
            This alert indicates an issue with <strong className="text-white">{sku_code}</strong> that requires your attention.
            Review the details below and take action to prevent potential revenue loss.
          </p>
        )
    }
  }

  // Get type icon
  const getTypeIcon = () => {
    switch (type) {
      case 'critical_stockout':
        return <Package className="h-5 w-5" />
      case 'overstock_cash_drain':
        return <DollarSign className="h-5 w-5" />
      case 'price_opportunity':
        return <TrendingUp className="h-5 w-5" />
      case 'dead_stock':
        return <AlertTriangle className="h-5 w-5" />
      default:
        return <AlertCircle className="h-5 w-5" />
    }
  }

  return (
    <div className={cn(
      'rounded-lg border overflow-hidden transition-all duration-200 backdrop-blur-sm',
      colors.border,
      colors.bg,
      colors.accent,
      resolved && 'opacity-60',
      snoozed && 'opacity-40'
    )}>
      {/* Header */}
      <div className={cn('p-4 border-b border-white/5', colors.header)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn('p-2 rounded-lg', colors.badge)}>
              {getTypeIcon()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={cn('px-2 py-0.5 text-xs font-medium rounded border uppercase', colors.badge)}>
                  {severity}
                </span>
                <span className="text-xs text-white/50">SKU: {sku_code}</span>
                {can_auto_resolve && (
                  <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-300 rounded border border-green-500/30">
                    Auto-resolve available
                  </span>
                )}
              </div>

              <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
              <p className="text-sm text-white/70 line-clamp-2">{short_description || message}</p>
            </div>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
          >
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-white/60" />
            ) : (
              <ChevronDown className="h-5 w-5 text-white/60" />
            )}
          </button>
        </div>

        {/* Metrics row */}
        <div className="flex items-center gap-4 mt-3 text-sm flex-wrap">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-red-400" />
            <span className="text-white/60">At Risk:</span>
            <span className="text-white font-semibold">£{revenue_at_risk.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <span className="text-white/60">Impact:</span>
            <span className="text-green-300 font-semibold">£{estimated_impact.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-orange-400" />
            <span className="text-white/60">Urgency:</span>
            <span className="text-white font-semibold">{time_to_critical}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Info className="h-4 w-4 text-blue-400" />
            <span className="text-white/60">Confidence:</span>
            <span className="text-white font-semibold">{Math.round(confidence_level * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="p-4 space-y-4 bg-black/20">
          {/* What does this mean? */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              What does this mean?
            </h4>
            <div className="space-y-2 text-sm text-white/70 leading-relaxed">
              {getExplanation()}
            </div>
          </div>

          {/* Full message */}
          <div>
            <h4 className="text-sm font-medium text-white/60 mb-2 uppercase tracking-wide">Situation Analysis</h4>
            <p className="text-sm text-white/80 leading-relaxed">{message}</p>
          </div>

          {/* AI Analysis */}
          {ai_analysis && (
            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-indigo-300 mb-1">AI Strategic Insight</h4>
                  <p className="text-sm text-white/70 leading-relaxed">{ai_analysis}</p>
                </div>
              </div>
            </div>
          )}

          {/* Primary action */}
          <div className="bg-black/40 rounded-lg p-4 border border-white/10">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">Recommended Action</h4>
                <p className="text-base font-medium text-white">{primary_action.title}</p>
              </div>
              {primary_action.automation_available && (
                <span className="px-2 py-1 text-xs bg-green-500/20 text-green-300 rounded border border-green-500/30 whitespace-nowrap">
                  Can Automate
                </span>
              )}
            </div>

            {/* Action steps */}
            <div className="space-y-2 mb-3">
              {primary_action.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white/70">
                    {idx + 1}
                  </span>
                  <span className="text-white/70">{step}</span>
                </div>
              ))}
            </div>

            {/* Deadline and outcome */}
            <div className="flex items-center justify-between gap-4 text-xs pt-3 border-t border-white/10">
              <div>
                <span className="text-white/50">Deadline: </span>
                <span className="text-orange-300 font-medium">{primary_action.deadline}</span>
              </div>
              <div>
                <span className="text-white/50">Expected: </span>
                <span className="text-green-300 font-medium">{primary_action.expected_outcome}</span>
              </div>
            </div>

            {/* Auto-execute conditions */}
            {primary_action.auto_execute_conditions && primary_action.auto_execute_conditions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-white/50 mb-1.5">Auto-execute when:</p>
                <div className="space-y-1">
                  {primary_action.auto_execute_conditions.map((condition, idx) => (
                    <div key={idx} className="text-xs text-white/60 flex items-start gap-1.5">
                      <CheckCircle className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{condition}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Alternative actions */}
          {alternative_actions.length > 0 && (
            <div>
              <button
                onClick={() => setShowAlternatives(!showAlternatives)}
                className="flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white transition-colors mb-2"
              >
                {showAlternatives ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span>Alternative Actions ({alternative_actions.length})</span>
              </button>

              {showAlternatives && (
                <div className="space-y-3">
                  {alternative_actions.map((alt, idx) => (
                    <div key={idx} className="bg-black/40 rounded-lg p-3 border border-white/10">
                      <h5 className="text-sm font-medium text-white mb-1">{alt.title}</h5>
                      <p className="text-xs text-white/50 italic mb-2">When to use: {alt.when_to_use}</p>
                      <div className="space-y-1">
                        {alt.steps.map((step, stepIdx) => (
                          <div key={stepIdx} className="text-xs text-white/60 flex items-start gap-1.5">
                            <span className="text-white/30">•</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-green-400/80 mt-2">→ {alt.expected_outcome}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Status/History */}
          {(acknowledged || resolved || snoozed) && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="flex items-start gap-2 mb-2">
                <History className="h-4 w-4 text-white/40 mt-0.5 flex-shrink-0" />
                <h4 className="text-sm font-medium text-white/60 uppercase tracking-wide">Action Status</h4>
              </div>
              <div className="space-y-1.5 ml-6">
                {acknowledged && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span className="text-blue-300 font-medium">Acknowledged</span>
                    <span className="text-white/40">• Alert has been seen and noted</span>
                  </div>
                )}
                {snoozed && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                    <span className="text-orange-300 font-medium">Snoozed</span>
                    <span className="text-white/40">• Postponed for 24 hours</span>
                  </div>
                )}
                {resolved && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    <span className="text-green-300 font-medium">Resolved</span>
                    <span className="text-white/40">• Issue has been addressed</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <button
              onClick={() => onAction?.(id, 'execute')}
              disabled={resolved}
              className={cn(
                "px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                resolved && "opacity-50 cursor-not-allowed"
              )}
            >
              <Play className="h-4 w-4" />
              Execute Now
            </button>

            {!acknowledged && (
              <button
                onClick={() => onAction?.(id, 'acknowledge')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Acknowledge
              </button>
            )}

            {!snoozed && (
              <button
                onClick={() => onAction?.(id, 'snooze')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Pause className="h-4 w-4" />
                Snooze 24h
              </button>
            )}

            {!resolved && (
              <button
                onClick={() => onAction?.(id, 'resolve')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Mark Resolved
              </button>
            )}
          </div>

          {/* Escalation warning */}
          {escalate_if_not_resolved_hours && !resolved && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-200/80">
                  This alert will auto-escalate if not resolved within {escalate_if_not_resolved_hours} hours
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
