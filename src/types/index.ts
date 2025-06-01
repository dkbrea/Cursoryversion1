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
  { value: 'food', label: 'Food (Groceries, Restaurants)' },
  { value: 'utilities', label: 'Utilities (Energy, Water, Internet, Phone)' },
  { value: 'transportation', label: 'Transportation (Insurance, Gasoline, Maint.)' },
  { value: 'health', label: 'Health (Meds, Insurance, Gym)' },
  { value: 'personal', label: 'Personal' },
  { value: 'home-family', label: 'Home/Family' },
  { value: 'media-productivity', label: 'Media/Productivity' },
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
  category: PredefinedRecurringCategoryValue; // Using the same categories as recurring items
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
