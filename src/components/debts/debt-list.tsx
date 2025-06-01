"use client";

import type { DebtAccount } from "@/types";
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
import { format } from "date-fns";

interface DebtListProps {
  debtAccounts: DebtAccount[];
  onDeleteDebtAccount: (debtId: string) => void;
  onEditDebtAccount: (debt: DebtAccount) => void;
}

const getDebtTypeIcon = (type: DebtAccount["type"]) => {
  switch (type) {
    case "credit-card":
      return <Icons.DebtTypeCreditCard className="h-5 w-5" />;
    case "line-of-credit":
      return <Icons.DebtTypeLineOfCredit className="h-5 w-5" />;
    case "student-loan":
      return <Icons.DebtTypeStudentLoan className="h-5 w-5" />;
    case "personal-loan":
      return <Icons.DebtTypePersonalLoan className="h-5 w-5" />;
    case "mortgage":
      return <Icons.DebtTypeMortgage className="h-5 w-5" />;
    case "auto-loan":
      return <Icons.DebtTypeAutoLoan className="h-5 w-5" />;
    default:
      return <Icons.DebtTypeOther className="h-5 w-5" />;
  }
};

const formatDebtType = (type: DebtAccount["type"]) => {
  return type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getDayOrdinal = (day: number): string => {
  if (day >= 11 && day <= 13) {
    return `${day}th`;
  }
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
};

export function DebtList({ debtAccounts, onDeleteDebtAccount, onEditDebtAccount }: DebtListProps) {

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {debtAccounts.map((debt) => (
        <Card key={debt.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                {getDebtTypeIcon(debt.type)}
                {debt.name}
              </CardTitle>
              <Badge variant="outline" className="capitalize">{formatDebtType(debt.type)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-grow space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold text-foreground">
                ${debt.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                    <p className="text-xs text-muted-foreground">APR</p>
                    <p className="font-medium">{debt.apr.toFixed(2)}%</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Min. Payment</p>
                    <p className="font-medium">${debt.minimumPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Payment Day</p>
                    <p className="font-medium">{debt.paymentDayOfMonth !== undefined ? getDayOrdinal(debt.paymentDayOfMonth) : 'Not set'}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Frequency</p>
                    <p className="font-medium capitalize">{debt.paymentFrequency}</p>
                </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end items-center gap-2 pt-4 border-t">
            <Button variant="ghost" size="sm" onClick={() => onEditDebtAccount(debt)} className="text-muted-foreground hover:text-primary">
              <Icons.Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                  <Icons.Delete className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Debt "{debt.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this debt account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDeleteDebtAccount(debt.id)}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Delete Debt
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
