"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface AccountContextType {
  refreshTrigger: number;
  triggerAccountRefresh: () => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerAccountRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <AccountContext.Provider value={{ refreshTrigger, triggerAccountRefresh }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccountRefresh() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccountRefresh must be used within an AccountProvider');
  }
  return context;
} 