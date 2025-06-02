"use client";

import { CheckCircle, Mail, ArrowRight, Shield } from 'lucide-react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function EmailConfirmedPage() {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    // If there's a token, verify it
    if (token) {
      verifyEmailToken(token);
    } else {
      // If no token, assume they navigated here directly after confirmation
      setIsVerified(true);
    }
  }, [token]);

  const verifyEmailToken = async (token: string) => {
    try {
      // Here you would call your actual email verification API
      // For now, we'll simulate a successful verification
      // Replace this with your actual verification logic
      
      /*
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        setIsVerified(true);
      } else {
        const data = await response.json();
        setError(data.error || 'Email verification failed');
        setIsVerified(false);
      }
      */

      // Simulated success for now
      setTimeout(() => {
        setIsVerified(true);
      }, 1000);

    } catch (error) {
      console.error('Email verification error:', error);
      setError('Failed to verify email. Please try again.');
      setIsVerified(false);
    }
  };

  if (isVerified === null) {
    // Loading state
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying your email...</p>
        </div>
      </div>
    );
  }

  if (isVerified === false) {
    // Error state
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/30 p-8">
            <div className="w-16 h-16 rounded-full bg-red-500/10 mx-auto mb-6 flex items-center justify-center">
              <Mail className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Email Verification Failed
            </h1>
            <p className="text-muted-foreground mb-6">
              {error || "We couldn't verify your email. The link may have expired or already been used."}
            </p>
            <Link href="/auth">
              <Button className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                Go to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Enhanced Modern Background System */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Mesh Gradient Background */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `
              radial-gradient(800px circle at 60% 40%, rgba(120, 87, 214, 0.15), transparent 50%),
              radial-gradient(600px circle at 30% 70%, rgba(138, 43, 226, 0.1), transparent 40%),
              linear-gradient(135deg, rgba(120, 87, 214, 0.03) 0%, rgba(138, 43, 226, 0.05) 50%, rgba(75, 0, 130, 0.03) 100%)
            `
          }}
        />
        
        {/* Floating bubbles */}
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => {
            const size = Math.random() * 60 + 20;
            const opacity = Math.random() * 0.3 + 0.1;
            const animationDuration = Math.random() * 8 + 6;
            const delay = Math.random() * 5;
            
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
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/30 p-8 sm:p-12 hover:bg-card/60 transition-all duration-300">
            
            {/* Success Icon */}
            <div className="relative mb-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/10 to-emerald-500/10 mx-auto flex items-center justify-center border border-green-500/20">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping opacity-75"></div>
            </div>

            {/* Header */}
            <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-4">
              Email Confirmed!
            </h1>
            
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Great! Your email address has been successfully verified. You're now ready to access your Unbroken Pockets account.
            </p>

            {/* Security Notice */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-8">
              <div className="flex items-center gap-3 text-primary mb-2">
                <Shield className="w-5 h-5" />
                <span className="font-medium">Security Notice</span>
              </div>
              <p className="text-sm text-muted-foreground">
                For your security, please log in to access your financial dashboard and start managing your money.
              </p>
            </div>

            {/* Call to Action */}
            <div className="space-y-4">
              <Link href="/auth">
                <Button 
                  size="lg" 
                  className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground py-3 px-6 text-lg font-medium transition-all duration-300 hover:scale-105 animate-glow"
                >
                  <div className="flex items-center justify-center gap-2">
                    Sign In to Your Account
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </Button>
              </Link>
              
              <p className="text-xs text-muted-foreground">
                By signing in, you'll have access to your financial dashboard, budgeting tools, and more.
              </p>
            </div>

            {/* Footer Link */}
            <div className="mt-8 pt-6 border-t border-border/30">
              <p className="text-sm text-muted-foreground">
                Need help?{' '}
                <Link 
                  href="/contact" 
                  className="text-primary hover:text-primary/80 transition-colors underline"
                >
                  Contact Support
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 