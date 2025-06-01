"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/auth');
      }
    }
  }, [isAuthenticated, loading, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          Welcome to Your App
        </h1>
        
        <p className="text-xl text-muted-foreground">
          Your application is running successfully. Check out the new landing page inspired by micro.so!
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <Link href="/landing">
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
              View Landing Page
            </Button>
          </Link>
          
          <Link href="/auth">
            <Button variant="outline" size="lg">
              Go to Dashboard
            </Button>
          </Link>
        </div>
        
        <div className="text-sm text-muted-foreground">
          The landing page replicates micro.so's design elements and animations using your existing color scheme.
        </div>
      </div>
    </div>
  );
}
