import { BudgetManager } from "@/components/budget/budget-manager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Budget - Unbroken Pockets",
  description: "Manage your zero-based budget.",
};

export default function BudgetPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Budget</h1>
      <p className="text-muted-foreground">
        Utilize the zero-based budget method to manage your finances effectively.
        Account for all your income, fixed outflows, and variable expenses.
      </p>
      <BudgetManager />
    </div>
  );
}
