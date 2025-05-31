"use client";

import type { Transaction, Category, Account, RecurringItem, DebtAccount, FinancialGoalWithContribution, TransactionDetailedType } from "@/types";
import { useState, useEffect } from "react";
import { TransactionTable } from "./transaction-table";
import { AddEditTransactionDialog } from "./add-edit-transaction-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, TrendingDown, TrendingUp, DollarSign, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

// API imports
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from "@/lib/api/transactions";
import { getCategories } from "@/lib/api/categories";
import { getAccounts } from "@/lib/api/accounts";
import { getRecurringItems } from "@/lib/api/recurring";
import { getDebtAccounts } from "@/lib/api/debts";
import { getFinancialGoals } from "@/lib/api/goals";

export function TransactionManager() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  // State management
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [accountsList, setAccountsList] = useState<Account[]>([]);
  const [recurringItemsList, setRecurringItemsList] = useState<RecurringItem[]>([]);
  const [debtAccountsList, setDebtAccountsList] = useState<DebtAccount[]>([]);
  const [goalsList, setGoalsList] = useState<FinancialGoalWithContribution[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

  // Fetch all data when component mounts and user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setIsLoading(false);
      return;
    }

    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        // Fetch all data in parallel
        const [
          transactionsResult,
          categoriesResult,
          accountsResult,
          recurringResult,
          debtsResult,
          goalsResult
        ] = await Promise.all([
          getTransactions(user.id, { limit: 100 }),
          getCategories(user.id),
          getAccounts(user.id),
          getRecurringItems(user.id),
          getDebtAccounts(user.id),
          getFinancialGoals(user.id)
        ]);

        // Handle transactions
        if (transactionsResult.error) {
          console.error("Error fetching transactions:", transactionsResult.error);
          toast({
            title: "Error",
            description: "Failed to load transactions. Please try again.",
            variant: "destructive"
          });
        } else {
          setTransactions(transactionsResult.transactions || []);
        }

        // Handle categories
        if (categoriesResult.error) {
          console.error("Error fetching categories:", categoriesResult.error);
        } else {
          setCategoriesList(categoriesResult.categories || []);
        }

        // Handle accounts
        if (accountsResult.error) {
          console.error("Error fetching accounts:", accountsResult.error);
        } else {
          setAccountsList(accountsResult.accounts || []);
        }

        // Handle recurring items
        if (recurringResult.error) {
          console.error("Error fetching recurring items:", recurringResult.error);
        } else {
          setRecurringItemsList(recurringResult.items || []);
        }

        // Handle debt accounts
        if (debtsResult.error) {
          console.error("Error fetching debt accounts:", debtsResult.error);
        } else {
          setDebtAccountsList(debtsResult.accounts || []);
        }

        // Handle goals - transform to match expected interface
        if (goalsResult.error) {
          console.error("Error fetching goals:", goalsResult.error);
        } else {
          const goalsWithContributions: FinancialGoalWithContribution[] = (goalsResult.goals || []).map(goal => ({
            ...goal,
            monthlyContribution: 0, // You might want to calculate this based on target date
            monthsRemaining: 0 // You might want to calculate this based on target date
          }));
          setGoalsList(goalsWithContributions);
        }

      } catch (error) {
        console.error("Unexpected error fetching data:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred while loading data.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [isAuthenticated, user?.id, toast]);

  const handleOpenAddDialog = () => {
    setTransactionToEdit(null);
    setIsAddEditDialogOpen(true);
  };

  const handleOpenEditDialog = (transaction: Transaction) => {
    setTransactionToEdit(transaction);
    setIsAddEditDialogOpen(true);
  };

  const handleSaveTransaction = async (
    data: Omit<Transaction, "id" | "userId" | "source" | "createdAt" | "updatedAt">, 
    id?: string
  ) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to save transactions.",
        variant: "destructive"
      });
      return;
    }
    
    let finalType: Transaction['type'] = 'expense';
    if (data.detailedType === 'income') {
      finalType = 'income';
    } else if (data.detailedType === 'goal-contribution') {
      finalType = 'transfer';
    }
    
    const finalAmount = (finalType === 'income' || finalType === 'transfer') ? Math.abs(data.amount) : -Math.abs(data.amount);

    const processedData = {
      ...data,
      type: finalType,
      amount: finalAmount,
      tags: data.tags || [],
      categoryId: data.detailedType === 'variable-expense' ? data.categoryId : null,
      toAccountId: data.detailedType === 'goal-contribution' ? data.toAccountId : null,
      userId: user.id
    };

    try {
      if (id) {
        // Update existing transaction
        const result = await updateTransaction(id, processedData);
        if (result.error) {
          toast({
            title: "Error",
            description: `Failed to update transaction: ${result.error}`,
            variant: "destructive"
          });
          return;
        }
        
        if (result.transaction) {
          setTransactions(prev => prev.map(t => t.id === id ? result.transaction! : t));
          toast({ 
            title: "Transaction Updated", 
            description: `"${data.description}" has been updated.` 
          });
        }
      } else {
        // Create new transaction
        const result = await createTransaction(processedData);
        if (result.error) {
          toast({
            title: "Error",
            description: `Failed to create transaction: ${result.error}`,
            variant: "destructive"
          });
          return;
        }
        
        if (result.transaction) {
          setTransactions(prev => [result.transaction!, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
          toast({ 
            title: "Transaction Added", 
            description: `"${result.transaction.description}" has been added.` 
          });
        }
      }
    } catch (error) {
      console.error("Error saving transaction:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving the transaction.",
        variant: "destructive"
      });
    }
    
    setIsAddEditDialogOpen(false);
    setTransactionToEdit(null);
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    const transactionToDelete = transactions.find(t => t.id === transactionId);
    
    try {
      const result = await deleteTransaction(transactionId);
      if (result.error) {
        toast({
          title: "Error",
          description: `Failed to delete transaction: ${result.error}`,
          variant: "destructive"
        });
        return;
      }
      
      setTransactions((prevTransactions) => prevTransactions.filter(t => t.id !== transactionId));
      if (transactionToDelete) {
        toast({
          title: "Transaction Deleted",
          description: `Transaction "${transactionToDelete.description}" has been removed.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the transaction.",
        variant: "destructive"
      });
    }
  };
  
  const handleUpdateTransactionCategory = async (transactionId: string, categoryId: string | null) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    try {
      const result = await updateTransaction(transactionId, { categoryId });
      if (result.error) {
        toast({
          title: "Error",
          description: `Failed to update category: ${result.error}`,
          variant: "destructive"
        });
        return;
      }
      
      setTransactions((prevTransactions) =>
        prevTransactions.map((t) =>
          t.id === transactionId ? { ...t, categoryId, updatedAt: new Date() } : t
        )
      );
      
      toast({ 
        title: "Category Updated", 
        description: `Category for "${transaction.description}" updated.`
      });
    } catch (error) {
      console.error("Error updating transaction category:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating the category.",
        variant: "destructive"
      });
    }
  };

  // If not authenticated, show message
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Please log in to view your transactions.</p>
      </div>
    );
  }

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your transactions...</p>
      </div>
    );
  }

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0); 
  const netFlow = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalIncome.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Based on current transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${totalExpenses.toFixed(2)}</div>
             <p className="text-xs text-muted-foreground">Based on current transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Flow</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${netFlow.toFixed(2)}
            </div>
             <p className="text-xs text-muted-foreground">Income - Expenses</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Manually track all your income and expenses. Use AI to help categorize your spending.</CardDescription>
          </div>
          <AddEditTransactionDialog
            isOpen={isAddEditDialogOpen}
            onOpenChange={setIsAddEditDialogOpen}
            onSave={handleSaveTransaction}
            categories={categoriesList}
            accounts={accountsList}
            recurringItems={recurringItemsList}
            debtAccounts={debtAccountsList}
            goals={goalsList}
            transactionToEdit={transactionToEdit}
          >
            <Button onClick={handleOpenAddDialog} variant="default">
              <PlusCircle className="mr-2 h-4 w-4" /> Record Transaction
            </Button>
          </AddEditTransactionDialog>
        </CardHeader>
        <CardContent>
          <TransactionTable
            transactions={transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
            categories={categoriesList}
            accounts={accountsList}
            onUpdateTransactionCategory={handleUpdateTransactionCategory}
            onDeleteTransaction={handleDeleteTransaction}
            onEditTransaction={handleOpenEditDialog}
          />
        </CardContent>
      </Card>
    </div>
  );
}
