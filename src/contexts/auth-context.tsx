"use client";

import type { User } from "@/types";
import { useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser, signIn, signOut, updateUserProfile } from "@/lib/api/auth";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: { firstName?: string; lastName?: string; avatar?: string }) => Promise<{ success: boolean; error?: string }>;
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
      console.log('Logout function called');
      const result = await signOut();
      console.log('SignOut result:', result);
      
      // Always clear user state and redirect, even if signOut had issues
      setUser(null);
      setSessionChecked(false); // Allow session check on next login
      router.push("/auth");
      
      if (result.error) {
        console.warn('Sign out had an error, but proceeding with logout:', result.error);
        return { success: true, error: result.error }; // Still treat as success since we cleared state
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Logout exception:', error);
      
      // Even if there's an exception, clear the user state and redirect
      setUser(null);
      setSessionChecked(false);
      router.push("/auth");
      
      return { success: true, error: error.message }; // Treat as success since we cleared state
    }
  };

  const updateProfile = async (updates: { firstName?: string; lastName?: string; avatar?: string }) => {
    try {
      if (!user) {
        return { success: false, error: "No user logged in" };
      }

      const result = await updateUserProfile(user.id, updates);
      
      if (result.error) {
        return { success: false, error: result.error };
      }

      if (result.user) {
        setUser(result.user);
        return { success: true };
      }

      return { success: false, error: "Failed to update profile" };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, updateProfile, loading }}>
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
