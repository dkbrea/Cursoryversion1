"use client";

import type {
    RecurringItem, DebtAccount, BudgetCategory, VariableExpense, FinancialGoal, FinancialGoalWithContribution,
    MonthlyForecast, MonthlyForecastVariableExpense, MonthlyForecastGoalContribution,
    MonthlyForecastIncomeItem, MonthlyForecastFixedExpenseItem, MonthlyForecastSubscriptionItem, MonthlyForecastDebtPaymentItem,
    DebtAccountType
} from "@/types";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { BudgetSummary } from "./budget-summary";
import { VariableExpenseList } from "./variable-expense-list";
import { AddVariableExpenseDialog } from "./add-variable-expense-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BudgetForecastView } from "./budget-forecast-view";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle } from "lucide-react";
import {
  startOfMonth, endOfMonth, isWithinInterval, setDate, addDays, addWeeks,
  addMonths, addQuarters, addYears, getDate, startOfDay, isBefore, isAfter,
  differenceInCalendarMonths, isPast, format, getYear, getMonth, isSameDay
} from "date-fns";
import { saveForecastOverride, getForecastOverridesForMonth } from "@/lib/api/forecast-overrides-v2";

export function BudgetManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [debtAccounts, setDebtAccounts] = useState<DebtAccount[]>([]);
  const [variableExpenses, setVariableExpenses] = useState<VariableExpense[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date()); // Default to current month

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
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
        let variableExpensesData = [];
        let variableExpensesError = null;
        
        try {
          // Try to fetch from the new variable_expenses table first
          const { data, error } = await supabase
            .from('variable_expenses')
            .select('*')
            .eq('user_id', user.id);
            
          if (error) {
            // If there's an error (likely because the table doesn't exist yet), fall back to budget_categories
            console.warn('Failed to fetch from variable_expenses, falling back to budget_categories');
            const { data: legacyData, error: legacyError } = await supabase
              .from('budget_categories')
              .select('*')
              .eq('user_id', user.id);
              
            if (legacyError) throw new Error(legacyError.message);
            
            // Convert legacy data format to new format
            variableExpensesData = legacyData?.map(item => ({
              id: item.id,
              name: item.name,
              category: 'personal', // Default category for legacy data
              amount: item.budgeted_amount,
              user_id: item.user_id,
              created_at: item.created_at,
              updated_at: item.updated_at || item.created_at
            })) || [];
          } else {
            variableExpensesData = data || [];
          }
        } catch (err) {
          variableExpensesError = err;
        }
        
        if (variableExpensesError) throw new Error(variableExpensesError.message);

        // Fetch financial goals
        const { data: goalsData, error: goalsError } = await supabase
          .from('financial_goals')
          .select('*')
          .eq('user_id', user.id);

        if (goalsError) throw new Error(goalsError.message);

        // Transform the data to match our types
        const formattedRecurringItems = recurringData?.map(item => {
          const recurringItem: RecurringItem = {
            id: item.id,
            name: item.name,
            type: item.type,
            amount: item.amount,
            frequency: item.frequency,
            startDate: item.start_date ? new Date(item.start_date) : null,
            lastRenewalDate: item.last_renewal_date ? new Date(item.last_renewal_date) : null,
            endDate: item.end_date ? new Date(item.end_date) : null,
            semiMonthlyFirstPayDate: item.semi_monthly_first_pay_date ? new Date(item.semi_monthly_first_pay_date) : null,
            semiMonthlySecondPayDate: item.semi_monthly_second_pay_date ? new Date(item.semi_monthly_second_pay_date) : null,
            userId: item.user_id,
            createdAt: new Date(item.created_at),
            categoryId: item.category_id || null,
          };
          
          // Only add notes if it exists
          if (item.notes) {
            recurringItem.notes = item.notes;
          }
          
          return recurringItem;
        }) || [];

        const formattedDebtAccounts: DebtAccount[] = debtData?.map(debt => ({
          id: debt.id,
          name: debt.name,
          type: debt.type,
          balance: debt.balance,
          apr: debt.apr,
          minimumPayment: debt.minimum_payment,
          paymentDayOfMonth: debt.payment_day_of_month,
          paymentFrequency: debt.payment_frequency,
          userId: debt.user_id,
          createdAt: new Date(debt.created_at)
        })) || [];

        const formattedVariableExpenses: VariableExpense[] = variableExpensesData?.map(expense => ({
          id: expense.id,
          name: expense.name,
          category: expense.category,
          amount: expense.amount,
          userId: expense.user_id,
          createdAt: new Date(expense.created_at),
          updatedAt: expense.updated_at ? new Date(expense.updated_at) : undefined
        })) || [];

        const formattedGoals: FinancialGoal[] = goalsData?.map(goal => ({
          id: goal.id,
          name: goal.name,
          targetAmount: goal.target_amount,
          currentAmount: goal.current_amount,
          targetDate: new Date(goal.target_date),
          icon: goal.icon,
          userId: goal.user_id,
          createdAt: new Date(goal.created_at)
        })) || [];

        setRecurringItems(formattedRecurringItems);
        setDebtAccounts(formattedDebtAccounts);
        setVariableExpenses(formattedVariableExpenses);
        setGoals(formattedGoals);
      } catch (error) {
        console.error('Error fetching budget data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load budget data.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id, toast]);

  const [currentMonthSummary, setCurrentMonthSummary] = useState({
    totalIncome: 0,
    totalActualFixedExpenses: 0, // 'fixed-expense' type recurring items
    totalSubscriptions: 0,
    totalDebtPayments: 0,
    totalGoalContributions: 0,
  });

  const goalsWithContributions = useMemo((): FinancialGoalWithContribution[] => {
    return goals.map(goal => {
      // Calculate based on the original timeframe between creation and target date
      // This ensures the monthly contribution remains consistent
      const creationDate = startOfDay(new Date(goal.createdAt));
      const targetDate = startOfDay(new Date(goal.targetDate));
      const today = startOfDay(new Date());
      
      // Calculate total months in the goal's timeframe (from creation to target)
      const totalMonthsInGoal = Math.max(1, differenceInCalendarMonths(targetDate, creationDate));
      
      // Calculate current months remaining
      let monthsRemaining = Math.max(0, differenceInCalendarMonths(targetDate, today));
      
      // Calculate the original target amount (when the goal was created)
      const originalTargetAmount = goal.targetAmount;
      
      // Calculate the consistent monthly contribution based on original timeframe
      let monthlyContribution = 0;
      const amountNeeded = goal.targetAmount - goal.currentAmount;
      
      if (amountNeeded <= 0) {
        // Goal already achieved
        monthsRemaining = 0;
        monthlyContribution = 0;
      } else if (isPast(targetDate)) {
        // Past due - show full remaining amount
        monthsRemaining = 0;
        monthlyContribution = amountNeeded;
      } else {
        // Calculate the consistent monthly contribution based on original timeframe
        // This will be the same every month regardless of when we check
        monthlyContribution = originalTargetAmount / totalMonthsInGoal;
        
        // Adjust if the remaining amount is less than the calculated contribution
        if (amountNeeded < monthlyContribution) {
          monthlyContribution = amountNeeded;
        }
      }
      
      return {
        ...goal,
        monthsRemaining: monthsRemaining,
        monthlyContribution: monthlyContribution > 0 ? monthlyContribution : 0,
      };
    }).sort((a,b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  }, [goals]);

  const totalCurrentMonthGoalContributions = useMemo(() => {
    return goalsWithContributions.reduce((sum, goal) => {
      if (goal.currentAmount < goal.targetAmount && goal.monthsRemaining > 0) {
        return sum + goal.monthlyContribution;
      }
      return sum;
    }, 0);
  }, [goalsWithContributions]);

  // Calculate the current month summary
  useEffect(() => {
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const currentMonthEnd = endOfMonth(today);

    let calculatedIncome = 0;
    let calculatedActualFixedExpenses = 0; // Specifically for 'fixed-expense' type
    let calculatedSubscriptions = 0;
    let calculatedDebtPayments = 0;

    recurringItems.forEach(item => {
      if (item.endDate && isBefore(startOfDay(new Date(item.endDate)), currentMonthStart)) return;
      let itemMonthlyTotal = 0;
      if (item.frequency === 'semi-monthly') {
        if (item.semiMonthlyFirstPayDate && isWithinInterval(startOfDay(new Date(item.semiMonthlyFirstPayDate)), { start: currentMonthStart, end: currentMonthEnd })) {
          if (!item.endDate || !isAfter(startOfDay(new Date(item.semiMonthlyFirstPayDate)), startOfDay(new Date(item.endDate)))) itemMonthlyTotal += item.amount;
        }
        if (item.semiMonthlySecondPayDate && isWithinInterval(startOfDay(new Date(item.semiMonthlySecondPayDate)), { start: currentMonthStart, end: currentMonthEnd })) {
          if (!item.endDate || !isAfter(startOfDay(new Date(item.semiMonthlySecondPayDate)), startOfDay(new Date(item.endDate)))) itemMonthlyTotal += item.amount;
        }
      } else {
        let baseIterationDate: Date | null = item.type === 'subscription' ? (item.lastRenewalDate ? startOfDay(new Date(item.lastRenewalDate)) : null) : (item.startDate ? startOfDay(new Date(item.startDate)) : null);
        if (!baseIterationDate || (isAfter(baseIterationDate, currentMonthEnd) && item.type !== 'subscription')) return;

        let tempDate = new Date(baseIterationDate);
        if (item.type === 'subscription') { // For subscriptions, the first occurrence is *after* last renewal
          switch (item.frequency) {
            case "daily": tempDate = addDays(tempDate, 1); break; case "weekly": tempDate = addWeeks(tempDate, 1); break;
            case "bi-weekly": tempDate = addWeeks(tempDate, 2); break; case "monthly": tempDate = addMonths(tempDate, 1); break;
            case "quarterly": tempDate = addQuarters(tempDate, 1); break; case "yearly": tempDate = addYears(tempDate, 1); break;
          }
        }

        while (isBefore(tempDate, currentMonthEnd) || isWithinInterval(tempDate, { start: currentMonthStart, end: currentMonthEnd })) {
          if (item.endDate && isAfter(tempDate, startOfDay(new Date(item.endDate)))) break;
          if (isWithinInterval(tempDate, { start: currentMonthStart, end: currentMonthEnd })) itemMonthlyTotal += item.amount;
          if (isAfter(tempDate, currentMonthEnd) && item.frequency !== 'daily') break;
          switch (item.frequency) {
            case "daily": tempDate = addDays(tempDate, 1); break; case "weekly": tempDate = addWeeks(tempDate, 1); break;
            case "bi-weekly": tempDate = addWeeks(tempDate, 2); break; case "monthly": tempDate = addMonths(tempDate, 1); break;
            case "quarterly": tempDate = addQuarters(tempDate, 1); break; case "yearly": tempDate = addYears(tempDate, 1); break;
            default: tempDate = addYears(tempDate, 100); break;
          }
        }
      }
      if (item.type === 'income') calculatedIncome += itemMonthlyTotal;
      else if (item.type === 'fixed-expense') calculatedActualFixedExpenses += itemMonthlyTotal;
      else if (item.type === 'subscription') calculatedSubscriptions += itemMonthlyTotal;
    });

    debtAccounts.forEach(debt => {
      let debtMonthlyTotal = 0;
      const debtCreationDate = startOfDay(new Date(debt.createdAt));
      // Use nextDueDate if available, otherwise fall back to paymentDayOfMonth
      let checkDate = debt.nextDueDate ? startOfDay(new Date(debt.nextDueDate)) : setDate(currentMonthStart, debt.paymentDayOfMonth || 1);

      // Adjust checkDate if it's before creation or if the day has passed for the creation month.
      if (isBefore(checkDate, debtCreationDate)) {
          if (debt.paymentDayOfMonth) {
              checkDate = setDate(debtCreationDate, debt.paymentDayOfMonth);
              if (isBefore(checkDate, debtCreationDate)) { // If payment day in creation month is still before creation day
                  checkDate = addMonths(setDate(debtCreationDate, debt.paymentDayOfMonth), 1);
              }
          } else {
              // If we don't have paymentDayOfMonth, just use the nextDueDate
              checkDate = startOfDay(new Date(debt.nextDueDate));
          }
      }

      while (isWithinInterval(checkDate, {start: currentMonthStart, end: currentMonthEnd})) {
        // Always include debt payments regardless of creation date for consistent forecasting
        debtMonthlyTotal += debt.minimumPayment;
        // Advance checkDate based on frequency for multiple payments in a month
        let advancedInLoop = false;
        switch (debt.paymentFrequency) {
          case "weekly": checkDate = addWeeks(checkDate, 1); advancedInLoop = true; break;
          case "bi-weekly": checkDate = addWeeks(checkDate, 2); advancedInLoop = true; break;
          case "monthly":
          case "annually":
          case "other":
          default: break;
        }
        if(!advancedInLoop) break;
      }
      calculatedDebtPayments += debtMonthlyTotal;
    });

    setCurrentMonthSummary({
        totalIncome: calculatedIncome,
        totalActualFixedExpenses: calculatedActualFixedExpenses,
        totalSubscriptions: calculatedSubscriptions,
        totalDebtPayments: calculatedDebtPayments,
        totalGoalContributions: totalCurrentMonthGoalContributions,
    });
  }, [recurringItems, debtAccounts, totalCurrentMonthGoalContributions]);

  const [forecastData, setForecastData] = useState<MonthlyForecast[]>([]);

  useEffect(() => {
    const currentYear = getYear(new Date());
    const newForecastData: MonthlyForecast[] = [];

    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const monthDate = startOfMonth(new Date(currentYear, monthIndex, 1));
      const monthStart = startOfDay(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthLabel = format(monthDate, "MMMM yyyy");

      const monthIncomeItems: MonthlyForecastIncomeItem[] = [];
      const monthFixedExpenseItems: MonthlyForecastFixedExpenseItem[] = [];
      const monthSubscriptionItems: MonthlyForecastSubscriptionItem[] = [];
      const monthDebtPaymentItems: MonthlyForecastDebtPaymentItem[] = [];

      recurringItems.forEach(item => {
        // Skip if the item has ended before this month
        if (item.endDate && isBefore(startOfDay(new Date(item.endDate)), monthStart)) return;
        
        let itemAmountInMonth = 0;
        
        // Special handling for income items to ensure they appear in all months of the year
        if (item.type === 'income') {
          // Get the current year's start and end
          const currentYear = getYear(new Date());
          const yearStart = new Date(currentYear, 0, 1); // January 1st
          const yearEnd = new Date(currentYear, 11, 31); // December 31st
          
          // For income items, we want to calculate all occurrences for the entire year
          // and then check if any fall within this month
          
          // First, determine the most recent or next payment date to use as reference
          let referenceDate: Date;
          const today = startOfDay(new Date());
          
          if (item.frequency === 'semi-monthly') {
            // For semi-monthly, use the pattern of days in the month
            const firstPayDay = item.semiMonthlyFirstPayDate ? getDate(new Date(item.semiMonthlyFirstPayDate)) : 15;
            const secondPayDay = item.semiMonthlySecondPayDate ? getDate(new Date(item.semiMonthlySecondPayDate)) : 30;
            
            // Create dates for this month using the same day pattern
            let firstPayDateThisMonth = new Date(monthStart);
            firstPayDateThisMonth.setDate(Math.min(firstPayDay, getDate(monthEnd)));
            
            let secondPayDateThisMonth = new Date(monthStart);
            secondPayDateThisMonth.setDate(Math.min(secondPayDay, getDate(monthEnd)));
            
            // Check if either payment date falls within this month
            // and if the item would be active on these dates
            const itemStartDate = item.startDate ? startOfDay(new Date(item.startDate)) : yearStart;
            const itemEndDate = item.endDate ? startOfDay(new Date(item.endDate)) : null;
            
            // First payment
            if ((!itemStartDate || !isAfter(firstPayDateThisMonth, itemStartDate)) && 
                (!itemEndDate || !isBefore(firstPayDateThisMonth, itemEndDate))) {
              itemAmountInMonth += item.amount;
            }
            
            // Second payment
            if ((!itemStartDate || !isAfter(secondPayDateThisMonth, itemStartDate)) && 
                (!itemEndDate || !isBefore(secondPayDateThisMonth, itemEndDate))) {
              itemAmountInMonth += item.amount;
            }
          } else {
            // For other frequencies, calculate all occurrences in the year
            
            // Start with the item's start date or January 1st of current year
            const startDate = item.startDate ? startOfDay(new Date(item.startDate)) : yearStart;
            
            // Find the first occurrence in the year (or the item's start date if later)
            let firstOccurrence = isAfter(startDate, yearStart) ? startDate : yearStart;
            
            // Calculate all occurrences throughout the year
            let tempDate = new Date(firstOccurrence);
            
            // Move backward to find the most recent occurrence before the year started
            // This helps us establish the pattern for the entire year
            if (isAfter(tempDate, yearStart) && item.frequency !== 'daily') {
              let previousDate = new Date(tempDate);
              
              do {
                tempDate = previousDate;
                previousDate = new Date(tempDate);
                
                switch (item.frequency) {
                  case "daily": previousDate = addDays(previousDate, -1); break;
                  case "weekly": previousDate = addWeeks(previousDate, -1); break;
                  case "bi-weekly": previousDate = addWeeks(previousDate, -2); break;
                  case "monthly": previousDate = addMonths(previousDate, -1); break;
                  case "quarterly": previousDate = addQuarters(previousDate, -1); break;
                  case "yearly": previousDate = addYears(previousDate, -1); break;
                }
              } while (isAfter(previousDate, yearStart));
            }
            
            // Now move forward through the year, checking for occurrences in this month
            while (isBefore(tempDate, yearEnd)) {
              // Check if this occurrence falls within the current month
              if (isWithinInterval(tempDate, { start: monthStart, end: monthEnd })) {
                // Check if the item has ended
                if (!item.endDate || !isBefore(tempDate, startOfDay(new Date(item.endDate)))) {
                  itemAmountInMonth += item.amount;
                }
              }
              
              // Move to next occurrence
              switch (item.frequency) {
                case "daily": tempDate = addDays(tempDate, 1); break;
                case "weekly": tempDate = addWeeks(tempDate, 1); break;
                case "bi-weekly": tempDate = addWeeks(tempDate, 2); break;
                case "monthly": tempDate = addMonths(tempDate, 1); break;
                case "quarterly": tempDate = addQuarters(tempDate, 1); break;
                case "yearly": tempDate = addYears(tempDate, 1); break;
                default: tempDate = addYears(tempDate, 1); break; // Safeguard
              }
            }
          }
          
          // Add to income items if there's an amount for this month
          if (itemAmountInMonth > 0) {
            monthIncomeItems.push({ id: item.id, name: item.name, totalAmountInMonth: itemAmountInMonth });
          }
        } 
        // Handle non-income recurring items (fixed expenses and subscriptions)
        else {
          // Get the current year's start and end
          const currentYear = getYear(new Date());
          const yearStart = new Date(currentYear, 0, 1); // January 1st
          const yearEnd = new Date(currentYear, 11, 31); // December 31st
          
          // Handle semi-monthly items
          if (item.frequency === 'semi-monthly') {
            // For semi-monthly items, we need to calculate the dates for this month
            // based on the pattern established in the item's configuration
            
            // Get the day of month for first and second payments
            let firstPayDay = item.semiMonthlyFirstPayDate ? getDate(new Date(item.semiMonthlyFirstPayDate)) : 15;
            let secondPayDay = item.semiMonthlySecondPayDate ? getDate(new Date(item.semiMonthlySecondPayDate)) : 30;
            
            // Create dates for this month using the same day pattern
            let firstPayDateThisMonth = new Date(monthStart);
            firstPayDateThisMonth.setDate(Math.min(firstPayDay, getDate(monthEnd)));
            
            let secondPayDateThisMonth = new Date(monthStart);
            secondPayDateThisMonth.setDate(Math.min(secondPayDay, getDate(monthEnd)));
            
            // Check if the item would be active on these dates
            const itemStartDate = item.startDate ? startOfDay(new Date(item.startDate)) : yearStart;
            const itemEndDate = item.endDate ? startOfDay(new Date(item.endDate)) : null;
            
            // First payment
            if ((!itemStartDate || !isAfter(firstPayDateThisMonth, itemStartDate)) && 
                (!itemEndDate || !isBefore(firstPayDateThisMonth, itemEndDate))) {
              itemAmountInMonth += item.amount;
            }
            
            // Second payment
            if ((!itemStartDate || !isAfter(secondPayDateThisMonth, itemStartDate)) && 
                (!itemEndDate || !isBefore(secondPayDateThisMonth, itemEndDate))) {
              itemAmountInMonth += item.amount;
            }
          } else {
            // For other frequencies, calculate all occurrences in the year
            
            // Start with the item's start date or January 1st of current year
            let startDate: Date;
            
            if (item.type === 'subscription' && item.lastRenewalDate) {
              // For subscriptions, use last renewal date
              startDate = startOfDay(new Date(item.lastRenewalDate));
              
              // Adjust for subscription first occurrence
              switch (item.frequency) {
                case "daily": startDate = addDays(startDate, 1); break;
                case "weekly": startDate = addWeeks(startDate, 1); break;
                case "bi-weekly": startDate = addWeeks(startDate, 2); break;
                case "monthly": startDate = addMonths(startDate, 1); break;
                case "quarterly": startDate = addQuarters(startDate, 1); break;
                case "yearly": startDate = addYears(startDate, 1); break;
              }
            } else if (item.startDate) {
              // Use the item's start date
              startDate = startOfDay(new Date(item.startDate));
            } else {
              // Default to the first day of the current year
              startDate = yearStart;
            }
            
            // Find the first occurrence in the year (or the item's start date if later)
            let firstOccurrence = isAfter(startDate, yearStart) ? startDate : yearStart;
            
            // Calculate all occurrences throughout the year
            let tempDate = new Date(firstOccurrence);
            
            // Move backward to find the most recent occurrence before the year started
            // This helps us establish the pattern for the entire year
            if (isAfter(tempDate, yearStart) && item.frequency !== 'daily') {
              let previousDate = new Date(tempDate);
              
              do {
                tempDate = previousDate;
                previousDate = new Date(tempDate);
                
                switch (item.frequency) {
                  case "daily": previousDate = addDays(previousDate, -1); break;
                  case "weekly": previousDate = addWeeks(previousDate, -1); break;
                  case "bi-weekly": previousDate = addWeeks(previousDate, -2); break;
                  case "monthly": previousDate = addMonths(previousDate, -1); break;
                  case "quarterly": previousDate = addQuarters(previousDate, -1); break;
                  case "yearly": previousDate = addYears(previousDate, -1); break;
                }
              } while (isAfter(previousDate, yearStart));
            }
            
            // Now move forward through the year, checking for occurrences in this month
            while (isBefore(tempDate, yearEnd)) {
              // Check if this occurrence falls within the current month
              if (isWithinInterval(tempDate, { start: monthStart, end: monthEnd })) {
                // Check if the item has ended
                if (!item.endDate || !isBefore(tempDate, startOfDay(new Date(item.endDate)))) {
                  itemAmountInMonth += item.amount;
                }
              }
              
              // Move to next occurrence
              switch (item.frequency) {
                case "daily": tempDate = addDays(tempDate, 1); break;
                case "weekly": tempDate = addWeeks(tempDate, 1); break;
                case "bi-weekly": tempDate = addWeeks(tempDate, 2); break;
                case "monthly": tempDate = addMonths(tempDate, 1); break;
                case "quarterly": tempDate = addQuarters(tempDate, 1); break;
                case "yearly": tempDate = addYears(tempDate, 1); break;
                default: tempDate = addYears(tempDate, 1); break; // Safeguard
              }
            }
          }
          
          // Add to the appropriate list if there's an amount for this month
          if (itemAmountInMonth > 0) {
            if (item.type === 'fixed-expense') {
              monthFixedExpenseItems.push({ id: item.id, name: item.name, totalAmountInMonth: itemAmountInMonth, categoryId: item.categoryId });
            } else if (item.type === 'subscription') {
              monthSubscriptionItems.push({ id: item.id, name: item.name, totalAmountInMonth: itemAmountInMonth, categoryId: item.categoryId });
            }
          }
        }
      });

      debtAccounts.forEach(debt => {
        // Calculate debt payments for this month based on payment frequency and day of month
        let debtAmountInMonth = 0;
        
        // Get reference dates
        const debtCreationDate = startOfDay(new Date(debt.createdAt));
        const paymentDay = debt.paymentDayOfMonth;
        const nextDueDate = debt.nextDueDate ? startOfDay(new Date(debt.nextDueDate)) : null;
        
        // Get the current year's start and end
        const currentYear = getYear(new Date());
        const yearStart = new Date(currentYear, 0, 1); // January 1st
        const yearEnd = new Date(currentYear, 11, 31); // December 31st
        
        // For budget forecasting, we want to show debt payments for all months of the year
        // This provides a more accurate and consistent view of finances
        
        // Create a consistent pattern of payments based on the debt's configuration
        switch (debt.paymentFrequency) {
          case "weekly":
          case "bi-weekly": {
            // For weekly/bi-weekly payments, calculate based on a consistent pattern
            // Start from the creation date and find the first payment date
            let firstPaymentDate;
            
            // Use nextDueDate if available, otherwise calculate based on paymentDay
            if (nextDueDate) {
              firstPaymentDate = new Date(nextDueDate);
            } else {
              firstPaymentDate = new Date(debtCreationDate);
              
              // Adjust to the payment day if needed
              if (paymentDay && getDate(firstPaymentDate) !== paymentDay) {
                // Find the next occurrence of the payment day
                while (getDate(firstPaymentDate) !== paymentDay) {
                  firstPaymentDate = addDays(firstPaymentDate, 1);
                }
              }
            }
            
            // Now calculate all occurrences for the entire year
            let tempDate = new Date(firstPaymentDate);
            
            // Move backward to find the most recent occurrence before the year started
            // This helps us establish the pattern for the entire year
            if (isAfter(tempDate, yearStart) && debt.paymentFrequency !== 'daily') {
              let previousDate = new Date(tempDate);
              
              do {
                tempDate = previousDate;
                previousDate = new Date(tempDate);
                
                if (debt.paymentFrequency === "weekly") {
                  previousDate = addWeeks(previousDate, -1);
                } else { // bi-weekly
                  previousDate = addWeeks(previousDate, -2);
                }
              } while (isAfter(previousDate, yearStart));
            }
            
            // Now move forward through the year, checking for occurrences in this month
            while (isBefore(tempDate, yearEnd)) {
              // Check if this occurrence falls within the current month
              if (isWithinInterval(tempDate, { start: monthStart, end: monthEnd })) {
                debtAmountInMonth += debt.minimumPayment;
              }
              
              // Move to next payment date
              if (debt.paymentFrequency === "weekly") {
                tempDate = addWeeks(tempDate, 1);
              } else { // bi-weekly
                tempDate = addWeeks(tempDate, 2);
              }
            }
            break;
          }
          
          case "monthly": {
            // For monthly payments, calculate all occurrences for the entire year
            
            // Find the first payment date in the year or after debt creation
            let firstPaymentDate: Date;
            
            // Use nextDueDate if available, otherwise calculate based on paymentDay
            if (nextDueDate) {
              firstPaymentDate = new Date(nextDueDate);
            } else if (paymentDay) {
              // If debt was created this year, start from creation date
              if (isAfter(debtCreationDate, yearStart) || isSameDay(debtCreationDate, yearStart)) {
                firstPaymentDate = new Date(debtCreationDate);
                // Adjust to the payment day
                firstPaymentDate.setDate(paymentDay);
                // If we've already passed this day in the month, move to next month
                if (isBefore(firstPaymentDate, debtCreationDate)) {
                  firstPaymentDate = addMonths(firstPaymentDate, 1);
                }
              } else {
                // Debt existed before this year, start from January with the payment day
                firstPaymentDate = new Date(yearStart);
                firstPaymentDate.setDate(Math.min(paymentDay, 31)); // Handle edge cases like 31st
              }
            } else {
              // Fallback if neither nextDueDate nor paymentDay is available
              firstPaymentDate = new Date(debtCreationDate);
            }
            
            // Now calculate all monthly payments for the year
            let tempDate = new Date(firstPaymentDate);
            
            // Move backward to January if needed to establish pattern
            while (isAfter(tempDate, yearStart)) {
              const prevMonth = addMonths(tempDate, -1);
              if (isBefore(prevMonth, yearStart)) break;
              tempDate = prevMonth;
            }
            
            // Now move forward through the year
            while (isBefore(tempDate, yearEnd)) {
              // Check if this payment falls in the current month
              if (isWithinInterval(tempDate, { start: monthStart, end: monthEnd })) {
                // Show debt payments for all months of the year, regardless of creation date
                // This ensures consistent budget forecasting across the entire year
                debtAmountInMonth += debt.minimumPayment;
              }
              
              // Move to next month's payment
              tempDate = addMonths(tempDate, 1);
              // Adjust for months with fewer days
              if (getDate(tempDate) !== paymentDay) {
                tempDate.setDate(Math.min(paymentDay, getDate(endOfMonth(tempDate))));
              }
            }
            break;
          }
          
          case "annually": {
            // For annual payments, check all months in the year
            for (let month = 0; month < 12; month++) {
              // If this is the month we're forecasting
              if (getMonth(monthStart) === month) {
                // Get the payment date for this month/year
                const paymentDateThisYear = new Date(currentYear, month, Math.min(paymentDay, getDate(endOfMonth(new Date(currentYear, month)))));
                
                // Show debt payments for all months of the year, regardless of creation date
                // This ensures consistent budget forecasting across the entire year
                if (isWithinInterval(paymentDateThisYear, { start: monthStart, end: monthEnd })) {
                  debtAmountInMonth += debt.minimumPayment;
                }
              }
            }
            break;
          }
          
          case "other":
          default: {
            // For other payment frequencies, assume monthly for simplicity
            // and use the same approach as monthly payments
            
            // Find the first payment date in the year or after debt creation
            let firstPaymentDate: Date;
            
            // If debt was created this year, start from creation date
            if (isAfter(debtCreationDate, yearStart) || isSameDay(debtCreationDate, yearStart)) {
              firstPaymentDate = new Date(debtCreationDate);
              // Adjust to the payment day
              firstPaymentDate.setDate(paymentDay);
              // If we've already passed this day in the month, move to next month
              if (isBefore(firstPaymentDate, debtCreationDate)) {
                firstPaymentDate = addMonths(firstPaymentDate, 1);
              }
            } else {
              // Debt existed before this year, start from January with the payment day
              firstPaymentDate = new Date(yearStart);
              firstPaymentDate.setDate(Math.min(paymentDay, 31)); // Handle edge cases like 31st
            }
            
            // Now calculate all monthly payments for the year
            let tempDate = new Date(firstPaymentDate);
            
            // Move backward to January if needed to establish pattern
            while (isAfter(tempDate, yearStart)) {
              const prevMonth = addMonths(tempDate, -1);
              if (isBefore(prevMonth, yearStart)) break;
              tempDate = prevMonth;
            }
            
            // Now move forward through the year
            while (isBefore(tempDate, yearEnd)) {
              // Check if this payment falls in the current month
              if (isWithinInterval(tempDate, { start: monthStart, end: monthEnd })) {
                // Show debt payments for all months of the year, regardless of creation date
                // This ensures consistent budget forecasting across the entire year
                debtAmountInMonth += debt.minimumPayment;
              }
              
              // Move to next month's payment
              tempDate = addMonths(tempDate, 1);
              // Adjust for months with fewer days
              if (getDate(tempDate) !== paymentDay) {
                tempDate.setDate(Math.min(paymentDay, getDate(endOfMonth(tempDate))));
              }
            }
            break;
          }
        }
        
        // Add to the forecast if there's a payment this month
        if (debtAmountInMonth > 0) {
          monthDebtPaymentItems.push({
            id: debt.id,
            name: debt.name,
            totalAmountInMonth: debtAmountInMonth,
            debtType: debt.type,
            additionalPayment: 0 // Initialize additional payment to 0
          });
        }
      });

      const totalMonthIncome = monthIncomeItems.reduce((sum, item) => sum + item.totalAmountInMonth, 0);
      const totalMonthFixedExpenses = monthFixedExpenseItems.reduce((sum, item) => sum + item.totalAmountInMonth, 0);
      const totalMonthSubscriptions = monthSubscriptionItems.reduce((sum, item) => sum + item.totalAmountInMonth, 0);
      const totalMonthDebtMinimumPayments = monthDebtPaymentItems.reduce((sum, item) => sum + item.totalAmountInMonth, 0);

      const forecastVariableExpenses: MonthlyForecastVariableExpense[] = variableExpenses.map(vc => ({
        id: vc.id,
        name: vc.name,
        monthSpecificAmount: vc.amount, // Initialize with default
      }));
      const monthTotalVariableExpenses = forecastVariableExpenses.reduce((sum, ve) => sum + ve.monthSpecificAmount, 0);

      const forecastGoalContributions: MonthlyForecastGoalContribution[] = goalsWithContributions
        .filter(goal => goal.currentAmount < goal.targetAmount) // Only active goals
        .map(goal => {
            const targetDate = startOfDay(new Date(goal.targetDate));
            
            // Use the consistent monthly contribution calculated earlier
            // This ensures the same amount is shown for each month
            let contribution = goal.monthlyContribution;
            
            // Only include contributions for months before or equal to the target date
            if (isAfter(monthStart, targetDate)) {
                contribution = 0;
            }
            
            return {
                id: goal.id,
                name: goal.name,
                monthSpecificContribution: contribution > 0 ? parseFloat(contribution.toFixed(2)) : 0,
            };
      }).filter(gc => gc.monthSpecificContribution > 0); // Only include if there's a contribution

      const monthTotalGoalContributions = forecastGoalContributions.reduce((sum, gc) => sum + gc.monthSpecificContribution, 0);
      const monthTotalAdditionalDebtPayments = monthDebtPaymentItems.reduce((sum, debt) => sum + (debt.additionalPayment || 0), 0);

      const remainingToBudget = totalMonthIncome - (totalMonthFixedExpenses + totalMonthSubscriptions + totalMonthDebtMinimumPayments + monthTotalAdditionalDebtPayments + monthTotalVariableExpenses + monthTotalGoalContributions);

      newForecastData.push({
        month: monthDate,
        monthLabel,
        incomeItems: monthIncomeItems,
        fixedExpenseItems: monthFixedExpenseItems,
        subscriptionItems: monthSubscriptionItems,
        debtPaymentItems: monthDebtPaymentItems,
        totalIncome: totalMonthIncome,
        totalFixedExpenses: totalMonthFixedExpenses,
        totalSubscriptions: totalMonthSubscriptions,
        totalDebtMinimumPayments: totalMonthDebtMinimumPayments,
        variableExpenses: forecastVariableExpenses,
        totalVariableExpenses: monthTotalVariableExpenses,
        goalContributions: forecastGoalContributions,
        totalGoalContributions: monthTotalGoalContributions,
        remainingToBudget: remainingToBudget,
        isBalanced: Math.abs(remainingToBudget) < 0.01, // Check if close to zero
      });
    }
    
    // Load existing overrides and apply them to the forecast data
    const loadOverridesAndSetForecast = async () => {
      if (!user?.id) {
        setForecastData(newForecastData);
        return;
      }

      try {
        // Load overrides for each month
        const updatedForecastData = [...newForecastData];
        
        for (let monthIndex = 0; monthIndex < newForecastData.length; monthIndex++) {
          const monthData = newForecastData[monthIndex];
          const monthYear = format(monthData.month, 'yyyy-MM');
          
          const { overrides, error } = await getForecastOverridesForMonth(user.id, monthYear);
          
          if (error) {
            console.error(`Error loading overrides for ${monthYear}:`, error);
            continue;
          }
          
          if (overrides && Object.keys(overrides).length > 0) {
            // Apply overrides to variable expenses
            const updatedVariableExpenses = monthData.variableExpenses.map(ve => {
              const override = overrides[ve.id];
              return override !== undefined 
                ? { ...ve, monthSpecificAmount: override }
                : ve;
            });
            
            // Apply overrides to goal contributions
            const updatedGoalContributions = monthData.goalContributions.map(gc => {
              const override = overrides[gc.id];
              return override !== undefined 
                ? { ...gc, monthSpecificContribution: override }
                : gc;
            });
            
            // Apply overrides to debt additional payments
            const updatedDebtPayments = monthData.debtPaymentItems.map(dp => {
              const override = overrides[dp.id];
              return override !== undefined 
                ? { ...dp, additionalPayment: override }
                : dp;
            });
            
            // Recalculate totals
            const newTotalVariableExpenses = updatedVariableExpenses.reduce(
              (sum, ve) => sum + ve.monthSpecificAmount, 0
            );
            const newTotalGoalContributions = updatedGoalContributions.reduce(
              (sum, gc) => sum + gc.monthSpecificContribution, 0
            );
            const newTotalAdditionalDebtPayments = updatedDebtPayments.reduce(
              (sum, dp) => sum + (dp.additionalPayment || 0), 0
            );
            
            const newRemainingToBudget = monthData.totalIncome - (
              monthData.totalFixedExpenses +
              monthData.totalSubscriptions +
              monthData.totalDebtMinimumPayments +
              newTotalAdditionalDebtPayments +
              newTotalVariableExpenses +
              newTotalGoalContributions
            );
            
            // Update the month data
            updatedForecastData[monthIndex] = {
              ...monthData,
              variableExpenses: updatedVariableExpenses,
              totalVariableExpenses: newTotalVariableExpenses,
              goalContributions: updatedGoalContributions,
              totalGoalContributions: newTotalGoalContributions,
              debtPaymentItems: updatedDebtPayments,
              remainingToBudget: newRemainingToBudget,
              isBalanced: Math.abs(newRemainingToBudget) < 0.01
            };
          }
        }
        
        setForecastData(updatedForecastData);
      } catch (error) {
        console.error('Error loading forecast overrides:', error);
        // Fall back to setting forecast data without overrides
        setForecastData(newForecastData);
      }
    };
    
    loadOverridesAndSetForecast();
  }, [recurringItems, debtAccounts, variableExpenses, goals, goalsWithContributions, user?.id]);

  const totalBudgetedVariable = useMemo(() => {
    return variableExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [variableExpenses]);

  const handleAddVariableExpense = async (expenseData: Omit<VariableExpense, "id" | "userId" | "createdAt" | "updatedAt">) => {
    if (!user?.id) return;

    try {
      // Try to insert into the new variable_expenses table
      try {
        const { data, error } = await supabase
          .from('variable_expenses')
          .insert({
            name: expenseData.name,
            category: expenseData.category,
            amount: expenseData.amount,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;

        const newExpense: VariableExpense = {
          id: data.id,
          name: data.name,
          category: data.category,
          amount: data.amount,
          userId: data.user_id,
          createdAt: new Date(data.created_at),
          updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
        };

        setVariableExpenses(prev => [...prev, newExpense]);
        toast({
          title: "Variable Expense Added",
          description: `Variable expense "${newExpense.name}" has been added.`,
        });
        return;
      } catch (err) {
        // If the variable_expenses table doesn't exist, fall back to budget_categories
        console.warn('Failed to insert into variable_expenses, falling back to budget_categories');
        const { data, error } = await supabase
          .from('budget_categories')
          .insert({
            name: expenseData.name,
            budgeted_amount: expenseData.amount,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;

        const newExpense: VariableExpense = {
          id: data.id,
          name: data.name,
          category: expenseData.category,
          amount: data.budgeted_amount,
          userId: data.user_id,
          createdAt: new Date(data.created_at)
        };

        setVariableExpenses(prev => [...prev, newExpense]);
        toast({
          title: "Variable Expense Added",
          description: `Variable expense "${newExpense.name}" has been added.`,
        });
      }
    } catch (error: any) {
      console.error("Error adding variable expense:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add variable expense.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateVariableExpenseAmount = async (expenseId: string, newAmount: number) => {
    // Update the variable expense amount in the main state
    setVariableExpenses(prev => prev.map(expense => 
      expense.id === expenseId ? { ...expense, amount: newAmount } : expense
    ));
    
    // Also update this expense in all months of the forecast data
    // This ensures changes in the current month view propagate to the forecast
    setForecastData(prevForecast => {
      if (prevForecast.length === 0) return prevForecast;
      
      return prevForecast.map(month => {
        // Find and update the specific variable expense
        const updatedVariableExpenses = month.variableExpenses.map(ve =>
          ve.id === expenseId ? { ...ve, monthSpecificAmount: newAmount } : ve
        );
        
        // Recalculate the total variable expenses
        const newTotalVariableExpenses = updatedVariableExpenses.reduce(
          (sum, ve) => sum + ve.monthSpecificAmount, 0
        );
        
        // Recalculate remaining to budget
        const newRemainingToBudget = month.totalIncome - (
          month.totalFixedExpenses +
          month.totalSubscriptions +
          month.totalDebtMinimumPayments +
          month.debtPaymentItems.reduce((sum, debt) => sum + (debt.additionalPayment || 0), 0) +
          newTotalVariableExpenses +
          month.totalGoalContributions
        );
        
        // Return the updated month data
        return {
          ...month,
          variableExpenses: updatedVariableExpenses,
          totalVariableExpenses: newTotalVariableExpenses,
          remainingToBudget: newRemainingToBudget,
          isBalanced: Math.abs(newRemainingToBudget) < 0.01
        };
      });
    });

    // Save override for the selected month to persist the change
    if (user?.id) {
      try {
        const result = await saveForecastOverride(
          user.id,
          expenseId,
          format(selectedMonth, 'yyyy-MM'),
          newAmount,
          'variable-expense'
        );

        if (!result.success) {
          console.error('Failed to save forecast override:', result.error);
        }
      } catch (error) {
        console.error('Error saving forecast override:', error);
      }
    }
  };

  const handleDeleteVariableExpense = (expenseId: string) => {
    const expenseToDelete = variableExpenses.find(expense => expense.id === expenseId);
    setVariableExpenses(prev => prev.filter(expense => expense.id !== expenseId));
    if (expenseToDelete) {
        toast({ title: "Variable Expense Deleted", description: `"${expenseToDelete.name}" removed.`, variant: "destructive" });
    }
  };
  
  // Function to get data for the selected month from forecast data
  const getSelectedMonthData = () => {
    // If forecast data is not yet loaded, return current month summary
    if (forecastData.length === 0) {
      return {
        totalIncome: currentMonthSummary.totalIncome,
        totalFixedExpenses: currentMonthSummary.totalActualFixedExpenses,
        totalSubscriptions: currentMonthSummary.totalSubscriptions,
        totalDebtMinimumPayments: currentMonthSummary.totalDebtPayments,
        totalGoalContributions: currentMonthSummary.totalGoalContributions,
        totalVariableExpenses: totalBudgetedVariable,
      };
    }
    
    // Find the selected month in forecast data
    const selectedMonthStr = format(selectedMonth, 'yyyy-MM');
    const selectedMonthData = forecastData.find(month => 
      format(month.month, 'yyyy-MM') === selectedMonthStr
    );
    
    // If found, return that month's data
    if (selectedMonthData) {
      return selectedMonthData;
    }
    
    // If not found (e.g., selected month is outside forecast range),
    // return data for the closest month in the forecast
    const currentMonthIndex = getMonth(new Date());
    const currentYearMonthStr = format(new Date(), 'yyyy-MM');
    const currentMonthForecast = forecastData.find(month => 
      format(month.month, 'yyyy-MM') === currentYearMonthStr
    ) || forecastData[0];
    
    return currentMonthForecast;
  };

  const updateForecastMonth = (monthIndex: number, updatedMonthData: Partial<MonthlyForecast>) => {
    setForecastData(prevData => {
        const newData = [...prevData];
        const currentMonth = {...newData[monthIndex], ...updatedMonthData};

        // Recalculate totals and remaining for the specific month
        currentMonth.totalVariableExpenses = currentMonth.variableExpenses.reduce((sum, ve) => sum + ve.monthSpecificAmount, 0);
        currentMonth.totalGoalContributions = currentMonth.goalContributions.reduce((sum, gc) => sum + gc.monthSpecificContribution, 0);
        const totalAdditionalDebtPayments = currentMonth.debtPaymentItems.reduce((sum, debt) => sum + (debt.additionalPayment || 0), 0);

        currentMonth.remainingToBudget = currentMonth.totalIncome - (
            currentMonth.totalFixedExpenses +
            currentMonth.totalSubscriptions +
            currentMonth.totalDebtMinimumPayments +
            totalAdditionalDebtPayments +
            currentMonth.totalVariableExpenses +
            currentMonth.totalGoalContributions
        );
        currentMonth.isBalanced = Math.abs(currentMonth.remainingToBudget) < 0.01;

        newData[monthIndex] = currentMonth;
        return newData;
    });
  };

  const handleUpdateForecastVariableAmount = async (monthIndex: number, expenseId: string, newAmount: number) => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    try {
      // Update local state immediately for responsive UI
      setForecastData(prev => {
        if (!prev || prev.length === 0 || monthIndex >= prev.length) return prev;
        
        return prev.map((monthData, index) => {
          if (index !== monthIndex) return monthData;
          
          // Update the variable expenses for this month
          const updatedVariableExpenses = monthData.variableExpenses.map(expense =>
            expense.id === expenseId ? { ...expense, monthSpecificAmount: newAmount } : expense
          );
          
          // Recalculate totals
          const newTotalVariableExpenses = updatedVariableExpenses.reduce(
            (sum, ve) => sum + ve.monthSpecificAmount, 0
          );
          
          const newRemainingToBudget = monthData.totalIncome - (
            monthData.totalFixedExpenses +
            monthData.totalSubscriptions +
            monthData.totalDebtMinimumPayments +
            monthData.debtPaymentItems.reduce((sum, debt) => sum + (debt.additionalPayment || 0), 0) +
            newTotalVariableExpenses +
            monthData.totalGoalContributions
          );
          
          return {
            ...monthData,
            variableExpenses: updatedVariableExpenses,
            totalVariableExpenses: newTotalVariableExpenses,
            remainingToBudget: newRemainingToBudget,
            isBalanced: Math.abs(newRemainingToBudget) < 0.01
          };
        });
      });

      // Save override to database/localStorage
      const monthToUpdate = forecastData[monthIndex];
      if (monthToUpdate) {
        const result = await saveForecastOverride(
          user.id,
          expenseId,
          format(monthToUpdate.month, 'yyyy-MM'),
          newAmount,
          'variable-expense'
        );

        if (!result.success) {
          console.error('Failed to save forecast override:', result.error);
          // Could show a toast notification here
        }
      }
    } catch (error) {
      console.error('Error updating forecast variable amount:', error);
    }
  };

  const handleUpdateForecastGoalContribution = async (monthIndex: number, goalId: string, newAmount: number) => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    try {
      // Update local state immediately
      setForecastData(prev => {
        if (!prev || prev.length === 0 || monthIndex >= prev.length) return prev;
        
        return prev.map((monthData, index) => {
          if (index !== monthIndex) return monthData;
          
          // Update the goal contributions for this month
          const updatedGoalContributions = monthData.goalContributions.map(goal =>
            goal.id === goalId ? { ...goal, monthSpecificContribution: newAmount } : goal
          );
          
          // Recalculate totals
          const newTotalGoalContributions = updatedGoalContributions.reduce(
            (sum, gc) => sum + gc.monthSpecificContribution, 0
          );
          
          const newRemainingToBudget = monthData.totalIncome - (
            monthData.totalFixedExpenses +
            monthData.totalSubscriptions +
            monthData.totalDebtMinimumPayments +
            monthData.debtPaymentItems.reduce((sum, debt) => sum + (debt.additionalPayment || 0), 0) +
            monthData.totalVariableExpenses +
            newTotalGoalContributions
          );
          
          return {
            ...monthData,
            goalContributions: updatedGoalContributions,
            totalGoalContributions: newTotalGoalContributions,
            remainingToBudget: newRemainingToBudget,
            isBalanced: Math.abs(newRemainingToBudget) < 0.01
          };
        });
      });

      // Save override to database/localStorage
      const monthToUpdate = forecastData[monthIndex];
      if (monthToUpdate) {
        const result = await saveForecastOverride(
          user.id,
          goalId,
          format(monthToUpdate.month, 'yyyy-MM'),
          newAmount,
          'goal-contribution'
        );

        if (!result.success) {
          console.error('Failed to save forecast override:', result.error);
        }
      }
    } catch (error) {
      console.error('Error updating forecast goal contribution:', error);
    }
  };

  const handleUpdateForecastDebtAdditionalPayment = async (monthIndex: number, debtId: string, newAmount: number) => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    try {
      // Update local state immediately
      setForecastData(prev => {
        if (!prev || prev.length === 0 || monthIndex >= prev.length) return prev;
        
        return prev.map((monthData, index) => {
          if (index !== monthIndex) return monthData;
          
          // Update the debt payments for this month
          const updatedDebtPayments = monthData.debtPaymentItems.map(debt =>
            debt.id === debtId ? { ...debt, additionalPayment: newAmount } : debt
          );
          
          // Recalculate totals
          const newTotalAdditionalDebtPayments = updatedDebtPayments.reduce(
            (sum, debt) => sum + (debt.additionalPayment || 0), 0
          );
          
          const newRemainingToBudget = monthData.totalIncome - (
            monthData.totalFixedExpenses +
            monthData.totalSubscriptions +
            monthData.totalDebtMinimumPayments +
            newTotalAdditionalDebtPayments +
            monthData.totalVariableExpenses +
            monthData.totalGoalContributions
          );
          
          return {
            ...monthData,
            debtPaymentItems: updatedDebtPayments,
            remainingToBudget: newRemainingToBudget,
            isBalanced: Math.abs(newRemainingToBudget) < 0.01
          };
        });
      });

      // Save override to database/localStorage
      const monthToUpdate = forecastData[monthIndex];
      if (monthToUpdate) {
        const result = await saveForecastOverride(
          user.id,
          debtId,
          format(monthToUpdate.month, 'yyyy-MM'),
          newAmount,
          'debt-additional-payment'
        );

        if (!result.success) {
          console.error('Failed to save forecast override:', result.error);
        }
      }
    } catch (error) {
      console.error('Error updating forecast debt payment:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading budget data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="currentMonth" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] mb-6">
          <TabsTrigger value="currentMonth">Current Month Budget</TabsTrigger>
          <TabsTrigger value="forecast">12-Month Forecast</TabsTrigger>
        </TabsList>
        <TabsContent value="currentMonth">
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Budget for {format(selectedMonth, 'MMMM yyyy')}</h2>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedMonth(new Date())}
                  className={format(selectedMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM') ? 'bg-primary/10' : ''}
                >
                  Current Month
                </Button>
                <select 
                  className="border rounded p-1 text-sm" 
                  value={format(selectedMonth, 'yyyy-MM')}
                  onChange={(e) => {
                    const [year, month] = e.target.value.split('-').map(Number);
                    setSelectedMonth(new Date(year, month - 1, 1));
                  }}
                >
                  {forecastData && forecastData.map((month) => (
                    <option key={format(month.month, 'yyyy-MM')} value={format(month.month, 'yyyy-MM')}>
                      {format(month.month, 'MMMM yyyy')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <BudgetSummary
            totalIncome={getSelectedMonthData().totalIncome}
            totalActualFixedExpenses={getSelectedMonthData().totalFixedExpenses}
            totalSubscriptions={getSelectedMonthData().totalSubscriptions}
            totalDebtPayments={(() => {
              const selectedData = getSelectedMonthData();
              const minimumPayments = selectedData.totalDebtMinimumPayments || 0;
              // Add additional payments if available in forecast data
              if ('debtPaymentItems' in selectedData && selectedData.debtPaymentItems) {
                const additionalPayments = selectedData.debtPaymentItems.reduce(
                  (sum, debt) => sum + (debt.additionalPayment || 0), 0
                );
                return minimumPayments + additionalPayments;
              }
              return minimumPayments;
            })()}
            totalGoalContributions={getSelectedMonthData().totalGoalContributions}
            totalBudgetedVariable={getSelectedMonthData().totalVariableExpenses}
            onAddCategoryClick={() => setIsAddCategoryDialogOpen(true)}
          />
          <VariableExpenseList
            expenses={(() => {
              const selectedMonthData = getSelectedMonthData();
              // If we have forecast data for the selected month, use the variable expenses from there
              // This ensures the list shows the overridden amounts
              if (selectedMonthData && 'variableExpenses' in selectedMonthData && selectedMonthData.variableExpenses) {
                return selectedMonthData.variableExpenses.map(ve => ({
                  id: ve.id,
                  name: ve.name,
                  category: 'personal' as const, // Default category since forecast doesn't store this
                  amount: ve.monthSpecificAmount,
                  userId: user?.id || '',
                  createdAt: new Date(),
                  updatedAt: undefined
                }));
              }
              // Fallback to original variable expenses if no forecast data
              return variableExpenses;
            })()}
            onUpdateExpenseAmount={handleUpdateVariableExpenseAmount}
            onDeleteExpense={handleDeleteVariableExpense}
          />
        </TabsContent>
        <TabsContent value="forecast">
            <BudgetForecastView
                forecastData={forecastData}
                onUpdateVariableAmount={(monthIndex, expenseId, newAmount) => handleUpdateForecastVariableAmount(monthIndex, expenseId, newAmount)}
                onUpdateGoalContribution={(monthIndex, goalId, newAmount) => handleUpdateForecastGoalContribution(monthIndex, goalId, newAmount)}
                onUpdateDebtAdditionalPayment={(monthIndex, debtId, newAmount) => handleUpdateForecastDebtAdditionalPayment(monthIndex, debtId, newAmount)}
            />
        </TabsContent>
      </Tabs>

      <AddVariableExpenseDialog
        isOpen={isAddCategoryDialogOpen}
        onOpenChange={setIsAddCategoryDialogOpen}
        onExpenseAdded={handleAddVariableExpense}
      >
        <Button onClick={() => setIsAddCategoryDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Variable Expense
        </Button>
      </AddVariableExpenseDialog>
    </div>
  );
}