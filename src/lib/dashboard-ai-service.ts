import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';
import type { DashboardContext } from '@/ai/flows/dashboard-insights';

export class DashboardAIService {
  private supabase;

  constructor() {
    this.supabase = createServerComponentClient({ cookies });
  }

  async buildDashboardContext(userId: string): Promise<DashboardContext> {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));
    const currentYearStart = startOfYear(now);

    // Get current month transactions
    const { data: currentTransactions } = await this.supabase
      .from('transactions')
      .select('amount, description, detailed_type, category_id, date')
      .eq('user_id', userId)
      .gte('date', currentMonthStart.toISOString())
      .lte('date', currentMonthEnd.toISOString())
      .order('date', { ascending: false });

    // Get previous month transactions
    const { data: previousTransactions } = await this.supabase
      .from('transactions')
      .select('amount, description, detailed_type, category_id, date')
      .eq('user_id', userId)
      .gte('date', previousMonthStart.toISOString())
      .lte('date', previousMonthEnd.toISOString())
      .order('date', { ascending: false });

    // Get budget data (variable expenses)
    const budgetData = await this.getBudgetData(userId, currentTransactions || []);

    // Get financial goals
    const { data: goalsData } = await this.supabase
      .from('financial_goals')
      .select('*')
      .eq('user_id', userId);

    // Get debt accounts
    const { data: debtsData } = await this.supabase
      .from('debt_accounts')
      .select('*')
      .eq('user_id', userId);

    // Get recurring items
    const { data: recurringData } = await this.supabase
      .from('recurring_items')
      .select('*')
      .eq('user_id', userId);

    // Get account balances
    const { data: accountsData } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId);

    return {
      timeframe: {
        currentMonth: {
          start: currentMonthStart,
          end: currentMonthEnd,
        },
        previousMonth: {
          start: previousMonthStart,
          end: previousMonthEnd,
        },
        currentYear: currentYearStart,
      },
      financialData: {
        transactions: (currentTransactions || []).map(t => ({
          amount: Math.abs(t.amount),
          description: t.description,
          detailedType: t.detailed_type,
          categoryId: t.category_id,
          date: new Date(t.date),
        })),
        previousMonthTransactions: (previousTransactions || []).map(t => ({
          amount: Math.abs(t.amount),
          description: t.description,
          detailedType: t.detailed_type,
          categoryId: t.category_id,
          date: new Date(t.date),
        })),
        budgetData,
        goals: (goalsData || []).map(goal => ({
          id: goal.id,
          name: goal.name,
          targetAmount: goal.target_amount,
          currentAmount: goal.current_amount,
          targetDate: new Date(goal.target_date),
          monthlyContribution: this.calculateMonthlyContribution(
            goal.target_amount,
            goal.current_amount,
            new Date(goal.target_date)
          ),
        })),
        debts: (debtsData || []).map(debt => ({
          id: debt.id,
          name: debt.name,
          balance: debt.balance,
          minimumPayment: debt.minimum_payment,
          apr: debt.apr,
        })),
        recurringItems: (recurringData || []).map(item => ({
          name: item.name,
          type: item.type,
          amount: item.amount,
          frequency: item.frequency,
        })),
        accounts: (accountsData || []).map(account => ({
          id: account.id,
          name: account.name,
          balance: account.balance,
          type: account.type,
        })),
      },
      userPreferences: {
        insightLevel: 'moderate' as const,
        focusAreas: ['spending', 'goals', 'budget'],
      },
    };
  }

  private async getBudgetData(userId: string, currentTransactions: any[]) {
    // Try to get variable expenses (new budget system)
    let budgetData: Array<{
      categoryId: string;
      budgetedAmount: number;
      spentAmount: number;
      categoryName: string;
    }> = [];

    try {
      const { data: variableExpenses } = await this.supabase
        .from('variable_expenses')
        .select('*')
        .eq('user_id', userId);

      if (variableExpenses) {
        // Calculate spending for each variable expense category
        budgetData = variableExpenses.map(expense => {
          const spentAmount = currentTransactions
            .filter(t => t.detailed_type === 'variable-expense')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

          return {
            categoryId: expense.category,
            budgetedAmount: expense.amount,
            spentAmount,
            categoryName: expense.name,
          };
        });
      }
    } catch (error) {
      console.warn('Failed to fetch variable expenses, trying budget categories');
      
      // Fallback to budget categories
      const { data: budgetCategories } = await this.supabase
        .from('budget_categories')
        .select('*')
        .eq('user_id', userId);

      if (budgetCategories) {
        budgetData = budgetCategories.map(category => ({
          categoryId: category.id,
          budgetedAmount: category.budgeted_amount,
          spentAmount: currentTransactions
            .filter(t => t.category_id === category.id)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0),
          categoryName: category.name,
        }));
      }
    }

    return budgetData;
  }

  private calculateMonthlyContribution(targetAmount: number, currentAmount: number, targetDate: Date): number {
    const now = new Date();
    const monthsRemaining = Math.max(1, 
      (targetDate.getFullYear() - now.getFullYear()) * 12 + 
      (targetDate.getMonth() - now.getMonth())
    );
    
    const amountNeeded = targetAmount - currentAmount;
    return Math.max(0, amountNeeded / monthsRemaining);
  }
} 