import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Transaction, Category, VariableExpense } from '@/types';
import type { TransactionContext } from '@/ai/flows/financial-insights';
import type { PatternContext } from '@/ai/flows/pattern-recognition';

export class AIContextService {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClientComponentClient();
  }

  async buildTransactionContext(
    userId: string,
    currentTransaction: {
      amount: number;
      description: string;
      detailedType: string;
      categoryId?: string;
      date: Date;
    }
  ): Promise<TransactionContext> {
    // Ensure date is properly converted to Date object
    const transactionDate = currentTransaction.date instanceof Date 
      ? currentTransaction.date 
      : new Date(currentTransaction.date);

    // Get recent transactions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentTransactions } = await this.supabase
      .from('transactions')
      .select('amount, description, detailed_type, category_id, date')
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgo.toISOString())
      .order('date', { ascending: false })
      .limit(50);

    console.log('AI Context Debug - thirtyDaysAgo:', thirtyDaysAgo.toISOString());
    console.log('AI Context Debug - recentTransactions:', recentTransactions);
    console.log('AI Context Debug - current transaction:', currentTransaction);

    // Get category spending patterns
    const { data: categorySpending } = await this.supabase
      .from('transactions')
      .select(`
        category_id,
        amount,
        categories(name)
      `)
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgo.toISOString())
      .not('category_id', 'is', null);

    // Process category spending data
    const categorySpendingMap = new Map();
    categorySpending?.forEach((transaction: any) => {
      const categoryId = transaction.category_id;
      const amount = Math.abs(transaction.amount);
      
      if (!categorySpendingMap.has(categoryId)) {
        categorySpendingMap.set(categoryId, {
          categoryId,
          categoryName: transaction.categories?.name || 'Uncategorized',
          totalAmount: 0,
          transactionCount: 0,
          amounts: [],
        });
      }
      
      const category = categorySpendingMap.get(categoryId);
      category.totalAmount += amount;
      category.transactionCount += 1;
      category.amounts.push(amount);
    });

    const categorySpendingArray = Array.from(categorySpendingMap.values()).map(category => ({
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      totalAmount: category.totalAmount,
      transactionCount: category.transactionCount,
      averageAmount: category.totalAmount / category.transactionCount,
      timeframe: '30 days',
    }));

    // Get merchant spending for financial insights format
    const merchantSpending = this.analyzeMerchantPatternsForInsights(recentTransactions || []);

    // Get budget data if available
    const { data: variableExpenses } = await this.supabase
      .from('variable_expenses')
      .select('*')
      .eq('user_id', userId);

    const budgetData = variableExpenses ? {
      categoryBudgets: variableExpenses.map(expense => ({
        categoryId: expense.category,
        budgetedAmount: expense.amount,
        spentAmount: categorySpendingArray.find(cs => cs.categoryId === expense.category)?.totalAmount || 0,
        timeframe: 'monthly',
      })),
    } : undefined;

    return {
      currentTransaction: {
        ...currentTransaction,
        date: transactionDate
      },
      historicalData: {
        recentTransactions: (recentTransactions || []).map(t => ({
          amount: Math.abs(t.amount),
          description: t.description,
          detailedType: t.detailed_type,
          categoryId: t.category_id,
          date: new Date(t.date),
        })),
        categorySpending: categorySpendingArray,
        merchantSpending,
      },
      budgetData,
      userPreferences: {
        insightLevel: 'moderate' as const,
      },
    };
  }

  async buildPatternContext(
    userId: string,
    currentTransaction: {
      amount: number;
      description: string;
      detailedType: string;
      categoryId?: string;
      date: Date;
    }
  ): Promise<PatternContext> {
    // Ensure date is properly converted to Date object
    const transactionDate = currentTransaction.date instanceof Date 
      ? currentTransaction.date 
      : new Date(currentTransaction.date);

    // Get historical data for pattern analysis
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: historicalTransactions } = await this.supabase
      .from('transactions')
      .select('amount, description, detailed_type, category_id, date')
      .eq('user_id', userId)
      .gte('date', sixtyDaysAgo.toISOString())
      .order('date', { ascending: false });

    // Get recurring items for pattern matching
    const { data: recurringItems } = await this.supabase
      .from('recurring_items')
      .select('*')
      .eq('user_id', userId);

    const userPatterns = this.analyzeUserPatterns(historicalTransactions || [], recurringItems || []);
    
    const timeContext = {
      dayOfWeek: transactionDate.getDay(),
      dayOfMonth: transactionDate.getDate(),
      isWeekend: transactionDate.getDay() === 0 || transactionDate.getDay() === 6,
    };

    return {
      currentTransaction: {
        ...currentTransaction,
        date: transactionDate
      },
      userPatterns,
      timeContext,
    };
  }

  private analyzeMerchantPatternsForInsights(transactions: any[]) {
    const merchantMap = new Map();
    
    transactions.forEach(transaction => {
      const merchant = this.extractMerchantName(transaction.description);
      const amount = Math.abs(transaction.amount);
      
      if (!merchantMap.has(merchant)) {
        merchantMap.set(merchant, {
          merchant,
          amounts: [],
          dates: [],
        });
      }
      
      const merchantData = merchantMap.get(merchant);
      merchantData.amounts.push(amount);
      merchantData.dates.push(new Date(transaction.date));
    });

    return Array.from(merchantMap.values())
      .filter(merchant => merchant.amounts.length > 1)
      .map(merchant => {
        const amounts = merchant.amounts;
        const dates = merchant.dates.sort((a: Date, b: Date) => a.getTime() - b.getTime());
        
        return {
          merchant: merchant.merchant,
          totalAmount: amounts.reduce((sum: number, amt: number) => sum + amt, 0),
          transactionCount: amounts.length,
          averageAmount: amounts.reduce((sum: number, amt: number) => sum + amt, 0) / amounts.length,
          lastTransactionDate: dates[dates.length - 1],
        };
      });
  }

  private analyzeMerchantPatternsForPatterns(transactions: any[]) {
    const merchantMap = new Map();
    
    transactions.forEach(transaction => {
      const merchant = this.extractMerchantName(transaction.description);
      const amount = Math.abs(transaction.amount);
      
      if (!merchantMap.has(merchant)) {
        merchantMap.set(merchant, {
          merchant,
          amounts: [],
          dates: [],
        });
      }
      
      const merchantData = merchantMap.get(merchant);
      merchantData.amounts.push(amount);
      merchantData.dates.push(new Date(transaction.date));
    });

    return Array.from(merchantMap.values())
      .filter(merchant => merchant.amounts.length > 1)
      .map(merchant => {
        const amounts = merchant.amounts;
        const dates = merchant.dates.sort((a: Date, b: Date) => a.getTime() - b.getTime());
        
        return {
          merchant: merchant.merchant,
          averageAmount: amounts.reduce((sum: number, amt: number) => sum + amt, 0) / amounts.length,
          frequencyDays: this.calculateAverageFrequency(dates),
          lastTransaction: dates[dates.length - 1],
          transactionCount: amounts.length,
          amountRange: {
            min: Math.min(...amounts),
            max: Math.max(...amounts),
          },
        };
      });
  }

  private analyzeUserPatterns(transactions: any[], recurringItems: any[]) {
    // Analyze recurring transaction patterns
    const recurringTransactions = recurringItems.map(item => ({
      description: item.name,
      amount: item.amount,
      frequency: item.frequency,
      lastOccurrence: new Date(item.last_renewal_date || item.start_date),
      categoryId: item.category_id,
    }));

    // Analyze category patterns
    const categoryMap = new Map();
    transactions.forEach(transaction => {
      const categoryId = transaction.category_id;
      if (!categoryId) return;

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          amounts: [],
          dates: [],
        });
      }

      const category = categoryMap.get(categoryId);
      category.amounts.push(Math.abs(transaction.amount));
      category.dates.push(new Date(transaction.date));
    });

    const categoryPatterns = Array.from(categoryMap.entries()).map(([categoryId, data]) => {
      const amounts = data.amounts;
      const dates = data.dates.sort((a: Date, b: Date) => a.getTime() - b.getTime());
      
      return {
        categoryId,
        averageAmount: amounts.reduce((sum: number, amt: number) => sum + amt, 0) / amounts.length,
        typicalRange: {
          min: Math.min(...amounts),
          max: Math.max(...amounts),
        },
        frequencyDays: this.calculateAverageFrequency(dates),
      };
    });

    // Analyze weekly patterns
    const weeklyMap = new Map();
    transactions.forEach(transaction => {
      const dayOfWeek = new Date(transaction.date).getDay();
      if (!weeklyMap.has(dayOfWeek)) {
        weeklyMap.set(dayOfWeek, {
          transactions: [],
          categories: new Set<string>(),
        });
      }
      
      const day = weeklyMap.get(dayOfWeek);
      day.transactions.push(transaction);
      if (transaction.category_id) {
        day.categories.add(transaction.category_id);
      }
    });

    const weeklyPatterns = Array.from(weeklyMap.entries()).map(([dayOfWeek, data]) => ({
      dayOfWeek: Number(dayOfWeek),
      averageTransactions: data.transactions.length,
      commonCategories: Array.from(data.categories) as string[],
    }));

    return {
      recurringTransactions,
      merchantHistory: this.analyzeMerchantPatternsForPatterns(transactions),
      categoryPatterns,
      weeklyPatterns,
    };
  }

  private extractMerchantName(description: string): string {
    // Simple merchant name extraction - remove common transaction codes and normalize
    return description
      .replace(/\*\d+/g, '') // Remove *1234 type codes
      .replace(/\d{2}\/\d{2}/g, '') // Remove dates
      .replace(/[#\-\*]/g, ' ') // Replace special chars with spaces
      .trim()
      .toLowerCase()
      .split(' ')[0] // Take first word as merchant identifier
      || 'unknown';
  }

  private calculateAverageFrequency(dates: Date[]): number {
    if (dates.length < 2) return 0;
    
    const intervals = [];
    for (let i = 1; i < dates.length; i++) {
      const daysBetween = (dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(daysBetween);
    }
    
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }
} 