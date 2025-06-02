import { DebtManager } from "@/components/debts/debt-manager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Debt Plan - Unbroken Pockets",
  description: "Manage your debts and choose a payoff strategy (Snowball or Avalanche).",
};

export default function DebtsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Debt Plan</h1>
            <p className="text-muted-foreground">
            Organize your debts and select a strategy to become debt-free.
            </p>
        </div>
      </div>
      <DebtManager />
    </div>
  );
}
