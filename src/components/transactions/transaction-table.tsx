"use client";

import type { Transaction, Category, Account } from "@/types";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wand2, Trash2, Edit3, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TransactionTableProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onDeleteTransaction: (transactionId: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
}

export function TransactionTable({
  transactions, categories, accounts,
  onDeleteTransaction, onEditTransaction,
}: TransactionTableProps) {
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  
  // Helper function to format currency with commas
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  
  const getCategoryName = (categoryId: string | null | undefined, transaction?: Transaction) => {
    if (!categoryId) {
      // For transactions with sources, try to show more helpful info
      if (transaction?.detailedType && transaction?.sourceId) {
        return `${transaction.detailedType.replace('-', ' ')} (no category)`;
      }
      return "Uncategorized";
    }
    
    // Check if this is a predefined category value (for variable expenses)
    const predefinedCategoryLabels: Record<string, string> = {
      'housing': 'Housing',
      'food': 'Food',
      'utilities': 'Utilities',
      'transportation': 'Transportation',
      'health': 'Health',
      'personal': 'Personal',
      'home-family': 'Home/Family',
      'media-productivity': 'Media/Productivity'
    };
    
    if (predefinedCategoryLabels[categoryId]) {
      return predefinedCategoryLabels[categoryId];
    }
    
    // Otherwise, look up in the categories database
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : "Uncategorized";
  };
  
  const getAccountName = (accountId: string) => {
    return accounts.find(acc => acc.id === accountId)?.name || "N/A";
  }

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
  };

  const handleConfirmDelete = () => {
    if (transactionToDelete) {
      onDeleteTransaction(transactionToDelete.id);
      setTransactionToDelete(null);
    }
  };

  if (transactions.length === 0) {
    return <p className="text-muted-foreground mt-4 text-center py-6">No transactions yet. Click "Add Transaction" to get started.</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>{format(new Date(transaction.date), "MMM dd, yy")}</TableCell>
              <TableCell className="font-medium">{transaction.description}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{getAccountName(transaction.accountId)}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {getCategoryName(transaction.categoryId, transaction)}
                </Badge>
              </TableCell>
              <TableCell className={cn("text-right font-semibold", transaction.type === 'income' ? 'text-green-600' : 'text-foreground')}>
                {transaction.type === 'income' ? '+' : '-'}${formatCurrency(Math.abs(transaction.amount))}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEditTransaction(transaction)}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDeleteClick(transaction)}
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!transactionToDelete} onOpenChange={() => setTransactionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the transaction: "{transactionToDelete?.description}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete Transaction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
