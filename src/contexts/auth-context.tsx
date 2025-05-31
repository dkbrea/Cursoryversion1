"use client";

import type { User } from "@/types";
import { useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser, signIn, signOut } from "@/lib/api/auth";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Only check session once
    if (sessionChecked) return;

    const checkSession = async () => {
      try {
        console.log('Checking for existing session...');
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Session check timeout')), 5000);
        });
        
        const sessionPromise = getCurrentUser();
        
        const { user, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (error) {
          console.error("Session error:", error);
          setUser(null);
        } else if (user) {
          console.log('User found in session:', user.email);
          setUser(user);
        } else {
          console.log('No authenticated user found');
          setUser(null);
        }
      } catch (error) {
        console.error("Session check failed:", error);
        setUser(null);
      } finally {
        setLoading(false);
        setSessionChecked(true);
        console.log('Session check completed');
      }
    };

    checkSession();
  }, [sessionChecked]);

  const login = async (email: string, password: string) => {
    try {
      console.log('Login attempt for:', email);
      const result = await signIn(email, password);
      
      if (result.error) {
        console.error('Login error:', result.error);
        return { success: false, error: result.error };
      }
      
      if (result.data?.user) {
        console.log('Supabase auth successful, getting user data');
        const { user: userData, error: userError } = await getCurrentUser();
        
        if (userError) {
          console.error('Error getting user data:', userError);
          return { success: false, error: userError };
        }
        
        if (!userData) {
          console.error('No user data found after login');
          return { success: false, error: 'User profile not found' };
        }
        
        console.log('User data retrieved successfully:', userData);
        setUser(userData);
        router.replace("/dashboard");
        return { success: true };
      }
      
      return { success: false, error: "Login failed" };
    } catch (error: any) {
      console.error('Unexpected login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      const result = await signOut();
      
      if (result.error) {
        return { success: false, error: result.error };
      }
      
      setUser(null);
      setSessionChecked(false); // Allow session check on next login
      router.push("/auth");
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
