import { RecurringManager } from "@/components/recurring/recurring-manager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recurring Items - Unbroken Pockets",
  description: "Manage your recurring income, subscriptions, and fixed expenses.",
};

export default function RecurringPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Recurring Items</h1>
      <p className="text-muted-foreground">
        Set up and track your regular income and expenses. Switch between list and calendar views.
      </p>
      <RecurringManager />
    </div>
  );
}
