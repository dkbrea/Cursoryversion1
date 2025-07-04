"use client";

import { useOnboarding } from "@/hooks/use-onboarding";
import { GettingStartedDialog } from "@/components/onboarding/getting-started-dialog";

interface DashboardClientProps {
  children: React.ReactNode;
}

export function DashboardClient({ children }: DashboardClientProps) {
  const { showOnboarding, setShowOnboarding } = useOnboarding();

  return (
    <>
      {children}
      <GettingStartedDialog 
        open={showOnboarding} 
        onOpenChange={setShowOnboarding} 
      />
    </>
  );
}
