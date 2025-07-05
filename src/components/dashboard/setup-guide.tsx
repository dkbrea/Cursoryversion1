"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, CircleDashed, ArrowRight, Loader2, CalendarIcon, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { insertRecurringItem } from "@/lib/supabase-helpers";
import { AddAccountDialog } from "@/components/accounts/add-account-dialog";
import { AddRecurringItemDialog } from "@/components/recurring/add-recurring-item-dialog";
import { AddDebtDialog } from "@/components/debts/add-debt-dialog";
import { AddGoalDialog } from "@/components/goals/add-goal-dialog";
import { createAccount } from "@/lib/api/accounts";
import { createDebtAccount } from "@/lib/api/debts";
import { createFinancialGoal } from "@/lib/api/goals";
import { getUserPreferences, updateUserPreferences, type UserPreferences } from "@/lib/api/user-preferences";
import { autoCompletePeriodsBeforeTrackingStart } from "@/lib/api/recurring-completions";
import type { Account, RecurringItem, DebtAccount, FinancialGoal } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

export type SetupStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  isCompleted: boolean;
};

export function SetupGuide() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showTrackingDateDialog, setShowTrackingDateDialog] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showIncomeDialog, setShowIncomeDialog] = useState(false);
  const [showFixedExpenseDialog, setShowFixedExpenseDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [showDebtDialog, setShowDebtDialog] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [dialogKey, setDialogKey] = useState(0); // Add a key to force dialog recreation
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingRecurringItem, setIsAddingRecurringItem] = useState(false);
  const [isAddingDebt, setIsAddingDebt] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [isSavingTrackingDate, setIsSavingTrackingDate] = useState(false);
  const [selectedTrackingDate, setSelectedTrackingDate] = useState<Date | undefined>(undefined);
  const [setupProgressState, setSetupProgressState] = useState<{steps: Record<string, boolean>}>({steps: {}});
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([
    {
      id: "financial-tracking-start",
      title: "Set your financial tracking start date",
      description: "Choose when your financial tracking begins. This determines which recurring items are marked as completed.",
      href: "#",
      isCompleted: false,
    },
    {
      id: "accounts",
      title: "Set up your accounts",
      description: "Add your bank accounts, credit cards, and other financial accounts.",
      href: "/accounts/new",
      isCompleted: false,
    },
    {
      id: "income",
      title: "Set up your income",
      description: "Add your sources of income like salary, freelance work, etc.",
      href: "/recurring/new?type=income",
      isCompleted: false,
    },
    {
      id: "fixed-expenses",
      title: "Set up fixed expenses",
      description: "Add your fixed expenses like rent, mortgage, etc.",
      href: "/recurring/new?type=fixed-expense",
      isCompleted: false,
    },
    {
      id: "subscriptions",
      title: "Set up subscriptions",
      description: "Add your recurring subscriptions like Netflix, Spotify, etc.",
      href: "/recurring/new?type=subscription",
      isCompleted: false,
    },
    {
      id: "debt",
      title: "Set up debt accounts",
      description: "Add your debts and choose a payoff plan.",
      href: "/debt/new",
      isCompleted: false,
    },
    {
      id: "goals",
      title: "Set up financial goals",
      description: "Define your savings goals and track your progress.",
      href: "/goals/new",
      isCompleted: false,
    },
    {
      id: "budget",
      title: "Set up your budget",
      description: "Create a zero-based budget to track your spending.",
      href: "/budget/",
      isCompleted: false,
    },
  ]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [showSetupGuide, setShowSetupGuide] = useState(true);

  useEffect(() => {
    async function checkSetupStatus() {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        // Check financial tracking start date
        let hasTrackingStartDate = false;
        try {
          const { data: userPrefs, error: prefsError } = await supabase
            .from('user_preferences')
            .select('financial_tracking_start_date')
            .eq('user_id', user.id)
            .single();
          
          if (!prefsError && userPrefs?.financial_tracking_start_date) {
            hasTrackingStartDate = true;
          }
        } catch (error) {
          console.warn('Could not check tracking start date:', error);
        }

        // Check accounts
        const { count: accountsCount, error: accountsError } = await supabase
          .from('accounts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Check income recurring items
        const { count: incomeCount, error: incomeError } = await supabase
          .from('recurring_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('type', 'income');

        // Check fixed expenses
        const { count: fixedExpensesCount, error: fixedExpensesError } = await supabase
          .from('recurring_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('type', 'fixed-expense');

        // Check subscriptions
        const { count: subscriptionsCount, error: subscriptionsError } = await supabase
          .from('recurring_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('type', 'subscription');

        // Check debt accounts
        const { count: debtCount, error: debtError } = await supabase
          .from('debt_accounts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Check financial goals
        const { count: goalsCount, error: goalsError } = await supabase
          .from('financial_goals')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Check variable expenses (previously budget categories)
        let budgetCount = 0;
        try {
          // Try to fetch from the new variable_expenses table first
          const { count: variableExpensesCount, error: variableExpensesError } = await supabase
            .from('variable_expenses')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          if (variableExpensesError) {
            // If there's an error (likely because the table doesn't exist yet), fall back to budget_categories
            console.warn('Failed to fetch from variable_expenses, falling back to budget_categories');
            const { count: budgetCategoriesCount, error: budgetCategoriesError } = await supabase
              .from('budget_categories')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id);
            
            if (!budgetCategoriesError) {
              budgetCount = budgetCategoriesCount || 0;
            }
          } else {
            budgetCount = variableExpensesCount || 0;
          }
        } catch (error) {
          console.error('Error checking budget setup:', error);
          budgetCount = 0;
        }

        // Update setup steps status
        const updatedSteps = [...setupSteps];
        updatedSteps[0].isCompleted = hasTrackingStartDate;
        updatedSteps[1].isCompleted = (accountsCount || 0) > 0;
        updatedSteps[2].isCompleted = (incomeCount || 0) > 0;
        updatedSteps[3].isCompleted = (fixedExpensesCount || 0) > 0;
        updatedSteps[4].isCompleted = (subscriptionsCount || 0) > 0;
        updatedSteps[5].isCompleted = (debtCount || 0) > 0;
        updatedSteps[6].isCompleted = (goalsCount || 0) > 0;
        updatedSteps[7].isCompleted = (budgetCount || 0) > 0;
        
        setSetupSteps(updatedSteps);

        // Check if all steps are completed
        const allCompleted = updatedSteps.every(step => step.isCompleted);
        
        // Hide setup guide if all steps are completed
        setShowSetupGuide(!allCompleted);

      } catch (error) {
        console.error("Error checking setup status:", error);
      } finally {
        setIsLoading(false);
      }
    }

    checkSetupStatus();
  }, [user?.id]);

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Loading setup guide...</p>
        </CardContent>
      </Card>
    );
  }

  if (!showSetupGuide) {
    return null;
  }

  const completedSteps = setupSteps.filter(step => step.isCompleted).length;
  const progress = (completedSteps / setupSteps.length) * 100;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Setup Your Financial Profile</CardTitle>
        <CardDescription>
          Complete these steps to get the most out of Unbroken Pockets
        </CardDescription>
        <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-300 ease-in-out" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {completedSteps} of {setupSteps.length} steps completed
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {setupSteps.map((step, index) => {
            // Find first incomplete step for highlighting
            const isNextStep = !step.isCompleted && 
              setupSteps.slice(0, index).every(s => s.isCompleted);
            
            return (
              <div 
                key={step.id}
                className={`flex items-start p-3 rounded-lg transition-colors
                  ${step.isCompleted ? 'bg-green-50 border border-green-100' : 
                    isNextStep ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-100'}`}
              >
                <div className="mr-3 mt-1">
                  {step.isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <CircleDashed className={`h-5 w-5 ${isNextStep ? 'text-blue-500' : 'text-gray-400'}`} />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium ${step.isCompleted ? 'text-green-700' : 
                    isNextStep ? 'text-blue-700' : 'text-gray-700'}`}>
                    {step.title}
                  </h4>
                  <p className="text-sm text-gray-500">{step.description}</p>
                </div>
                
                <div className="ml-2 flex items-center space-x-2">
                  {(() => {
                    // Determine which button to show based on step ID
                    switch(step.id) {
                      case 'financial-tracking-start':
                        return (
                          <>
                            <Button 
                              variant={isNextStep ? "default" : "outline"}
                              size="sm"
                              className={step.isCompleted ? "bg-green-500 hover:bg-green-600" : "bg-purple-500 hover:bg-purple-600 text-white"}
                              disabled={step.isCompleted || isSavingTrackingDate}
                              onClick={() => setShowTrackingDateDialog(true)}
                            >
                              {step.isCompleted ? 'Completed' : (
                                isSavingTrackingDate ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    Set Up <ArrowRight className="ml-1 h-4 w-4" />
                                  </>
                                )
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setShowTrackingDateDialog(true)}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </>
                        );
                      case 'accounts':
                        return (
                          <>
                            <Button 
                              variant={isNextStep ? "default" : "outline"}
                              size="sm"
                              className={step.isCompleted ? "bg-green-500 hover:bg-green-600" : "bg-purple-500 hover:bg-purple-600 text-white"}
                              disabled={step.isCompleted || isSaving}
                              onClick={() => setShowAccountDialog(true)}
                            >
                              {step.isCompleted ? 'Completed' : (
                                isSaving ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    Set Up <ArrowRight className="ml-1 h-4 w-4" />
                                  </>
                                )
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setShowAccountDialog(true)}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </>
                        );
                      case 'income':
                        return (
                          <>
                            <Button 
                              variant={isNextStep ? "default" : "outline"}
                              size="sm"
                              className={step.isCompleted ? "bg-green-500 hover:bg-green-600" : "bg-purple-500 hover:bg-purple-600 text-white"}
                              disabled={step.isCompleted || isAddingRecurringItem}
                              onClick={() => setShowIncomeDialog(true)}
                            >
                              {step.isCompleted ? 'Completed' : (
                                isAddingRecurringItem ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    Set Up <ArrowRight className="ml-1 h-4 w-4" />
                                  </>
                                )
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setShowIncomeDialog(true)}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </>
                        );
                      case 'fixed-expenses':
                        return (
                          <>
                            <Button 
                              variant={isNextStep ? "default" : "outline"}
                              size="sm"
                              className={step.isCompleted ? "bg-green-500 hover:bg-green-600" : "bg-purple-500 hover:bg-purple-600 text-white"}
                              disabled={step.isCompleted || isAddingRecurringItem}
                              onClick={() => setShowFixedExpenseDialog(true)}
                            >
                              {step.isCompleted ? 'Completed' : (
                                isAddingRecurringItem ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    Set Up <ArrowRight className="ml-1 h-4 w-4" />
                                  </>
                                )
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setShowFixedExpenseDialog(true)}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </>
                        );
                      case 'subscriptions':
                        return (
                          <>
                            <Button 
                              variant={isNextStep ? "default" : "outline"}
                              size="sm"
                              className={step.isCompleted ? "bg-green-500 hover:bg-green-600" : "bg-purple-500 hover:bg-purple-600 text-white"}
                              disabled={step.isCompleted || isAddingRecurringItem}
                              onClick={() => setShowSubscriptionDialog(true)}
                            >
                              {step.isCompleted ? 'Completed' : (
                                isAddingRecurringItem ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    Set Up <ArrowRight className="ml-1 h-4 w-4" />
                                  </>
                                )
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setShowSubscriptionDialog(true)}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </>
                        );
                      case 'debt':
                        return (
                          <>
                            <Button 
                              variant={isNextStep ? "default" : "outline"}
                              size="sm"
                              className={step.isCompleted ? "bg-green-500 hover:bg-green-600" : "bg-purple-500 hover:bg-purple-600 text-white"}
                              disabled={step.isCompleted || isAddingDebt}
                              onClick={() => setShowDebtDialog(true)}
                            >
                              {step.isCompleted ? 'Completed' : (
                                isAddingDebt ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    Set Up <ArrowRight className="ml-1 h-4 w-4" />
                                  </>
                                )
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setShowDebtDialog(true)}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </>
                        );
                      case 'goals':
                        return (
                          <>
                            <Button 
                              variant={isNextStep ? "default" : "outline"}
                              size="sm"
                              className={step.isCompleted ? "bg-green-500 hover:bg-green-600" : "bg-purple-500 hover:bg-purple-600 text-white"}
                              disabled={step.isCompleted || isAddingGoal}
                              onClick={() => setShowGoalDialog(true)}
                            >
                              {step.isCompleted ? 'Completed' : (
                                isAddingGoal ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    Set Up <ArrowRight className="ml-1 h-4 w-4" />
                                  </>
                                )
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setShowGoalDialog(true)}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </>
                        );
                      default:
                        return (
                          <Button 
                            asChild 
                            variant={step.isCompleted ? "outline" : "default"}
                            size="sm" 
                            className={step.isCompleted ? "bg-green-500 hover:bg-green-600" : "bg-purple-500 hover:bg-purple-600 text-white"}
                            disabled={step.isCompleted}
                          >
                            <Link href={step.href}>
                              {step.isCompleted ? 'Completed' : (
                                <>
                                  Set Up <ArrowRight className="ml-1 h-4 w-4" />
                                </>
                              )}
                            </Link>
                          </Button>
                        );
                    }
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* AddAccountDialog component with proper child */}
      <AddAccountDialog
        isOpen={showAccountDialog}
        onOpenChange={setShowAccountDialog}
        onAccountAdded={async (accountData, keepOpen) => {
          try {
            console.log('=== Setup Guide: Account Creation Started ===');
            console.log('accountData:', JSON.stringify(accountData, null, 2));
            console.log('user:', user);
            
            setIsSaving(true);
            
            if (!user?.id) {
              console.error('No user ID available');
              throw new Error('You must be logged in to create an account');
            }
            
            console.log('Creating account with userId:', user.id);
            // Create the account
            const result = await createAccount({
              ...accountData,
              userId: user.id,
              isPrimary: true // First account is primary by default
            });
            
            console.log('Account creation result:', result);
            
            if (result.error) {
              console.error('Account creation failed:', result.error);
              throw new Error(result.error);
            }
            
            if (!result.account) {
              console.error('No account returned from creation');
              throw new Error('Failed to create account. Please try again.');
            }
            
            console.log('Account created successfully:', result.account);
            // Mark the account step as completed
            const updatedSteps = [...setupSteps];
            const accountStep = updatedSteps.find(step => step.id === 'accounts');
            if (accountStep) accountStep.isCompleted = true;
            setSetupSteps(updatedSteps);
            
            toast({
              title: "Account Added",
              description: keepOpen ? "Account added. You can add another one." : 
                "Your account has been set up successfully."
            });
          } catch (err: any) {
            console.error("Error creating account:", err);
            toast({
              title: "Error",
              description: err.message || "Failed to create account. Please try again.",
              variant: "destructive"
            });
            // Re-throw the error to be handled by the dialog
            throw err;
          } finally {
            setIsSaving(false);
          }
        }}
      >
        <span />
      </AddAccountDialog>

      {/* Add Income Dialog */}
      <AddRecurringItemDialog
        key={`income-dialog-${dialogKey}`}
        isOpen={showIncomeDialog}
        onOpenChange={(open) => {
          setShowIncomeDialog(open);
          if (!open) {
            // Increment key when dialog closes to ensure fresh instance next time
            setDialogKey(prev => prev + 1);
          }
        }}
        initialType="income"
        onRecurringItemAdded={async (itemData, keepOpen = false) => {
          try {
            setIsAddingRecurringItem(true);
            
            if (user?.id) {
              // Save to Supabase using helper function
              const { data, error } = await insertRecurringItem({
                name: itemData.name,
                type: itemData.type,
                amount: itemData.amount,
                frequency: itemData.frequency,
                start_date: itemData.startDate ? itemData.startDate.toISOString() : '',
                last_renewal_date: itemData.lastRenewalDate ? itemData.lastRenewalDate.toISOString() : undefined,
                end_date: itemData.endDate ? itemData.endDate.toISOString() : undefined,
                semi_monthly_first_pay_date: itemData.semiMonthlyFirstPayDate ? itemData.semiMonthlyFirstPayDate.toISOString() : undefined,
                semi_monthly_second_pay_date: itemData.semiMonthlySecondPayDate ? itemData.semiMonthlySecondPayDate.toISOString() : undefined,
                user_id: user.id,
                category_id: itemData.categoryId || undefined,
                notes: itemData.notes
              });
                
              if (error) throw error;
              
              // Mark the income step as completed
              const updatedSteps = [...setupSteps];
              const incomeStep = updatedSteps.find(step => step.id === 'income');
              if (incomeStep) incomeStep.isCompleted = true;
              setSetupSteps(updatedSteps);
              
              toast({
                title: "Income Added",
                description: keepOpen ? "Income added. You can add another one." : 
                  "Your income has been set up successfully."
              });
              
              if (keepOpen) {
                // Force a new dialog instance by incrementing the key
                setDialogKey(prev => prev + 1);
              } else {
                // Close the dialog
                setShowIncomeDialog(false);
              }
            }
          } catch (err: any) {
            console.error("Error adding income:", err);
            toast({
              title: "Error",
              description: "Failed to add income. Please try again.",
              variant: "destructive"
            });
          } finally {
            setIsAddingRecurringItem(false);
          }
        }}
      >
        <span />
      </AddRecurringItemDialog>

      {/* Add Fixed Expense Dialog */}
      <AddRecurringItemDialog
        key={`fixed-expense-dialog-${dialogKey}`}
        isOpen={showFixedExpenseDialog}
        onOpenChange={(open) => {
          setShowFixedExpenseDialog(open);
          if (!open) {
            // Increment key when dialog closes to ensure fresh instance next time
            setDialogKey(prev => prev + 1);
          }
        }}
        initialType="fixed-expense"
        onRecurringItemAdded={async (itemData, keepOpen = false) => {
          try {
            setIsAddingRecurringItem(true);
            
            if (user?.id) {
              // Save to Supabase using helper function
              const { data, error } = await insertRecurringItem({
                name: itemData.name,
                type: itemData.type,
                amount: itemData.amount,
                frequency: itemData.frequency,
                start_date: itemData.startDate ? itemData.startDate.toISOString() : '',
                last_renewal_date: itemData.lastRenewalDate ? itemData.lastRenewalDate.toISOString() : undefined,
                end_date: itemData.endDate ? itemData.endDate.toISOString() : undefined,
                semi_monthly_first_pay_date: itemData.semiMonthlyFirstPayDate ? itemData.semiMonthlyFirstPayDate.toISOString() : undefined,
                semi_monthly_second_pay_date: itemData.semiMonthlySecondPayDate ? itemData.semiMonthlySecondPayDate.toISOString() : undefined,
                user_id: user.id,
                category_id: itemData.categoryId || undefined,
                notes: itemData.notes
              });
                
              if (error) throw error;
              
              // Mark the fixed-expenses step as completed
              const updatedSteps = [...setupSteps];
              const fixedExpenseStep = updatedSteps.find(step => step.id === 'fixed-expenses');
              if (fixedExpenseStep) fixedExpenseStep.isCompleted = true;
              setSetupSteps(updatedSteps);
              
              toast({
                title: "Fixed Expense Added",
                description: keepOpen ? "Fixed expense added. You can add another one." : 
                  "Your fixed expense has been set up successfully."
              });
              
              if (keepOpen) {
                // Force a new dialog instance by incrementing the key
                setDialogKey(prev => prev + 1);
              } else {
                // Close the dialog
                setShowFixedExpenseDialog(false);
              }
            }
          } catch (err: any) {
            console.error("Error adding fixed expense:", err);
            toast({
              title: "Error",
              description: "Failed to add fixed expense. Please try again.",
              variant: "destructive"
            });
          } finally {
            setIsAddingRecurringItem(false);
          }
        }}
      >
        <Button type="button">Open Fixed Expense Dialog</Button>
      </AddRecurringItemDialog>

      {/* Add Subscription Dialog */}
      <AddRecurringItemDialog
        key={`subscription-dialog-${dialogKey}`}
        isOpen={showSubscriptionDialog}
        onOpenChange={(open) => {
          setShowSubscriptionDialog(open);
          if (!open) {
            // Increment key when dialog closes to ensure fresh instance next time
            setDialogKey(prev => prev + 1);
          }
        }}
        initialType="subscription"
        onRecurringItemAdded={async (itemData, keepOpen = false) => {
          try {
            setIsAddingRecurringItem(true);
            
            if (user?.id) {
              // Save to Supabase using helper function
              const { data, error } = await insertRecurringItem({
                name: itemData.name,
                type: itemData.type,
                amount: itemData.amount,
                frequency: itemData.frequency,
                start_date: itemData.startDate ? itemData.startDate.toISOString() : '',
                last_renewal_date: itemData.lastRenewalDate ? itemData.lastRenewalDate.toISOString() : undefined,
                end_date: itemData.endDate ? itemData.endDate.toISOString() : undefined,
                semi_monthly_first_pay_date: itemData.semiMonthlyFirstPayDate ? itemData.semiMonthlyFirstPayDate.toISOString() : undefined,
                semi_monthly_second_pay_date: itemData.semiMonthlySecondPayDate ? itemData.semiMonthlySecondPayDate.toISOString() : undefined,
                user_id: user.id,
                category_id: itemData.categoryId || undefined,
                notes: itemData.notes
              });
                
              if (error) throw error;
              
              // Mark the subscriptions step as completed
              const updatedSteps = [...setupSteps];
              const subscriptionStep = updatedSteps.find(step => step.id === 'subscriptions');
              if (subscriptionStep) subscriptionStep.isCompleted = true;
              setSetupSteps(updatedSteps);
              
              toast({
                title: "Subscription Added",
                description: keepOpen ? "Subscription added. You can add another one." : 
                  "Your subscription has been set up successfully."
              });
              
              if (keepOpen) {
                // Force a new dialog instance by incrementing the key
                setDialogKey(prev => prev + 1);
              } else {
                // Close the dialog
                setShowSubscriptionDialog(false);
              }
            }
          } catch (err: any) {
            console.error("Error adding subscription:", err);
            toast({
              title: "Error",
              description: "Failed to add subscription. Please try again.",
              variant: "destructive"
            });
          } finally {
            setIsAddingRecurringItem(false);
          }
        }}
      >
        <Button type="button">Open Subscription Dialog</Button>
      </AddRecurringItemDialog>

      {/* Add Debt Dialog */}
      <AddDebtDialog
        key={`debt-dialog-${dialogKey}`}
        isOpen={showDebtDialog}
        onOpenChange={(open) => {
          setShowDebtDialog(open);
          if (!open) {
            // Increment key when dialog closes to ensure fresh instance next time
            setDialogKey(prev => prev + 1);
          }
        }}
        onDebtAdded={async (debtData, keepOpen = false) => {
          try {
            setIsAddingDebt(true);
            
            if (user?.id) {
              // Create the debt account
              const result = await createDebtAccount({
                ...debtData,
                userId: user.id
              });
              
              if (result.error) throw new Error(result.error);
              
              if (result.account) {
                // Mark the debt step as completed
                const updatedSteps = [...setupSteps];
                const debtStep = updatedSteps.find(step => step.id === 'debt');
                if (debtStep) debtStep.isCompleted = true;
                setSetupSteps(updatedSteps);
                
                toast({
                  title: "Debt Account Added",
                  description: keepOpen ? "Debt account added. You can add another one." : 
                    "Your debt account has been set up successfully."
                });
              }
              
              if (keepOpen) {
                // Force a new dialog instance by incrementing the key
                setDialogKey(prev => prev + 1);
              } else {
                // Close the dialog
                setShowDebtDialog(false);
              }
            }
          } catch (err: any) {
            console.error("Error creating debt account:", err);
            toast({
              title: "Error",
              description: "Failed to create debt account. Please try again.",
              variant: "destructive"
            });
          } finally {
            setIsAddingDebt(false);
          }
        }}
      >
        <Button type="button">Open Debt Dialog</Button>
      </AddDebtDialog>

      {/* Add Financial Goal Dialog */}
      <AddGoalDialog
        key={`goal-dialog-${dialogKey}`}
        isOpen={showGoalDialog}
        onOpenChange={(open) => {
          setShowGoalDialog(open);
          if (!open) {
            // Increment key when dialog closes to ensure fresh instance next time
            setDialogKey(prev => prev + 1);
          }
        }}
        onGoalAdded={async (goalData, keepOpen = false) => {
          try {
            setIsAddingGoal(true);
            
            if (user?.id) {
              // Create the financial goal
              const result = await createFinancialGoal({
                ...goalData,
                userId: user.id
              });
              
              if (result.error) throw new Error(result.error);
              
              if (result.goal) {
                // Mark the goals step as completed
                const updatedSteps = [...setupSteps];
                const goalStep = updatedSteps.find(step => step.id === 'goals');
                if (goalStep) goalStep.isCompleted = true;
                setSetupSteps(updatedSteps);
                
                toast({
                  title: "Financial Goal Added",
                  description: keepOpen ? "Financial goal added. You can add another one." : 
                    "Your financial goal has been set up successfully."
                });
              }
              
              if (keepOpen) {
                // Force a new dialog instance by incrementing the key
                setDialogKey(prev => prev + 1);
              } else {
                // Close the dialog
                setShowGoalDialog(false);
              }
            }
          } catch (err: any) {
            console.error("Error creating financial goal:", err);
            toast({
              title: "Error",
              description: "Failed to create financial goal. Please try again.",
              variant: "destructive"
            });
          } finally {
            setIsAddingGoal(false);
          }
        }}
      >
        <Button type="button">Open Goal Dialog</Button>
      </AddGoalDialog>

      {/* Financial Tracking Start Date Dialog */}
      {showTrackingDateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Set Financial Tracking Start Date</CardTitle>
              <CardDescription>
                Choose when your financial tracking begins. Recurring items are generated from January 1 of this year — items before this date will be marked as completed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedTrackingDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedTrackingDate ? format(selectedTrackingDate, "PPP") : <span>Pick a date (optional)</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedTrackingDate}
                      onSelect={setSelectedTrackingDate}
                      disabled={(date) =>
                        date > new Date() || date < new Date("2020-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowTrackingDateDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={async () => {
                      try {
                        setIsSavingTrackingDate(true);
                        
                        if (user?.id) {
                          const { preferences, error } = await updateUserPreferences(user.id, {
                            financialTrackingStartDate: selectedTrackingDate
                          });
                          
                          if (error) throw new Error(error);
                          
                          // Auto-complete periods before the tracking start date
                          if (selectedTrackingDate) {
                            try {
                              const { success, autoCompletedCount, error: autoCompleteError } = 
                                await autoCompletePeriodsBeforeTrackingStart(user.id, selectedTrackingDate);
                              
                              if (autoCompleteError) {
                                console.warn('Failed to auto-complete periods:', autoCompleteError);
                              } else if (success && autoCompletedCount > 0) {
                                console.log(`Auto-completed ${autoCompletedCount} periods before tracking start date`);
                              }
                            } catch (autoCompleteErr) {
                              console.warn('Error during auto-completion:', autoCompleteErr);
                            }
                          }
                          
                          // Mark the step as completed
                          const updatedSteps = [...setupSteps];
                          const trackingStep = updatedSteps.find(step => step.id === 'financial-tracking-start');
                          if (trackingStep) trackingStep.isCompleted = true;
                          setSetupSteps(updatedSteps);
                          
                          toast({
                            title: "Financial Tracking Start Date Set",
                            description: selectedTrackingDate 
                              ? `Financial tracking will begin from ${format(selectedTrackingDate, "PPP")}. Historical periods have been automatically marked as completed.`
                              : "Financial tracking will use the default start date (6 months ago)"
                          });
                          
                          setShowTrackingDateDialog(false);
                        }
                      } catch (err: any) {
                        console.error("Error saving tracking start date:", err);
                        toast({
                          title: "Error",
                          description: "Failed to save tracking start date. Please try again.",
                          variant: "destructive"
                        });
                      } finally {
                        setIsSavingTrackingDate(false);
                      }
                    }}
                    disabled={isSavingTrackingDate}
                  >
                    {isSavingTrackingDate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}
