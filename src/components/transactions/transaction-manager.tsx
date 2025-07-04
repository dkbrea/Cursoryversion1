"use client";

import type { Transaction, Category, Account, RecurringItem, DebtAccount, FinancialGoalWithContribution, TransactionDetailedType, VariableExpense } from "@/types";
import { useState, useEffect } from "react";
import { TransactionTable } from "./transaction-table";
import { AddEditTransactionDialog } from "./add-edit-transaction-dialog";
import { PostTransactionJadeInsights } from "./post-transaction-ai-insights";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, TrendingDown, TrendingUp, DollarSign, Loader2, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

// API imports
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from "@/lib/api/transactions";
import { getCategories } from "@/lib/api/categories";
import { getAccounts } from "@/lib/api/accounts";
import { getRecurringItems } from "@/lib/api/recurring";
import { getDebtAccounts } from "@/lib/api/debts";
import { getFinancialGoals } from "@/lib/api/goals";
import { supabase } from "@/lib/supabase";

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
  const [variableExpensesList, setVariableExpensesList] = useState<VariableExpense[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  
  // Post-transaction Jade insights state
  const [isJadeInsightsOpen, setIsJadeInsightsOpen] = useState(false);
  const [recentlyAddedTransaction, setRecentlyAddedTransaction] = useState<Transaction | null>(null);

  // Helper function to format currency with commas
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

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

        // Fetch variable expenses separately since there's no dedicated API function yet
        let variableExpensesData: VariableExpense[] = [];
        try {
          const { data, error } = await supabase
            .from('variable_expenses')
            .select('*')
            .eq('user_id', user.id);
            
          if (error) {
            console.error("Error fetching variable expenses:", error);
          } else if (data) {
            variableExpensesData = data.map(expense => ({
              id: expense.id,
              name: expense.name,
              category: expense.category,
              amount: expense.amount,
              userId: expense.user_id,
              createdAt: new Date(expense.created_at || new Date().toISOString()),
              updatedAt: expense.updated_at ? new Date(expense.updated_at) : undefined
            }));
          }
        } catch (err) {
          console.error("Error fetching variable expenses:", err);
        }
        
        setVariableExpensesList(variableExpensesData);

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
    id?: string,
    keepOpen?: boolean
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
    } else if (data.detailedType === 'debt-payment') {
      finalType = 'expense';
    }
    
    const finalAmount = (finalType === 'income' || finalType === 'transfer') ? Math.abs(data.amount) : -Math.abs(data.amount);

    // Handle predefined category mapping
    let finalCategoryId = data.categoryId;
    
    // For income transactions, always use "Income" category
    if (data.detailedType === 'income') {
      const incomeCategoryName = 'Income';
      let incomeCategory = categoriesList.find(cat => cat.name === incomeCategoryName);
      
      if (incomeCategory) {
        finalCategoryId = incomeCategory.id;
      } else {
        // Create Income category
        try {
          const { createCategory } = await import('@/lib/api/categories');
          const result = await createCategory({
            name: incomeCategoryName,
            userId: user.id
          });
          
          if (result.category) {
            setCategoriesList(prev => [...prev, result.category!]);
            finalCategoryId = result.category.id;
          } else {
            finalCategoryId = null;
          }
        } catch (error) {
          console.error('Failed to create Income category:', error);
          finalCategoryId = null;
        }
      }
    } else if (data.detailedType === 'goal-contribution') {
      // For goal contribution transactions, always use "Savings" category
      const savingsCategoryName = 'Savings';
      let savingsCategory = categoriesList.find(cat => cat.name === savingsCategoryName);
      
      if (savingsCategory) {
        finalCategoryId = savingsCategory.id;
      } else {
        // Create Savings category
        try {
          const { createCategory } = await import('@/lib/api/categories');
          const result = await createCategory({
            name: savingsCategoryName,
            userId: user.id
          });
          
          if (result.category) {
            setCategoriesList(prev => [...prev, result.category!]);
            finalCategoryId = result.category.id;
          } else {
            finalCategoryId = null;
          }
        } catch (error) {
          console.error('Failed to create Savings category:', error);
          finalCategoryId = null;
        }
      }
    } else if (data.detailedType === 'debt-payment') {
      // For debt payment transactions, always use "Debt" category
      const debtCategoryName = 'Debt';
      let debtCategory = categoriesList.find(cat => cat.name === debtCategoryName);
      
      if (debtCategory) {
        finalCategoryId = debtCategory.id;
      } else {
        // Create Debt category
        try {
          const { createCategory } = await import('@/lib/api/categories');
          const result = await createCategory({
            name: debtCategoryName,
            userId: user.id
          });
          
          if (result.category) {
            setCategoriesList(prev => [...prev, result.category!]);
            finalCategoryId = result.category.id;
          } else {
            finalCategoryId = null;
          }
        } catch (error) {
          console.error('Failed to create Debt category:', error);
          finalCategoryId = null;
        }
      }
    } else if (finalCategoryId && typeof finalCategoryId === 'string' && finalCategoryId.startsWith('PREDEFINED:')) {
      // Handle other predefined categories (for expenses)
      const predefinedValue = finalCategoryId.replace('PREDEFINED:', '');
      
      // Map predefined value to display label
      const categoryLabels: Record<string, string> = {
        'housing': 'Housing',
        'food': 'Food',
        'utilities': 'Utilities',
        'transportation': 'Transportation',
        'health': 'Health',
        'personal': 'Personal',
        'home-family': 'Home/Family',
        'media-productivity': 'Media/Productivity'
      };
      
      const categoryLabel = categoryLabels[predefinedValue] || predefinedValue;
      
      // Try to find existing category with this name
      let existingCategory = categoriesList.find(cat => cat.name === categoryLabel);
      
      if (existingCategory) {
        finalCategoryId = existingCategory.id;
      } else {
        // Create new category
        try {
          const { createCategory } = await import('@/lib/api/categories');
          const result = await createCategory({
            name: categoryLabel,
            userId: user.id
          });
          
          if (result.category) {
            setCategoriesList(prev => [...prev, result.category!]);
            finalCategoryId = result.category.id;
          } else {
            finalCategoryId = null;
          }
        } catch (error) {
          console.error('Failed to create category:', error);
          finalCategoryId = null;
        }
      }
    }

    const processedData = {
      ...data,
      type: finalType,
      amount: finalAmount,
      tags: data.tags || [],
      categoryId: finalCategoryId,
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
          // Set recently added transaction for Jade insights
          setRecentlyAddedTransaction(result.transaction);
          setIsJadeInsightsOpen(true);
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
    
    // Close dialog unless explicitly keeping it open
    if (keepOpen !== true) {
      setIsAddEditDialogOpen(false);
      setTransactionToEdit(null);
    }
  };



  const handleDeleteTransaction = async (transactionId: string) => {
    const transactionToDelete = transactions.find(t => t.id === transactionId);
    
    try {
      // IMPORTANT: Delete completion records BEFORE deleting the transaction
      // This is because the foreign key constraint will set transaction_id to NULL
      // if we delete the transaction first, making it impossible to find the completion
      if (transactionToDelete) {
        try {
          console.log('TransactionManager: Attempting to remove completion BEFORE deleting transaction:', transactionToDelete.id);
          const { removeCompletionByTransactionId } = await import('@/lib/api/recurring-completions');
          
          const completionResult = await removeCompletionByTransactionId(transactionToDelete.id, transactionToDelete.userId);
          
          if (completionResult.success) {
            console.log('TransactionManager: Successfully removed completion before transaction deletion');
          } else {
            console.log('TransactionManager: No completion found for this transaction (this is normal for non-recurring transactions)');
          }
        } catch (error) {
          console.warn('TransactionManager: Error removing completion record:', error);
          // Don't fail the delete operation if completion cleanup fails
        }
      }
      
      // Now delete the transaction
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
            <div className="text-2xl font-bold text-green-600">${formatCurrency(totalIncome)}</div>
            <p className="text-xs text-muted-foreground">Based on current transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${formatCurrency(totalExpenses)}</div>
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
              ${formatCurrency(netFlow)}
            </div>
             <p className="text-xs text-muted-foreground">Income - Expenses</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Post-Transaction Jade Insights */}
      {recentlyAddedTransaction && (
        <PostTransactionJadeInsights
          transaction={recentlyAddedTransaction}
          isOpen={isJadeInsightsOpen}
          onClose={() => {
            setIsJadeInsightsOpen(false);
            setRecentlyAddedTransaction(null);
          }}
          accounts={accountsList}
          categories={categoriesList}
        />
      )}
      
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              <span className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                Every entry here is created by you — no syncing delays, no guesswork. <i>Master your money by tracking every decision.</i>
              </span>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <AddEditTransactionDialog
              isOpen={isAddEditDialogOpen}
              onOpenChange={setIsAddEditDialogOpen}
              onSave={handleSaveTransaction}
              categories={categoriesList}
              accounts={accountsList}
              recurringItems={recurringItemsList}
              debtAccounts={debtAccountsList}
              goals={goalsList}
              variableExpenses={variableExpensesList}
              transactionToEdit={transactionToEdit}
            >
              <Button onClick={handleOpenAddDialog} variant="default">
                <PlusCircle className="mr-2 h-4 w-4" /> Record Transaction
              </Button>
            </AddEditTransactionDialog>
          </div>
        </CardHeader>
        <CardContent>
          <TransactionTable
            transactions={transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
            categories={categoriesList}
            accounts={accountsList}
            debtAccounts={debtAccountsList}
            onDeleteTransaction={handleDeleteTransaction}
            onEditTransaction={handleOpenEditDialog}
          />
        </CardContent>
      </Card>
    </div>
  );
}
