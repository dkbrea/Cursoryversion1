import type { 
  RecurringItem, DebtAccount, VariableExpense, FinancialGoal,
  PaycheckPeriod, PaycheckExpenseItem, PaycheckAllocation, PaycheckBreakdown,
  SinkingFund, PaycheckTimingMode, PaycheckPreferences, ContributionFrequency
} from "@/types";
import { 
  addDays, addWeeks, addMonths, addQuarters, addYears, 
  isSameDay, setDate, startOfDay, isWithinInterval,
  differenceInDays, format, isBefore, isAfter, addMinutes,
  differenceInWeeks, differenceInMonths
} from "date-fns";
import { calculateNextRecurringItemOccurrence, calculateNextDebtOccurrence } from "./date-calculations";
import { getVariableExpenseSpending } from "../api/transactions";

// Generate individual paycheck events from all income sources
export const generatePaycheckPeriods = (
  recurringItems: RecurringItem[],
  startDate: Date = new Date(),
  periodsCount: number = 12,
  pastPeriodsCount: number = 3
): PaycheckPeriod[] => {
  const incomeItems = recurringItems.filter(item => item.type === 'income');
  
  console.log('Found income items:', incomeItems.map(item => ({
    name: item.name,
    amount: item.amount,
    frequency: item.frequency,
    type: item.type
  })));
  
  if (incomeItems.length === 0) {
    console.log('No income items found, using defaults');
    return generateDefaultPaycheckPeriods(startDate, periodsCount, 'bi-weekly', 3000, pastPeriodsCount);
  }

  // Generate individual paycheck events for each income source
  const allPaycheckEvents: PaycheckEvent[] = [];
  
  incomeItems.forEach(incomeItem => {
    console.log(`Generating events for: ${incomeItem.name}`);
    const paycheckEvents = generatePaycheckEventsForIncome(
      incomeItem,
      startDate,
      periodsCount,
      pastPeriodsCount
    );
    console.log(`Generated ${paycheckEvents.length} events for ${incomeItem.name}`);
    allPaycheckEvents.push(...paycheckEvents);
  });

  console.log(`Total paycheck events before sorting: ${allPaycheckEvents.length}`);
  
  // Sort all paycheck events chronologically
  allPaycheckEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  console.log('Sorted paycheck events:', allPaycheckEvents.map(event => ({
    date: event.date.toISOString().split('T')[0],
    source: event.source,
    amount: event.amount
  })));

  // Convert paycheck events to periods with proper expense allocation
  const periods = convertEventsToPeriodsWithExpenseAllocation(allPaycheckEvents);
  console.log(`Final periods generated: ${periods.length}`);
  
  return periods;
};

interface PaycheckEvent {
  date: Date;
  amount: number;
  source: string;
  incomeItemId: string;
}

// Generate paycheck events for a specific income source
const generatePaycheckEventsForIncome = (
  incomeItem: RecurringItem,
  startDate: Date,
  periodsCount: number,
  pastPeriodsCount: number
): PaycheckEvent[] => {
  const events: PaycheckEvent[] = [];
  
  try {
    // Define a clear date range instead of going back N periods
    const today = startOfDay(new Date());
    const rangeStart = addMonths(today, -2); // Go back 2 months to catch recent history
    const rangeEnd = addMonths(today, Math.ceil(periodsCount / 4)); // Go forward based on periods
    
    console.log(`Generating events for ${incomeItem.name} between ${rangeStart.toISOString().split('T')[0]} and ${rangeEnd.toISOString().split('T')[0]}`);
    
    // Get all occurrences of this income item within the date range
    const occurrences = getOccurrencesInPeriod(incomeItem, rangeStart, rangeEnd);
    
    console.log(`Found ${occurrences.length} occurrences for ${incomeItem.name}:`, 
      occurrences.map(date => date.toISOString().split('T')[0]));
    
    // Convert occurrences to paycheck events
    occurrences.forEach((date, index) => {
      events.push({
        date: new Date(date),
        amount: incomeItem.amount,
        source: incomeItem.name,
        incomeItemId: incomeItem.id
      });
    });
    
    console.log(`Generated ${events.length} events for ${incomeItem.name}`);
    
  } catch (error) {
    console.error(`Error generating events for ${incomeItem.name}:`, error);
  }
  
  return events;
};

// Convert paycheck events to periods with expense allocation logic
const convertEventsToPeriodsWithExpenseAllocation = (
  paycheckEvents: PaycheckEvent[]
): PaycheckPeriod[] => {
  const periods: PaycheckPeriod[] = [];
  
  for (let i = 0; i < paycheckEvents.length; i++) {
    const currentEvent = paycheckEvents[i];
    const nextEvent = paycheckEvents[i + 1];
    
    // Period runs from this paycheck until the next one (or end of planning horizon)
    const periodStart = currentEvent.date;
    const periodEnd = nextEvent 
      ? addMinutes(nextEvent.date, -1)
      : addMonths(currentEvent.date, 1); // Default 1 month if no next paycheck
    
    periods.push({
      id: `paycheck-event-${i}`,
      paycheckDate: currentEvent.date,
      paycheckAmount: currentEvent.amount,
      nextPaycheckDate: nextEvent?.date,
      periodStart,
      periodEnd,
      paycheckSource: 'recurring'
    });
  }
  
  return periods;
};

// Enhanced breakdown generation with comprehensive edge case handling
export const generatePaycheckBreakdownWithCarryover = (
  periods: PaycheckPeriod[],
  recurringItems: RecurringItem[],
  debtAccounts: DebtAccount[],
  variableExpenses: VariableExpense[],
  goals: FinancialGoal[],
  actualSpendingData?: { categoryId: string; spent: number; budgeted: number }[]
): PaycheckBreakdown[] => {
  const breakdowns: PaycheckBreakdown[] = [];
  let carryoverBalance = 0; // Track surplus/deficit from previous paychecks
  
  console.log('Processing paychecks with carryover logic...');
  console.log('Input periods (before sorting):', periods.map(p => ({
    date: p.paycheckDate.toISOString().split('T')[0],
    amount: p.paycheckAmount
  })));
  
  // CRITICAL: Ensure periods are sorted chronologically
  const sortedPeriods = [...periods].sort((a, b) => 
    a.paycheckDate.getTime() - b.paycheckDate.getTime()
  );
  
  console.log('Sorted periods:', sortedPeriods.map(p => ({
    date: p.paycheckDate.toISOString().split('T')[0],
    amount: p.paycheckAmount
  })));

  // PRE-ANALYSIS: Check for major financial health issues
  const financialHealthAnalysis = analyzeFinancialHealth(sortedPeriods, recurringItems, debtAccounts, variableExpenses, goals);
  console.log('Financial Health Analysis:', financialHealthAnalysis);

  // Look ahead for future deficits to inform current allocations
  const futureDeficitAnalysis = analyzeFutureDeficits(sortedPeriods, recurringItems, debtAccounts);
  console.log('Future Deficit Analysis:', futureDeficitAnalysis);
  
  sortedPeriods.forEach((period, index) => {
    console.log(`\n--- Processing paycheck ${index + 1}: ${period.paycheckDate.toISOString().split('T')[0]} ---`);
    // console.log(`Paycheck amount: $${period.paycheckAmount}`);
    // console.log(`Starting carryover balance: $${carryoverBalance}`);
    
    const obligatedExpenses = getExpensesDuePeriod(period, recurringItems, debtAccounts);
    const totalObligated = obligatedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Available funds = this paycheck + any carryover from previous paychecks
    const totalAvailable = period.paycheckAmount + carryoverBalance;
    const remainingAfterObligated = totalAvailable - totalObligated;
    
    // console.log(`Total obligated: $${totalObligated}`);
    // console.log(`Total available (paycheck + carryover): $${totalAvailable}`);
    console.log(`Remaining after obligated: $${remainingAfterObligated.toFixed(2)} (${totalAvailable.toFixed(2)} available - ${totalObligated.toFixed(2)} obligated)`);
    // console.log(`Period start: ${period.periodStart.toISOString().split('T')[0]}`);
    // console.log(`Period end: ${period.periodEnd.toISOString().split('T')[0]}`);
    
    const isDeficit = remainingAfterObligated < 0;
    const deficitAmount = isDeficit ? Math.abs(remainingAfterObligated) : undefined;
    
    // Check for upcoming deficits within next 2 paychecks
    const upcomingDeficits = futureDeficitAnalysis.deficits.filter(d => 
      d.paycheckIndex > index && d.paycheckIndex <= index + 2
    );
    
    // Calculate allocation with enhanced logic
    let allocation: PaycheckAllocation;
    let totalAllocated = 0;
    let finalRemaining = 0;
    
    if (isDeficit) {
      // DEFICIT HANDLING: Provide specific guidance
      allocation = {
        variableExpenses: [],
        savingsGoals: [],
        sinkingFunds: [],
        carryover: {
          amount: 0,
          reason: `Deficit of $${deficitAmount!.toFixed(2)} - ${getDeficitGuidance(deficitAmount!, financialHealthAnalysis)}`
        }
      };
      totalAllocated = 0;
      finalRemaining = 0;
      carryoverBalance = remainingAfterObligated;
    } else {
      // SURPLUS HANDLING: Smart allocation with future awareness
      const availableForAllocation = Math.max(0, remainingAfterObligated);
      
      // Reserve funds for upcoming deficits
      const deficitReserve = upcomingDeficits.reduce((sum, deficit) => sum + deficit.amount, 0);
      const conservativeAllocation = Math.max(0, availableForAllocation - deficitReserve);
      
      // console.log(`Available for allocation: $${availableForAllocation}`);
      // console.log(`Deficit reserve needed: $${deficitReserve}`);
      // console.log(`Conservative allocation amount: $${conservativeAllocation}`);
      
      // Use enhanced allocation that considers deadlines and priorities
      allocation = calculateEnhancedPaycheckAllocation(
        conservativeAllocation,
        variableExpenses,
        goals,
        upcomingDeficits,
        financialHealthAnalysis,
        period,
        actualSpendingData
      );
      
      totalAllocated = 
        allocation.variableExpenses.reduce((sum, exp) => sum + exp.suggestedAmount, 0) +
        allocation.savingsGoals.reduce((sum, goal) => sum + goal.suggestedAmount, 0);
      
      // CRITICAL FIX: carryover should be what's actually in the allocation.carryover.amount
      // not calculated separately
      const actualCarryoverFromAllocation = allocation.carryover.amount;
      
      // console.log(`Variable expenses allocated: $${allocation.variableExpenses.reduce((sum, exp) => sum + exp.suggestedAmount, 0)}`);
      // console.log(`Goals allocated: $${allocation.savingsGoals.reduce((sum, goal) => sum + goal.suggestedAmount, 0)}`);
      console.log(`Total allocated to expenses/goals: $${totalAllocated.toFixed(2)}, Carryover: $${actualCarryoverFromAllocation.toFixed(2)}`);
      
      finalRemaining = availableForAllocation - totalAllocated - actualCarryoverFromAllocation;
      
      // CRITICAL: The new carryover balance should be what the allocation determined
      carryoverBalance = actualCarryoverFromAllocation;
      
      // console.log(`Final remaining (should be ~0): $${finalRemaining}`);
    }
    
    // console.log(`Is deficit: ${isDeficit}`);
    // console.log(`Total allocated: $${totalAllocated}`);
    // console.log(`Final remaining: $${finalRemaining}`);
    console.log(`New carryover balance: $${carryoverBalance.toFixed(2)}\n`);
    
    // Add financial health warnings and guidance
    const warnings = generatePaycheckWarnings(
      period, 
      remainingAfterObligated, 
      carryoverBalance, 
      upcomingDeficits,
      financialHealthAnalysis
    );
    
    breakdowns.push({
      period,
      obligatedExpenses,
      totalObligated,
      remainingAfterObligated,
      allocation,
      totalAllocated,
      finalRemaining,
      isDeficit,
      deficitAmount,
      warnings,
      financialHealthScore: financialHealthAnalysis.overallScore,
      actionableInsights: generateActionableInsights(
        remainingAfterObligated, 
        upcomingDeficits, 
        financialHealthAnalysis,
        allocation,
        calculateBudgetAwareVariableExpenses(variableExpenses, period, actualSpendingData)
      )
    } as PaycheckBreakdown & {
      warnings: string[];
      financialHealthScore: number;
      actionableInsights: string[];
    });
  });
  
  console.log('\nFinal breakdown summary:');
  breakdowns.forEach((bd, i) => {
    console.log(`${bd.period.paycheckDate.toISOString().split('T')[0]}: $${bd.period.paycheckAmount} -> ${bd.isDeficit ? 'DEFICIT' : 'SURPLUS'} $${bd.remainingAfterObligated}`);
  });
  
  return breakdowns;
};

// Analyze overall financial health
interface FinancialHealthAnalysis {
  monthlyIncome: number;
  monthlyObligatedExpenses: number;
  monthlyVariableTarget: number;
  monthlyGoalTarget: number;
  totalMonthlyNeeds: number;
  incomeSufficiency: number; // Percentage of needs covered by income
  overallScore: number; // 0-100 health score
  majorIssues: string[];
  recommendations: string[];
}

const analyzeFinancialHealth = (
  periods: PaycheckPeriod[],
  recurringItems: RecurringItem[],
  debtAccounts: DebtAccount[],
  variableExpenses: VariableExpense[],
  goals: FinancialGoal[]
): FinancialHealthAnalysis => {
  // Calculate monthly averages
  const monthlyIncome = periods.reduce((sum, p) => sum + p.paycheckAmount, 0) / 3; // Approximate monthly
  
  const monthlyObligatedExpenses = 
    recurringItems.filter(item => item.type !== 'income').reduce((sum, item) => sum + item.amount, 0) +
    debtAccounts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
  
  const monthlyVariableTarget = variableExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  const monthlyGoalTarget = goals.reduce((sum, goal) => {
    const monthsRemaining = Math.max(1, Math.ceil(
      (goal.targetDate.getTime() - new Date().getTime()) / (30 * 24 * 60 * 60 * 1000)
    ));
    return sum + Math.max(0, (goal.targetAmount - goal.currentAmount) / monthsRemaining);
  }, 0);
  
  const totalMonthlyNeeds = monthlyObligatedExpenses + monthlyVariableTarget + monthlyGoalTarget;
  const incomeSufficiency = monthlyIncome > 0 ? (monthlyIncome / totalMonthlyNeeds) * 100 : 0;
  
  // Determine major issues
  const majorIssues: string[] = [];
  const recommendations: string[] = [];
  
  if (incomeSufficiency < 100) {
    majorIssues.push(`Income insufficient: Need $${(totalMonthlyNeeds - monthlyIncome).toFixed(2)} more monthly`);
    recommendations.push('Consider increasing income or reducing expenses');
  }
  
  if (monthlyObligatedExpenses / monthlyIncome > 0.7) {
    majorIssues.push('High fixed expense ratio - limited flexibility');
    recommendations.push('Look for ways to reduce fixed expenses');
  }
  
  // Calculate overall score
  let overallScore = Math.min(100, incomeSufficiency);
  if (monthlyObligatedExpenses / monthlyIncome > 0.7) overallScore -= 20;
  if (goals.some(g => g.targetDate < addMonths(new Date(), 6))) overallScore -= 10;
  
  return {
    monthlyIncome,
    monthlyObligatedExpenses,
    monthlyVariableTarget,
    monthlyGoalTarget,
    totalMonthlyNeeds,
    incomeSufficiency,
    overallScore: Math.max(0, overallScore),
    majorIssues,
    recommendations
  };
};

// Analyze future deficits
interface DeficitAnalysis {
  deficits: {
    paycheckIndex: number;
    amount: number;
    reason: string;
  }[];
  totalDeficit: number;
  worstPeriod: {
    index: number;
    amount: number;
  } | null;
}

const analyzeFutureDeficits = (
  periods: PaycheckPeriod[],
  recurringItems: RecurringItem[],
  debtAccounts: DebtAccount[]
): DeficitAnalysis => {
  const deficits: DeficitAnalysis['deficits'] = [];
  let runningBalance = 0;
  
  periods.forEach((period, index) => {
    const obligatedExpenses = getExpensesDuePeriod(period, recurringItems, debtAccounts);
    const totalObligated = obligatedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    runningBalance += period.paycheckAmount - totalObligated;
    
    if (runningBalance < 0) {
      deficits.push({
        paycheckIndex: index,
        amount: Math.abs(runningBalance),
        reason: `Obligations exceed available funds by period ${index + 1}`
      });
    }
  });
  
  const totalDeficit = deficits.reduce((sum, d) => sum + d.amount, 0);
  const worstPeriod = deficits.length > 0 
    ? deficits.reduce((worst, current) => current.amount > worst.amount ? current : worst, deficits[0])
    : null;
  
  return {
    deficits,
    totalDeficit,
    worstPeriod: worstPeriod ? { index: worstPeriod.paycheckIndex, amount: worstPeriod.amount } : null
  };
};

// Update the main breakdown function to use the new carryover logic
export const generatePaycheckBreakdown = (
  period: PaycheckPeriod,
  recurringItems: RecurringItem[],
  debtAccounts: DebtAccount[],
  variableExpenses: VariableExpense[],
  goals: FinancialGoal[]
): PaycheckBreakdown => {
  // This is now a simplified version - the main logic should use generatePaycheckBreakdownWithCarryover
  const obligatedExpenses = getExpensesDuePeriod(period, recurringItems, debtAccounts);
  const totalObligated = obligatedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remainingAfterObligated = period.paycheckAmount - totalObligated;
  
  const isDeficit = remainingAfterObligated < 0;
  const deficitAmount = isDeficit ? Math.abs(remainingAfterObligated) : undefined;
  
  const allocation = calculatePaycheckAllocation(
    Math.max(0, remainingAfterObligated),
    variableExpenses,
    goals
  );
  
  const totalAllocated = 
    allocation.variableExpenses.reduce((sum, exp) => sum + exp.suggestedAmount, 0) +
    allocation.savingsGoals.reduce((sum, goal) => sum + goal.suggestedAmount, 0) +
    allocation.carryover.amount;
  
  const finalRemaining = Math.max(0, remainingAfterObligated) - totalAllocated;
  
  return {
    period,
    obligatedExpenses,
    totalObligated,
    remainingAfterObligated,
    allocation,
    totalAllocated,
    finalRemaining,
    isDeficit,
    deficitAmount
  };
};

// Calculate total income from all sources within a specific period
const calculateTotalIncomeInPeriod = (
  incomeItems: RecurringItem[],
  periodStart: Date,
  periodEnd: Date
): number => {
  let totalIncome = 0;
  
  incomeItems.forEach(incomeItem => {
    const occurrences = getOccurrencesInPeriod(incomeItem, periodStart, periodEnd);
    totalIncome += occurrences.length * incomeItem.amount;
  });
  
  return totalIncome;
};

// Generate default paycheck periods when no income items exist
const generateDefaultPaycheckPeriods = (
  startDate: Date,
  periodsCount: number,
  frequency: 'bi-weekly' | 'monthly' = 'bi-weekly',
  estimatedAmount: number = 3000,
  pastPeriodsCount: number = 3
): PaycheckPeriod[] => {
  const periods: PaycheckPeriod[] = [];
  let currentDate = startOfDay(startDate);
  
  // Go back to generate some past paychecks for context
  for (let i = 0; i < pastPeriodsCount; i++) {
    currentDate = frequency === 'bi-weekly' 
      ? addWeeks(currentDate, -2)
      : addMonths(currentDate, -1);
  }
  
  // Generate past + future periods
  for (let i = 0; i < periodsCount + pastPeriodsCount; i++) {
    const nextDate = frequency === 'bi-weekly' 
      ? addWeeks(currentDate, 2)
      : addMonths(currentDate, 1);
    
    periods.push({
      id: `estimated-paycheck-${i}`,
      paycheckDate: currentDate,
      paycheckAmount: estimatedAmount,
      nextPaycheckDate: nextDate,
      periodStart: currentDate,
      periodEnd: addMinutes(nextDate, -1),
      paycheckSource: 'estimated'
    });
    
    currentDate = nextDate;
  }
  
  return periods;
};

// Calculate next paycheck date based on frequency
const calculateNextPaycheckDate = (currentDate: Date, frequency: string): Date => {
  switch (frequency) {
    case 'weekly':
      return addWeeks(currentDate, 1);
    case 'bi-weekly':
      return addWeeks(currentDate, 2);
    case 'semi-monthly':
      // For semi-monthly, add 15 days approximately
      return addDays(currentDate, 15);
    case 'monthly':
      return addMonths(currentDate, 1);
    case 'quarterly':
      return addQuarters(currentDate, 1);
    case 'yearly':
      return addYears(currentDate, 1);
    default:
      return addWeeks(currentDate, 2); // Default to bi-weekly
  }
};

// Get expenses due within a paycheck period
export const getExpensesDuePeriod = (
  period: PaycheckPeriod,
  recurringItems: RecurringItem[],
  debtAccounts: DebtAccount[]
): PaycheckExpenseItem[] => {
  const expenses: PaycheckExpenseItem[] = [];
  
  // Get recurring expenses (fixed expenses and subscriptions)
  const expenseItems = recurringItems.filter(
    item => item.type === 'fixed-expense' || item.type === 'subscription'
  );
  
  expenseItems.forEach(item => {
    const occurrences = getOccurrencesInPeriod(item, period.periodStart, period.periodEnd);
    occurrences.forEach(dueDate => {
      expenses.push({
        id: `${item.id}-${dueDate.getTime()}`,
        name: item.name,
        amount: item.amount,
        dueDate,
        type: item.type as 'fixed-expense' | 'subscription',
        source: 'recurring',
        categoryId: item.categoryId
      });
    });
  });
  
  // Get debt payments
  debtAccounts.forEach(debt => {
    const occurrences = getDebtOccurrencesInPeriod(debt, period.periodStart, period.periodEnd);
    occurrences.forEach(dueDate => {
      expenses.push({
        id: `debt-${debt.id}-${dueDate.getTime()}`,
        name: `${debt.name} Payment`,
        amount: debt.minimumPayment,
        dueDate,
        type: 'debt-payment',
        source: 'debt'
      });
    });
  });
  
  // Sort by due date
  expenses.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  
  return expenses;
};

// Get all occurrences of a recurring item within a date range
const getOccurrencesInPeriod = (item: RecurringItem, startDate: Date, endDate: Date): Date[] => {
  const occurrences: Date[] = [];
  let currentDate = calculateNextRecurringItemOccurrence(item);
  
  // If the item ended before this period, return empty
  if (item.endDate && item.endDate < startDate) {
    return occurrences;
  }
  
  // Backtrack to find first occurrence in or before the period
  while (currentDate > startDate && currentDate > (item.startDate || new Date())) {
    currentDate = getPreviousOccurrence(currentDate, item.frequency);
  }
  
  // Move forward to find all occurrences in the period
  while (currentDate <= endDate) {
    if (currentDate >= startDate && (!item.endDate || currentDate <= item.endDate)) {
      occurrences.push(new Date(currentDate));
    }
    currentDate = getNextOccurrence(currentDate, item.frequency);
  }
  
  return occurrences;
};

// Get debt payment occurrences in a period
const getDebtOccurrencesInPeriod = (debt: DebtAccount, startDate: Date, endDate: Date): Date[] => {
  const occurrences: Date[] = [];
  let currentDate = calculateNextDebtOccurrence(debt);
  
  // Backtrack to find first occurrence in or before the period
  while (currentDate > startDate) {
    currentDate = getPreviousOccurrence(currentDate, debt.paymentFrequency);
  }
  
  // Move forward to find all occurrences in the period
  while (currentDate <= endDate) {
    if (currentDate >= startDate) {
      occurrences.push(new Date(currentDate));
    }
    currentDate = getNextOccurrence(currentDate, debt.paymentFrequency);
  }
  
  return occurrences;
};

// Helper functions for date calculations
const getNextOccurrence = (date: Date, frequency: string): Date => {
  switch (frequency) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addWeeks(date, 1);
    case 'bi-weekly':
      return addWeeks(date, 2);
    case 'monthly':
      return addMonths(date, 1);
    case 'quarterly':
      return addQuarters(date, 1);
    case 'yearly':
      return addYears(date, 1);
    default:
      return addMonths(date, 1);
  }
};

const getPreviousOccurrence = (date: Date, frequency: string): Date => {
  switch (frequency) {
    case 'daily':
      return addDays(date, -1);
    case 'weekly':
      return addWeeks(date, -1);
    case 'bi-weekly':
      return addWeeks(date, -2);
    case 'monthly':
      return addMonths(date, -1);
    case 'quarterly':
      return addQuarters(date, -1);
    case 'yearly':
      return addYears(date, -1);
    default:
      return addMonths(date, -1);
  }
};

// Calculate smart allocation for remaining funds
export const calculatePaycheckAllocation = (
  remainingAmount: number,
  variableExpenses: VariableExpense[],
  goals: FinancialGoal[],
  futureDeficits: { amount: number; reason: string }[] = []
): PaycheckAllocation => {
  let allocatableAmount = remainingAmount;
  
  // First, reserve funds for future deficits
  const carryover = futureDeficits.reduce((acc, deficit) => ({
    amount: acc.amount + deficit.amount,
    reason: acc.reason + (acc.reason ? '; ' : '') + deficit.reason
  }), { amount: 0, reason: '' });
  
  allocatableAmount -= carryover.amount;
  
  const allocation: PaycheckAllocation = {
    variableExpenses: [],
    savingsGoals: [],
    sinkingFunds: [],
    carryover
  };
  
  if (allocatableAmount <= 0) {
    return allocation;
  }
  
  // Calculate monthly targets
  const totalVariableTarget = variableExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalGoalsTarget = goals.reduce((sum, goal) => {
    const monthsRemaining = Math.max(1, Math.ceil(
      (goal.targetDate.getTime() - new Date().getTime()) / (30 * 24 * 60 * 60 * 1000)
    ));
    const monthlyTarget = Math.max(0, (goal.targetAmount - goal.currentAmount) / monthsRemaining);
    return sum + monthlyTarget;
  }, 0);
  
  const totalTarget = totalVariableTarget + totalGoalsTarget;
  
  // Allocate proportionally if we have enough, or scale down if we don't
  const allocationRatio = totalTarget > 0 ? Math.min(1, allocatableAmount / totalTarget) : 0;
  
  // Allocate to variable expenses (prioritize these)
  const variableAllocationRatio = totalVariableTarget > 0 ? 
    Math.min(1, allocatableAmount / totalVariableTarget) : 0;
  
  let remainingForGoals = allocatableAmount;
  let totalVariableAllocated = 0;
  
  variableExpenses.forEach(expense => {
    const suggestedAmount = Math.round(expense.amount * variableAllocationRatio * 100) / 100;
    allocation.variableExpenses.push({
      id: expense.id,
      name: expense.name,
      category: expense.category,
      suggestedAmount,
      isProportional: variableAllocationRatio < 1
    });
    totalVariableAllocated += suggestedAmount;
  });
  
  remainingForGoals = allocatableAmount - totalVariableAllocated;
  
  // Allocate remaining to goals
  let totalGoalsAllocated = 0;
  if (remainingForGoals > 0 && totalGoalsTarget > 0) {
    const goalAllocationRatio = remainingForGoals / totalGoalsTarget;
    
    goals.forEach((goal, index) => {
      const monthsRemaining = Math.max(1, Math.ceil(
        (goal.targetDate.getTime() - new Date().getTime()) / (30 * 24 * 60 * 60 * 1000)
      ));
      const monthlyTarget = Math.max(0, (goal.targetAmount - goal.currentAmount) / monthsRemaining);
      let suggestedAmount = Math.round(monthlyTarget * goalAllocationRatio * 100) / 100;
      
      // For the last goal, allocate any remaining cents to avoid rounding issues
      if (index === goals.length - 1) {
        const remainingAfterOtherGoals = remainingForGoals - totalGoalsAllocated;
        if (remainingAfterOtherGoals > suggestedAmount) {
          suggestedAmount = remainingAfterOtherGoals;
        }
      }
      
      if (suggestedAmount > 0) {
        allocation.savingsGoals.push({
          id: goal.id,
          name: goal.name,
          suggestedAmount,
          monthlyTarget
        });
        totalGoalsAllocated += suggestedAmount;
      }
    });
  }
  
  return allocation;
};

// Helper function to provide deficit guidance
const getDeficitGuidance = (deficitAmount: number, healthAnalysis: FinancialHealthAnalysis): string => {
  if (deficitAmount < 100) {
    return 'minor timing issue - consider cash flow adjustment';
  } else if (deficitAmount < 500) {
    return 'moderate deficit - review discretionary spending';
  } else {
    return 'significant deficit - income or expense restructuring needed';
  }
};

// Enhanced allocation that considers deadlines and priorities with DAILY PRORATION AND BUDGET AWARENESS
const calculateEnhancedPaycheckAllocation = (
  remainingAmount: number,
  variableExpenses: VariableExpense[],
  goals: FinancialGoal[],
  upcomingDeficits: { paycheckIndex: number; amount: number; reason: string }[],
  healthAnalysis: FinancialHealthAnalysis,
  paycheckPeriod: PaycheckPeriod,
  actualSpendingData?: { categoryId: string; spent: number; budgeted: number }[]
): PaycheckAllocation => {
  let allocatableAmount = remainingAmount;
  
  // Step 1: Reserve for upcoming deficits (highest priority)
  const futureDeficitAmount = upcomingDeficits.reduce((sum, deficit) => sum + deficit.amount, 0);
  allocatableAmount -= futureDeficitAmount;
  
  const allocation: PaycheckAllocation = {
    variableExpenses: [],
    savingsGoals: [],
    sinkingFunds: [],
    carryover: {
      amount: futureDeficitAmount,
      reason: futureDeficitAmount > 0 
        ? `Reserved for upcoming deficit(s): $${futureDeficitAmount.toFixed(2)}`
        : ''
    }
  };
  
  if (allocatableAmount <= 0) {
    return allocation;
  }
  
  // Step 2: Calculate BUDGET-AWARE prorated variable expenses with ACTUAL spending data
  const budgetAwareExpenses = calculateBudgetAwareVariableExpenses(variableExpenses, paycheckPeriod, actualSpendingData);
  console.log('Budget-aware expenses for period:', budgetAwareExpenses);
  
  // Step 3: Calculate prorated goals with urgency
  const proratedGoals = calculateProratedGoals(goals, paycheckPeriod);
  console.log('Prorated goals for period:', proratedGoals);
  
  // Step 4: Priority allocation - UPDATED to use remainingBudget instead of proratedAmount
  let remainingForAllocation = allocatableAmount;
  
  // Priority 1: Essential variable expenses (only remaining budget amounts)
  const essentialCategories = ['housing', 'utilities', 'food', 'transportation'];
  const essentialExpenses = budgetAwareExpenses.filter(exp => 
    essentialCategories.includes(exp.category.toLowerCase()) && exp.remainingBudget > 0
  );
  
  essentialExpenses.forEach(expense => {
    // UPDATED: Use remaining budget as the maximum allocation, but respect prorated amount
    const allocateAmount = Math.min(expense.remainingBudget, expense.proratedAmount, remainingForAllocation);
    if (allocateAmount > 0) {
      allocation.variableExpenses.push({
        id: expense.id,
        name: expense.name,
        category: expense.category,
        suggestedAmount: allocateAmount,
        isProportional: allocateAmount < expense.remainingBudget,
        budgetRemaining: expense.remainingBudget,
        actualSpent: expense.actualSpent
      });
      remainingForAllocation -= allocateAmount;
    }
  });
  
  // Priority 2: Urgent goals (deadline within 6 months)
  const urgentGoals = proratedGoals.filter(goal => goal.isUrgent);
  urgentGoals.forEach(goal => {
    const allocateAmount = Math.min(goal.proratedAmount, remainingForAllocation);
    if (allocateAmount > 0) {
      allocation.savingsGoals.push({
        id: goal.id,
        name: goal.name,
        suggestedAmount: allocateAmount,
        monthlyTarget: goal.monthlyTarget
      });
      remainingForAllocation -= allocateAmount;
    }
  });
  
  // Priority 3: Non-essential variable expenses (only remaining budget amounts)
  const nonEssentialExpenses = budgetAwareExpenses.filter(exp => 
    !essentialCategories.includes(exp.category.toLowerCase()) && exp.remainingBudget > 0
  );
  
  nonEssentialExpenses.forEach(expense => {
    // UPDATED: Use remaining budget as the maximum allocation
    const allocateAmount = Math.min(expense.remainingBudget, expense.proratedAmount, remainingForAllocation);
    if (allocateAmount > 0) {
      allocation.variableExpenses.push({
        id: expense.id,
        name: expense.name,
        category: expense.category,
        suggestedAmount: allocateAmount,
        isProportional: allocateAmount < expense.remainingBudget,
        budgetRemaining: expense.remainingBudget,
        actualSpent: expense.actualSpent
      });
      remainingForAllocation -= allocateAmount;
    }
  });
  
  // Priority 4: Normal goals
  const normalGoals = proratedGoals.filter(goal => !goal.isUrgent);
  normalGoals.forEach(goal => {
    const allocateAmount = Math.min(goal.proratedAmount, remainingForAllocation);
    if (allocateAmount > 0) {
      allocation.savingsGoals.push({
        id: goal.id,
        name: goal.name,
        suggestedAmount: allocateAmount,
        monthlyTarget: goal.monthlyTarget
      });
      remainingForAllocation -= allocateAmount;
    }
  });
  
  console.log(`Enhanced allocation: Available $${allocatableAmount}, Total allocated $${allocatableAmount - remainingForAllocation}, Remaining unallocated $${remainingForAllocation}`);
  
  // Step 5: Handle remaining unallocated funds
  if (remainingForAllocation > 0) {
    allocation.carryover.amount += remainingForAllocation;
    const existingReason = allocation.carryover.reason;
    allocation.carryover.reason = existingReason 
      ? `${existingReason}; $${remainingForAllocation.toFixed(2)} unallocated - choose how to use`
      : `$${remainingForAllocation.toFixed(2)} unallocated - choose how to use`;
  }
  
  return allocation;
};

// Calculate budget-aware variable expenses (respects actual spending vs budget) - UPDATED
interface BudgetAwareVariableExpense {
  id: string;
  name: string;
  category: string;
  monthlyBudget: number;
  actualSpent: number;
  remainingBudget: number; // This is now max(0, monthlyBudget - actualSpent)
  proratedAmount: number;
  daysAllocated: number;
}

const calculateBudgetAwareVariableExpenses = (
  variableExpenses: VariableExpense[],
  paycheckPeriod: PaycheckPeriod,
  actualSpendingData?: { categoryId: string; spent: number; budgeted: number }[]
): BudgetAwareVariableExpense[] => {
  const monthBreakdown = calculateDaysInEachMonth(paycheckPeriod.periodStart, paycheckPeriod.periodEnd);
  const totalDaysInPeriod = monthBreakdown.reduce((sum, month) => sum + month.days, 0);
  
  return variableExpenses.map(expense => {
    // Find actual spending data for this expense
    const spendingData = actualSpendingData?.find(data => data.categoryId === expense.id);
    const actualSpent = spendingData?.spent || 0;
    const monthlyBudget = expense.amount;
    
    // UPDATED: Use max(0, budgeted_amount - actual_spent) formula
    const remainingBudget = Math.max(0, monthlyBudget - actualSpent);
    
    // Calculate prorated amount based on days in period
    let totalProratedAmount = 0;
    monthBreakdown.forEach(month => {
      const daysInMonth = getDaysInMonth(month.year, month.month);
      const dailyRate = monthlyBudget / daysInMonth;
      totalProratedAmount += dailyRate * month.days;
    });
    
    // The prorated amount should be based on the full monthly budget for this period
    // But actual allocation will be capped by remainingBudget
    
    return {
      id: expense.id,
      name: expense.name,
      category: expense.category,
      monthlyBudget,
      actualSpent,
      remainingBudget, // This is the key change: max(0, monthlyBudget - actualSpent)
      proratedAmount: Math.round(totalProratedAmount * 100) / 100,
      daysAllocated: totalDaysInPeriod
    };
  });
};

// Calculate prorated goals based on days this paycheck covers
interface ProratedGoal {
  id: string;
  name: string;
  monthlyTarget: number;
  proratedAmount: number;
  isUrgent: boolean;
  daysAllocated: number;
}

const calculateProratedGoals = (
  goals: FinancialGoal[],
  paycheckPeriod: PaycheckPeriod
): ProratedGoal[] => {
  const monthBreakdown = calculateDaysInEachMonth(paycheckPeriod.periodStart, paycheckPeriod.periodEnd);
  const totalDaysInPeriod = monthBreakdown.reduce((sum, month) => sum + month.days, 0);
  
  return goals.map(goal => {
    const monthsRemaining = Math.max(1, Math.ceil(
      (goal.targetDate.getTime() - new Date().getTime()) / (30 * 24 * 60 * 60 * 1000)
    ));
    const monthlyTarget = Math.max(0, (goal.targetAmount - goal.currentAmount) / monthsRemaining);
    
    // Prorate the monthly target based on days in this period
    // Assume 30.44 average days per month for proration
    const dailyTarget = monthlyTarget / 30.44;
    const proratedAmount = Math.round(dailyTarget * totalDaysInPeriod * 100) / 100;
    
    const isUrgent = monthsRemaining <= 6;
    
    return {
      id: goal.id,
      name: goal.name,
      monthlyTarget,
      proratedAmount,
      isUrgent,
      daysAllocated: totalDaysInPeriod
    };
  });
};

// Helper function to calculate how many days fall in each month for a given period
const calculateDaysInEachMonth = (startDate: Date, endDate: Date): { year: number; month: number; days: number; }[] => {
  const result: { year: number; month: number; days: number; }[] = [];
  
  // console.log(`\n--- Calculating days in each month from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]} ---`);
  
  // Start from the beginning of the period
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    // Find the end of this month or the end of our period, whichever comes first
    const endOfMonth = new Date(year, month, 0); // Last day of the month
    const periodEndForMonth = endOfMonth < endDate ? endOfMonth : endDate;
    
    // Calculate days from current position to end of month/period
    const daysDiff = Math.ceil((periodEndForMonth.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    
    // console.log(`  Month ${year}-${month.toString().padStart(2, '0')}: ${daysDiff} days (from ${currentDate.toISOString().split('T')[0]} to ${periodEndForMonth.toISOString().split('T')[0]})`);
    
    // Add to result or update existing entry
    const existingMonth = result.find(r => r.year === year && r.month === month);
    if (existingMonth) {
      existingMonth.days += daysDiff;
    } else {
      result.push({ year, month, days: daysDiff });
    }
    
    // Move to the first day of next month
    currentDate = new Date(year, month, 1); // First day of next month
  }
  
  // console.log(`Final month breakdown:`, result);
  return result;
};

// Helper function to get days in a specific month
const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

// Generate warnings for paycheck periods
const generatePaycheckWarnings = (
  period: PaycheckPeriod,
  remainingAfterObligated: number,
  carryoverBalance: number,
  upcomingDeficits: { paycheckIndex: number; amount: number; reason: string }[],
  healthAnalysis: FinancialHealthAnalysis
): string[] => {
  const warnings: string[] = [];
  
  if (remainingAfterObligated < 0) {
    warnings.push(`⚠️ Deficit of $${Math.abs(remainingAfterObligated).toFixed(2)} - obligations exceed available funds`);
  }
  
  if (upcomingDeficits.length > 0) {
    warnings.push(`⚠️ Future deficit detected in next ${upcomingDeficits.length} paycheck(s)`);
  }
  
  if (carryoverBalance < 0 && Math.abs(carryoverBalance) > 100) {
    warnings.push(`⚠️ Significant cumulative deficit: $${Math.abs(carryoverBalance).toFixed(2)}`);
  }
  
  if (healthAnalysis.incomeSufficiency < 90) {
    warnings.push(`⚠️ Income may be insufficient for all financial goals`);
  }
  
  if (period.paycheckSource === 'estimated') {
    warnings.push(`ℹ️ Based on estimated paycheck - actual amounts may vary`);
  }
  
  return warnings;
};

// Generate actionable insights
const generateActionableInsights = (
  remainingAfterObligated: number,
  upcomingDeficits: { paycheckIndex: number; amount: number; reason: string }[],
  healthAnalysis: FinancialHealthAnalysis,
  allocation?: PaycheckAllocation,
  budgetAwareExpenses?: BudgetAwareVariableExpense[]
): string[] => {
  const insights: string[] = [];
  
  if (remainingAfterObligated < 0) {
    insights.push('💎 Consider delaying non-essential purchases until your next paycheck arrives');
    insights.push('💎 Check if any bills can be paid later without penalties to ease this period');
    insights.push('💎 Look for quick wins like meal planning to stretch your current funds');
  } else if (remainingAfterObligated > 0) {
    insights.push('✅ This paycheck has a surplus - great opportunity for strategic allocation');
    
    // Budget-aware insights
    if (budgetAwareExpenses) {
      const overspentCategories = budgetAwareExpenses.filter(exp => exp.actualSpent > exp.monthlyBudget);
      const underutilizedCategories = budgetAwareExpenses.filter(exp => exp.actualSpent < exp.monthlyBudget * 0.5);
      
      if (overspentCategories.length > 0) {
        insights.push(`⚠️ I detected overspending in ${overspentCategories.length} categories - adjusting allocations accordingly`);
      }
      
      if (underutilizedCategories.length > 0) {
        insights.push(`💎 You're under budget in ${underutilizedCategories[0].name} - consider reallocating those funds`);
      }
    }
    
    // Strategic allocation insights
    const totalAllocated = allocation 
      ? allocation.variableExpenses.reduce((sum, exp) => sum + exp.suggestedAmount, 0) +
        allocation.savingsGoals.reduce((sum, goal) => sum + goal.suggestedAmount, 0)
      : 0;
    
    const unallocated = Math.max(0, remainingAfterObligated - totalAllocated - (allocation?.carryover.amount || 0));
    
    if (unallocated > 100) {
      insights.push(`💎 You have $${unallocated.toFixed(0)} unallocated - consider extra debt payments or emergency fund boost`);
    }
    
    if (upcomingDeficits.length > 0) {
      insights.push('🛡️ I recommend reserving funds for upcoming tight periods to maintain financial stability');
    } else {
      insights.push('🎯 No upcoming deficits detected - excellent time to accelerate financial goals');
    }
  }
  
  // Health-based insights
  if (healthAnalysis.overallScore < 70) {
    insights.push('📊 I detected areas for financial improvement - focus on essential expenses first');
    if (healthAnalysis.majorIssues.length > 0) {
      insights.push(`💡 Priority issue: ${healthAnalysis.majorIssues[0]}`);
    }
  } else {
    insights.push('🌟 Your financial health looks strong - great foundation for building wealth');
  }
  
  return insights;
};

// Enhanced PaycheckAllocation interface with new strategic categories
export interface EnhancedPaycheckAllocation {
  // Enhanced variable expenses with budget tracking
  variableExpenses: Array<{
    id: string;
    name: string;
    category: string;
    suggestedAmount: number;
    isProportional?: boolean;
    budgetRemaining?: number; // New: show remaining budget
    actualSpent?: number; // New: show actual spending
  }>;
  
  // Enhanced savings goals
  savingsGoals: Array<{
    id: string;
    name: string;
    suggestedAmount: number;
    monthlyTarget: number;
  }>;
  
  // Basic carryover
  carryover: {
    amount: number;
    reason: string;
  };
  
  // New strategic categories
  strategicAllocations: {
    extraDebtPayments: Array<{
      debtId: string;
      debtName: string;
      suggestedAmount: number;
      strategy: 'snowball' | 'avalanche' | 'custom';
      potentialSavings: number; // Interest saved
    }>;
    
    goalAccelerations: Array<{
      goalId: string;
      goalName: string;
      suggestedAmount: number;
      timeAdvancement: string; // "Reach goal 2 months earlier"
    }>;
    
    futureReserves: {
      nextPeriodDeficit: number;
      emergencyBuffer: number;
      seasonalExpenses: number;
    };
    
    unallocated: {
      amount: number;
      suggestions: string[]; // "Consider extra debt payment", "Build emergency fund", etc.
    };
  };
}

// Enhanced paycheck calculation with sinking funds integration
export const generatePaycheckBreakdownWithSinkingFunds = (
  periods: PaycheckPeriod[],
  recurringItems: RecurringItem[],
  debtAccounts: DebtAccount[],
  variableExpenses: VariableExpense[],
  goals: FinancialGoal[],
  sinkingFunds: SinkingFund[],
  paycheckPreferences: PaycheckPreferences,
  actualSpendingData?: { categoryId: string; spent: number; budgeted: number }[]
): PaycheckBreakdown[] => {
  // Use existing logic but with sinking fund integration
  const baseBreakdowns = generatePaycheckBreakdownWithCarryover(
    periods, recurringItems, debtAccounts, variableExpenses, goals, actualSpendingData
  );

  // Enhance each breakdown with sinking fund calculations
  return baseBreakdowns.map(breakdown => {
    const enhancedAllocation = calculateSinkingFundAwareAllocation(
      breakdown.remainingAfterObligated,
      variableExpenses,
      goals,
      sinkingFunds,
      breakdown.period,
      paycheckPreferences,
      actualSpendingData
    );

    return {
      ...breakdown,
      allocation: enhancedAllocation
    };
  });
};

// Calculate sinking fund contributions for paycheck periods
const calculateSinkingFundAwareAllocation = (
  remainingAmount: number,
  variableExpenses: VariableExpense[],
  goals: FinancialGoal[],
  sinkingFunds: SinkingFund[],
  paycheckPeriod: PaycheckPeriod,
  preferences: PaycheckPreferences,
  actualSpendingData?: { categoryId: string; spent: number; budgeted: number }[]
): PaycheckAllocation => {
  let allocatableAmount = remainingAmount;
  
  const allocation: PaycheckAllocation = {
    variableExpenses: [],
    savingsGoals: [],
    sinkingFunds: [],
    carryover: { amount: 0, reason: '' }
  };

  if (allocatableAmount <= 0) {
    return allocation;
  }

  // Calculate sinking fund contributions for this paycheck period
  const sinkingFundContributions = calculatePaycheckSinkingFundContributions(
    sinkingFunds,
    paycheckPeriod,
    preferences
  );

  // Apply priority-based allocation based on preferences
  let remainingForAllocation = allocatableAmount;

  if (preferences.prioritizeSinkingFunds) {
    // Sinking funds first
    sinkingFundContributions.forEach(contribution => {
      const allocateAmount = Math.min(contribution.suggestedAmount, remainingForAllocation);
      if (allocateAmount > 0) {
        allocation.sinkingFunds.push({
          ...contribution,
          suggestedAmount: allocateAmount
        });
        remainingForAllocation -= allocateAmount;
      }
    });
  }

  // Variable expenses (essential first) - Now with actual spending data
  const budgetAwareExpenses = calculateBudgetAwareVariableExpenses(variableExpenses, paycheckPeriod, actualSpendingData);
  const essentialCategories = ['housing', 'utilities', 'food', 'transportation'];
  const essentialExpenses = budgetAwareExpenses.filter(exp => 
    essentialCategories.includes(exp.category.toLowerCase()) && exp.remainingBudget > 0
  );

  essentialExpenses.forEach(expense => {
    const allocateAmount = Math.min(expense.remainingBudget, expense.proratedAmount, remainingForAllocation);
    if (allocateAmount > 0) {
      allocation.variableExpenses.push({
        id: expense.id,
        name: expense.name,
        category: expense.category,
        suggestedAmount: allocateAmount,
        isProportional: allocateAmount < expense.remainingBudget,
        budgetRemaining: expense.remainingBudget,
        actualSpent: expense.actualSpent
      });
      remainingForAllocation -= allocateAmount;
    }
  });

  // Goals (urgent first)
  const proratedGoals = calculateProratedGoals(goals, paycheckPeriod);
  const urgentGoals = proratedGoals.filter(goal => goal.isUrgent);
  
  urgentGoals.forEach(goal => {
    const allocateAmount = Math.min(goal.proratedAmount, remainingForAllocation);
    if (allocateAmount > 0) {
      allocation.savingsGoals.push({
        id: goal.id,
        name: goal.name,
        suggestedAmount: allocateAmount,
        monthlyTarget: goal.monthlyTarget
      });
      remainingForAllocation -= allocateAmount;
    }
  });

  // Sinking funds (if not prioritized earlier)
  if (!preferences.prioritizeSinkingFunds) {
    sinkingFundContributions.forEach(contribution => {
      const allocateAmount = Math.min(contribution.suggestedAmount, remainingForAllocation);
      if (allocateAmount > 0) {
        allocation.sinkingFunds.push({
          ...contribution,
          suggestedAmount: allocateAmount
        });
        remainingForAllocation -= allocateAmount;
      }
    });
  }

  // Remaining variable expenses - Now with actual spending data
  const nonEssentialExpenses = budgetAwareExpenses.filter(exp => 
    !essentialCategories.includes(exp.category.toLowerCase()) && exp.remainingBudget > 0
  );

  nonEssentialExpenses.forEach(expense => {
    const allocateAmount = Math.min(expense.remainingBudget, expense.proratedAmount, remainingForAllocation);
    if (allocateAmount > 0) {
      allocation.variableExpenses.push({
        id: expense.id,
        name: expense.name,
        category: expense.category,
        suggestedAmount: allocateAmount,
        isProportional: allocateAmount < expense.remainingBudget,
        budgetRemaining: expense.remainingBudget,
        actualSpent: expense.actualSpent
      });
      remainingForAllocation -= allocateAmount;
    }
  });

  // Remaining goals
  const normalGoals = proratedGoals.filter(goal => !goal.isUrgent);
  normalGoals.forEach(goal => {
    const allocateAmount = Math.min(goal.proratedAmount, remainingForAllocation);
    if (allocateAmount > 0) {
      allocation.savingsGoals.push({
        id: goal.id,
        name: goal.name,
        suggestedAmount: allocateAmount,
        monthlyTarget: goal.monthlyTarget
      });
      remainingForAllocation -= allocateAmount;
    }
  });

  // Any remaining funds go to carryover
  if (remainingForAllocation > 0) {
    allocation.carryover = {
      amount: remainingForAllocation,
      reason: `Unallocated funds - consider extra sinking fund contributions or debt payments`
    };
  }

  return allocation;
};

// Calculate sinking fund contributions for a specific paycheck period
const calculatePaycheckSinkingFundContributions = (
  sinkingFunds: SinkingFund[],
  paycheckPeriod: PaycheckPeriod,
  preferences: PaycheckPreferences
): Array<{
  id: string;
  name: string;
  suggestedAmount: number;
  contributionFrequency: ContributionFrequency;
  targetAmount: number;
  currentAmount: number;
  nextExpenseDate?: Date;
  isUrgent: boolean;
  missedContributions?: number;
}> => {
  const activeFunds = sinkingFunds.filter(fund => fund.isActive);
  
  return activeFunds.map(fund => {
    const contribution = calculateSinkingFundPaycheckContribution(
      fund,
      paycheckPeriod,
      preferences
    );

    // Determine urgency based on deadline
    const isUrgent = fund.nextExpenseDate ? 
      differenceInMonths(fund.nextExpenseDate, new Date()) <= 6 : false;

    // Calculate missed contributions
    const missedContributions = calculateMissedContributions(fund, paycheckPeriod);

    return {
      id: fund.id,
      name: fund.name,
      suggestedAmount: contribution,
      contributionFrequency: fund.contributionFrequency,
      targetAmount: fund.targetAmount,
      currentAmount: fund.currentAmount,
      nextExpenseDate: fund.nextExpenseDate,
      isUrgent,
      missedContributions
    };
  }).sort((a, b) => {
    // Sort by strategy preference
    switch (preferences.sinkingFundStrategy) {
      case 'deadline-priority':
        if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1;
        if (a.nextExpenseDate && b.nextExpenseDate) {
          return a.nextExpenseDate.getTime() - b.nextExpenseDate.getTime();
        }
        return 0;
      
      case 'frequency-based':
        // Match paycheck frequency when possible
        const paycheckFrequency = inferPaycheckFrequency(paycheckPeriod);
        const aMatches = matchesPaycheckFrequency(a.contributionFrequency, paycheckFrequency);
        const bMatches = matchesPaycheckFrequency(b.contributionFrequency, paycheckFrequency);
        if (aMatches !== bMatches) return aMatches ? -1 : 1;
        return (b.missedContributions || 0) - (a.missedContributions || 0);
      
      case 'proportional':
      default:
        // Proportional by target amount
        return b.targetAmount - a.targetAmount;
    }
  });
};

// Calculate individual sinking fund contribution for a paycheck
const calculateSinkingFundPaycheckContribution = (
  fund: SinkingFund,
  paycheckPeriod: PaycheckPeriod,
  preferences: PaycheckPreferences
): number => {
  const remaining = fund.targetAmount - fund.currentAmount;
  if (remaining <= 0) return 0;

  // Determine if this paycheck should contribute based on frequency
  const paycheckFrequency = inferPaycheckFrequency(paycheckPeriod);
  const shouldContribute = shouldContributeThisPaycheck(
    fund.contributionFrequency,
    paycheckFrequency,
    paycheckPeriod.paycheckDate
  );

  if (!shouldContribute) return 0;

  // Calculate contribution amount based on frequency and timing
  let contributionAmount = 0;

  switch (fund.contributionFrequency) {
    case 'weekly':
      // For weekly funds, contribute every paycheck if bi-weekly or weekly pay
      if (paycheckFrequency === 'weekly') {
        contributionAmount = fund.monthlyContribution / 4.33; // ~4.33 weeks per month
      } else if (paycheckFrequency === 'bi-weekly') {
        contributionAmount = fund.monthlyContribution / 2.17; // ~2.17 bi-weekly periods per month
      } else {
        contributionAmount = fund.monthlyContribution;
      }
      break;

    case 'bi-weekly':
      if (paycheckFrequency === 'bi-weekly') {
        contributionAmount = fund.monthlyContribution / 2.17;
      } else if (paycheckFrequency === 'weekly') {
        // Skip every other week
        contributionAmount = shouldContributeThisPaycheck('bi-weekly', 'weekly', paycheckPeriod.paycheckDate) 
          ? fund.monthlyContribution / 2.17 : 0;
      } else {
        contributionAmount = fund.monthlyContribution;
      }
      break;

    case 'monthly':
      if (paycheckFrequency === 'monthly') {
        contributionAmount = fund.monthlyContribution;
      } else if (paycheckFrequency === 'bi-weekly') {
        contributionAmount = fund.monthlyContribution / 2.17;
      } else if (paycheckFrequency === 'weekly') {
        contributionAmount = fund.monthlyContribution / 4.33;
      }
      break;

    case 'quarterly':
      // Only contribute once per quarter
      if (isQuarterlyContributionDue(paycheckPeriod.paycheckDate)) {
        contributionAmount = fund.monthlyContribution * 3; // 3 months worth
      }
      break;

    case 'annually':
      // Only contribute once per year
      if (isAnnualContributionDue(paycheckPeriod.paycheckDate, fund.nextExpenseDate)) {
        contributionAmount = fund.monthlyContribution * 12; // 12 months worth
      }
      break;
  }

  // Apply timing mode adjustments
  if (preferences.timingMode === 'next-period') {
    // Adjust for next period timing - this could modify the amount or timing
    contributionAmount = adjustForNextPeriodTiming(contributionAmount, fund, paycheckPeriod);
  }

  // Cap at remaining amount needed
  return Math.min(contributionAmount, remaining);
};

// Helper functions for sinking fund calculations
const inferPaycheckFrequency = (period: PaycheckPeriod): 'weekly' | 'bi-weekly' | 'monthly' => {
  if (!period.nextPaycheckDate) return 'bi-weekly'; // Default assumption
  
  const daysBetween = differenceInDays(period.nextPaycheckDate, period.paycheckDate);
  
  if (daysBetween <= 8) return 'weekly';
  if (daysBetween <= 16) return 'bi-weekly';
  return 'monthly';
};

const matchesPaycheckFrequency = (
  contributionFreq: ContributionFrequency, 
  paycheckFreq: 'weekly' | 'bi-weekly' | 'monthly'
): boolean => {
  return (contributionFreq === 'weekly' && paycheckFreq === 'weekly') ||
         (contributionFreq === 'bi-weekly' && paycheckFreq === 'bi-weekly') ||
         (contributionFreq === 'monthly' && paycheckFreq === 'monthly');
};

const shouldContributeThisPaycheck = (
  contributionFreq: ContributionFrequency,
  paycheckFreq: 'weekly' | 'bi-weekly' | 'monthly',
  paycheckDate: Date
): boolean => {
  // For matching frequencies, always contribute
  if (matchesPaycheckFrequency(contributionFreq, paycheckFreq)) {
    return true;
  }

  // For mismatched frequencies, use date-based logic
  const weekOfMonth = Math.ceil(paycheckDate.getDate() / 7);
  
  switch (contributionFreq) {
    case 'bi-weekly':
      // Contribute every other paycheck for weekly pay
      return paycheckFreq === 'weekly' ? weekOfMonth % 2 === 1 : true;
    
    case 'monthly':
      // Contribute on first paycheck of month
      return weekOfMonth === 1;
    
    case 'quarterly':
      // Contribute on first paycheck of quarter
      const month = paycheckDate.getMonth();
      return (month % 3 === 0) && weekOfMonth === 1;
    
    case 'annually':
      // Contribute once per year based on fund's target date
      return isAnnualContributionDue(paycheckDate);
    
    default:
      return true;
  }
};

const calculateMissedContributions = (
  fund: SinkingFund,
  paycheckPeriod: PaycheckPeriod
): number => {
  // Calculate how many contributions should have been made by now
  // This is a simplified calculation - in production, you'd track actual contribution history
  const monthsSinceStart = differenceInMonths(new Date(), fund.createdAt);
  const expectedContributions = Math.floor(monthsSinceStart * getContributionMultiplier(fund.contributionFrequency));
  const actualContributions = Math.floor(fund.currentAmount / (fund.monthlyContribution || 1));
  
  return Math.max(0, expectedContributions - actualContributions);
};

const getContributionMultiplier = (frequency: ContributionFrequency): number => {
  switch (frequency) {
    case 'weekly': return 4.33;
    case 'bi-weekly': return 2.17;
    case 'monthly': return 1;
    case 'quarterly': return 0.33;
    case 'annually': return 0.083;
    default: return 1;
  }
};

const isQuarterlyContributionDue = (date: Date): boolean => {
  const month = date.getMonth();
  const dayOfMonth = date.getDate();
  // First paycheck of quarter months (January, April, July, October)
  return (month % 3 === 0) && dayOfMonth <= 7;
};

const isAnnualContributionDue = (date: Date, targetDate?: Date): boolean => {
  if (targetDate) {
    // Contribute a few months before the target date
    const monthsUntilTarget = differenceInMonths(targetDate, date);
    return monthsUntilTarget <= 3 && monthsUntilTarget >= 2;
  }
  
  // Default to January for annual contributions
  return date.getMonth() === 0 && date.getDate() <= 7;
};

const adjustForNextPeriodTiming = (
  amount: number,
  fund: SinkingFund,
  paycheckPeriod: PaycheckPeriod
): number => {
  // For next-period timing, we might adjust the contribution timing
  // This is a simplified implementation - you could make this more sophisticated
  return amount;
}; 