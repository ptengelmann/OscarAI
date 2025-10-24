import React from 'react'
import { ArrowRight, Play } from 'lucide-react'

interface HeroSectionProps {
  onBookDemo: () => void
  onWatchDemo: () => void
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onBookDemo, onWatchDemo }) => {
  return (
<div className="min-h-screen flex items-center">
      <section className="relative w-full py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-12 items-center">
            {/* Left side - Value proposition (3 columns) */}
            <div className="lg:col-span-3">
              <div className="inline-flex items-center space-x-2 px-3 py-1 border border-green-400/30 bg-green-500/10 rounded mb-8">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-300 text-sm font-medium">Real-time UK alcohol market intelligence • AI powered</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-light text-white leading-tight mb-8">
                One-click actions that
                <br />
                <span className="text-green-400">execute themselves</span>
              </h1>

              <p className="text-base md:text-lg text-white/70 leading-relaxed mb-6 max-w-2xl">
                AI that doesn't just recommend - it executes. Real scraping across UK retailers.
                Full audit trails. Rollback protection. Built exclusively for UK alcohol brands.
              </p>

              {/* Social proof metrics - ACCURATE */}
              <div className="grid grid-cols-3 gap-6 mb-10 max-w-lg">
                <div className="text-center">
                  <div className="text-2xl font-light text-white">20+</div>
                  <div className="text-xs text-white/60">UK retailers scraped live</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-light text-white">15 min</div>
                  <div className="text-xs text-white/60">Smart cache refresh</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-light text-white">100%</div>
                  <div className="text-xs text-white/60">Audit trail coverage</div>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-10">
                <button 
                  onClick={onBookDemo}
                  className="px-6 py-3 bg-white text-black text-sm font-medium rounded hover:bg-gray-100 transition-colors flex items-center space-x-2"
                >
                  <span>Book demo</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                
                <button 
                  onClick={onWatchDemo}
                  className="px-6 py-3 border border-white/20 text-white text-sm font-medium rounded hover:border-white/40 transition-colors flex items-center space-x-2"
                >
                  <Play className="h-4 w-4" />
                  <span>Watch demo</span>
                </button>
              </div>

              <div className="text-sm text-white/50">
                <span className="text-white/60">Live scraping from UK retailers:</span>
                <br />
                Majestic Wine • Tesco • Waitrose • ASDA • Morrisons • Sainsbury's • and more
              </div>
            </div>

            {/* Right side - Live example (2 columns) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="text-xs text-white/60 mb-3 flex items-center space-x-2">
                <span>AI Strategic Intelligence:</span>
                <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400">LIVE</span>
              </div>

              {/* Real features showcase */}
              <div className="space-y-3">
                <div className="bg-purple-500/10 border border-purple-500/20 rounded p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse" />
                      <span className="text-purple-300 text-xs font-medium">UK Events Calendar</span>
                    </div>
                    <span className="text-purple-200 text-xs">Live</span>
                  </div>
                  <div className="text-white text-xs font-medium">Wimbledon starts in 14 days</div>
                  <div className="text-white/60 text-xs">AI analyzing gin & Pimm's seasonal demand surge</div>
                  <div className="text-purple-300 text-xs font-medium mt-1">Strategy: Pre-position stock with 18% markup</div>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-green-300 text-xs font-medium">Action Executed</span>
                    </div>
                    <span className="text-green-200 text-xs">2 mins ago</span>
                  </div>
                  <div className="text-white text-xs font-medium">Price update: Grey Goose £28.50 → £26.99</div>
                  <div className="text-white/60 text-xs">Full audit trail saved • Rollback available</div>
                  <div className="text-green-300 text-xs font-medium mt-1">Confidence: 87% • Tracking actual impact</div>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/20 rounded p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-1 bg-orange-400 rounded-full animate-pulse" />
                      <span className="text-orange-300 text-xs font-medium">Live Scrape Alert</span>
                    </div>
                    <span className="text-orange-200 text-xs">Just now</span>
                  </div>
                  <div className="text-white text-xs font-medium">Belvedere price dropped at Waitrose</div>
                  <div className="text-white/60 text-xs">£42.00 → £37.50 (-11%) • Scraped from waitrose.com</div>
                  <div className="text-orange-300 text-xs font-medium mt-1">Action ready: Click to match competitor price</div>
                </div>
              </div>

              {/* Real system capabilities */}
              <div className="bg-white/5 border border-white/20 rounded p-4 mt-6">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="text-xs text-white/60">Real System Features:</div>
                  <div className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded border border-green-500/30">
                    All Implemented
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/70">Competitive coverage tracking</span>
                    <span className="text-green-400 font-medium">Live % monitoring</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/70">UK events: Wimbledon, Burns Night...</span>
                    <span className="text-white">20+ seasonal events</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/70">Action audit trail with rollback</span>
                    <span className="text-purple-400">100% coverage</span>
                  </div>
                  <div className="border-t border-white/20 pt-2 mt-3">
                    <div className="text-white/70 text-xs font-medium mb-1">Impact Analytics:</div>
                    <span className="text-green-300 text-xs">Track predicted vs actual outcomes (Shopify ready)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}