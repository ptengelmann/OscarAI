'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import { AuthModal } from '@/components/ui/auth-modals'
import { Navbar } from '@/components/ui/navbar'

// Import all icons in a single line
import { 
  ArrowRight,
  Shield,
  Briefcase,
  Play,
  MonitorSpeaker,
  Target,
  Brain,
  Upload,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  PieChart,
  Activity,
  Award,
  Building,
  Globe,
  CheckCircle,
  Store,
  Package,
  Star,
  Users,
  Zap,
  Calendar,
  Wine,
  X
} from 'lucide-react'

// Import modular components
import { HeroSection } from '@/components/landing/hero-section'
import { InteractiveDemo } from '@/components/landing/interactive-demo'
import { HowItWorksSection } from '@/components/landing/how-it-works-section'
import { TestimonialsSection } from '@/components/landing/testimonials-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { CallToActionSection } from '@/components/landing/call-to-action-section'
import { Footer } from '@/components/landing/footer'
import { DemoBookingModal } from '@/components/landing/demo-booking-modal'

// Helper data - keeps the main component clean
const testimonials = [
  {
    quote: "The UK Events Calendar is brilliant - it flagged Wimbledon 2 weeks early and suggested we stock up on Pimm's and premium gin. The AI even gave us the optimal pricing strategy. That one feature alone paid for the entire year.",
    author: "Sarah Mitchell",
    title: "Brand Manager, Premium Spirits Co.",
    avatar: "SM"
  },
  {
    quote: "Finally, someone who actually scrapes real retailer websites instead of using stale API data. I can see exactly what Tesco, Waitrose, and Majestic are charging right now. The one-click price matching with audit trails is a game-changer.",
    author: "David Chen",
    title: "Head of Commercial Intelligence, Independent Whisky Distillery",
    avatar: "DC"
  },
  {
    quote: "The rollback protection gives me confidence to execute AI recommendations without fear. If something goes wrong, I can undo it instantly. The full audit trail means I can show my boss exactly what actions I took and why.",
    author: "Maria Rodriguez",
    title: "UK Market Director, International Wine & Spirits",
    avatar: "MR"
  }
]

const howItWorksSteps = [
  {
    step: 1,
    title: "Upload & AI Brand Recognition",
    headline: "CSV upload, instant brand recognition",
    description: "Upload your product CSV and our AI automatically identifies your alcohol brands and categories. Within minutes, our system starts scraping live competitor prices from 20+ UK retailers and building your competitive intelligence dashboard.",
    features: [
      "AI recognizes brands automatically",
      "Works with CSV, Excel - simple upload interface",
      "Covers spirits, wine, beer, RTD, craft categories",
      "Instant competitive scraping begins upon upload",
      "15-minute smart cache keeps API costs low"
    ],
    icon: Upload
  },
  {
    step: 2,
    title: "Real UK Web Scraping",
    headline: "Not API data - actual live scraping",
    description: "Our system actually scrapes UK retailer websites (Tesco, Waitrose, Majestic, ASDA, Morrisons, Sainsbury's) for real-time competitor pricing. Get alerts when competitors change prices, with one-click actions to respond instantly.",
    features: [
      "Real web scraping from 20+ UK alcohol retailers",
      "Competitive coverage % tracking for your portfolio",
      "Smart 15-minute caching to minimize scraping costs",
      "One-click action execution with rollback protection",
      "Full audit trail on every price change"
    ],
    icon: MonitorSpeaker
  },
  {
    step: 3,
    title: "UK Events + AI Strategy",
    headline: "20+ UK events with AI-generated strategies",
    description: "Our built-in UK Events Calendar tracks Wimbledon, Burns Night, Chelsea Flower Show, Bonfire Night, Royal Ascot, and 15+ more events. Our AI generates event-specific strategies with timing, pricing, and revenue predictions for your portfolio.",
    features: [
      "UK Events Calendar: Wimbledon, Burns Night, Chelsea Flower Show, etc.",
      "AI-generated seasonal strategies tied to UK events",
      "Portfolio health scoring (1-10) with AI analysis",
      "Confidence scores on every AI recommendation",
      "Impact analytics ready (track predicted vs actual when Shopify connects)"
    ],
    icon: Brain
  }
]

const features = [
  {
    icon: Calendar,
    title: "UK Events Calendar",
    description: "20+ UK seasonal events (Wimbledon, Burns Night, etc.) with AI-generated strategies"
  },
  {
    icon: Activity,
    title: "Action Execution",
    description: "One-click actions with full audit trails, rollback protection, and confidence scoring"
  },
  {
    icon: Target,
    title: "Real Web Scraping",
    description: "Live scraping from 20+ UK retailers with smart 15-minute caching and coverage tracking"
  }
]

export default function ProductionReadyLanding() {
  const router = useRouter()
  const { user, login } = useUser()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [demoModalOpen, setDemoModalOpen] = useState(false)
  
  // Interactive states
  const [animatedNumber, setAnimatedNumber] = useState(0)
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [scrollY, setScrollY] = useState(0)

  // Animation effects
  useEffect(() => {
    const timer = setTimeout(() => {
      if (animatedNumber < 85) {
        setAnimatedNumber(prev => prev + 1)
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [animatedNumber])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial(prev => (prev + 1) % testimonials.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogin = () => {
    setAuthMode('login')
    setAuthModalOpen(true)
  }

  const handleSignup = () => {
    setAuthMode('signup')
    setAuthModalOpen(true)
  }

  const handleForgotPassword = () => {
    setAuthMode('reset')
    setAuthModalOpen(true)
  }

  const handleAuthSuccess = (userData: any) => {
    const fullUserData = {
      ...userData,
      company: 'Demo Account',
      phone: '',
      location: 'UK'
    }
    login(fullUserData)
    setAuthModalOpen(false)
    router.push('/dashboard')
  }

  // Updated switchAuthMode to handle reset mode properly
  const switchAuthMode = () => {
    if (authMode === 'login') {
      setAuthMode('signup')
    } else if (authMode === 'signup') {
      setAuthMode('login')
    } else if (authMode === 'reset') {
      setAuthMode('login')
    }
  }

  // New function specifically for forgot password
  const handleSwitchToReset = () => {
    setAuthMode('reset')
  }

  const handleBookDemo = () => {
    setDemoModalOpen(true)
  }

  const handleWatchDemo = () => {
    router.push('/competitive')
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Clean black background with minimal grid overlay */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Pure black background */}
        <div className="absolute inset-0 bg-black" />
        
        {/* Subtle grid overlay for depth - no geometric circles */}
        <div className="absolute inset-0">
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `
                linear-gradient(white 1px, transparent 1px),
                linear-gradient(90deg, white 1px, transparent 1px)
              `,
              backgroundSize: '100px 100px'
            }}
          />
        </div>
      </div>

      {/* Header */}
      <div className="relative z-50">
        <Navbar 
          onLogin={handleLogin} 
          onSignup={handleSignup}
          onForgotPassword={handleForgotPassword}
        />
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={switchAuthMode}
        onSwitchToReset={handleSwitchToReset}
        onSuccess={handleAuthSuccess}
      />

      <main>
        <HeroSection 
          onBookDemo={handleBookDemo}
          onWatchDemo={handleWatchDemo}
        />
        
        <InteractiveDemo 
          animatedNumber={animatedNumber}
          scrollY={scrollY}
        />
        
        <HowItWorksSection 
          steps={howItWorksSteps}
        />
        
        <TestimonialsSection 
          testimonials={testimonials}
          currentTestimonial={currentTestimonial}
          setCurrentTestimonial={setCurrentTestimonial}
        />
        
        <FeaturesSection 
          features={features}
          scrollY={scrollY}
        />
        
        <CallToActionSection 
          onBookDemo={handleBookDemo}
        />
      </main>

      <Footer />

      <DemoBookingModal 
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
      />
    </div>
  )
}