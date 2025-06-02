'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { ChevronRight, Star, Users, TrendingUp, ArrowRight, CheckCircle, ArrowUpRight, Sparkles, DollarSign, Shield, PieChart, BarChart3, Wallet, CreditCard, Target, Calculator } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth()
  const [isVisible, setIsVisible] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [currentSection, setCurrentSection] = useState(0)
  const heroRef = useRef<HTMLElement>(null)
  const [visibleElements, setVisibleElements] = useState(new Set())
  
  // Text scramble state
  const [scrambledText, setScrambledText] = useState("Master Your Money System")
  const titleRef = useRef<HTMLHeadingElement>(null)
  
  const dynamicTexts = [
    "Master Your Money System",
    "Control Your Financial Future", 
    "Unbreak Your Finances",
    "Achieve Financial Freedom"
  ]

  const sections = ['hero', 'dashboard', 'features', 'stats', 'testimonials', 'cta']

  // TextScramble class converted for React
  class TextScramble {
    constructor(el: HTMLElement) {
      this.el = el;
      this.chars = '!<>-_\\/[]{}—=+*^?#________';
      this.update = this.update.bind(this);
    }
    
    setText(newText: string): Promise<void> {
      const oldText = this.el.innerText;
      const length = Math.max(oldText.length, newText.length);
      const promise = new Promise<void>((resolve) => { this.resolve = resolve; });
      this.queue = [];
      
      for (let i = 0; i < length; i++) {
        const from = oldText[i] || '';
        const to = newText[i] || '';
        const start = Math.floor(Math.random() * 40);
        const end = start + Math.floor(Math.random() * 40);
        this.queue.push({ from, to, start, end });
      }
      
      if (this.frameRequest) {
        cancelAnimationFrame(this.frameRequest);
      }
      this.frame = 0;
      this.update();
      return promise;
    }
    
    update() {
      let output = '';
      let complete = 0;
      
      for (let i = 0, n = this.queue.length; i < n; i++) {
        let { from, to, start, end, char } = this.queue[i];
        
        if (this.frame >= end) {
          complete++;
          output += to;
        } else if (this.frame >= start) {
          if (!char || Math.random() < 0.28) {
            char = this.randomChar();
            this.queue[i].char = char;
          }
          output += `<span style="color: #7957D6; opacity: 0.7">${char}</span>`;
        } else {
          output += from;
        }
      }
      
      this.el.innerHTML = output;
      
      if (complete === this.queue.length) {
        this.resolve();
      } else {
        this.frameRequest = requestAnimationFrame(this.update);
        this.frame++;
      }
    }
    
    randomChar() {
      return this.chars[Math.floor(Math.random() * this.chars.length)];
    }

    el: HTMLElement;
    chars: string;
    queue: Array<{from: string, to: string, start: number, end: number, char?: string}> = [];
    frame = 0;
    frameRequest?: number;
    resolve!: () => void;
  }

  useEffect(() => {
    setIsVisible(true)
    
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = (scrollTop / docHeight) * 100
      
      setScrollY(scrollTop)
      setScrollProgress(progress)
      
      // Update current section
      const sectionElements = sections.map(id => document.getElementById(id)).filter(Boolean)
      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const section = sectionElements[i]
        if (section && section.offsetTop <= scrollTop + 200) {
          setCurrentSection(i)
          break
        }
      }
    }

    // Text scramble effect
    let scrambler: TextScramble | null = null;
    let counter = 0;
    let textInterval: NodeJS.Timeout;

    if (titleRef.current) {
      scrambler = new TextScramble(titleRef.current);
      
      const next = () => {
        if (scrambler) {
          scrambler.setText(dynamicTexts[counter]).then(() => {
            textInterval = setTimeout(next, 1500);
          });
          counter = (counter + 1) % dynamicTexts.length;
        }
      };
      
      setTimeout(next, 2000);
    }

    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleElements(prev => new Set(prev).add(entry.target.id))
          }
        })
      },
      { threshold: 0.1 }
    )

    const elements = document.querySelectorAll('.scroll-reveal')
    elements.forEach(el => {
      if (el.id) observer.observe(el)
    })

    // Magnetic button effects
    const magneticButtons = document.querySelectorAll('.magnetic-button')
    magneticButtons.forEach(btn => {
      const button = btn as HTMLElement
      
      const handleMouseEnter = () => {
        // Removed custom cursor effects
      }
      
      const handleMouseLeave = () => {
        // Removed custom cursor effects
        button.style.transform = 'translate(0px, 0px)'
      }
      
      const handleMouseMove = (e: MouseEvent) => {
        const rect = button.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const moveX = (x - centerX) * 0.3
        const moveY = (y - centerY) * 0.3
        
        button.style.transform = `translate(${moveX}px, ${moveY}px)`
      }
      
      button.addEventListener('mouseenter', handleMouseEnter)
      button.addEventListener('mouseleave', handleMouseLeave)
      button.addEventListener('mousemove', handleMouseMove)
    })

    window.addEventListener('scroll', handleScroll)
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (textInterval) clearTimeout(textInterval)
      observer.disconnect()
    }
  }, [])

  const scrollToSection = (index: number) => {
    const sectionId = sections[index]
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const scrollToSectionByName = (sectionName: string) => {
    const element = document.getElementById(sectionName)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="landing-page min-h-screen bg-background overflow-hidden relative">
      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="cursor-pointer">
                <div className="text-2xl font-bold gradient-text leading-tight">
                  Unbroken Pockets
                </div>
              </div>
            </div>
            
            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSectionByName('features')} className="text-muted-foreground hover:text-primary transition-colors duration-300 cursor-pointer">
                Features
              </button>
              <button onClick={() => scrollToSectionByName('dashboard')} className="text-muted-foreground hover:text-primary transition-colors duration-300 cursor-pointer">
                Screenshots
              </button>
              <button onClick={() => scrollToSectionByName('stats')} className="text-muted-foreground hover:text-primary transition-colors duration-300 cursor-pointer">
                Pricing
              </button>
              <button onClick={() => scrollToSectionByName('testimonials')} className="text-muted-foreground hover:text-primary transition-colors duration-300 cursor-pointer">
                Support
              </button>
            </div>
            
            {/* Authentication Buttons */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button 
                    variant="ghost" 
                    className="magnetic-button text-muted-foreground hover:text-primary border border-primary/20 hover:border-primary hover:bg-primary/5 transition-all duration-300"
                  >
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth">
                    <Button 
                      variant="ghost" 
                      className="magnetic-button text-muted-foreground hover:text-primary border border-primary/20 hover:border-primary hover:bg-primary/5 transition-all duration-300"
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth">
                    <Button 
                      className="magnetic-button bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Progress Bar */}
      <div className="fixed top-0 left-0 h-1 bg-gradient-to-r from-primary to-accent z-[999] transition-all duration-100" style={{ width: `${scrollProgress}%` }} />
      
      {/* Side Navigation */}
      <div className="fixed top-1/2 right-8 transform -translate-y-1/2 flex flex-col gap-4 z-50">
        {sections.map((section, index) => (
          <div
            key={section}
            onClick={() => scrollToSection(index)}
            className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-300 ${
              currentSection === index 
                ? 'bg-primary scale-150' 
                : 'bg-primary/30 hover:bg-primary/60 hover:scale-125'
            }`}
          />
        ))}
      </div>

      {/* Enhanced Modern Background System */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Mesh Gradient Background */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `
              radial-gradient(800px circle at 60% 40%, rgba(120, 87, 214, 0.15), transparent 50%),
              radial-gradient(600px circle at 30% 70%, rgba(138, 43, 226, 0.1), transparent 40%),
              radial-gradient(400px circle at 80% 20%, rgba(75, 0, 130, 0.08), transparent 30%),
              linear-gradient(135deg, rgba(120, 87, 214, 0.03) 0%, rgba(138, 43, 226, 0.05) 50%, rgba(75, 0, 130, 0.03) 100%)
            `
          }}
        />

        {/* Enhanced Bubble System */}
        <div className="absolute inset-0">
          {[...Array(25)].map((_, i) => {
            const size = Math.random() * 60 + 20; // 20-80px bubbles
            const opacity = Math.random() * 0.3 + 0.1; // 0.1-0.4 opacity
            const animationDuration = Math.random() * 8 + 6; // 6-14s duration
            const delay = Math.random() * 5; // 0-5s delay
            
            return (
              <div
                key={i}
                className="absolute rounded-full bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 animate-float blur-sm"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: opacity,
                  animationDelay: `${delay}s`,
                  animationDuration: `${animationDuration}s`
                }}
              />
            );
          })}
        </div>

        {/* Large Glass Orbs */}
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => {
            const size = Math.random() * 120 + 80; // 80-200px orbs
            const opacity = Math.random() * 0.15 + 0.05; // 0.05-0.2 opacity
            const animationDuration = Math.random() * 12 + 8; // 8-20s duration
            const delay = Math.random() * 6; // 0-6s delay
            
            return (
              <div
                key={i}
                className="absolute rounded-full bg-gradient-to-br from-white/10 via-primary/5 to-accent/10 backdrop-blur-md border border-white/5 animate-float"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: opacity,
                  animationDelay: `${delay}s`,
                  animationDuration: `${animationDuration}s`
                }}
              />
            );
          })}
        </div>

        {/* Extra Large Bubbles */}
        <div className="absolute inset-0">
          {[...Array(4)].map((_, i) => {
            const size = Math.random() * 200 + 150; // 150-350px extra large bubbles
            const opacity = Math.random() * 0.1 + 0.03; // 0.03-0.13 opacity (more subtle)
            const animationDuration = Math.random() * 20 + 15; // 15-35s duration (slower)
            const delay = Math.random() * 10; // 0-10s delay
            
            return (
              <div
                key={i}
                className="absolute rounded-full bg-gradient-to-br from-primary/10 via-accent/5 to-primary/3 animate-float blur-md"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: opacity,
                  animationDelay: `${delay}s`,
                  animationDuration: `${animationDuration}s`
                }}
              />
            );
          })}
        </div>

        {/* Small Particle Bubbles */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => {
            const size = Math.random() * 8 + 4; // 4-12px particles
            const opacity = Math.random() * 0.4 + 0.2; // 0.2-0.6 opacity
            const animationDuration = Math.random() * 6 + 4; // 4-10s duration
            const delay = Math.random() * 8; // 0-8s delay
            
            return (
              <div
                key={i}
                className="absolute rounded-full bg-gradient-to-r from-primary/40 to-accent/40 animate-float"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: opacity,
                  animationDelay: `${delay}s`,
                  animationDuration: `${animationDuration}s`
                }}
              />
            );
          })}
        </div>

        {/* Enhanced Grid Pattern with Depth */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(120, 87, 214, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(120, 87, 214, 0.3) 1px, transparent 1px),
              linear-gradient(rgba(138, 43, 226, 0.2) 1px, transparent 1px),
              linear-gradient(90deg, rgba(138, 43, 226, 0.2) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px, 60px 60px, 20px 20px, 20px 20px',
            transform: `translateY(${scrollY * 0.05}px)`
          }}
        />

        {/* Spotlight Effects */}
        <div className="absolute inset-0">
          <div 
            className="absolute w-96 h-96 bg-gradient-radial from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl"
            style={{
              top: '20%',
              left: '10%'
            }}
          />
          <div 
            className="absolute w-80 h-80 bg-gradient-radial from-accent/8 via-accent/4 to-transparent rounded-full blur-3xl"
            style={{
              bottom: '20%',
              right: '15%'
            }}
          />
        </div>
      </div>
      
      {/* Hero Section */}
      <section id="hero" ref={heroRef} className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-16">
        <div 
          className={`max-w-7xl mx-auto text-center transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        >
          
          {/* Enhanced 3D main heading with text scramble effect */}
          <div className="perspective-1000 mb-8">
            <h1 
              ref={titleRef}
              className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight transform-3d bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent animate-gradient"
            >
              Master Your Money System
            </h1>
          </div>

          {/* Enhanced subtitle */}
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom duration-1000 delay-500">
            Take control of your financial future with our all-in-one personal finance solution.
            <br />
            <span className="gradient-text font-semibold text-2xl">Experience peace of mind knowing your finances are unbroken.</span>
          </p>

          {/* Enhanced CTA section */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-in fade-in slide-in-from-bottom duration-1000 delay-700">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="lg" className="magnetic-button group relative overflow-hidden px-12 py-6 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transform hover:scale-105 transition-all duration-300 animate-glow">
                  <span className="relative z-10 flex items-center">
                    Go to Dashboard
                    <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-2" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </Button>
              </Link>
            ) : (
              <Link href="/auth">
                <Button size="lg" className="magnetic-button group relative overflow-hidden px-12 py-6 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transform hover:scale-105 transition-all duration-300 animate-glow">
                  <span className="relative z-10 flex items-center">
                    Start Your Financial Journey
                    <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-2" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </Button>
              </Link>
            )}
          </div>

          {/* Financial metrics preview */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom duration-1000 delay-1500">
            <div className="flex items-center gap-2 hover-lift">
              <DollarSign className="w-5 h-5 text-primary" />
              <span className="font-medium">$24,532 Avg. Balance</span>
            </div>
            <div className="flex items-center gap-2 hover-lift">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="font-medium">+5.8% Growth</span>
            </div>
            <div className="flex items-center gap-2 hover-lift">
              <Target className="w-5 h-5 text-accent" />
              <span className="font-medium">Goal Tracking</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div 
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer z-10 opacity-80 hover:opacity-100 transition-opacity"
          onClick={() => scrollToSection(1)}
        >
          <div className="flex flex-col items-center gap-3 text-primary">
            <div className="w-7 h-12 border-2 border-primary rounded-full relative">
              <div className="w-1 h-2 bg-primary rounded-full absolute top-2 left-1/2 transform -translate-x-1/2 animate-bounce" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-2 h-2 border-r-2 border-b-2 border-primary transform rotate-45 animate-pulse" style={{ animationDelay: '0s' }} />
              <div className="w-2 h-2 border-r-2 border-b-2 border-primary transform rotate-45 animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 border-r-2 border-b-2 border-primary transform rotate-45 animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        </div>

        {/* Enhanced floating particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-primary/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section id="dashboard" className="py-32 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div 
            className={`text-center mb-20 scroll-reveal ${visibleElements.has('dashboard-header') ? 'visible' : ''}`}
            id="dashboard-header"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Your All-in-One 
              <span className="block gradient-text">Financial Command Center</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See how our platform transforms your financial life with these powerful features.
            </p>
          </div>

          {/* Mock Dashboard */}
          <div 
            className={`scroll-reveal ${visibleElements.has('dashboard-preview') ? 'visible' : ''} mb-20`}
            id="dashboard-preview"
          >
            <div className="relative max-w-5xl mx-auto">
              <div className="tilt-card relative p-8 rounded-3xl border border-border/50 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-md hover:border-primary/30 transition-all duration-500 hover:-translate-y-2 group">
                {/* Dashboard Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Financial Dashboard</h3>
                      <p className="text-sm text-muted-foreground">Overview of your finances</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/30"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/30"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/30"></div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex gap-6 mb-8 border-b border-border/30 pb-4">
                  {['Dashboard', 'Accounts', 'Transactions', 'Cash Flow', 'Budget'].map((item, index) => (
                    <div key={item} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer hover:bg-primary/5 ${index === 0 ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                      {index === 0 && <BarChart3 className="w-4 h-4" />}
                      {index === 1 && <CreditCard className="w-4 h-4" />}
                      {index === 2 && <ArrowRight className="w-4 h-4" />}
                      {index === 3 && <TrendingUp className="w-4 h-4" />}
                      {index === 4 && <Target className="w-4 h-4" />}
                      <span className="text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>

                {/* Financial Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="metric-card p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10 hover:shadow-lg transition-all duration-300 cursor-pointer">
                    <div className="text-3xl font-bold text-primary mb-2">$24,532</div>
                    <div className="text-sm text-muted-foreground mb-1">Total Balance</div>
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <TrendingUp className="w-3 h-3" />
                      <span>+12.5% from last month</span>
                    </div>
                  </div>
                  <div className="metric-card p-6 rounded-2xl bg-gradient-to-br from-green-500/5 to-emerald-500/5 border border-green-500/10 hover:shadow-lg transition-all duration-300 cursor-pointer">
                    <div className="text-3xl font-bold text-green-600 mb-2">+5.8%</div>
                    <div className="text-sm text-muted-foreground mb-1">Monthly Growth</div>
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <ArrowRight className="w-3 h-3" />
                      <span>Trending upward</span>
                    </div>
                  </div>
                  <div className="metric-card p-6 rounded-2xl bg-gradient-to-br from-accent/5 to-purple-500/5 border border-accent/10 hover:shadow-lg transition-all duration-300 cursor-pointer">
                    <div className="text-3xl font-bold text-accent mb-2">$3,250</div>
                    <div className="text-sm text-muted-foreground mb-1">Saving Goal</div>
                    <div className="flex items-center gap-1 text-xs text-accent">
                      <Target className="w-3 h-3" />
                      <span>65% completed</span>
                    </div>
                  </div>
                </div>

                {/* Feature highlights */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: 'Transaction Tracking', icon: ArrowRight },
                    { name: 'Budget Management', icon: PieChart },
                    { name: 'Financial Goals', icon: Target },
                    { name: 'Investment Portfolio', icon: TrendingUp }
                  ].map((feature, index) => {
                    const IconComponent = feature.icon;
                    return (
                      <div key={feature.name} className="feature-highlight p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-300 text-center cursor-pointer hover:scale-105">
                        <IconComponent className="w-6 h-6 text-primary mx-auto mb-2" />
                        <div className="text-xs font-medium">{feature.name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section with 3D cards */}
      <section id="features" className="py-32 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div 
            className={`text-center mb-20 scroll-reveal ${visibleElements.has('features-header') ? 'visible' : ''}`}
            id="features-header"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Comprehensive Financial Tools
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage, track, and grow your wealth in one seamless platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Intuitive Dashboard",
                description: "Get a holistic view of your finances at a glance with our beautifully designed dashboard that highlights key metrics and insights.",
                icon: BarChart3,
                gradient: "from-blue-500/20 to-primary/20",
                delay: "delay-200"
              },
              {
                title: "Detailed Reports",
                description: "Generate insightful financial reports that help you understand your spending patterns and make informed decisions.",
                icon: PieChart,
                gradient: "from-primary/20 to-accent/20",
                delay: "delay-400"
              },
              {
                title: "Smart Budgeting",
                description: "Create personalized budgets that adapt to your lifestyle and help you reach your financial goals without feeling restricted.",
                icon: Calculator,
                gradient: "from-accent/20 to-primary/20",
                delay: "delay-600"
              }
            ].map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div 
                  key={index}
                  className={`scroll-reveal ${visibleElements.has(`feature-${index}`) ? 'visible' : ''}`}
                  id={`feature-${index}`}
                >
                  <div className={`tilt-card group perspective-1000 h-full animate-in fade-in slide-in-from-bottom duration-1000 ${feature.delay}`}>
                    <div className="relative p-8 rounded-3xl border border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-md hover:border-primary/30 transition-all duration-500 hover:-translate-y-4 hover:rotate-x-2 transform-3d group-hover:shadow-2xl group-hover:shadow-primary/10 h-full cursor-pointer">
                      {/* Gradient overlay */}
                      <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                      
                      {/* Content */}
                      <div className="relative z-10">
                        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 mb-6 group-hover:scale-110 transition-transform duration-300">
                          <IconComponent className="w-8 h-8 text-primary group-hover:text-accent transition-colors duration-300" />
                        </div>
                        <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors duration-300">
                          {feature.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                      
                      {/* Hover shimmer effect */}
                      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 shimmer-wrapper" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Enhanced Stats Section with counter animations */}
      <section id="stats" className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-muted/20 via-card/10 to-muted/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto text-center">
          <div 
            className={`scroll-reveal ${visibleElements.has('stats-header') ? 'visible' : ''} mb-16`}
            id="stats-header"
          >
            <h2 className="text-3xl sm:text-4xl font-bold gradient-text">
              Trusted by thousands for their financial success
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "50K+", label: "Active Users", icon: Users },
              { number: "$2.5B+", label: "Money Managed", icon: DollarSign },
              { number: "25K+", label: "Goals Achieved", icon: Target },
              { number: "99.9%", label: "Uptime", icon: Shield }
            ].map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div 
                  key={index}
                  className={`scroll-reveal ${visibleElements.has(`stat-${index}`) ? 'visible' : ''} group`}
                  id={`stat-${index}`}
                >
                  <div className="tilt-card relative p-6 rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:-translate-y-2 cursor-pointer">
                    <IconComponent className="w-8 h-8 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
                    <div className="text-4xl sm:text-5xl font-bold text-primary mb-2 group-hover:scale-105 transition-transform duration-300">
                      {stat.number}
                    </div>
                    <div className="text-muted-foreground font-medium">
                      {stat.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Enhanced Testimonials with 3D perspective */}
      <section id="testimonials" className="py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div 
            className={`text-center mb-20 scroll-reveal ${visibleElements.has('testimonials-header') ? 'visible' : ''}`}
            id="testimonials-header"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              What people are <span className="gradient-text">saying</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                quote: "This app completely transformed my financial habits. I finally have control over my money and can see my progress clearly.",
                author: "Sarah Mitchell",
                role: "Freelance Designer",
                company: "Self-Employed",
                avatar: "SM"
              },
              {
                quote: "The budgeting tools are incredible. I've saved more money in 6 months than I did in the previous 2 years combined.",
                author: "David Chen",
                role: "Software Engineer",
                company: "TechCorp",
                avatar: "DC"
              },
              {
                quote: "Finally, a financial app that doesn't make me feel overwhelmed. The dashboard is beautiful and everything just makes sense.",
                author: "Maria Rodriguez",
                role: "Marketing Manager",
                company: "StartupXYZ",
                avatar: "MR"
              }
            ].map((testimonial, index) => (
              <div 
                key={index}
                className={`scroll-reveal ${visibleElements.has(`testimonial-${index}`) ? 'visible' : ''} group perspective-1000`}
                id={`testimonial-${index}`}
              >
                <div className="tilt-card relative p-8 rounded-3xl border border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-md hover:border-primary/30 transition-all duration-500 hover:-translate-y-2 hover:rotate-x-1 transform-3d h-full cursor-pointer">
                  {/* Quote decoration */}
                  <div className="absolute top-4 right-4 text-6xl text-primary/10 font-serif">"</div>
                  
                  {/* Stars */}
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className="w-4 h-4 fill-primary text-primary animate-pulse" 
                        style={{ animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                  
                  {/* Quote */}
                  <p className="text-muted-foreground mb-8 leading-relaxed text-lg relative z-10">
                    "{testimonial.quote}"
                  </p>
                  
                  {/* Author info */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{testimonial.author}</div>
                      <div className="text-sm text-muted-foreground">
                        {testimonial.role} at {testimonial.company}
                      </div>
                    </div>
                  </div>
                  
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section with animated background */}
      <section id="cta" className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5" />
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer" />
        </div>
        
        <div 
          className={`max-w-4xl mx-auto text-center relative z-10 scroll-reveal ${visibleElements.has('cta-section') ? 'visible' : ''}`}
          id="cta-section"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-8">
            Start Your Financial
            <span className="block gradient-text">Transformation</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Join thousands of people who have found peace and success with their finances. 
            Take control of your financial future today.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="lg" className="magnetic-button px-16 py-8 text-xl font-semibold group bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transform hover:scale-105 transition-all duration-300 animate-glow">
                  <span className="flex items-center">
                    Go to Dashboard
                    <ArrowRight className="ml-3 w-6 h-6 transition-transform group-hover:translate-x-2" />
                  </span>
                </Button>
              </Link>
            ) : (
              <Link href="/auth">
                <Button size="lg" className="magnetic-button px-16 py-8 text-xl font-semibold group bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transform hover:scale-105 transition-all duration-300 animate-glow">
                  <span className="flex items-center">
                    Get Started Today
                    <ArrowRight className="ml-3 w-6 h-6 transition-transform group-hover:translate-x-2" />
                  </span>
                </Button>
              </Link>
            )}
            {!isAuthenticated && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-lg">Free to start • No credit card required</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="border-t border-border/30 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-md py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-6">
            <div className="text-3xl font-bold gradient-text mb-2">Unbroken Pockets</div>
          </div>
          <p className="text-muted-foreground mb-8 text-lg">
            Master your money, master your life.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
            {['Privacy Policy', 'Terms of Service', 'Contact Us', 'Support'].map((link) => (
              <a 
                key={link}
                href="#" 
                className="hover:text-primary transition-colors duration-300 hover:scale-105 transform text-lg cursor-pointer"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}