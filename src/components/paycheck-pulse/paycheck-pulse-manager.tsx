"use client";

import type {
  RecurringItem, DebtAccount, VariableExpense, FinancialGoal,
  PaycheckBreakdown, PaycheckTimeframe, MonthlyForecast, SinkingFund, PaycheckPreferences
} from "@/types";
import { useState, useEffect, useCallback } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";

// --- ManualExpenseTable component (moved above main component for scope) ---
function ManualExpenseTable({ items, prefix, manualOverrides, handleManualChange, minKey, showDefaults, hasManualOverridesForPeriod }: any) {
  // Local state for input values
  const [inputStates, setInputStates] = useState<Record<string, string>>({});

  useEffect(() => {
    // Reset local state when items or overrides change
    const newStates: Record<string, string> = {};
    items.forEach((item: any) => {
      const key = `${prefix}-${item.id}`;
      if (manualOverrides.hasOwnProperty(key)) {
        newStates[key] = String(manualOverrides[key]);
      } else {
        newStates[key] = hasManualOverridesForPeriod ? '' : String(minKey ? item[minKey] : item.amount);
      }
    });
    setInputStates(newStates);
  }, [items, manualOverrides, prefix, minKey, hasManualOverridesForPeriod]);

  if (!items.length) return <div className="text-muted-foreground">No items in this category for the selected period.</div>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="text-left py-1">Name</th>
          <th className="text-right py-1">Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item: any) => {
          const key = `${prefix}-${item.id}`;
          const defaultValue = minKey ? item[minKey] : item.amount;
          let value = inputStates[key] ?? '';
          // If override is 0, show 0
          if (manualOverrides[key] === 0 && value === '') value = '0';
          return (
            <tr key={item.id}>
              <td className="py-1">{item.name}</td>
              <td className="py-1 text-right flex items-center gap-2 justify-end">
                <Input
                  type="text"
                  className="w-24"
                  value={value}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^\d*(\.\d*)?$/.test(val)) {
                      setInputStates(prev => ({ ...prev, [key]: val }));
                    }
                  }}
                  onBlur={e => {
                    const val = e.target.value;
                    if (val === '') {
                      setInputStates(prev => ({ ...prev, [key]: '0' }));
                      handleManualChange(key, 0);
                    } else if (!isNaN(Number(val))) {
                      handleManualChange(key, Number(val));
                    }
                  }}
                  placeholder={showDefaults ? 'Enter amount' : undefined}
                />
                {showDefaults && (
                  <span className="text-xs italic text-gray-400">{defaultValue}</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// Helper to calculate total for a category
function getManualTabTotal(items: any[], prefix: string, manualOverrides: Record<string, number>, minKey?: string, manualOnly?: boolean, hasManualOverridesForPeriod?: boolean) {
  // If in manual mode for this period, only sum manual overrides (or 0 if missing)
  if (manualOnly || hasManualOverridesForPeriod) {
    return items.reduce((acc, item) => {
      const key = `${prefix}-${item.id}`;
      return acc + (manualOverrides[key] !== undefined ? Number(manualOverrides[key]) : 0);
    }, 0);
  }
  // Otherwise, use manual override if present, else projected/default
  return items.reduce((acc, item) => acc + Number(manualOverrides[`${prefix}-${item.id}`] ?? (minKey ? item[minKey] : item.amount)), 0);
}

export function PaycheckPulseManager() {
  // Add userPreferences state at the very top of the component
  const [userPreferences, setUserPreferences] = useState<any>(null); // Replace 'any' with the correct type if available

  // --- PLAN SUPPORT: up to 3 plans, each with their own state ---
  const PLAN_KEYS = ['plan1', 'plan2', 'plan3'] as const;
  type PlanKey = typeof PLAN_KEYS[number];
  type PlanState = {
    manualOverrides: Record<string, number>;
    manualStartDate: Date | null;
    manualEndDate: Date | null;
    manualTab: string;
    hasManualOverridesForPeriod: boolean;
    shouldLoadMostRecentManual: boolean;
  };
  // Plan state: each plan gets its own overrides, dates, tab, etc.
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('plan1');
  const [planStates, setPlanStates] = useState<Record<PlanKey, PlanState>>({
    plan1: {
      manualOverrides: {},
      manualStartDate: null,
      manualEndDate: null,
      manualTab: 'fixed',
      hasManualOverridesForPeriod: false,
      shouldLoadMostRecentManual: false,
    },
    plan2: {
      manualOverrides: {},
      manualStartDate: null,
      manualEndDate: null,
      manualTab: 'fixed',
      hasManualOverridesForPeriod: false,
      shouldLoadMostRecentManual: false,
    },
    plan3: {
      manualOverrides: {},
      manualStartDate: null,
      manualEndDate: null,
      manualTab: 'fixed',
      hasManualOverridesForPeriod: false,
      shouldLoadMostRecentManual: false,
    },
  });

  // Helper to update a plan's state
  const updatePlanState = (plan: PlanKey, changes: Partial<PlanState>) => {
    setPlanStates(prev => ({ ...prev, [plan]: { ...prev[plan], ...changes } }));
  };

  // For convenience, get the current plan's state
  const {
    manualOverrides,
    manualStartDate,
    manualEndDate,
    manualTab,
    hasManualOverridesForPeriod,
    shouldLoadMostRecentManual,
  } = planStates[selectedPlan];

  // All hooks at the very top, before any logic or early return
  const { toast } = useToast();
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<'auto' | 'manual'>('auto');
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

  // --- Plan Tabs State ---
  const PLAN_LABELS = { plan1: 'Plan 1', plan2: 'Plan 2', plan3: 'Plan 3' };

  // Manual overrides state (plan-aware)
  const handleManualChange = useCallback((itemKey: string, value: number | '') => {
    setPlanStates(prev => {
      const prevOverrides = prev[selectedPlan].manualOverrides;
      let newOverrides = { ...prevOverrides };
      if (value === '' || value === null) {
        delete newOverrides[itemKey];
      } else {
        newOverrides[itemKey] = value;
      }
      return {
        ...prev,
        [selectedPlan]: {
          ...prev[selectedPlan],
          manualOverrides: newOverrides
        }
      };
    });
  }, [selectedPlan]);

  // Helper to normalize type from DB to UI prefix
  function normalizeType(type: string): string {
    if (type === 'fixed-expense') return 'fixed';
    if (type === 'variable-expense') return 'variable';
    return type;
  }

  // Fetch manual overrides for the selected period (plan-aware)
  const fetchManualOverrides = useCallback(async () => {
    if (!user?.id || !manualStartDate || !manualEndDate) return;
    if (isNaN(manualStartDate.getTime()) || isNaN(manualEndDate.getTime())) return;
    const paycheckId = `${user.id}-${manualStartDate.toISOString()}-${manualEndDate.toISOString()}-${selectedPlan}`;
    const { data, error } = await supabase
      .from('paycheckoverrides')
      .select('*')
      .eq('user_id', user.id)
      .eq('paycheck_id', paycheckId);
    if (error) {
      console.warn('Error fetching manual overrides:', error);
      updatePlanState(selectedPlan, { manualOverrides: {}, hasManualOverridesForPeriod: false });
      return;
    }
    const overrides: Record<string, number> = {};
    (data || []).forEach((row: any) => {
      const key = `${normalizeType(row.type)}-${row.item_id}`;
      overrides[key] = Number(row.amount);
    });
    updatePlanState(selectedPlan, { manualOverrides: overrides, hasManualOverridesForPeriod: (data || []).length > 0 });
  }, [user?.id, manualStartDate, manualEndDate, selectedPlan]);

  // Always call this useEffect, but only fetch when flag is set
  useEffect(() => {
    if (!shouldLoadMostRecentManual || !user?.id) return;
    (async () => {
      // Only fetch the most recent override for the selected plan
      const { data, error } = await supabase
        .from('paycheckoverrides')
        .select('*')
        .eq('user_id', user.id)
        .like('paycheck_id', `%-${selectedPlan}`)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!error && data && data.length > 0) {
        const row = data[0];
        const isoDateRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g;
        const matches = row.paycheck_id.match(isoDateRegex);
        const startDate = matches && matches[0] ? new Date(matches[0]) : null;
        const endDate = matches && matches[1] ? new Date(matches[1]) : null;
        if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          updatePlanState(selectedPlan, { manualStartDate: startDate, manualEndDate: endDate });
          // Immediately fetch and set manual overrides for these dates
          const paycheckId = `${user.id}-${startDate.toISOString()}-${endDate.toISOString()}-${selectedPlan}`;
          const { data: overrideData, error: overrideError } = await supabase
            .from('paycheckoverrides')
            .select('*')
            .eq('user_id', user.id)
            .eq('paycheck_id', paycheckId);
          if (!overrideError && overrideData) {
            const overrides: Record<string, number> = {};
            (overrideData || []).forEach((row: any) => {
              const key = `${normalizeType(row.type)}-${row.item_id}`;
              overrides[key] = Number(row.amount);
            });
            updatePlanState(selectedPlan, { manualOverrides: overrides });
          }
        } else {
          updatePlanState(selectedPlan, { manualStartDate: null, manualEndDate: null, manualOverrides: {} });
        }
      }
      updatePlanState(selectedPlan, { shouldLoadMostRecentManual: false });
    })();
  }, [shouldLoadMostRecentManual, user?.id, selectedPlan]);

  // When switching to manual tab, set flag to load most recent manual override (plan-aware)
  useEffect(() => {
    if (mainTab === 'manual' && user?.id) {
      updatePlanState(selectedPlan, { shouldLoadMostRecentManual: true });
    }
  }, [mainTab, user?.id, selectedPlan]);

  // When user changes start/end date, fetch overrides (plan-aware)
  useEffect(() => {
    fetchManualOverrides();
  }, [manualStartDate, manualEndDate, user?.id, fetchManualOverrides]);

  // When user changes start/end date (plan-aware)
  const handleManualDateChange = (setter: (date: Date | null) => void, value: Date | null) => {
    setter(value);
    // fetchManualOverrides will be triggered by useEffect
  };

  // Plan-aware setters for date and tab
  const setManualStartDate = (date: Date | null) => {
    updatePlanState(selectedPlan, { manualStartDate: date });
    // Persist to user preferences
    if (user && user.id && date) {
      const planKey = selectedPlan;
      // Always use the latest end date from planStates, or '' if not set
      const endDate = planStates[planKey].manualEndDate;
      const newRanges = { ...(paycheckPreferences.manualPlanDateRanges || {}) };
      newRanges[planKey] = {
        start: date.toISOString(),
        end: endDate ? endDate.toISOString() : ''
      };
      const updated = { ...paycheckPreferences, manualPlanDateRanges: newRanges };
      updateUserPreferences(user.id, { paycheckPreferences: updated });
      setPaycheckPreferences(updated);
    }
  };
  const setManualEndDate = (date: Date | null) => {
    updatePlanState(selectedPlan, { manualEndDate: date });
    // Persist to user preferences
    if (user && user.id && date) {
      const planKey = selectedPlan;
      // Always use the latest start date from planStates, or '' if not set
      const startDate = planStates[planKey].manualStartDate;
      const newRanges = { ...(paycheckPreferences.manualPlanDateRanges || {}) };
      newRanges[planKey] = {
        start: startDate ? startDate.toISOString() : '',
        end: date.toISOString()
      };
      const updated = { ...paycheckPreferences, manualPlanDateRanges: newRanges };
      updateUserPreferences(user.id, { paycheckPreferences: updated });
      setPaycheckPreferences(updated);
    }
  };
  const setManualTab = (tab: string) => updatePlanState(selectedPlan, { manualTab: tab });

  // Save overrides to backend (plan-aware)
  const saveManualOverrides = async () => {
    if (!user?.id || !manualStartDate || !manualEndDate) return;
    if (isNaN(manualStartDate.getTime()) || isNaN(manualEndDate.getTime())) return;
    const paycheckId = `${user.id}-${manualStartDate.toISOString()}-${manualEndDate.toISOString()}-${selectedPlan}`;

    // First, delete all existing overrides for this plan to ensure only one set per plan
    const { error: deleteError } = await supabase
      .from('paycheckoverrides')
      .delete()
      .eq('user_id', user.id)
      .like('paycheck_id', `%-${selectedPlan}`);

    if (deleteError) {
      toast({ title: 'Error', description: `Failed to clear existing ${selectedPlan} overrides: ${deleteError.message}`, variant: 'destructive' });
      return;
    }

    // Build a complete set of overrides for all visible items in each section, using the current input if present, otherwise the default/projected value
    const allOverrideRows: any[] = [];
    // Helper to add overrides for a section
    const addOverrides = (items: any[], prefix: string, minKey?: string) => {
      items.forEach(item => {
        const key = `${prefix}-${item.id}`;
        // Use manual override if present (including 0), otherwise use default/projected value
        let value: number | undefined;
        if (manualOverrides.hasOwnProperty(key)) {
          value = manualOverrides[key];
        } else if (minKey && item[minKey] !== undefined) {
          value = Number(item[minKey]);
        } else if (item.amount !== undefined) {
          value = Number(item.amount);
        } else {
          // fallback: skip if no value can be determined
          return;
        }
        const dashIndex = key.indexOf('-');
        const type = key.substring(0, dashIndex);
        const itemId = key.substring(dashIndex + 1);
        let name = '';
        let itemType = type;
        if (type === 'income') {
          const found = recurringItems.find(i => i.id === itemId);
          name = found?.name || '';
        } else if (type === 'fixed') {
          const found = recurringItems.find(i => i.id === itemId);
          name = found?.name || '';
          itemType = 'fixed';
        } else if (type === 'subscription') {
          const found = recurringItems.find(i => i.id === itemId);
          name = found?.name || '';
          itemType = 'subscription';
        } else if (type === 'variable') {
          const found = variableExpenses.find(i => i.id === itemId);
          name = found?.name || '';
          itemType = 'variable';
        } else if (type === 'debt') {
          const found = debtAccounts.find(i => i.id === itemId);
          name = found?.name || '';
          itemType = 'debt';
        } else if (type === 'goal') {
          const found = goals.find(i => i.id === itemId);
          name = found?.name || '';
          itemType = 'goal';
        }
        allOverrideRows.push({
          paycheck_id: paycheckId,
          user_id: user.id,
          type: itemType,
          item_id: itemId,
          name,
          amount: value,
        });
      });
    };
    // Add overrides for all visible items in each section
    addOverrides(
      recurringItems.filter(item => item.type === 'income' && item.startDate && item.startDate >= manualStartDate && item.startDate <= manualEndDate),
      'income'
    );
    addOverrides(
      recurringItems.filter(item => item.type === 'fixed-expense' && item.startDate && item.startDate <= manualEndDate && (!item.endDate || item.endDate >= manualStartDate) && !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))),
      'fixed'
    );
    addOverrides(
      recurringItems.filter(item => item.type === 'subscription'),
      'subscription'
    );
    addOverrides(
      variableExpenses,
      'variable'
    );
    addOverrides(
      debtAccounts.filter(item => item.createdAt && item.createdAt <= manualEndDate),
      'debt',
      'minimumPayment'
    );
    // For goals, only save if a manual override is present (do not autofill with targetAmount)
    goals.filter(item => item.createdAt && item.createdAt <= manualEndDate).forEach(item => {
      const key = `goal-${item.id}`;
      if (manualOverrides.hasOwnProperty(key)) {
        const value = manualOverrides[key];
        allOverrideRows.push({
          paycheck_id: paycheckId,
          user_id: user.id,
          type: 'goal',
          item_id: item.id,
          name: item.name || '',
          amount: value,
        });
      }
    });

    const { error } = await supabase.from('paycheckoverrides').upsert(allOverrideRows, { onConflict: 'paycheck_id,user_id,item_id' });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Manual overrides saved!' });
      fetchManualOverrides();
    }
  };

  // Revert manual changes (plan-aware)
  const revertManualOverrides = async () => {
    if (!user?.id || !manualStartDate || !manualEndDate) return;
    const paycheckId = `${user.id}-${manualStartDate.toISOString()}-${manualEndDate.toISOString()}-${selectedPlan}`;
    await supabase.from('paycheckoverrides').delete().match({ user_id: user.id, paycheck_id: paycheckId });
    updatePlanState(selectedPlan, { manualOverrides: {} });
    toast({ title: 'Reverted to Auto Mode' });
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        // Fetch user preferences first to get paycheck preferences
        const { preferences } = await getUserPreferences(user.id);
        if (preferences) setUserPreferences(preferences);
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

        const transformedDebtAccounts = debtData?.map(debt => ({
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
        })) || [];

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
      // Use the user's financial tracking start date if available, otherwise default
      const trackingStart = userPreferences?.financialTrackingStartDate
        ? startOfDay(new Date(userPreferences.financialTrackingStartDate))
        : undefined;
      const periods = generatePaycheckPeriods(recurringItems, trackingStart);
      
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
  }, [recurringItems, debtAccounts, variableExpenses, goals, sinkingFunds, paycheckPreferences, actualSpendingData, userPreferences]);

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

  // Categorize breakdowns by timeframe (robust for multiple income sources)
  const categorizeBreakdowns = () => {
    const today = startOfDay(new Date());
    const sorted = [...paycheckBreakdowns].sort((a, b) => new Date(a.period.paycheckDate).getTime() - new Date(b.period.paycheckDate).getTime());
    console.log("First period paycheckDate:", sorted[0]?.period.paycheckDate); // Debug: log first period
    const past: PaycheckBreakdown[] = [];
    const current: PaycheckBreakdown[] = [];
    const future: PaycheckBreakdown[] = [];

    if (sorted.length === 0) return { past, current, future };

    // Get financial tracking start date from preferences (if available)
    const trackingStart = userPreferences?.financialTrackingStartDate
      ? startOfDay(new Date(userPreferences.financialTrackingStartDate))
      : null;

    // Build periods as intervals
    const periods: { start: Date, end: Date | null, breakdowns: PaycheckBreakdown[] }[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const start = startOfDay(new Date(sorted[i].period.paycheckDate));
      const end = i + 1 < sorted.length ? startOfDay(new Date(sorted[i + 1].period.paycheckDate)) : null;
      // Group all breakdowns with the same start date
      const group = sorted.filter(bd => startOfDay(new Date(bd.period.paycheckDate)).getTime() === start.getTime());
      periods.push({ start, end, breakdowns: group });
      // Skip over grouped items
      i += group.length - 1;
    }

    let foundCurrent = false;
    for (let i = 0; i < periods.length; i++) {
      const { start, end, breakdowns } = periods[i];
      // Only consider periods after tracking start date
      if (trackingStart && start < trackingStart) continue;
      if (!foundCurrent && today >= start && (!end || today < end)) {
        // All previous (after trackingStart) are past, this is current, all after are future
        for (let j = 0; j < i; j++) {
          if (!trackingStart || periods[j].start >= trackingStart) {
            past.push(...periods[j].breakdowns);
          }
        }
        current.push(...breakdowns);
        for (let j = i + 1; j < periods.length; j++) future.push(...periods[j].breakdowns);
        foundCurrent = true;
        break;
      }
    }
    // If not found and today is before the first period, all are future
    if (!foundCurrent && today < periods[0].start) {
      for (let j = 0; j < periods.length; j++) future.push(...periods[j].breakdowns);
    }
    // If not found and today is after the last period, last is current, rest are past
    if (!foundCurrent && today >= periods[periods.length - 1].start) {
      for (let j = 0; j < periods.length - 1; j++) {
        if (!trackingStart || periods[j].start >= trackingStart) {
          past.push(...periods[j].breakdowns);
        }
      }
      current.push(...periods[periods.length - 1].breakdowns);
    }
    return { past, current, future };
  };

  const { past, current, future } = categorizeBreakdowns();

  // Only sync selectedPlan from preferences (not allocationMode/mainTab)
  useEffect(() => {
    if (paycheckPreferences.activeManualPlan && PLAN_KEYS.includes(paycheckPreferences.activeManualPlan as PlanKey)) {
      setSelectedPlan(paycheckPreferences.activeManualPlan as PlanKey);
    }
  }, [paycheckPreferences]);

  // Early return logic moved to before main return
  if (isLoading) {
    return (
      <div className="space-y-10">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading paycheck data...</span>
        </div>
      </div>
    );
  }
  if (paycheckBreakdowns.length === 0) {
    return (
      <div className="space-y-10">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No Paycheck Data Available</h3>
          <p className="text-sm text-muted-foreground">
            Add some recurring income items to get started with paycheck planning.
          </p>
        </div>
      </div>
    );
  }

  // Filter and autofill items for manual mode
  const filteredIncome = manualStartDate && manualEndDate
    ? recurringItems.filter(item => item.type === 'income' && item.startDate && item.startDate >= manualStartDate && item.startDate <= manualEndDate)
    : [];
  const filteredFixed = manualStartDate && manualEndDate
    ? recurringItems.filter(item => item.type === 'fixed-expense' && item.startDate && item.startDate <= manualEndDate && (!item.endDate || item.endDate >= manualStartDate))
    : [];
  const filteredSubscriptions = manualStartDate && manualEndDate
    ? recurringItems.filter(item => item.type === 'subscription' && item.startDate && item.startDate <= manualEndDate && (!item.endDate || item.endDate >= manualStartDate))
    : [];
  const filteredVariable = manualStartDate && manualEndDate
    ? variableExpenses.filter(item => item.createdAt && item.createdAt <= manualEndDate && (!item.updatedAt || item.updatedAt >= manualStartDate))
    : [];
  const filteredDebt = manualStartDate && manualEndDate
    ? debtAccounts.filter(item => item.createdAt && item.createdAt <= manualEndDate)
    : [];
  const filteredGoals = manualStartDate && manualEndDate
    ? goals.filter(item => item.createdAt && item.createdAt <= manualEndDate)
    : [];

  return (
    <div className="space-y-10">
      {/* Segmented control for Auto/Manual tab switching */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-lg bg-gray-100 border border-gray-200 overflow-hidden">
          <button
            className={`px-6 py-2 text-sm font-semibold focus:outline-none transition-colors ${mainTab === 'auto' ? 'bg-white text-primary shadow' : 'text-gray-500 hover:bg-gray-200'}`}
            onClick={() => setMainTab('auto')}
            aria-pressed={mainTab === 'auto'}
            type="button"
          >
            Auto
          </button>
          <button
            className={`px-6 py-2 text-sm font-semibold focus:outline-none transition-colors border-l border-gray-200 ${mainTab === 'manual' ? 'bg-white text-primary shadow' : 'text-gray-500 hover:bg-gray-200'}`}
            onClick={() => setMainTab('manual')}
            aria-pressed={mainTab === 'manual'}
            type="button"
          >
            Manual
          </button>
        </div>
      </div>
      {/* Active Plan Toggle (visible on both tabs, directly below tabs) */}
      <div className="flex flex-col items-center mb-4">
        <div className="flex gap-2">
          <Button
            variant={paycheckPreferences.allocationMode === 'auto' ? 'default' : 'outline'}
            onClick={() => {
              setPaycheckPreferences(prev => ({ ...prev, allocationMode: 'auto', activeManualPlan: null }));
              updateUserPreferences(user?.id, { paycheckPreferences: { ...paycheckPreferences, allocationMode: 'auto', activeManualPlan: null } });
            }}
            aria-pressed={paycheckPreferences.allocationMode === 'auto'}
          >
            Auto {paycheckPreferences.allocationMode === 'auto' && <span className="ml-2 text-xs text-green-600 font-semibold">Active</span>}
          </Button>
          <Button
            variant={paycheckPreferences.allocationMode === 'manual' ? 'default' : 'outline'}
            onClick={() => {
              setPaycheckPreferences(prev => ({ ...prev, allocationMode: 'manual', activeManualPlan: selectedPlan }));
              updateUserPreferences(user?.id, { paycheckPreferences: { ...paycheckPreferences, allocationMode: 'manual', activeManualPlan: selectedPlan } });
            }}
            aria-pressed={paycheckPreferences.allocationMode === 'manual'}
          >
            Manual {paycheckPreferences.allocationMode === 'manual' && <span className="ml-2 text-xs text-green-600 font-semibold">Active</span>}
          </Button>
        </div>
        <div className="mt-1 text-xs text-gray-500">Mark which mode is considered the active plan. This affects which allocation is used across the app.</div>
      </div>
      {/* --- Existing content --- */}
      {mainTab === 'auto' && (
        <>
          {/* --- Existing Auto Tab content --- */}
          <div className="space-y-6">
            <div className="flex items-center justify-end">
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
                <PaycheckBreakdownCard 
                  breakdown={{
                    ...current[0],
                    obligatedExpenses: current[0].obligatedExpenses?.filter(
                      (item: any) => !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))
                    ) || current[0].obligatedExpenses
                  }} 
                  isHighlighted={true} 
                />
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
                <PaycheckTimelineView 
                  breakdowns={past.map(bd => ({
                    ...bd,
                    obligatedExpenses: bd.obligatedExpenses?.filter(
                      (item: any) => !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))
                    ) || bd.obligatedExpenses
                  }))} 
                  title="Past Paychecks" 
                />
              </TabsContent>

              <TabsContent value="current" className="space-y-6">
                {/* Show most recent income and breakdown */}
                {current.length > 0 ? (
                  <PaycheckTimelineView 
                    breakdowns={current.map(bd => ({
                      ...bd,
                      obligatedExpenses: bd.obligatedExpenses?.filter(
                        (item: any) => !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))
                      ) || bd.obligatedExpenses
                    }))} 
                    title="Most Recent Paycheck" 
                  />
                ) : (
                  <div className="text-center py-8">
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">No Most Recent Paycheck</h3>
                    <p className="text-sm text-muted-foreground">
                      Your most recent paycheck information will appear here once you receive a paycheck.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="future" className="space-y-6">
                <PaycheckTimelineView 
                  breakdowns={future.map(bd => ({
                    ...bd,
                    obligatedExpenses: bd.obligatedExpenses?.filter(
                      (item: any) => !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))
                    ) || bd.obligatedExpenses
                  }))} 
                  title="Upcoming Paychecks" 
                />
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
      {mainTab === 'manual' && (
        <>
          {/* --- Active Manual Plan Selector --- */}
          {paycheckPreferences.allocationMode === 'manual' && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium text-gray-700">Active Manual Plan:</span>
              {PLAN_KEYS.map(plan => (
                <Button
                  key={plan}
                  variant={paycheckPreferences.activeManualPlan === plan ? 'default' : 'outline'}
                  onClick={() => {
                    setSelectedPlan(plan);
                    setPaycheckPreferences(prev => ({ ...prev, activeManualPlan: plan }));
                    if (user && user.id) {
                      updateUserPreferences(user.id, { paycheckPreferences: { ...paycheckPreferences, activeManualPlan: plan } });
                    }
                  }}
                  className={paycheckPreferences.activeManualPlan === plan ? 'font-bold' : ''}
                  aria-pressed={paycheckPreferences.activeManualPlan === plan}
                >
                  {plan === 'plan1' ? 'Plan 1' : plan === 'plan2' ? 'Plan 2' : 'Plan 3'}
                  {paycheckPreferences.activeManualPlan === plan && (
                    <span className="ml-2 text-xs text-green-600 font-semibold">Active</span>
                  )}
                </Button>
              ))}
            </div>
          )}
          {/* --- Plan Tabs Row --- */}
          <div className="flex gap-2 mb-4">
            {PLAN_KEYS.map(plan => (
              <Button
                key={plan}
                variant={selectedPlan === plan ? 'default' : 'outline'}
                onClick={() => setSelectedPlan(plan)}
                className={selectedPlan === plan ? 'font-bold' : ''}
              >
                {plan === 'plan1' ? 'Plan 1' : plan === 'plan2' ? 'Plan 2' : 'Plan 3'}
              </Button>
            ))}
          </div>
          {/* --- Manual Paycheck Budget Section (plan-aware) --- */}
          <section className="bg-white rounded-xl p-6 shadow space-y-6 border border-gray-200">
            {/* Summary Card */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 bg-gray-50 rounded-lg p-4 border border-gray-100">
              {/* Date selection row styled like screenshot */}
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-2 text-gray-600 font-semibold text-base">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Budget Period
                </span>
                <input
                  type="date"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary-200"
                  value={manualStartDate ? manualStartDate.toISOString().slice(0, 10) : ''}
                  onChange={e => handleManualDateChange(setManualStartDate, e.target.value ? new Date(e.target.value) : null)}
                />
                <span className="text-gray-400 font-semibold">to</span>
                <input
                  type="date"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary-200"
                  value={manualEndDate ? manualEndDate.toISOString().slice(0, 10) : ''}
                  onChange={e => handleManualDateChange(setManualEndDate, e.target.value ? new Date(e.target.value) : null)}
                />
              </div>
              {manualStartDate && manualEndDate && (
                <div className="flex flex-col items-end gap-2">
                  <div className="text-xs text-gray-500 font-semibold">Left to Budget</div>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    {/* Calculate total income for the selected period and render the result directly */}
                    {(() => {
                      // Calculate total income for the selected period
                      const filteredIncome = recurringItems.filter(item => item.type === 'income' && item.startDate && item.startDate >= manualStartDate && item.startDate <= manualEndDate);
                      const totalIncome = getManualTabTotal(filteredIncome, 'income', manualOverrides);
                      // Calculate totals for each section
                      const totalFixed = getManualTabTotal(recurringItems.filter(item => item.type === 'fixed-expense' && item.startDate && item.startDate <= manualEndDate && (!item.endDate || item.endDate >= manualStartDate) && !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))), 'fixed', manualOverrides);
                      const totalVariable = getManualTabTotal(variableExpenses, 'variable', manualOverrides);
                      const totalSubscriptions = getManualTabTotal(recurringItems.filter(item => item.type === 'subscription'), 'subscription', manualOverrides);
                      const totalDebt = getManualTabTotal(debtAccounts.filter(item => item.createdAt && item.createdAt <= manualEndDate), 'debt', manualOverrides, 'minimumPayment');
                      const totalSavings = getManualTabTotal(goals.filter(item => item.createdAt && item.createdAt <= manualEndDate), 'goal', manualOverrides, 'targetAmount', true);
                      const totalAllocated = totalFixed + totalVariable + totalSubscriptions + totalDebt + totalSavings;
                      const leftToBudget = totalIncome - totalAllocated;
                      if (leftToBudget === 0) {
                        return <span className="text-green-600">All Allocated <span className="inline-block w-3 h-3 rounded-full bg-green-400 align-middle"></span></span>;
                      } else if (leftToBudget > 0) {
                        return <span className="text-green-600">${leftToBudget.toLocaleString(undefined, { minimumFractionDigits: 0 })} <span className="inline-block w-3 h-3 rounded-full bg-green-400 align-middle"></span></span>;
                      } else {
                        return <span className="text-red-600">-${Math.abs(leftToBudget).toLocaleString(undefined, { minimumFractionDigits: 0 })} <span className="inline-block w-3 h-3 rounded-full bg-red-400 align-middle"></span></span>;
                      }
                    })()}
                  </div>
                  {/* Category Chips */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold">Income: ${getManualTabTotal(recurringItems.filter(item => item.type === 'income' && item.startDate && item.startDate >= manualStartDate && item.startDate <= manualEndDate), 'income', manualOverrides).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                    <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold">Fixed: ${getManualTabTotal(recurringItems.filter(item => item.type === 'fixed-expense' && item.startDate && item.startDate <= manualEndDate && (!item.endDate || item.endDate >= manualStartDate) && !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))), 'fixed', manualOverrides).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                    <span className="px-2 py-1 rounded bg-purple-100 text-purple-700 text-xs font-semibold">Variable: ${getManualTabTotal(variableExpenses, 'variable', manualOverrides).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                    <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-xs font-semibold">Subscriptions: ${getManualTabTotal(recurringItems.filter(item => item.type === 'subscription'), 'subscription', manualOverrides).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                    <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold">Debt: ${getManualTabTotal(debtAccounts.filter(item => item.createdAt && item.createdAt <= manualEndDate), 'debt', manualOverrides, 'minimumPayment').toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                    <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700 text-xs font-semibold">Savings: ${getManualTabTotal(goals.filter(item => item.createdAt && item.createdAt <= manualEndDate), 'goal', manualOverrides, 'targetAmount', true).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                  </div>
                </div>
              )}
            </div>
            {/* Category Tabs and Card */}
            {manualStartDate && manualEndDate && (
              <>
                <Tabs value={manualTab} onValueChange={setManualTab} className="w-full mb-4">
                  <TabsList className="grid grid-cols-5 mb-4">
                    <TabsTrigger value="fixed">
                      Fixed Expenses
                      <span className="block text-xs text-muted-foreground font-normal">{getManualTabTotal(recurringItems.filter(item => item.type === 'fixed-expense' && item.startDate && item.startDate <= manualEndDate && (!item.endDate || item.endDate >= manualStartDate) && !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))), 'fixed', manualOverrides).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </TabsTrigger>
                    <TabsTrigger value="subscription">
                      Subscriptions
                      <span className="block text-xs text-muted-foreground font-normal">{getManualTabTotal(recurringItems.filter(item => item.type === 'subscription'), 'subscription', manualOverrides).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </TabsTrigger>
                    <TabsTrigger value="variable">
                      Variable Expenses
                      <span className="block text-xs text-muted-foreground font-normal">{getManualTabTotal(variableExpenses, 'variable', manualOverrides).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </TabsTrigger>
                    <TabsTrigger value="debt">
                      Debt
                      <span className="block text-xs text-muted-foreground font-normal">{getManualTabTotal(debtAccounts.filter(item => item.createdAt && item.createdAt <= manualEndDate), 'debt', manualOverrides, 'minimumPayment').toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </TabsTrigger>
                    <TabsTrigger value="goal">
                      Savings Goals
                      <span className="block text-xs text-muted-foreground font-normal">{getManualTabTotal(goals.filter(item => item.createdAt && item.createdAt <= manualEndDate), 'goal', manualOverrides, 'targetAmount', true).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="fixed">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-blue-700 text-lg">Fixed Expenses</span>
                        <span className="font-bold text-blue-700">${getManualTabTotal(recurringItems.filter(item => item.type === 'fixed-expense' && item.startDate && item.startDate <= manualEndDate && (!item.endDate || item.endDate >= manualStartDate) && !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))), 'fixed', manualOverrides).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                      </div>
                      <ManualExpenseTable
                        items={recurringItems.filter(
                          item =>
                            item.type === 'fixed-expense' &&
                            item.startDate && item.startDate <= manualEndDate &&
                            (!item.endDate || item.endDate >= manualStartDate) &&
                            !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))
                        )}
                        prefix="fixed"
                        manualOverrides={manualOverrides}
                        handleManualChange={handleManualChange}
                        showDefaults={true}
                        hasManualOverridesForPeriod={hasManualOverridesForPeriod}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="subscription">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-indigo-700 text-lg">Subscriptions</span>
                        <span className="font-bold text-indigo-700">${getManualTabTotal(recurringItems.filter(item => item.type === 'subscription'), 'subscription', manualOverrides).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                      </div>
                      <ManualExpenseTable
                        items={recurringItems.filter(item => item.type === 'subscription')}
                        prefix="subscription"
                        manualOverrides={manualOverrides}
                        handleManualChange={handleManualChange}
                        showDefaults={true}
                        hasManualOverridesForPeriod={hasManualOverridesForPeriod}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="variable">
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-purple-700 text-lg">Variable Expenses</span>
                        <span className="font-bold text-purple-700">${getManualTabTotal(variableExpenses, 'variable', manualOverrides).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                      </div>
                      <ManualExpenseTable
                        items={variableExpenses}
                        prefix="variable"
                        manualOverrides={manualOverrides}
                        handleManualChange={handleManualChange}
                        showDefaults={true}
                        hasManualOverridesForPeriod={hasManualOverridesForPeriod}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="debt">
                    <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-red-700 text-lg">Debt</span>
                        <span className="font-bold text-red-700">${getManualTabTotal(debtAccounts.filter(item => item.createdAt && item.createdAt <= manualEndDate), 'debt', manualOverrides, 'minimumPayment').toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                      </div>
                      <ManualExpenseTable
                        items={debtAccounts.filter(item => item.createdAt && item.createdAt <= manualEndDate)}
                        prefix="debt"
                        manualOverrides={manualOverrides}
                        handleManualChange={handleManualChange}
                        minKey="minimumPayment"
                        showDefaults={true}
                        hasManualOverridesForPeriod={hasManualOverridesForPeriod}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="goal">
                    <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-yellow-700 text-lg">Savings Goals</span>
                        <span className="font-bold text-yellow-700">${getManualTabTotal(goals.filter(item => item.createdAt && item.createdAt <= manualEndDate), 'goal', manualOverrides, 'targetAmount', true).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                      </div>
                      <ManualExpenseTable
                        items={goals.filter(item => item.createdAt && item.createdAt <= manualEndDate)}
                        prefix="goal"
                        manualOverrides={manualOverrides}
                        handleManualChange={handleManualChange}
                        minKey={undefined} // Do not autofill with targetAmount
                        manualOnly={true}
                        showDefaults={true}
                        hasManualOverridesForPeriod={hasManualOverridesForPeriod}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
            <div className="flex gap-4 mt-6">
              <Button variant="default" onClick={saveManualOverrides}>Save Manual Overrides</Button>
              <Button variant="outline" onClick={revertManualOverrides}>Revert to Auto</Button>
            </div>
          </section>
        </>
      )}
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