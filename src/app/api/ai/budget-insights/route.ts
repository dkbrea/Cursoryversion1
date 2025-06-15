import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateBudgetInsights, type BudgetContext } from '@/ai/flows/budget-insights';
import { getForecastOverridesForMonth } from '@/lib/api/forecast-overrides-v2';
import { startOfMonth, endOfMonth, format, subMonths, differenceInCalendarMonths, startOfDay, isPast } from 'date-fns';

// For API routes, we'll use the service role key to bypass auth
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Check environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!supabaseServiceKey 
      });
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Get the user ID, year, and month from the request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { userId, year, month } = body;
    
    if (!userId || !year || !month || month < 1 || month > 12) {
      console.error('Missing required parameters:', { userId, year, month });
      return NextResponse.json({ error: 'User ID, year, and valid month required' }, { status: 400 });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create date range for current month
    const currentDate = new Date(year, month - 1, 1); // month is 0-indexed in Date constructor
    const currentMonthStart = startOfMonth(currentDate);
    const currentMonthEnd = endOfMonth(currentDate);
    const monthLabel = format(currentDate, 'MMMM yyyy');

    // Create date range for previous month
    const previousDate = subMonths(currentDate, 1);
    const previousMonthStart = startOfMonth(previousDate);
    const previousMonthEnd = endOfMonth(previousDate);

    // Fetch comprehensive budget data
    const [
      { data: recurringItems },
      { data: debtAccounts },
      { data: goals },
      { data: variableExpenses },
      { data: currentTransactions },
      { data: previousTransactions },
    ] = await Promise.all([
      // Recurring items (income, fixed expenses, subscriptions)
      supabase
        .from('recurring_items')
        .select('*')
        .eq('user_id', userId),

      // Debt accounts for minimum payments
      supabase
        .from('debt_accounts')
        .select('*')
        .eq('user_id', userId),

      // Financial goals
      supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', userId),

      // Variable expense categories - using the correct table name
      supabase
        .from('variable_expenses')
        .select('*')
        .eq('user_id', userId),

      // Current month transactions - using correct column names
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', currentMonthStart.toISOString())
        .lte('date', currentMonthEnd.toISOString()),

      // Previous month transactions for comparison
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', previousMonthStart.toISOString())
        .lte('date', previousMonthEnd.toISOString()),
    ]);

    // Calculate income and expenses from recurring items using the same logic as frontend
    let calculatedIncome = 0;
    let calculatedActualFixedExpenses = 0;
    let calculatedSubscriptions = 0;

    (recurringItems || []).forEach((item: any) => {
      // Skip items that ended before the current month
      if (item.end_date && new Date(item.end_date) < currentMonthStart) {
        return;
      }
      
      let itemMonthlyTotal = 0;
      
      if (item.frequency === 'semi-monthly') {
        // Handle semi-monthly items
        let firstPayCount = 0, secondPayCount = 0;
        if (item.semi_monthly_first_pay_date && 
            new Date(item.semi_monthly_first_pay_date) >= currentMonthStart && 
            new Date(item.semi_monthly_first_pay_date) <= currentMonthEnd) {
          if (!item.end_date || new Date(item.semi_monthly_first_pay_date) <= new Date(item.end_date)) {
            itemMonthlyTotal += item.amount;
            firstPayCount = 1;
          }
        }
        if (item.semi_monthly_second_pay_date && 
            new Date(item.semi_monthly_second_pay_date) >= currentMonthStart && 
            new Date(item.semi_monthly_second_pay_date) <= currentMonthEnd) {
          if (!item.end_date || new Date(item.semi_monthly_second_pay_date) <= new Date(item.end_date)) {
            itemMonthlyTotal += item.amount;
            secondPayCount = 1;
          }
        }
      } else {
        // Handle other frequencies
        let baseIterationDate: Date | null = null;
        
        if (item.type === 'subscription') {
          baseIterationDate = item.last_renewal_date ? new Date(item.last_renewal_date) : null;
        } else {
          baseIterationDate = item.start_date ? new Date(item.start_date) : null;
        }
        
        if (!baseIterationDate || (baseIterationDate > currentMonthEnd && item.type !== 'subscription')) {
          return;
        }

        let tempDate = new Date(baseIterationDate);
        let occurrences = 0;
        
        // For subscriptions, the first occurrence is *after* last renewal
        if (item.type === 'subscription') {
          switch (item.frequency) {
            case "daily": tempDate = new Date(tempDate.getTime() + 24 * 60 * 60 * 1000); break;
            case "weekly": tempDate = new Date(tempDate.getTime() + 7 * 24 * 60 * 60 * 1000); break;
            case "bi-weekly": tempDate = new Date(tempDate.getTime() + 14 * 24 * 60 * 60 * 1000); break;
            case "monthly": tempDate = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, tempDate.getDate()); break;
            case "quarterly": tempDate = new Date(tempDate.getFullYear(), tempDate.getMonth() + 3, tempDate.getDate()); break;
            case "yearly": tempDate = new Date(tempDate.getFullYear() + 1, tempDate.getMonth(), tempDate.getDate()); break;
          }
        }

        // Calculate occurrences within the current month
        while (tempDate < currentMonthEnd || (tempDate >= currentMonthStart && tempDate <= currentMonthEnd)) {
          if (item.end_date && tempDate > new Date(item.end_date)) break;
          if (tempDate >= currentMonthStart && tempDate <= currentMonthEnd) {
            itemMonthlyTotal += item.amount;
            occurrences++;
          }
          if (tempDate > currentMonthEnd && item.frequency !== 'daily') break;
          
          switch (item.frequency) {
            case "daily": tempDate = new Date(tempDate.getTime() + 24 * 60 * 60 * 1000); break;
            case "weekly": tempDate = new Date(tempDate.getTime() + 7 * 24 * 60 * 60 * 1000); break;
            case "bi-weekly": tempDate = new Date(tempDate.getTime() + 14 * 24 * 60 * 60 * 1000); break;
            case "monthly": tempDate = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, tempDate.getDate()); break;
            case "quarterly": tempDate = new Date(tempDate.getFullYear(), tempDate.getMonth() + 3, tempDate.getDate()); break;
            case "yearly": tempDate = new Date(tempDate.getFullYear() + 1, tempDate.getMonth(), tempDate.getDate()); break;
            default: tempDate = new Date(tempDate.getFullYear() + 100, tempDate.getMonth(), tempDate.getDate()); break;
          }
        }
      }
      
      if (item.type === 'income') calculatedIncome += itemMonthlyTotal;
      else if (item.type === 'fixed-expense') calculatedActualFixedExpenses += itemMonthlyTotal;
      else if (item.type === 'subscription') calculatedSubscriptions += itemMonthlyTotal;
    });

    // Calculate debt payments using the same logic as frontend
    let calculatedDebtPayments = 0;
    (debtAccounts || []).forEach((debt: any) => {
      let debtMonthlyTotal = 0;
      const debtCreationDate = new Date(debt.created_at);
      
      // Use nextDueDate if available, otherwise fall back to paymentDayOfMonth
      let checkDate = debt.next_due_date ? 
        new Date(debt.next_due_date) : 
        new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth(), debt.payment_day_of_month || 1);

      // Adjust checkDate if it's before creation or if the day has passed for the creation month
      if (checkDate < debtCreationDate) {
        if (debt.payment_day_of_month) {
          checkDate = new Date(debtCreationDate.getFullYear(), debtCreationDate.getMonth(), debt.payment_day_of_month);
          if (checkDate < debtCreationDate) {
            checkDate = new Date(debtCreationDate.getFullYear(), debtCreationDate.getMonth() + 1, debt.payment_day_of_month);
          }
        } else {
          checkDate = new Date(debt.next_due_date);
        }
      }

      let payments = 0;
      while (checkDate >= currentMonthStart && checkDate <= currentMonthEnd) {
        // Always include debt payments regardless of creation date for consistent forecasting
        debtMonthlyTotal += debt.minimum_payment;
        payments++;
        
        // Advance checkDate based on frequency for multiple payments in a month
        let advancedInLoop = false;
        switch (debt.payment_frequency) {
          case "weekly": 
            checkDate = new Date(checkDate.getTime() + 7 * 24 * 60 * 60 * 1000); 
            advancedInLoop = true; 
            break;
          case "bi-weekly": 
            checkDate = new Date(checkDate.getTime() + 14 * 24 * 60 * 60 * 1000); 
            advancedInLoop = true; 
            break;
          case "monthly":
          case "annually":
          case "other":
          default: break;
        }
        if (!advancedInLoop) break;
      }
      calculatedDebtPayments += debtMonthlyTotal;
    });

    // Use the calculated values instead of simple sums
    const totalIncome = calculatedIncome;
    const totalFixedExpenses = calculatedActualFixedExpenses;
    const totalSubscriptions = calculatedSubscriptions;
    const totalDebtPayments = calculatedDebtPayments;

    // Load monthly overrides for the selected month (same as frontend)
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`; // Format: YYYY-MM
    console.log('=== OVERRIDE DEBUG ===');
    console.log('Looking for overrides with:');
    console.log('- user_id:', userId);
    console.log('- month_year:', monthKey);
    
    // Use the same override loading function as the main UI
    const { overrides: overrideMapRaw, error: overrideError } = await getForecastOverridesForMonth(userId, monthKey);
    const overrideMap = overrideMapRaw || {}; // Ensure it's not null
    
    console.log('Forecast overrides query result:');
    console.log('- Error:', overrideError);
    console.log('- Override map:', overrideMap);
    console.log('=== END OVERRIDE DEBUG ===');

    // Process variable expenses with detailed progress information and apply overrides
    const processedVariableExpenses = (variableExpenses || []).map((category: any) => {
      // Find transactions linked to this specific variable expense by sourceId
      const categoryTransactions = (currentTransactions || []).filter(
        (t: any) => t.detailed_type === 'variable-expense' && t.source_id === category.id
      );
      
      const spentAmount = categoryTransactions.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
      
      // Apply override if it exists, otherwise use the original amount
      const budgetedAmount = overrideMap[category.id] !== undefined ? overrideMap[category.id] : (category.amount || 0);
      
      const remainingAmount = Math.max(0, budgetedAmount - spentAmount);
      const utilizationPercentage = budgetedAmount > 0 ? (spentAmount / budgetedAmount) * 100 : 0;

      // Calculate days remaining in month for velocity analysis
      const today = new Date();
      const daysInMonth = currentMonthEnd.getDate();
      const daysPassed = Math.min(today.getDate(), daysInMonth); // Ensure we don't exceed month days
      const daysRemaining = Math.max(0, daysInMonth - daysPassed);
      
      // Calculate spending velocity (only if we're actually in the current month)
      const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month - 1;
      let dailySpendRate = 0;
      let projectedMonthlySpend = spentAmount;
      
      if (isCurrentMonth && daysPassed > 0 && spentAmount > 0) {
        dailySpendRate = spentAmount / daysPassed;
        projectedMonthlySpend = dailySpendRate * daysInMonth;
      }
      
      const spendingTrend = projectedMonthlySpend > budgetedAmount ? 'over' : 
                           projectedMonthlySpend < budgetedAmount * 0.5 ? 'under' : 'on-track';

      // Determine status and risk level
      let status = 'under-budget';
      let riskLevel = 'low';
      
      if (spentAmount > budgetedAmount) {
        status = 'over-budget';
        riskLevel = 'high';
      } else if (utilizationPercentage > 90) {
        status = 'near-limit';
        riskLevel = 'medium';
      } else if (utilizationPercentage < 10 && daysPassed > daysInMonth / 2) {
        status = 'under-utilized';
        riskLevel = 'low';
      }

      return {
        id: category.id,
        name: category.name,
        category: category.category,
        budgetedAmount,
        spentAmount,
        remainingAmount,
        utilizationPercentage,
        status,
        riskLevel,
        spendingTrend,
        dailySpendRate,
        projectedMonthlySpend,
        daysRemaining,
        transactionCount: categoryTransactions.length,
        hasActivity: spentAmount > 0,
      };
    });

    // Apply overrides to goal contributions
    const adjustedGoalContributions = (goals || [])
      .reduce((sum: number, goal: any) => {
        // Check if there's an override for this goal
        if (overrideMap[goal.id] !== undefined) {
          return sum + overrideMap[goal.id];
        }

        // Use the exact same calculation logic as the frontend
        const creationDate = startOfDay(new Date(goal.created_at));
        const targetDate = startOfDay(new Date(goal.target_date));
        const today = startOfDay(new Date());
        
        // Calculate total months in the goal's timeframe (from creation to target)
        const totalMonthsInGoal = Math.max(1, differenceInCalendarMonths(targetDate, creationDate));
        
        // Calculate current months remaining
        let monthsRemaining = Math.max(0, differenceInCalendarMonths(targetDate, today));
        
        // Calculate the original target amount (when the goal was created)
        const originalTargetAmount = goal.target_amount;
        
        // Calculate the consistent monthly contribution based on original timeframe
        let monthlyContribution = 0;
        const amountNeeded = goal.target_amount - goal.current_amount;
        
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
        
        // Only include if goal is active and has contribution
        if (goal.current_amount < goal.target_amount && monthsRemaining > 0) {
          return sum + (monthlyContribution > 0 ? monthlyContribution : 0);
        }
        return sum;
      }, 0);

    // Apply overrides to debt payments (additional payments)
    let adjustedDebtPayments = calculatedDebtPayments;
    (debtAccounts || []).forEach((debt: any) => {
      if (overrideMap[debt.id] !== undefined) {
        // Override represents additional payment amount, add it to the minimum
        const additionalPayment = overrideMap[debt.id];
        adjustedDebtPayments += additionalPayment;
      }
    });

    // Apply overrides to variable expenses (same as goal contributions and debt payments)
    const adjustedVariableExpenses = processedVariableExpenses.map((category: any) => {
      // Check if there's an override for this variable expense
      if (overrideMap[category.id] !== undefined) {
        return {
          ...category,
          budgetedAmount: overrideMap[category.id]
        };
      }
      return category;
    });

    const totalBudgetedVariable = adjustedVariableExpenses.reduce((sum: number, cat: any) => sum + cat.budgetedAmount, 0);
    const totalSpentVariable = processedVariableExpenses.reduce((sum: number, cat: any) => sum + cat.spentAmount, 0);
    const remainingVariable = totalBudgetedVariable - totalSpentVariable;

    // Calculate "Left to Allocate" using adjusted values
    const totalAllocated = totalFixedExpenses + totalSubscriptions + adjustedDebtPayments + adjustedGoalContributions + totalBudgetedVariable;
    const leftToAllocate = totalIncome - totalAllocated;
    const isBalanced = Math.abs(leftToAllocate) < 0.01;

    console.log('=== FINAL CALCULATION DEBUG ===');
    console.log('Total Income:', totalIncome);
    console.log('Fixed Expenses:', totalFixedExpenses);
    console.log('Subscriptions:', totalSubscriptions);
    console.log('Debt Payments (base):', calculatedDebtPayments);
    console.log('Debt Payments (adjusted):', adjustedDebtPayments);
    console.log('Goal Contributions (adjusted):', adjustedGoalContributions);
    console.log('Variable Expenses (budgeted, adjusted):', totalBudgetedVariable);
    console.log('Total Allocated:', totalAllocated);
    console.log('Left to Allocate:', leftToAllocate);
    console.log('Should be balanced?:', isBalanced);
    console.log('=== END CALCULATION DEBUG ===');

    // Enhanced previous month comparison
    let previousMonthComparison;
    if (previousTransactions && previousTransactions.length > 0) {
      const previousVariableExpenses = (variableExpenses || []).map((category: any) => {
        const categoryTransactions = previousTransactions.filter(
          (t: any) => t.detailed_type === 'variable-expense' && t.source_id === category.id
        );
        return {
          categoryName: category.name,
          spentAmount: categoryTransactions.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0),
        };
      });

      const previousTotalSpentVariable = previousVariableExpenses.reduce((sum: number, cat: any) => sum + cat.spentAmount, 0);

      const variableExpenseChanges = processedVariableExpenses.map((current: any) => {
        const previous = previousVariableExpenses.find((p: any) => p.categoryName === current.name);
        const previousSpent = previous?.spentAmount || 0;
        const changeAmount = current.spentAmount - previousSpent;
        const changePercentage = previousSpent > 0 ? (changeAmount / previousSpent) * 100 : 0;

        return {
          categoryName: current.name,
          currentSpent: current.spentAmount,
          previousSpent,
          changeAmount,
          changePercentage,
          utilizationChange: current.utilizationPercentage - (previousSpent / current.budgetedAmount * 100),
        };
      }).filter((change: any) => Math.abs(change.changeAmount) > 5) // Lower threshold for more insights
        .sort((a: any, b: any) => Math.abs(b.changeAmount) - Math.abs(a.changeAmount));

      previousMonthComparison = {
        totalSpentVariable: previousTotalSpentVariable,
        leftToAllocate: leftToAllocate,
        variableExpenseChanges,
        spendingTrendChange: totalSpentVariable - previousTotalSpentVariable,
      };
    }

    // Enhanced budget context with detailed progress data
    const budgetContext: BudgetContext = {
      currentMonth: {
        monthLabel,
        totalIncome,
        totalFixedExpenses,
        totalSubscriptions,
        totalDebtPayments: adjustedDebtPayments,
        totalGoalContributions: adjustedGoalContributions,
        totalBudgetedVariable,
        totalSpentVariable,
        remainingVariable,
        leftToAllocate,
        isBalanced,
      },
      variableExpenses: adjustedVariableExpenses,
      previousMonthComparison,
      // Add category analysis for better Jade insights
      categoryAnalysis: {
        overBudgetCategories: adjustedVariableExpenses.filter((cat: any) => cat.status === 'over-budget'),
        underUtilizedCategories: adjustedVariableExpenses.filter((cat: any) => cat.status === 'under-utilized'),
        riskCategories: adjustedVariableExpenses.filter((cat: any) => cat.riskLevel === 'high' || cat.riskLevel === 'medium'),
        inactiveCategories: adjustedVariableExpenses.filter((cat: any) => !cat.hasActivity),
        highVelocityCategories: adjustedVariableExpenses.filter((cat: any) => cat.spendingTrend === 'over'),
      },
    };

    // Check if Jade features are enabled
    const enableJade = process.env.ENABLE_AI_FEATURES === 'true';
    
    if (!enableJade) {
      return NextResponse.json({
        error: 'disabled',
        message: 'Jade insights are currently disabled. Enable them in settings for personalized budget advice.',
        data: null,
      });
    }

    // Generate Jade insights with enhanced data
    const result = await generateBudgetInsights({ budgetContext });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Budget insights API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate budget insights' },
      { status: 500 }
    );
  }
} 