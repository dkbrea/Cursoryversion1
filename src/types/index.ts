export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface Category {
  id: string;
  name: string;
  userId: string; // Assuming categories are user-specific
  createdAt: Date;
}

export type TransactionType = 'income' | 'expense' | 'transfer'; // Overall flow direction

export const transactionDetailedTypes = ['income', 'variable-expense', 'fixed-expense', 'subscription', 'debt-payment', 'goal-contribution'] as const;
export type TransactionDetailedType = typeof transactionDetailedTypes[number];


export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number; // Positive for income or transfer source, negative for expense or transfer destination if viewed from source account
  type: TransactionType; 
  detailedType?: TransactionDetailedType; 
  categoryId?: string | null; 
  accountId?: string; // Now optional since we might use debtAccountId instead
  debtAccountId?: string; // New field for debt account transactions
  toAccountId?: string | null; 
  sourceId?: string; 
  userId: string;
  source?: string; 
  notes?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ExpenseByCategory {
  category: string;
  amount: number;
}

export type AccountType = 'checking' | 'savings' | 'credit card' | 'other';
export const accountTypes: AccountType[] = ['checking', 'savings', 'credit card', 'other'];

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  bankName?: string;
  last4?: string;
  balance: number;
  isPrimary: boolean;
  userId: string;
  createdAt: Date;
}

// Debt Management Types
export type DebtAccountType = 'credit-card' | 'line-of-credit' | 'student-loan' | 'personal-loan' | 'mortgage' | 'auto-loan' | 'other';

export const debtAccountTypes: DebtAccountType[] = ['credit-card', 'line-of-credit', 'student-loan', 'personal-loan', 'mortgage', 'auto-loan', 'other'];

export type PaymentFrequency = 'monthly' | 'bi-weekly' | 'weekly' | 'annually' | 'other';
export const paymentFrequencies: PaymentFrequency[] = ['monthly', 'bi-weekly', 'weekly', 'annually', 'other'];


export interface DebtAccount {
  id: string;
  name: string;
  type: DebtAccountType;
  balance: number;
  apr: number; 
  minimumPayment: number;
  paymentDayOfMonth?: number; 
  nextDueDate: Date;
  paymentFrequency: PaymentFrequency;
  userId: string;
  createdAt: Date;
}

export type DebtPayoffStrategy = 'snowball' | 'avalanche';

export interface DebtPlan {
  debtAccounts: DebtAccount[];
  strategy: DebtPayoffStrategy | null;
  userId: string;
}

// Recurring Items Types
export const recurringItemTypes = ['income', 'subscription', 'fixed-expense'] as const;
export type RecurringItemType = typeof recurringItemTypes[number];

export const recurringFrequencies = ['daily', 'weekly', 'bi-weekly', 'monthly', 'semi-monthly', 'quarterly', 'yearly'] as const;
export type RecurringFrequency = typeof recurringFrequencies[number];

export const predefinedRecurringCategories = [
  { value: 'housing', label: 'Housing (Rent/Mortgage)' },
  { value: 'utilities', label: 'Utilities (Energy, Water, Internet, Phone)' },
  { value: 'transportation', label: 'Transportation (Insurance, Gasoline, Maint.)' },
  { value: 'food', label: 'Food (Groceries, Restaurants)' },
  { value: 'health', label: 'Health (Meds, Insurance, Gym)' },
  { value: 'personal', label: 'Personal (Toiletries, Salon, Daycare, etc.)' },
  { value: 'home-family', label: 'Home/Family (Kids, Household needs)' },
  { value: 'media-productivity', label: 'Media/Productivity (Netflix, iCloud, etc.)' },
  { value: 'gifts', label: 'Gifts & Holidays' },
  { value: 'pets', label: 'Pets (Vet, Food, Grooming)' },
  { value: 'education', label: 'Education (Tuition, Supplies)' },
  { value: 'subscriptions', label: 'Other Subscriptions (Apps, Tools, Software)' },
  { value: 'self-care', label: 'Self-Care (Wellness, Hobbies)' },
  { value: 'clothing', label: 'Clothing & Shoes' },
  { value: 'home-maintenance', label: 'Home Maintenance & Repairs' },
  { value: 'car-replacement', label: 'Vehicle Replacement' },
  { value: 'vacation', label: 'Vacation & Travel' },
] as const;
export type PredefinedRecurringCategoryValue = typeof predefinedRecurringCategories[number]['value'];


export interface RecurringItem {
  id: string;
  name: string;
  type: RecurringItemType;
  amount: number; 
  frequency: RecurringFrequency;
  startDate?: Date | null; 
  lastRenewalDate?: Date | null; 
  semiMonthlyFirstPayDate?: Date | null; 
  semiMonthlySecondPayDate?: Date | null; 
  endDate?: Date | null; 
  notes?: string;
  userId: string;
  createdAt: Date;
  categoryId?: PredefinedRecurringCategoryValue | null; 
}

// Unified type for Recurring List
export type UnifiedListItemType = RecurringItemType | 'debt-payment';

export interface UnifiedRecurringListItem {
  id: string; 
  name: string;
  itemDisplayType: UnifiedListItemType; 
  amount: number; 
  frequency: RecurringFrequency | PaymentFrequency; 
  nextOccurrenceDate: Date;
  status: 'Ended' | 'Today' | 'Upcoming';
  isDebt: boolean;
  endDate?: Date | null; 
  startDate?: Date | null;
  lastRenewalDate?: Date | null;
  semiMonthlyFirstPayDate?: Date | null; 
  semiMonthlySecondPayDate?: Date | null; 
  notes?: string;
  source: 'recurring' | 'debt'; 
  categoryId?: PredefinedRecurringCategoryValue | null; 
}

// Variable Expenses Types
export interface VariableExpense {
  id: string;
  name: string;
  category: string; // Changed from union type to string to match database
  amount: number;
  userId: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Legacy type for backward compatibility during migration
export interface BudgetCategory {
  id: string;
  name: string;
  budgetedAmount: number;
  userId: string;
  createdAt: Date;
}

// Financial Goals Types
export const goalIconKeys = ['default', 'home', 'car', 'plane', 'briefcase', 'graduation-cap', 'gift', 'piggy-bank', 'trending-up', 'shield-check'] as const;
export type GoalIconKey = typeof goalIconKeys[number];

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  icon: GoalIconKey;
  userId: string;
  createdAt: Date;
}

export interface FinancialGoalWithContribution extends FinancialGoal {
  monthlyContribution: number;
  monthsRemaining: number;
}

// Sinking Funds Types
export const contributionFrequencies = ['monthly', 'bi-weekly', 'weekly', 'quarterly', 'annually'] as const;
export type ContributionFrequency = typeof contributionFrequencies[number];

export interface SinkingFund {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  nextExpenseDate?: Date;
  category: PredefinedRecurringCategoryValue;
  isRecurring: boolean;
  recurringExpenseId?: string; // Reference to recurring item if this is linked to a recurring expense
  variableExpenseId?: string; // Reference to variable expense if this is linked to a variable expense
  contributionFrequency: ContributionFrequency;
  isActive: boolean;
  userId: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface SinkingFundTransaction {
  id: string;
  sinkingFundId: string;
  amount: number;
  transactionType: 'contribution' | 'withdrawal';
  date: Date;
  description?: string;
  userId: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface SinkingFundWithProgress extends SinkingFund {
  progressPercentage: number;
  monthsToTarget?: number;
  isFullyFunded: boolean;
}

// Investment Types
export const investmentAccountTypes = ['brokerage', 'ira', '401k', 'crypto', 'other'] as const;
export type InvestmentAccountType = typeof investmentAccountTypes[number];

export interface InvestmentAccount {
  id: string;
  name: string;
  type: InvestmentAccountType;
  institution?: string;
  currentValue: number;
  userId: string;
  createdAt: Date;
}

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  value: number;
  shares: number;
  price: number;
  changePercent: number; 
  logoUrl?: string; 
  userId: string;
  accountId?: string; 
}


// Budget Forecast Types 
export interface MonthlyForecastIncomeItem {
  id: string; 
  name: string;
  totalAmountInMonth: number; 
}
export interface MonthlyForecastFixedExpenseItem {
  id: string; 
  name: string;
  totalAmountInMonth: number; 
  categoryId?: PredefinedRecurringCategoryValue | null;
}
export interface MonthlyForecastSubscriptionItem {
  id: string; 
  name: string;
  totalAmountInMonth: number; 
  categoryId?: PredefinedRecurringCategoryValue | null;
}
export interface MonthlyForecastDebtPaymentItem {
  id: string; 
  name: string;
  totalAmountInMonth: number; // This is minimum payment
  debtType: DebtAccountType;
  additionalPayment?: number; 
}


export interface MonthlyForecastVariableExpense {
  id: string; 
  name: string;
  monthSpecificAmount: number; 
}

export interface MonthlyForecastGoalContribution {
  id: string; 
  name: string;
  monthSpecificContribution: number; 
}

export interface MonthlyForecastSinkingFundContribution {
  id: string; 
  name: string;
  monthSpecificContribution: number; 
}

export interface MonthlyForecast {
  month: Date; 
  monthLabel: string; 
  
  incomeItems: MonthlyForecastIncomeItem[];
  fixedExpenseItems: MonthlyForecastFixedExpenseItem[];
  subscriptionItems: MonthlyForecastSubscriptionItem[];
  debtPaymentItems: MonthlyForecastDebtPaymentItem[];
  
  totalIncome: number;
  totalFixedExpenses: number; 
  totalSubscriptions: number; 
  totalDebtMinimumPayments: number; 
  
  variableExpenses: MonthlyForecastVariableExpense[];
  totalVariableExpenses: number; 
  
  goalContributions: MonthlyForecastGoalContribution[];
  totalGoalContributions: number; 

  sinkingFundContributions: MonthlyForecastSinkingFundContribution[];
  totalSinkingFundContributions: number;

  remainingToBudget: number;
  isBalanced: boolean;
}

// Report Specific Types
export interface CategorySpending {
  name: string;
  value: number; // amount spent
  percentage?: number;
  color: string;
}

export interface NetWorthDataPoint {
  month: string; // e.g., "Jan '24"
  netWorth: number;
  assets: number;
  liabilities: number;
}

// Types for new Goal & Savings Dashboard
export interface SavingsBreakdownItem {
  name: string;
  value: number; // currentAmount of the goal
  color: string;
}

export interface GoalPerformanceDataPoint {
  month: string; // e.g., "Jan"
  saving: number;
}

export interface SavingsTransactionItem {
  id: string;
  date: Date;
  goalName: string;
  amount: number;
  method: 'Auto-Save' | 'Manual';
  status: 'Pending' | 'Completed' | 'Failed';
}

// Paycheck Pulse Types
export interface PaycheckPeriod {
  id: string;
  paycheckDate: Date;
  paycheckAmount: number;
  nextPaycheckDate?: Date;
  periodStart: Date;
  periodEnd: Date;
  paycheckSource: 'recurring' | 'estimated'; // Whether this is from a recurring income item or estimated
  planKey?: PaycheckManualPlan | 'auto'; // Optional: used for dashboard selection
}

// Paycheck timing preference for expense allocation
export type PaycheckTimingMode = 'current-period' | 'next-period';

export type PaycheckAllocationMode = 'auto' | 'manual';
export type PaycheckManualPlan = 'plan1' | 'plan2' | 'plan3' | null;

export interface PaycheckPreferences {
  timingMode: PaycheckTimingMode; // Whether to allocate for current period or next period expenses
  includeBufferDays: number; // Buffer days for expense timing (e.g., 3 days before paycheck)
  prioritizeSinkingFunds: boolean; // Whether to prioritize sinking fund contributions
  sinkingFundStrategy: 'proportional' | 'frequency-based' | 'deadline-priority'; // How to allocate sinking fund contributions
  allocationMode: PaycheckAllocationMode; // 'auto' or 'manual' (now required)
  activeManualPlan?: PaycheckManualPlan; // 'plan1', 'plan2', 'plan3', or null
  manualPlanDateRanges?: {
    plan1?: { start: string; end: string };
    plan2?: { start: string; end: string };
    plan3?: { start: string; end: string };
  };
}

export interface PaycheckExpenseItem {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  type: 'fixed-expense' | 'subscription' | 'debt-payment';
  source: 'recurring' | 'debt';
  categoryId?: PredefinedRecurringCategoryValue | null;
}

// Enhanced paycheck allocation with sinking funds
export interface PaycheckAllocation {
  variableExpenses: Array<{
    id: string;
    name: string;
    category: string;
    suggestedAmount: number;
    isProportional?: boolean;
    budgetRemaining?: number;
    actualSpent?: number;
  }>;
  savingsGoals: Array<{
    id: string;
    name: string;
    suggestedAmount: number;
    monthlyTarget: number;
  }>;
  sinkingFunds: Array<{
    id: string;
    name: string;
    suggestedAmount: number;
    contributionFrequency: ContributionFrequency;
    targetAmount: number;
    currentAmount: number;
    nextExpenseDate?: Date;
    isUrgent: boolean; // Based on deadline proximity
    missedContributions?: number; // How many expected contributions were missed
  }>;
  carryover: {
    amount: number;
    reason: string;
  };
}

export interface PaycheckBreakdown {
  period: PaycheckPeriod;
  obligatedExpenses: PaycheckExpenseItem[];
  totalObligated: number;
  remainingAfterObligated: number;
  allocation: PaycheckAllocation;
  totalAllocated: number;
  finalRemaining: number;
  isDeficit: boolean; // Whether expenses exceed income
  deficitAmount?: number;
}

export type PaycheckTimeframe = 'past' | 'current' | 'future';

// User Preferences Types
export interface UserPreferences {
  id: string;
  userId: string;
  currency: string;
  dateFormat: string;
  theme: string;
  hideBalances: boolean;
  emailNotifications: boolean;
  browserNotifications: boolean;
  mobileNotifications: boolean;
  timezone: string;
  financialTrackingStartDate?: Date; // User's preferred start date for aged billing and historical tracking
  paycheckPreferences?: PaycheckPreferences;
  debtPayoffStrategy?: DebtPayoffStrategy;
  insightLevel?: 'minimal' | 'moderate' | 'detailed';
  focusAreas?: string[];
  forecastOverrides?: Record<string, ForecastOverride>;
  createdAt: Date;
  updatedAt?: Date;
}

// Forecast Override Types
export type ForecastOverrideType = 'variable-expense' | 'goal-contribution' | 'debt-additional-payment' | 'sinking-fund-contribution';

export interface ForecastOverride {
  id: string;
  userId: string;
  itemId: string;
  itemType: ForecastOverrideType;
  monthYear: string; // Format: YYYY-MM
  overrideAmount: number;
  originalAmount: number;
  reason?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ForecastOverrides {
  [key: string]: ForecastOverride; // key format: `${itemId}-${monthYear}-${type}`
}

// Enhanced PaycheckBreakdown with additional fields for insights
export interface EnhancedPaycheckBreakdown extends PaycheckBreakdown {
  warnings?: string[];
  financialHealthScore?: number;
  actionableInsights?: string[];
}

// Jade Context Types
export interface JadeUserPreferences {
  insightLevel: 'minimal' | 'moderate' | 'detailed';
  debtPayoffStrategy?: DebtPayoffStrategy;
  timezone: string;
  focusAreas?: string[];
}

export interface DashboardJadeContext {
  timeframe: {
    currentMonth: {
      start: Date;
      end: Date;
    };
    previousMonth: {
      start: Date;
      end: Date;
    };
    currentYear: Date;
  };
  financialData: {
    transactions: Array<{
      amount: number;
      description: string;
      detailedType: string;
      categoryId?: string;
      date: Date;
    }>;
    previousMonthTransactions: Array<{
      amount: number;
      description: string;
      detailedType: string;
      categoryId?: string;
      date: Date;
    }>;
    budgetData: Array<{
      categoryId: string;
      budgetedAmount: number;
      spentAmount: number;
      categoryName: string;
    }>;
    goals: Array<{
      id: string;
      name: string;
      targetAmount: number;
      currentAmount: number;
      targetDate: Date;
      monthlyContribution: number;
    }>;
    debts: Array<{
      id: string;
      name: string;
      balance: number;
      minimumPayment: number;
      apr: number;
    }>;
    recurringItems: Array<{
      name: string;
      type: string;
      amount: number;
      frequency: string;
    }>;
    accounts: Array<{
      id: string;
      name: string;
      balance: number;
      type: string;
    }>;
    totalIncome: number;
    totalExpenses: number;
    netWorth: number;
    monthlyBudgetUtilization: number;
    goalProgress: Array<{
      name: string;
      progress: number;
      target: number;
    }>;
  };
  userPreferences?: JadeUserPreferences;
}

// Budget Insight Types
export interface BudgetInsightContext {
  monthYear: string;
  totalIncome: number;
  totalFixedExpenses: number;
  totalVariableExpenses: number;
  totalActualExpenses: number;
  budgetUtilization: number;
  categoryBreakdown: Array<{
    category: string;
    budgeted: number;
    spent: number;
    utilization: number;
  }>;
  userPreferences?: JadeUserPreferences;
}

// Navigation Cache Types
export interface CachedNavigationData {
  data: any;
  timestamp: number;
  expires: number;
}

// Investment Related Extended Types
export interface InvestmentAccountWithHoldings extends InvestmentAccount {
  holdings: Holding[];
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}

// Transaction Summary Types
export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  netFlow: number;
  transactionCount: number;
  averageTransactionAmount: number;
  largestExpense: Transaction | null;
  largestIncome: Transaction | null;
}

// Category Analysis Types
export interface CategoryAnalysis {
  categoryId: string;
  categoryName: string;
  totalSpent: number;
  transactionCount: number;
  averageAmount: number;
  percentOfTotalSpending: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

// Date Range Types
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Financial Health Analysis Types
export interface FinancialHealthMetrics {
  debtToIncomeRatio: number;
  savingsRate: number;
  emergencyFundMonths: number;
  budgetVariance: number;
  goalProgressRate: number;
  overallScore: number;
  recommendations: string[];
}

// Budget Analysis Types
export interface BudgetVariance {
  categoryId: string;
  categoryName: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
  status: 'over' | 'under' | 'on-track';
}

// Paycheck Analysis Types
export interface PaycheckAnalysis {
  paycheckFrequency: 'weekly' | 'bi-weekly' | 'monthly' | 'irregular';
  averageAmount: number;
  predictedNextPaycheck: Date;
  cashFlowGaps: Array<{
    startDate: Date;
    endDate: Date;
    severity: 'low' | 'medium' | 'high';
  }>;
}

// Spending Pattern Types
export interface SpendingPattern {
  pattern: 'weekly' | 'monthly' | 'seasonal' | 'irregular';
  averageWeeklySpend: number;
  peakSpendingDay: string;
  peakSpendingCategory: string;
  trends: Array<{
    period: string;
    amount: number;
    change: number;
  }>;
}
