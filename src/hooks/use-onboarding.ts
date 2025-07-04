"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";

interface SetupProgress {
  onboardingCompleted?: boolean;
  steps?: Record<string, boolean>;
  [key: string]: any;
}

export function useOnboarding() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkOnboardingStatus = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      // First check if onboarding was manually completed
      const { data: preferencesData, error: preferencesError } = await supabase
        .from('user_preferences')
        .select('setup_progress')
        .eq('user_id', user.id)
        .single();

      // If onboarding was manually completed, don't show it
      const setupProgress = preferencesData?.setup_progress as SetupProgress | null;
      if (setupProgress?.onboardingCompleted) {
        setShowOnboarding(false);
        setIsLoading(false);
        return;
      }

      // Check if user has completed any setup steps by checking for existing data
      const [
        { data: accounts, error: accountsError },
        { data: recurringItems, error: recurringError },
        { data: debts, error: debtsError },
        { data: goals, error: goalsError }
      ] = await Promise.all([
        supabase.from('accounts').select('id').eq('user_id', user.id).limit(1),
        supabase.from('recurring_items').select('id').eq('user_id', user.id).limit(1),
        supabase.from('debt_accounts').select('id').eq('user_id', user.id).limit(1),
        supabase.from('financial_goals').select('id').eq('user_id', user.id).limit(1)
      ]);

      // If any of these queries return data, user has completed at least one setup step
      const hasAnySetupData = (accounts && accounts.length > 0) ||
                            (recurringItems && recurringItems.length > 0) ||
                            (debts && debts.length > 0) ||
                            (goals && goals.length > 0);

      // Only show onboarding if user has no setup data
      setShowOnboarding(!hasAnySetupData);
      
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      // On error, default to showing onboarding to be safe
      setShowOnboarding(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkOnboardingStatus();
  }, [user?.id]);

  // Function to refresh onboarding status (for use by other components)
  const refreshOnboardingStatus = async () => {
    await checkOnboardingStatus();
  };

  // Function to mark onboarding as completed
  const completeOnboarding = async () => {
    if (user?.id) {
      try {
        // First, get the current setup_progress object
        const { data, error: fetchError } = await supabase
          .from('user_preferences')
          .select('setup_progress')
          .eq('user_id', user.id)
          .single();

        // Initialize the setup_progress object or use existing one
        let setupProgress: SetupProgress = (data?.setup_progress as SetupProgress) || { steps: {} };
        
        // Set onboardingCompleted to true
        setupProgress.onboardingCompleted = true;

        // Update or insert the record
        const { error: updateError } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            setup_progress: setupProgress,
            // Set default values for new records
            ...(data ? {} : { 
              currency: 'USD',
              date_format: 'MM/DD/YYYY',
              theme: 'system',
              hide_balances: false,
              email_notifications: true,
              browser_notifications: true,
              mobile_notifications: false
            })
          }, { onConflict: 'user_id' });

        if (updateError) {
          console.error("Error updating onboarding status:", updateError);
          return;
        }

        // Update local state
        setShowOnboarding(false);
      } catch (err) {
        console.error("Failed to save onboarding status:", err);
      }
    }
  };

  return {
    showOnboarding,
    setShowOnboarding,
    completeOnboarding,
    refreshOnboardingStatus,
    isLoading
  };
}
