"use client";

import type { InvestmentAccount, InvestmentAccountType } from "@/types";
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

interface InvestmentAccountCardProps {
  account: InvestmentAccount;
  onDeleteAccount: (accountId: string) => void;
  onEditAccount: (account: InvestmentAccount) => void;
}

const getAccountTypeIcon = (type: InvestmentAccountType): React.ReactElement => {
  switch (type) {
    case "brokerage":
      return <Icons.InvestmentBrokerage className="h-5 w-5 text-primary" />;
    case "ira":
    case "401k":
      return <Icons.InvestmentRetirement className="h-5 w-5 text-primary" />;
    case "crypto":
      return <Icons.InvestmentCrypto className="h-5 w-5 text-primary" />;
    default:
      return <Icons.InvestmentOther className="h-5 w-5 text-primary" />;
  }
};

const formatAccountTypeLabel = (type: InvestmentAccountType) => {
  if (type === 'ira' || type === '401k') return type.toUpperCase();
  return type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export function InvestmentAccountCard({ account, onDeleteAccount, onEditAccount }: InvestmentAccountCardProps) {
  return (
    <TooltipProvider>
      <Card className="flex flex-col shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out border border-border hover:border-primary/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              {getAccountTypeIcon(account.type)}
              {account.name}
            </CardTitle>
            <Badge variant="outline" className="capitalize">{formatAccountTypeLabel(account.type)}</Badge>
          </div>
          {account.institution && (
            <CardDescription className="pt-1 text-xs text-muted-foreground">
              Institution: {account.institution}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-xs text-muted-foreground">Current Value</p>
          <p className="text-3xl font-bold text-foreground">
            ${account.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </CardContent>
        <CardFooter className="flex justify-end items-center gap-2 pt-4 border-t">
          <Tooltip>
            <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onEditAccount(account)}
                  className="text-muted-foreground hover:text-primary"
                >
                    <Icons.Edit className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent><p>Edit Account</p></TooltipContent>
          </Tooltip>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                <Icons.Delete className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Account "{account.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the investment account and its value.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDeleteAccount(account.id)}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
