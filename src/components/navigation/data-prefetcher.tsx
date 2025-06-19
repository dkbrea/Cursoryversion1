"use client";

import { useEffect } from 'react';
import { createUserPreference } from '../../lib/create-user-preferences';
import { usePathname, useRouter } from 'next/navigation';
import { getAccounts } from '@/lib/api/accounts';
import { getDebtAccounts } from '@/lib/api/debts';
import { getRecurringItems } from '@/lib/api/recurring';
import { useAuth } from '@/contexts/auth-context';

/**
 * This component prefetches common data needed across multiple pages
 * to improve navigation performance and reduce loading times
 */
export function DataPrefetcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  // Create user preference record when the app loads
  useEffect(() => {
    if (!user?.id) return;
    
    const initializeUserPreferences = async () => {
      try {
        // Create user preference record if it doesn't exist
        const result = await createUserPreference(user.id);
        if (!result.success) {
          console.warn('Could not create user preferences:', result.error);
        }
      } catch (error) {
        console.error('Error initializing user preferences:', error);
      }
    };

    initializeUserPreferences();
  }, [user?.id]);

  // Prefetch common data when navigating between pages
  useEffect(() => {
    if (!user?.id) return;

    const prefetchData = async () => {
      try {
        // Prefetch accounts data
        await getAccounts(user.id);
        
        // Prefetch debt accounts
        await getDebtAccounts(user.id);
        
        // Prefetch recurring items
        await getRecurringItems(user.id);
      } catch (error) {
        console.error('Error prefetching data:', error);
      }
    };

    prefetchData();
  }, [pathname, user?.id]);

  // This component doesn't render anything
  return null;
}
