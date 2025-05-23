"use client";

import { useEffect } from 'react';
import { createUserPreferencesTable } from '../../lib/create-user-preferences';
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

  // Create user_preferences table when the app loads
  useEffect(() => {
    if (!user) return;
    
    const initializeDatabase = async () => {
      try {
        // Create user_preferences table if it doesn't exist
        const result = await createUserPreferencesTable();
        console.log('Database initialization result:', result);
      } catch (error) {
        console.error('Error initializing database:', error);
      }
    };

    initializeDatabase();
  }, [user]);

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
