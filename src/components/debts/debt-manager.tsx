"use client";

import type { DebtAccount, DebtPayoffStrategy, PaymentFrequency } from "@/types";
import { useState, useEffect, useMemo } from "react";
import { DebtList } from "./debt-list";
import { AddDebtDialog } from "./add-debt-dialog";
import { PayoffStrategySelector } from "./payoff-strategy-selector";
import { Button } from "@/components/ui/button";
import { PlusCircle, Info, Loader2, ArrowDown, DollarSign, Calendar, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { getDebtAccounts, createDebtAccount, deleteDebtAccount, updateDebtAccount, getDebtPayoffStrategy, setDebtPayoffStrategy } from "@/lib/api/debts";
import { useAuth } from "@/contexts/auth-context";
import { format, addMonths } from "date-fns";



// Debt Payoff Plan Component
function DebtPayoffPlan({ debtAccounts, strategy }: { debtAccounts: DebtAccount[], strategy: DebtPayoffStrategy }) {
  // Sort debts based on the selected strategy
  const sortedDebts = useMemo(() => {
    const debts = [...debtAccounts];
    if (strategy === 'snowball') {
      // Sort by balance (smallest to largest)
      return debts.sort((a, b) => a.balance - b.balance);
    } else {
      // Sort by APR (highest to lowest)
      return debts.sort((a, b) => b.apr - a.apr);
    }
  }, [debtAccounts, strategy]);

  // Calculate total debt and monthly payment
  const totalDebt = useMemo(() => {
    return debtAccounts.reduce((sum, debt) => sum + debt.balance, 0);
  }, [debtAccounts]);

  const totalMinimumPayment = useMemo(() => {
    return debtAccounts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
  }, [debtAccounts]);

  // Calculate payoff timeline and generate payment schedule
  const payoffPlan = useMemo(() => {
    // Deep copy the sorted debts to avoid modifying the original array
    const workingDebts = sortedDebts.map(debt => ({
      ...debt,
      currentBalance: debt.balance,
      isPaidOff: false,
      payoffDate: null as Date | null,
      monthsToPayoff: 0,
      totalInterestPaid: 0,
      paymentSchedule: [] as Array<{month: number, payment: number, interestPaid: number, principalPaid: number, remainingBalance: number}>
    }));

    // Set a reasonable maximum number of months to prevent infinite loops
    const MAX_MONTHS = 360; // 30 years
    let month = 0;
    let allPaidOff = false;
    let extraPayment = 0;

    while (!allPaidOff && month < MAX_MONTHS) {
      month++;
      
      // Reset extra payment for this month
      extraPayment = 0;
      
      // Apply minimum payments and calculate interest for each debt
      for (const debt of workingDebts) {
        if (debt.isPaidOff) continue;
        
        // Calculate monthly interest rate (APR / 12)
        const monthlyInterestRate = debt.apr / 100 / 12;
        
        // Calculate interest for this month
        const interestThisMonth = debt.currentBalance * monthlyInterestRate;
        
        // Apply minimum payment
        let paymentAmount = debt.minimumPayment;
        let principalPaid = paymentAmount - interestThisMonth;
        
        // If payment is more than remaining balance + interest
        if (paymentAmount > debt.currentBalance + interestThisMonth) {
          paymentAmount = debt.currentBalance + interestThisMonth;
          principalPaid = debt.currentBalance;
        }
        
        // Update balance
        debt.currentBalance = Math.max(0, debt.currentBalance - principalPaid);
        debt.totalInterestPaid += interestThisMonth;
        
        // Add to payment schedule
        debt.paymentSchedule.push({
          month,
          payment: paymentAmount,
          interestPaid: interestThisMonth,
          principalPaid,
          remainingBalance: debt.currentBalance
        });
        
        // Check if paid off
        if (debt.currentBalance === 0 && !debt.isPaidOff) {
          debt.isPaidOff = true;
          debt.payoffDate = addMonths(new Date(), month);
          debt.monthsToPayoff = month;
          
          // Add this debt's minimum payment to extra payment for next month
          extraPayment += debt.minimumPayment;
        }
      }
      
      // Apply extra payment to the target debt (first non-paid debt in the sorted list)
      if (extraPayment > 0) {
        const targetDebt = workingDebts.find(debt => !debt.isPaidOff);
        if (targetDebt) {
          // Calculate how much extra payment can be applied
          const applicableExtraPayment = Math.min(extraPayment, targetDebt.currentBalance);
          
          if (applicableExtraPayment > 0) {
            // Update balance
            targetDebt.currentBalance = Math.max(0, targetDebt.currentBalance - applicableExtraPayment);
            
            // Update the last payment in the schedule
            const lastPayment = targetDebt.paymentSchedule[targetDebt.paymentSchedule.length - 1];
            lastPayment.payment += applicableExtraPayment;
            lastPayment.principalPaid += applicableExtraPayment;
            lastPayment.remainingBalance = targetDebt.currentBalance;
            
            // Check if paid off
            if (targetDebt.currentBalance === 0) {
              targetDebt.isPaidOff = true;
              targetDebt.payoffDate = addMonths(new Date(), month);
              targetDebt.monthsToPayoff = month;
            }
          }
        }
      }
      
      // Check if all debts are paid off
      allPaidOff = workingDebts.every(debt => debt.isPaidOff);
    }
    
    // Calculate total months to payoff and total interest paid
    const totalMonthsToPayoff = Math.max(...workingDebts.map(debt => debt.monthsToPayoff));
    const totalInterestPaid = workingDebts.reduce((sum, debt) => sum + debt.totalInterestPaid, 0);
    
    return {
      debts: workingDebts,
      totalMonthsToPayoff,
      totalInterestPaid,
      estimatedPayoffDate: addMonths(new Date(), totalMonthsToPayoff)
    };
  }, [sortedDebts]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-muted-foreground">Total Debt</span>
                <span className="text-2xl font-bold">${totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <DollarSign className="h-8 w-8 text-primary opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-muted-foreground">Estimated Payoff Date</span>
                <span className="text-2xl font-bold">{format(payoffPlan.estimatedPayoffDate, 'MMM yyyy')}</span>
              </div>
              <Calendar className="h-8 w-8 text-primary opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-muted-foreground">Total Interest</span>
                <span className="text-2xl font-bold">${payoffPlan.totalInterestPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <TrendingDown className="h-8 w-8 text-primary opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">Payoff Order</h3>
          <div className="space-y-4">
            {payoffPlan.debts.map((debt, index) => (
              <div key={debt.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{debt.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {strategy === 'snowball' ? 
                          `Balance: $${debt.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 
                          `APR: ${debt.apr.toFixed(2)}%`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{format(debt.payoffDate || new Date(), 'MMM yyyy')}</p>
                    <p className="text-sm text-muted-foreground">{debt.monthsToPayoff} months</p>
                  </div>
                </div>
                <Progress value={100} className="h-2" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">Payment Schedule</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableCaption>Your debt payoff schedule using the {strategy} method.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Debt</TableHead>
                  <TableHead>Current Balance</TableHead>
                  <TableHead>APR</TableHead>
                  <TableHead>Monthly Payment</TableHead>
                  <TableHead>Payoff Date</TableHead>
                  <TableHead>Total Interest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payoffPlan.debts.map((debt) => (
                  <TableRow key={debt.id}>
                    <TableCell className="font-medium">{debt.name}</TableCell>
                    <TableCell>${debt.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>{debt.apr.toFixed(2)}%</TableCell>
                    <TableCell>${debt.minimumPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>{format(debt.payoffDate || new Date(), 'MMM yyyy')}</TableCell>
                    <TableCell>${debt.totalInterestPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="font-bold">${totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="font-bold">${totalMinimumPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="font-bold">{format(payoffPlan.estimatedPayoffDate, 'MMM yyyy')}</TableCell>
                  <TableCell className="font-bold">${payoffPlan.totalInterestPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DebtManager() {
  const [debtAccounts, setDebtAccounts] = useState<DebtAccount[]>([]);
  const [payoffStrategy, setPayoffStrategy] = useState<DebtPayoffStrategy | null>(null);
  const [isAddDebtDialogOpen, setIsAddDebtDialogOpen] = useState(false);
  const [isEditDebtDialogOpen, setIsEditDebtDialogOpen] = useState(false);
  const [selectedDebtForEdit, setSelectedDebtForEdit] = useState<DebtAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    async function fetchDebtData() {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        // Fetch debt accounts
        const accountsResult = await getDebtAccounts(user.id);
        if (accountsResult.error) {
          throw new Error(accountsResult.error);
        }
        setDebtAccounts(accountsResult.accounts || []);
        
        // Fetch saved payoff strategy
        try {
          const strategyResult = await getDebtPayoffStrategy(user.id);
          if (strategyResult.error) {
            console.error("Error fetching payoff strategy:", strategyResult.error);
            // Set a default strategy if there's an error
            setPayoffStrategy('snowball'); // Default to snowball method
          } else if (strategyResult.strategy) {
            setPayoffStrategy(strategyResult.strategy);
          } else {
            // If no strategy is set, default to snowball
            setPayoffStrategy('snowball');
          }
        } catch (strategyError) {
          console.error("Exception fetching payoff strategy:", strategyError);
          // Set a default strategy if there's an exception
          setPayoffStrategy('snowball'); // Default to snowball method
        }
      } catch (err: any) {
        console.error("Error fetching debt data:", err);
        toast({
          title: "Error",
          description: "Failed to load your debt accounts. Please try refreshing the page.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchDebtData();
  }, [user?.id, toast]);

  const handleAddDebtAccount = async (newDebtData: Omit<DebtAccount, "id" | "userId" | "createdAt">, keepOpen = false) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to add debt accounts.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      console.log('=== handleAddDebtAccount called ===');
      console.log('newDebtData:', JSON.stringify(newDebtData, null, 2));
      
      // Add userId to the debt data
      const debtDataWithUser = {
        ...newDebtData,
        userId: user.id
      };
      
      console.log('debtDataWithUser:', JSON.stringify(debtDataWithUser, null, 2));
      
      // Create the debt account in the database
      const result = await createDebtAccount(debtDataWithUser);
      
      console.log('createDebtAccount result:', result);
      
      if (result.error) {
        console.error('Create failed with error:', result.error);
        throw new Error(result.error);
      }
      
      if (result.account) {
        console.log('Create successful, updating local state');
        // Add the new account to the local state
        setDebtAccounts((prevAccounts) => [...prevAccounts, result.account!]);
        
        toast({
          title: "Debt Account Added",
          description: `Debt "${result.account.name}" has been successfully added.`,
        });
        
        if (!keepOpen) {
          setIsAddDebtDialogOpen(false);
        }
      } else {
        console.error('No account returned from create');
        throw new Error('No account data returned from create');
      }
    } catch (err: any) {
      console.error("Error adding debt account:", err);
      const errorMessage = err.message || 'Unknown error occurred';
      toast({
        title: "Error",
        description: `Failed to add debt account: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDebtAccount = (debt: DebtAccount) => {
    setSelectedDebtForEdit(debt);
    setIsEditDebtDialogOpen(true);
  };

  const handleUpdateDebtAccount = async (debtId: string, updatedDebtData: Omit<DebtAccount, "id" | "userId" | "createdAt">) => {
    if (!user?.id) return;
    
    setIsSubmitting(true);
    try {
      console.log('=== handleUpdateDebtAccount called ===');
      console.log('debtId:', debtId);
      console.log('updatedDebtData:', JSON.stringify(updatedDebtData, null, 2));
      
      // Update the debt account in the database
      const result = await updateDebtAccount(debtId, updatedDebtData);
      
      console.log('updateDebtAccount result:', result);
      
      if (result.error) {
        console.error('Update failed with error:', result.error);
        throw new Error(result.error);
      }
      
      if (result.account) {
        console.log('Update successful, updating local state');
        // Update the account in the local state
        setDebtAccounts((prevAccounts) => 
          prevAccounts.map(account => 
            account.id === debtId ? result.account! : account
          )
        );
        
        toast({
          title: "Debt Account Updated",
          description: `Debt "${result.account.name}" has been successfully updated.`,
        });
        
        setIsEditDebtDialogOpen(false);
        setSelectedDebtForEdit(null);
      } else {
        console.error('No account returned from update');
        throw new Error('No account data returned from update');
      }
    } catch (err: any) {
      console.error("Error updating debt account:", err);
      const errorMessage = err.message || 'Unknown error occurred';
      toast({
        title: "Error",
        description: `Failed to update debt account: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDebtAccount = async (debtId: string) => {
    if (!user?.id) return;
    
    const accountToDelete = debtAccounts.find(acc => acc.id === debtId);
    if (!accountToDelete) return;
    
    try {
      // Delete the debt account from the database
      const result = await deleteDebtAccount(debtId);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.success) {
        // Remove the account from the local state
        setDebtAccounts((prevAccounts) => prevAccounts.filter(acc => acc.id !== debtId));
        
        toast({
          title: "Debt Account Deleted",
          description: `Debt "${accountToDelete.name}" has been deleted.`,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Error deleting debt account:", err);
      toast({
        title: "Error",
        description: "Failed to delete debt account. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleStrategySelect = async (strategy: DebtPayoffStrategy) => {
    if (!user?.id) return;
    
    setIsSubmitting(true);
    try {
      // Save the strategy to the database
      const result = await setDebtPayoffStrategy(user.id, strategy);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.success) {
        // Update the local state
        setPayoffStrategy(strategy);
        
        toast({
          title: "Payoff Strategy Updated",
          description: `You've selected the ${strategy.charAt(0).toUpperCase() + strategy.slice(1)} method.`,
        });
      }
    } catch (err: any) {
      console.error("Error setting payoff strategy:", err);
      toast({
        title: "Error",
        description: "Failed to update payoff strategy. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Your Debt Accounts</CardTitle>
            <CardDescription>Manage all your outstanding debts here.</CardDescription>
          </div>
          <AddDebtDialog
            isOpen={isAddDebtDialogOpen}
            onOpenChange={setIsAddDebtDialogOpen}
            onDebtAdded={handleAddDebtAccount}
          >
            <Button onClick={() => setIsAddDebtDialogOpen(true)} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Add New Debt
            </Button>
          </AddDebtDialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading your debt accounts...</span>
            </div>
          ) : debtAccounts.length > 0 ? (
            <DebtList
              debtAccounts={debtAccounts}
              onDeleteDebtAccount={handleDeleteDebtAccount}
              onEditDebtAccount={handleEditDebtAccount}
            />
          ) : (
            <div className="text-center text-muted-foreground py-10">
              <p className="text-lg">No debt accounts yet.</p>
              <p>Click "Add New Debt" to start planning your payoff.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {debtAccounts.length > 0 && (
        <PayoffStrategySelector
          selectedStrategy={payoffStrategy}
          onStrategySelect={handleStrategySelect}
        />
      )}

      {payoffStrategy && debtAccounts.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" />
              Debt Payoff Plan - {payoffStrategy === 'snowball' ? 'Snowball Method' : 'Avalanche Method'}
            </CardTitle>
            <CardDescription>
              {payoffStrategy === 'snowball' ? 
                'Paying off debts from smallest to largest balance to build momentum.' : 
                'Paying off debts from highest to lowest interest rate to minimize interest.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DebtPayoffPlan debtAccounts={debtAccounts} strategy={payoffStrategy} />
          </CardContent>
        </Card>
      )}

      {/* Edit Debt Dialog */}
      {selectedDebtForEdit && (
        <AddDebtDialog
          isOpen={isEditDebtDialogOpen}
          onOpenChange={(open) => {
            setIsEditDebtDialogOpen(open);
            if (!open) setSelectedDebtForEdit(null);
          }}
          onDebtAdded={() => {}} // Not used in edit mode
          initialValues={selectedDebtForEdit}
          isEditing={true}
          onDebtEdited={handleUpdateDebtAccount}
        >
          <Button className="hidden">Edit Debt</Button>
        </AddDebtDialog>
      )}
    </div>
  );
}
