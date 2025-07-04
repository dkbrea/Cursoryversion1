"use client";

import type { InvestmentAccount } from "@/types";
import { InvestmentAccountCard } from "./investment-account-card";

interface InvestmentAccountListProps {
  accounts: InvestmentAccount[];
  onDeleteAccount: (accountId: string) => void;
  onEditAccount: (account: InvestmentAccount) => void;
}

export function InvestmentAccountList({ accounts, onDeleteAccount, onEditAccount }: InvestmentAccountListProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account) => (
        <InvestmentAccountCard
          key={account.id}
          account={account}
          onDeleteAccount={onDeleteAccount}
          onEditAccount={onEditAccount}
        />
      ))}
    </div>
  );
}
