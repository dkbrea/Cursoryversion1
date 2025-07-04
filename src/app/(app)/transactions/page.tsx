import { TransactionManager } from "@/components/transactions/transaction-manager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Transactions - Unbroken Pockets",
  description: "Manually add, view, categorize, and manage your financial transactions.",
};

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Transactions</h1>
      <p className="text-muted-foreground">
        Manually track all your income and expenses. Use AI to help categorize your spending.
      </p>
      <TransactionManager />
    </div>
  );
}
