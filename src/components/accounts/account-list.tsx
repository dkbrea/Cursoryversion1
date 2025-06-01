"use client";

import type { Account, DebtAccount, AccountType as AssetAccountType, DebtAccountType } from "@/types";
import { debtAccountTypes } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons"; // Corrected import
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


type DisplayableAccount = Account | DebtAccount;

interface AccountListProps {
  accounts: DisplayableAccount[];
  onDeleteAccount: (accountId: string) => void; // For asset accounts
  onSetPrimaryAccount: (accountId: string) => void; // For asset accounts
  onEditAccount: (account: Account) => void; // Placeholder for asset accounts
  isUpdating?: boolean; // New prop to disable buttons during updates
}

const getAssetAccountTypeIcon = (type: AssetAccountType) => {
  switch (type) {
    case "checking":
      return <Icons.AccountTypeChecking className="h-5 w-5" />;
    case "savings":
      return <Icons.AccountTypeSavings className="h-5 w-5" />;
    case "credit card": // Asset-side credit card
      return <Icons.AccountTypeCreditCard className="h-5 w-5" />;
    default:
      return <Icons.AccountTypeOther className="h-5 w-5" />;
  }
};

const getDebtAccountTypeIcon = (type: DebtAccountType) => {
   switch (type) {
    case "credit-card": // Debt-side credit card
      return <Icons.DebtTypeCreditCard className="h-5 w-5 text-destructive" />;
    case "line-of-credit":
      return <Icons.DebtTypeLineOfCredit className="h-5 w-5 text-destructive" />;
    case "student-loan":
      return <Icons.DebtTypeStudentLoan className="h-5 w-5 text-destructive" />;
    case "personal-loan":
      return <Icons.DebtTypePersonalLoan className="h-5 w-5 text-destructive" />;
    case "mortgage":
      return <Icons.DebtTypeMortgage className="h-5 w-5 text-destructive" />;
    case "auto-loan":
      return <Icons.DebtTypeAutoLoan className="h-5 w-5 text-destructive" />;
    default:
      return <Icons.DebtTypeOther className="h-5 w-5 text-destructive" />;
  }
};

const formatDebtTypeLabel = (type: DebtAccountType) => {
  return type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + " Debt";
};


export function AccountList({ accounts, onDeleteAccount, onSetPrimaryAccount, onEditAccount, isUpdating = false }: AccountListProps) {

  const isDebtAccount = (account: DisplayableAccount): account is DebtAccount => {
    return debtAccountTypes.includes(account.type as DebtAccountType) && 'apr' in account;
  };

  return (
    <TooltipProvider>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => {
          if (isDebtAccount(account)) {
            // Render Debt Account Card
            return (
              <Card key={account.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out border-destructive/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                      {getDebtAccountTypeIcon(account.type)}
                      {account.name}
                    </CardTitle>
                     <Badge variant="destructive" className="capitalize">{formatDebtTypeLabel(account.type)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                   <div>
                    <p className="text-xs text-muted-foreground">Balance Owed</p>
                    <p className="text-3xl font-bold text-destructive">
                      ${account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex justify-between text-sm">
                      <div>
                          <p className="text-xs text-muted-foreground">APR</p>
                          <p className="font-medium text-foreground/80">{account.apr.toFixed(2)}%</p>
                      </div>
                      <div>
                          <p className="text-xs text-muted-foreground">Min. Payment</p>
                          <p className="font-medium text-foreground/80">${account.minimumPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end items-center gap-2 pt-4 border-t">
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" disabled className="cursor-not-allowed">
                            Manage in Debt Plan
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Debt accounts are managed in the "Debt Plan" section.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardFooter>
              </Card>
            );
          } else {
            // Render Asset Account Card (existing logic)
            const assetAccount = account as Account; // Type assertion
            return (
              <Card key={assetAccount.id} className={`flex flex-col shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out ${assetAccount.isPrimary ? 'border-primary border-2' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                      {getAssetAccountTypeIcon(assetAccount.type)}
                      {assetAccount.name}
                    </CardTitle>
                    {assetAccount.isPrimary && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <Icons.Primary className="h-3.5 w-3.5" /> Primary
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="capitalize pt-1">
                    {assetAccount.bankName ? `${assetAccount.type} - ${assetAccount.bankName}` : assetAccount.type}
                    {assetAccount.last4 && ` (•••• ${assetAccount.last4})`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className={`text-3xl font-bold ${assetAccount.balance < 0 ? 'text-destructive' : 'text-foreground'}`}>
                    ${assetAccount.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Current Balance
                  </p>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-4 border-t">
                  {!assetAccount.isPrimary && (assetAccount.type !== 'credit card' || assetAccount.balance >=0) && ( // Only show for non-primary, non-debt-like credit cards
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSetPrimaryAccount(assetAccount.id)}
                      className="w-full sm:w-auto"
                      disabled={isUpdating}
                    >
                      <Icons.Primary className="mr-2 h-4 w-4" /> Set as Primary
                    </Button>
                  )}
                  {(assetAccount.isPrimary || (assetAccount.type === 'credit card' && assetAccount.balance < 0)) && (
                      <div className="w-full sm:w-auto h-9"></div> // Spacer
                  )}
                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <Button variant="ghost" size="sm" onClick={() => onEditAccount(assetAccount)} className="text-muted-foreground hover:text-primary" disabled={isUpdating}>
                      <Icons.Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-muted-foreground hover:text-destructive"
                          disabled={isUpdating}
                        >
                          <Icons.Delete className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Account "{assetAccount.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the account.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDeleteAccount(assetAccount.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete Account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardFooter>
              </Card>
            );
          }
        })}
      </div>
    </TooltipProvider>
  );
}
