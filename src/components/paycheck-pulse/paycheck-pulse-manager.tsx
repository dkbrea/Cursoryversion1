"use client";

import type {
  RecurringItem, DebtAccount, VariableExpense, FinancialGoal,
  PaycheckBreakdown, PaycheckTimeframe, MonthlyForecast, SinkingFund, PaycheckPreferences
} from "@/types";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaycheckBreakdownCard } from "./paycheck-breakdown-card";
import { PaycheckTimelineView } from "./paycheck-timeline-view";
import { PaycheckPreferencesDialog } from "./paycheck-preferences-dialog";
import { generatePaycheckPeriods, generatePaycheckBreakdownWithSinkingFunds } from "@/lib/utils/paycheck-calculations";
import { getSinkingFundsWithProgress } from "@/lib/api/sinking-funds";
import { getUserPreferences, updateUserPreferences } from "@/lib/api/user-preferences";
import { getVariableExpenseSpending } from "@/lib/api/transactions";
import { isBefore, isAfter, startOfDay, startOfMonth, format } from "date-fns";
import { getForecastOverridesForMonth } from "@/lib/api/forecast-overrides";

export function PaycheckPulseManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [debtAccounts, setDebtAccounts] = useState<DebtAccount[]>([]);
  const [variableExpenses, setVariableExpenses] = useState<VariableExpense[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [sinkingFunds, setSinkingFunds] = useState<SinkingFund[]>([]);
  const [paycheckBreakdowns, setPaycheckBreakdowns] = useState<PaycheckBreakdown[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<PaycheckTimeframe>('current');
  const [currentMonthForecast, setCurrentMonthForecast] = useState<MonthlyForecast | null>(null);
  const [paycheckPreferences, setPaycheckPreferences] = useState<PaycheckPreferences>({
    timingMode: 'current-period',
    includeBufferDays: 3,
    prioritizeSinkingFunds: false,
    sinkingFundStrategy: 'frequency-based'
  });
  const [isPreferencesDialogOpen, setIsPreferencesDialogOpen] = useState(false);
  const [actualSpendingData, setActualSpendingData] = useState<{ categoryId: string; spent: number; budgeted: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        // Fetch user preferences first to get paycheck preferences
        const { preferences } = await getUserPreferences(user.id);
        if (preferences?.paycheckPreferences) {
          setPaycheckPreferences(preferences.paycheckPreferences);
        }

        // Fetch recurring items
        const { data: recurringData, error: recurringError } = await supabase
          .from('recurring_items')
          .select('*')
          .eq('user_id', user.id);

        if (recurringError) throw new Error(recurringError.message);

        // Fetch debt accounts
        const { data: debtData, error: debtError } = await supabase
          .from('debt_accounts')
          .select('*')
          .eq('user_id', user.id);

        if (debtError) throw new Error(debtError.message);

        // Fetch variable expenses
        let variableExpensesData: any[] = [];
        try {
          const { data, error } = await supabase
            .from('variable_expenses')
            .select('*')
            .eq('user_id', user.id);
            
          if (error) {
            console.warn('Variable expenses table not available, using empty array');
            variableExpensesData = [];
          } else {
            variableExpensesData = data || [];
          }
        } catch (err) {
          console.warn('Error fetching variable expenses:', err);
          variableExpensesData = [];
        }

        // Fetch financial goals
        const { data: goalsData, error: goalsError } = await supabase
          .from('financial_goals')
          .select('*')
          .eq('user_id', user.id);

        if (goalsError) throw new Error(goalsError.message);

        // Fetch sinking funds
        const { sinkingFunds: sinkingFundsData, error: sinkingFundsError } = await getSinkingFundsWithProgress(user.id);
        
        if (sinkingFundsError) {
          console.warn('Error fetching sinking funds:', sinkingFundsError);
        }

        // Transform data
        const transformedRecurringItems = (recurringData?.map(item => ({
          id: item.id,
          name: item.name,
          amount: Number(item.amount),
          frequency: item.frequency,
          type: item.type,
          categoryId: item.category_id,
          startDate: item.start_date ? new Date(item.start_date) : undefined,
          endDate: item.end_date ? new Date(item.end_date) : undefined,
          userId: item.user_id,
          createdAt: new Date(item.created_at!),
          updatedAt: item.updated_at ? new Date(item.updated_at) : undefined
        })) || []);

        const transformedDebtAccounts = (debtData?.map(debt => ({
          id: debt.id,
          name: debt.name,
          type: debt.type,
          balance: Number(debt.balance),
          apr: Number(debt.apr),
          minimumPayment: Number(debt.minimum_payment),
          paymentDayOfMonth: debt.payment_day_of_month,
          nextDueDate: debt.next_due_date ? new Date(debt.next_due_date) : new Date(),
          paymentFrequency: debt.payment_frequency,
          userId: debt.user_id,
          createdAt: new Date(debt.created_at!)
        })) || []);

        const transformedVariableExpenses = (variableExpensesData?.map(expense => ({
          id: expense.id,
          name: expense.name,
          category: expense.category,
          amount: Number(expense.amount),
          userId: expense.user_id,
          createdAt: new Date(expense.created_at!),
          updatedAt: expense.updated_at ? new Date(expense.updated_at) : undefined
        })) || []);

        const transformedGoals = (goalsData?.map(goal => ({
          id: goal.id,
          name: goal.name,
          targetAmount: Number(goal.target_amount),
          currentAmount: Number(goal.current_amount),
          targetDate: new Date(goal.target_date),
          icon: goal.icon || 'default',
          userId: goal.user_id,
          createdAt: new Date(goal.created_at!)
        })) || []);

        // Set the transformed data
        setRecurringItems(transformedRecurringItems);
        setDebtAccounts(transformedDebtAccounts);
        setVariableExpenses(transformedVariableExpenses);
        setGoals(transformedGoals);
        setSinkingFunds(sinkingFundsData || []);
        
      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error loading data",
          description: error.message || "Failed to load paycheck data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id, toast]);

  // Fetch actual spending data for the current month when variable expenses change
  // Note: This data is only applied to paycheck periods in the current month
  // Future months will show full budget amounts (actualSpent = 0)
  useEffect(() => {
    const fetchActualSpendingData = async () => {
      if (!user?.id || variableExpenses.length === 0) return;

      try {
        // Get current month's date range
        const today = new Date();
        const startOfCurrentMonth = startOfMonth(today);
        const endOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        // Fetch actual spending for variable expenses (current month only)
        const { spendingData, error } = await getVariableExpenseSpending(
          user.id,
          startOfCurrentMonth,
          endOfCurrentMonth
        );

        if (error) {
          console.warn('Error fetching spending data:', error);
          return;
        }

        // Transform to expected format
        const actualSpending = variableExpenses.map(expense => {
          const spendingRecord = spendingData?.find(data => data.variableExpenseId === expense.id);
          return {
            categoryId: expense.id,
            spent: spendingRecord?.spent || 0,
            budgeted: expense.amount
          };
        });

        setActualSpendingData(actualSpending);
      } catch (error: any) {
        console.error('Error fetching actual spending data:', error);
      }
    };

    fetchActualSpendingData();
  }, [user?.id, variableExpenses]);

  // Generate paycheck breakdowns when data is loaded
  useEffect(() => {
    if (recurringItems.length > 0 || debtAccounts.length > 0) {
      const periods = generatePaycheckPeriods(recurringItems);
      
      // Use the enhanced calculation with sinking funds integration and actual spending data
      const breakdowns = generatePaycheckBreakdownWithSinkingFunds(
        periods,
        recurringItems,
        debtAccounts,
        variableExpenses,
        goals,
        sinkingFunds,
        paycheckPreferences,
        actualSpendingData // Pass actual spending data
      );
      
      setPaycheckBreakdowns(breakdowns);
    }
  }, [recurringItems, debtAccounts, variableExpenses, goals, sinkingFunds, paycheckPreferences, actualSpendingData]);

  const handlePreferencesChanged = async (newPreferences: PaycheckPreferences) => {
    if (!user?.id) return;

    try {
      await updateUserPreferences(user.id, { paycheckPreferences: newPreferences });
      setPaycheckPreferences(newPreferences);
      
      toast({
        title: "Preferences saved",
        description: "Your paycheck pulse preferences have been updated.",
      });
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error saving preferences",
        description: error.message || "Failed to save preferences",
        variant: "destructive",
      });
    }
  };

  // Categorize breakdowns by timeframe
  const categorizeBreakdowns = () => {
    const today = startOfDay(new Date());
    const past: PaycheckBreakdown[] = [];
    const current: PaycheckBreakdown[] = [];
    const future: PaycheckBreakdown[] = [];

    paycheckBreakdowns.forEach(breakdown => {
      if (isBefore(breakdown.period.paycheckDate, today)) {
        past.push(breakdown);
      } else {
        future.push(breakdown);
      }
    });

    // Current paycheck is the most recent one that has been received (last item in past array)
    if (past.length > 0) {
      const mostRecentReceived = past[past.length - 1];
      current.push(mostRecentReceived);
      // Remove it from past since it's now "current"
      past.splice(-1, 1);
    }

    return { past, current, future };
  };

  const { past, current, future } = categorizeBreakdowns();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading paycheck data...</span>
      </div>
    );
  }

  if (paycheckBreakdowns.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-muted-foreground mb-2">No Paycheck Data Available</h3>
        <p className="text-sm text-muted-foreground">
          Add some recurring income items to get started with paycheck planning.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Preferences Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Paycheck Pulse</h2>
          <p className="text-sm text-muted-foreground">
            Smart allocation across your paychecks with sinking fund integration
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsPreferencesDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Preferences
        </Button>
      </div>

      {/* Current Paycheck Highlight */}
      {current.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Most Recent Paycheck</h3>
          </div>
          <PaycheckBreakdownCard breakdown={current[0]} isHighlighted={true} />
        </div>
      )}

      {/* Tabbed View */}
      <Tabs value={selectedTimeframe} onValueChange={(value) => setSelectedTimeframe(value as PaycheckTimeframe)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          <TabsTrigger value="current">Recent</TabsTrigger>
          <TabsTrigger value="future">Upcoming ({future.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="past" className="space-y-6">
          <PaycheckTimelineView breakdowns={past} title="Past Paychecks" />
        </TabsContent>

        <TabsContent value="current" className="space-y-6">
          <PaycheckTimelineView breakdowns={current} title="Most Recent Paycheck" />
        </TabsContent>

        <TabsContent value="future" className="space-y-6">
          <PaycheckTimelineView breakdowns={future} title="Upcoming Paychecks" />
        </TabsContent>
      </Tabs>

      {/* Preferences Dialog */}
      <PaycheckPreferencesDialog
        isOpen={isPreferencesDialogOpen}
        onOpenChange={setIsPreferencesDialogOpen}
        preferences={paycheckPreferences}
        onPreferencesChanged={handlePreferencesChanged}
      />
    </div>
  );
} 