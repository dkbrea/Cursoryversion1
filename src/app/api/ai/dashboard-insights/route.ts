import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateDashboardInsights } from '@/ai/flows/dashboard-insights';

// For API routes, we'll use the service role key to bypass auth
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    console.log('=== Dashboard insights API called ===');

    // Check environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!supabaseServiceKey 
      });
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Get the user ID from the request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { userId } = body;
    
    if (!userId) {
      console.error('No user ID provided');
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log('Dashboard insights request for user:', userId);

    // Create Supabase client
    let supabase;
    try {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
      console.log('Supabase client created successfully');
    } catch (error) {
      console.error('Error creating Supabase client:', error);
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Test basic Supabase connection
    try {
      const { data, error } = await supabase.from('accounts').select('id').eq('user_id', userId).limit(1);
      if (error) {
        console.error('Supabase connection test failed:', error);
      } else {
        console.log('Supabase connection test successful');
      }
    } catch (error) {
      console.error('Supabase connection test error:', error);
    }

    // Build comprehensive dashboard context
    let dashboardContext;
    try {
      console.log('Building comprehensive dashboard context...');
      
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      
      // Fetch comprehensive financial data in parallel
      const [
        currentTransactions,
        previousTransactions,
        accounts,
        goals,
        debts,
        recurringItems,
        budgetCategories,
        userPreferences
      ] = await Promise.all([
        // Current month transactions
        supabase
          .from('transactions')
          .select('amount, description, detailed_type, category_id, date')
          .eq('user_id', userId)
          .gte('date', currentMonthStart.toISOString())
          .lte('date', currentMonthEnd.toISOString()),
        
        // Previous month transactions for comparison
        supabase
          .from('transactions')
          .select('amount, description, detailed_type, category_id, date')
          .eq('user_id', userId)
          .gte('date', previousMonthStart.toISOString())
          .lte('date', previousMonthEnd.toISOString()),
        
        // Account balances
        supabase
          .from('accounts')
          .select('id, name, balance, type')
          .eq('user_id', userId),
        
        // Financial goals
        supabase
          .from('financial_goals')
          .select('id, name, target_amount, current_amount, target_date')
          .eq('user_id', userId),
        
        // Debt accounts
        supabase
          .from('debt_accounts')
          .select('id, name, balance, minimum_payment, apr')
          .eq('user_id', userId),
        
        // Recurring items
        supabase
          .from('recurring_items')
          .select('name, type, amount, frequency')
          .eq('user_id', userId),
        
        // Budget categories (for budget vs actual analysis)
        supabase
          .from('budget_categories')
          .select('name, budgeted_amount')
          .eq('user_id', userId),
        
        // User preferences including debt strategy
        supabase
          .from('user_preferences')
          .select('debt_payoff_strategy, timezone, insight_level')
          .eq('user_id', userId)
          .single()
      ]);

      console.log('Data fetched:', {
        currentTx: currentTransactions?.data?.length || 0,
        previousTx: previousTransactions?.data?.length || 0,
        accounts: accounts?.data?.length || 0,
        goals: goals?.data?.length || 0,
        debts: debts?.data?.length || 0,
        recurring: recurringItems?.data?.length || 0,
        budget: budgetCategories?.data?.length || 0,
        preferences: userPreferences?.data ? 'found' : 'none'
      });

      // Process budget data with actual spending
      const budgetData = (budgetCategories?.data || []).map((budget: any) => {
        const categorySpent = (currentTransactions?.data || [])
          .filter((tx: any) => tx.category_id === budget.name || tx.description?.toLowerCase().includes(budget.name.toLowerCase()))
          .reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0);
        
        return {
          categoryId: budget.name,
          categoryName: budget.name,
          budgetedAmount: budget.budgeted_amount || 0,
          spentAmount: categorySpent,
        };
      });

      // Calculate financial metrics
      const totalIncome = (currentTransactions?.data || [])
        .filter((tx: any) => tx.detailed_type === 'income')
        .reduce((sum: number, tx: any) => sum + Math.abs(tx.amount || 0), 0);
        
      const totalExpenses = (currentTransactions?.data || [])
        .filter((tx: any) => tx.detailed_type !== 'income')
        .reduce((sum: number, tx: any) => sum + Math.abs(tx.amount || 0), 0);
        
      const totalAssets = (accounts?.data || [])
        .reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0);
        
      const totalLiabilities = (debts?.data || [])
        .reduce((sum: number, debt: any) => sum + (debt.balance || 0), 0);
        
      const netWorth = totalAssets - totalLiabilities;
      
      const totalBudgeted = budgetData.reduce((sum, b) => sum + b.budgetedAmount, 0);
      const monthlyBudgetUtilization = totalBudgeted > 0 ? (totalExpenses / totalBudgeted) * 100 : 0;
      
      const goalProgress = (goals?.data || []).map((g: any) => ({
        name: g.name,
        progress: g.target_amount > 0 ? ((g.current_amount || 0) / g.target_amount) * 100 : 0,
        target: g.target_amount || 0,
      }));

      // Create comprehensive dashboard context
      dashboardContext = {
        timeframe: {
          currentMonth: {
            start: currentMonthStart,
            end: currentMonthEnd,
          },
          previousMonth: {
            start: previousMonthStart,
            end: previousMonthEnd,
          },
          currentYear: new Date(now.getFullYear(), 0, 1),
        },
        financialData: {
          transactions: (currentTransactions?.data || []).map((t: any) => ({
            amount: Math.abs(t.amount || 0),
            description: t.description || 'Unknown',
            detailedType: t.detailed_type || 'expense',
            categoryId: t.category_id,
            date: new Date(t.date),
          })),
          previousMonthTransactions: (previousTransactions?.data || []).map((t: any) => ({
            amount: Math.abs(t.amount || 0),
            description: t.description || 'Unknown',
            detailedType: t.detailed_type || 'expense',
            categoryId: t.category_id,
            date: new Date(t.date),
          })),
          budgetData,
          goals: (goals?.data || []).map((g: any) => ({
            id: g.id,
            name: g.name,
            targetAmount: g.target_amount || 0,
            currentAmount: g.current_amount || 0,
            targetDate: new Date(g.target_date),
            monthlyContribution: 0, // Could be calculated from goal contributions
          })),
          debts: (debts?.data || []).map((d: any) => ({
            id: d.id,
            name: d.name,
            balance: d.balance || 0,
            minimumPayment: d.minimum_payment || 0,
            apr: d.apr || 0,
          })),
          recurringItems: (recurringItems?.data || []).map((r: any) => ({
            name: r.name,
            type: r.type,
            amount: r.amount || 0,
            frequency: r.frequency,
          })),
          accounts: (accounts?.data || []).map((a: any) => ({
            id: a.id,
            name: a.name,
            balance: a.balance || 0,
            type: a.type,
          })),
          totalIncome,
          totalExpenses,
          netWorth,
          monthlyBudgetUtilization,
          goalProgress,
        },
        userPreferences: {
          insightLevel: (userPreferences?.data?.insight_level as 'minimal' | 'moderate' | 'detailed') || 'moderate',
          focusAreas: ['spending', 'goals', 'budget'],
          debtPayoffStrategy: userPreferences?.data?.debt_payoff_strategy as 'snowball' | 'avalanche' || null,
          timezone: userPreferences?.data?.timezone || 'UTC',
        },
      };

      console.log('Comprehensive dashboard context built successfully');
    } catch (error) {
      console.error('Error building comprehensive dashboard context:', error);
      return NextResponse.json({ 
        error: 'Failed to build comprehensive dashboard context',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    // Try to generate Jade insights
    try {
      console.log('Generating Jade insights...');
      
      const insights = await generateDashboardInsights({ dashboardContext });
      
      if (insights?.insights && insights.insights.length > 0) {
        return NextResponse.json(insights);
      }
      
      // If no insights generated, fall through to fallback
    } catch (error) {
      console.error('Error generating Jade insights:', error);
    }

    // Return fallback insights  
    return NextResponse.json({
      insights: [
        {
          title: 'Jade Starting Up',
          message: "I'm getting familiar with your financial data. Check back soon for personalized insights!",
          type: 'info' as const,
          severity: 'positive' as const,
          priority: 5,
          actionable: false,
          data: {
            icon: '🤖',
            category: 'system'
          }
        }
      ]
    });

  } catch (error) {
    console.error('=== Critical API error ===', error);
    
    // Ensure we always return JSON, never HTML
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error details:', { errorMessage, errorStack });
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 