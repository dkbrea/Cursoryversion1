import { AccountManager } from "@/components/accounts/account-manager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Accounts - Unbroken Pockets",
  description: "Add, view, and manage your financial accounts.",
};

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Manage Accounts</h1>
      <p className="text-muted-foreground">
        Keep track of your checking, savings, and other financial accounts. Set a primary account for quick expense allocation.
      </p>
      <AccountManager />
    </div>
  );
}
