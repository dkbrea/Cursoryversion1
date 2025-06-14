import { PaycheckPulseManager } from "@/components/paycheck-pulse/paycheck-pulse-manager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Paycheck Pulse - Unbroken Pockets",
  description: "Plan how to allocate each paycheck across expenses, budgets, and savings goals.",
};

export default function PaycheckPulsePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Paycheck Pulse</h1>
      <p className="text-muted-foreground">
        See exactly how to allocate each paycheck across your expenses, variable budgets, and savings goals.
        Get a clear breakdown of what's due and what's left to allocate.
      </p>
      <PaycheckPulseManager />
    </div>
  );
} 