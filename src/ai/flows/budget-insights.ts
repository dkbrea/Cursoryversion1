import { ai } from '../genkit';
import { z } from 'zod';
import { formatNumber } from '../../lib/utils';

const BudgetInsightSchema = z.object({
  insights: z.array(z.object({
    type: z.enum(['budget_balance', 'category_optimization', 'spending_pattern', 'zero_based_achievement', 'reallocation_opportunity']),
    title: z.string(),
    message: z.string(),
    severity: z.enum(['positive', 'neutral', 'warning', 'alert']),
    priority: z.number().min(1).max(10),
    actionable: z.boolean(),
    suggestions: z.array(z.string()).optional(),
    data: z.object({
      amount: z.number().optional(),
      percentage: z.number().optional(),
      categoryName: z.string().optional(),
      targetAmount: z.number().optional(),
      savings: z.number().optional(),
    }).optional(),
  })),
  summary: z.object({
    budgetHealth: z.enum(['excellent', 'good', 'needs_attention', 'critical']),
    keyRecommendation: z.string(),
    potentialSavings: z.number().optional(),
  }),
});

export interface BudgetContext {
  currentMonth: {
    monthLabel: string;
    totalIncome: number;
    totalFixedExpenses: number;
    totalSubscriptions: number;
    totalDebtPayments: number;
    totalGoalContributions: number;
    totalSinkingFundsContributions: number;
    totalBudgetedVariable: number;
    totalSpentVariable: number;
    remainingVariable: number;
    leftToAllocate: number;
    isBalanced: boolean;
  };
  variableExpenses: Array<{
    id: string;
    name: string;
    category: string;
    budgetedAmount: number;
    spentAmount: number;
    remainingAmount: number;
    utilizationPercentage: number;
    status?: string;
    riskLevel?: string;
    spendingTrend?: string;
    dailySpendRate?: number;
    projectedMonthlySpend?: number;
    daysRemaining?: number;
    transactionCount?: number;
    hasActivity?: boolean;
  }>;
  previousMonthComparison?: {
    totalSpentVariable: number;
    leftToAllocate: number;
    variableExpenseChanges: Array<{
      categoryName: string;
      currentSpent: number;
      previousSpent: number;
      changeAmount: number;
      changePercentage: number;
      utilizationChange?: number;
    }>;
    spendingTrendChange?: number;
  };
  categoryAnalysis?: {
    overBudgetCategories: Array<any>;
    underUtilizedCategories: Array<any>;
    riskCategories: Array<any>;
    inactiveCategories: Array<any>;
    highVelocityCategories: Array<any>;
  };
  userPreferences?: {
    budgetingStyle: 'conservative' | 'moderate' | 'aggressive';
    focusAreas: string[];
  };
}

export const generateBudgetInsights = ai.defineFlow(
  {
    name: 'generateBudgetInsights',
    inputSchema: z.object({
      budgetContext: z.custom<BudgetContext>(),
    }),
    outputSchema: BudgetInsightSchema,
  },
  async ({ budgetContext }) => {
    const { currentMonth, variableExpenses, previousMonthComparison, categoryAnalysis } = budgetContext;

    // Calculate key metrics for analysis
    const overBudgetCategories = variableExpenses.filter(cat => cat.spentAmount > cat.budgetedAmount);
    const underUtilizedCategories = variableExpenses.filter(cat => cat.utilizationPercentage < 50 && cat.budgetedAmount > 100);
    const wellBalancedCategories = variableExpenses.filter(cat => cat.utilizationPercentage >= 80 && cat.utilizationPercentage <= 105);
    const riskCategories = variableExpenses.filter(cat => cat.riskLevel === 'high' || cat.riskLevel === 'medium');
    const highVelocityCategories = variableExpenses.filter(cat => cat.spendingTrend === 'over');

    const prompt = `
You are Jade, an AI financial advisor with expertise in zero-based budgeting. Analyze this user's detailed budget progress and provide 2-3 concise, actionable insights to help them optimize their budget allocation.

Like a precious jade gemstone, your advice should be valuable, clear, and refined. Focus on practical recommendations that align with zero-based budgeting principles.

CURRENT BUDGET STATUS for ${currentMonth.monthLabel}:
• Total Income: $${formatNumber(currentMonth.totalIncome, 2)}
• Fixed Expenses: $${formatNumber(currentMonth.totalFixedExpenses, 2)}
• Subscriptions: $${formatNumber(currentMonth.totalSubscriptions, 2)}
• Debt Payments: $${formatNumber(currentMonth.totalDebtPayments, 2)}
• Goal Contributions: $${formatNumber(currentMonth.totalGoalContributions, 2)}
• Sinking Funds: $${formatNumber(currentMonth.totalSinkingFundsContributions, 2)}
• Variable Budget: $${formatNumber(currentMonth.totalBudgetedVariable, 2)}
• Variable Spent: $${formatNumber(currentMonth.totalSpentVariable, 2)}
• Variable Remaining: $${formatNumber(currentMonth.remainingVariable, 2)}
• LEFT TO ALLOCATE: $${formatNumber(currentMonth.leftToAllocate, 2)}
• Zero-Based Achieved: ${currentMonth.isBalanced ? 'YES' : 'NO'}

DETAILED VARIABLE EXPENSE PROGRESS:
${variableExpenses.map(cat => {
  const status = cat.status || 'unknown';
  const riskLevel = cat.riskLevel || 'low';
  const spendingTrend = cat.spendingTrend || 'unknown';
  const projectedSpend = cat.projectedMonthlySpend || 0;
  const daysRemaining = cat.daysRemaining || 0;
  const transactionCount = cat.transactionCount || 0;
  
  return `• ${cat.name}: 
  - Budget: $${cat.budgetedAmount.toFixed(2)} | Spent: $${cat.spentAmount.toFixed(2)} (${cat.utilizationPercentage.toFixed(0)}%) | Remaining: $${cat.remainingAmount.toFixed(2)}
  - Status: ${status.toUpperCase()} | Risk: ${riskLevel.toUpperCase()} | Trend: ${spendingTrend.toUpperCase()}
  - Projected Monthly Spend: $${projectedSpend.toFixed(2)} | Days Remaining: ${daysRemaining} | Transactions: ${transactionCount}`;
}).join('\n')}

CATEGORY RISK ANALYSIS:
• Over Budget (${overBudgetCategories.length}): ${overBudgetCategories.map(c => `${c.name} ($${(c.spentAmount - c.budgetedAmount).toFixed(0)} over)`).join(', ') || 'None'}
• Under-Utilized (${underUtilizedCategories.length}): ${underUtilizedCategories.map(c => `${c.name} (${c.utilizationPercentage.toFixed(0)}% used, $${c.remainingAmount.toFixed(0)} left)`).join(', ') || 'None'}
• High Risk (${riskCategories.length}): ${riskCategories.map(c => `${c.name} (${c.riskLevel} risk)`).join(', ') || 'None'}
• High Velocity Spending (${highVelocityCategories.length}): ${highVelocityCategories.map(c => `${c.name} (projected $${(c.projectedMonthlySpend || 0).toFixed(0)})`).join(', ') || 'None'}
• Inactive Categories: ${variableExpenses.filter(c => !c.hasActivity).map(c => c.name).join(', ') || 'None'}

${previousMonthComparison ? `
MONTH-OVER-MONTH ANALYSIS:
• Total Variable Spending: ${previousMonthComparison.totalSpentVariable > currentMonth.totalSpentVariable ? 'DECREASED' : 'INCREASED'} by $${Math.abs(currentMonth.totalSpentVariable - previousMonthComparison.totalSpentVariable).toFixed(2)}
• Spending Trend Change: ${previousMonthComparison.spendingTrendChange ? (previousMonthComparison.spendingTrendChange > 0 ? '+' : '') + '$' + previousMonthComparison.spendingTrendChange.toFixed(2) : 'No data'}
• Biggest Category Changes: ${previousMonthComparison.variableExpenseChanges.slice(0, 3).map(change => 
  `${change.categoryName} (${change.changeAmount >= 0 ? '+' : ''}$${change.changeAmount.toFixed(2)}, ${change.utilizationChange ? (change.utilizationChange >= 0 ? '+' : '') + change.utilizationChange.toFixed(1) + '% utilization' : 'no utilization change'})`
).join(', ')}
` : ''}

JADE'S ENHANCED ANALYSIS PRIORITIES:
1. IMMEDIATE ATTENTION: Categories over budget or at high risk of overspending
2. VELOCITY MONITORING: Categories with high spending velocity that may exceed budget
3. REALLOCATION OPPORTUNITIES: Under-utilized categories with significant remaining funds
4. ZERO-BASED OPTIMIZATION: Address "Left to Allocate" imbalances
5. SPENDING PATTERN INSIGHTS: Notable changes in category utilization patterns
6. INACTIVE CATEGORY REVIEW: Categories with no activity that could be reallocated

INSIGHT TYPES TO PRIORITIZE:
- budget_balance: When Left to Allocate is not zero (highest priority)
- category_optimization: Specific reallocation opportunities based on utilization data
- spending_pattern: Velocity-based alerts and utilization insights
- reallocation_opportunity: Detailed suggestions using actual progress data
- zero_based_achievement: Celebrating perfect budget balance with specific metrics

ENHANCED COMMUNICATION GUIDELINES:
- Reference specific utilization percentages and spending patterns
- Mention days remaining and projected spending when relevant
- Provide exact dollar amounts for reallocation suggestions
- Use category-specific language (e.g., "Your Dining Out is 85% spent with 12 days left")
- Highlight velocity concerns (e.g., "At current pace, you'll exceed budget by $X")
- Prioritize actionable advice with specific next steps

Focus on insights that help users:
- Prevent overspending through velocity monitoring
- Optimize allocation efficiency using utilization data
- Make data-driven budget adjustments
- Achieve and maintain zero-based budgeting with precision

Provide specific, data-driven recommendations using the detailed progress information available.
`;

    try {
      const result = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        prompt,
        output: { schema: BudgetInsightSchema },
      });

      // Return the Jade result or fallback
      return result.output || createFallbackBudgetInsights(currentMonth, variableExpenses);
    } catch (error) {
      console.error('Budget Jade generation failed:', error);
      // Return fallback insights if Jade fails
      return createFallbackBudgetInsights(currentMonth, variableExpenses);
    }
  }
);

// Fallback function to create basic budget insights when Jade fails
function createFallbackBudgetInsights(currentMonth: any, variableExpenses: any[]) {
  const insights = [];
  
  // Budget balance insight - Fix the logic for zero-based budgeting
  if (Math.abs(currentMonth.leftToAllocate) < 0.01) {
    // Perfect zero-based budget achieved!
    insights.push({
      type: 'zero_based_achievement' as const,
      title: 'Zero-Based Budget Achieved!',
      message: `Congratulations! You've perfectly allocated all your funds, achieving a true zero-based budget for ${currentMonth.monthLabel}. Every dollar has a purpose.`,
      severity: 'positive' as const,
      priority: 1,
      actionable: false,
      suggestions: [
        'Maintain this allocation strategy as you begin to spend.',
        'Monitor your spending velocity in each category to ensure you stay within budget.'
      ],
      data: { percentage: 100 }
    });
    
    // Add a second insight about spending vigilance when budget is balanced
    insights.push({
      type: 'spending_pattern' as const,
      title: 'Spending Vigilance',
      message: 'Although you have achieved a zero-based budget on paper, consistently tracking your spending against each category is crucial as you move through the month. Regular monitoring will help prevent overspending.',
      severity: 'neutral' as const,
      priority: 2,
      actionable: false,
      suggestions: [
        'Set up alerts to track spending velocity in key categories.',
        'Review your budget weekly to ensure you are on track.'
      ]
    });
  } else if (currentMonth.leftToAllocate > 0) {
    // Money left to allocate
    insights.push({
      type: 'budget_balance' as const,
      title: 'Money Left to Allocate',
      message: `You have $${formatNumber(currentMonth.leftToAllocate)} unassigned. Allocate it to achieve zero-based budgeting.`,
      severity: 'warning' as const,
      priority: 9,
      actionable: true,
      suggestions: ['Add more to variable expenses', 'Increase goal contributions', 'Build emergency fund'],
      data: { amount: currentMonth.leftToAllocate }
    });
  } else {
    // Over budget
    insights.push({
      type: 'budget_balance' as const,
      title: 'Over Budget Alert',
      message: `You're $${formatNumber(Math.abs(currentMonth.leftToAllocate))} over budget. Reduce variable expenses to balance.`,
      severity: 'alert' as const,
      priority: 10,
      actionable: true,
      suggestions: ['Review variable expense categories', 'Reduce discretionary spending'],
      data: { amount: Math.abs(currentMonth.leftToAllocate) }
    });
  }

  // Check for over-budget categories first (highest priority)
  const overBudgetCategories = variableExpenses.filter(cat => cat.spentAmount > cat.budgetedAmount);
  if (overBudgetCategories.length > 0) {
    const worstCategory = overBudgetCategories.sort((a, b) => (b.spentAmount - b.budgetedAmount) - (a.spentAmount - a.budgetedAmount))[0];
    const overAmount = worstCategory.spentAmount - worstCategory.budgetedAmount;
    insights.push({
      type: 'category_optimization' as const,
      title: 'Over Budget Alert',
      message: `${worstCategory.name} is $${formatNumber(overAmount)} over budget. Consider reducing spending or reallocating funds.`,
      severity: 'alert' as const,
      priority: 9,
      actionable: true,
      suggestions: ['Track daily spending in this category', 'Set spending alerts', 'Find alternative options'],
      data: { 
        amount: overAmount,
        categoryName: worstCategory.name,
        utilizationPercentage: worstCategory.utilizationPercentage
      }
    });
  }

  // Check for high velocity spending (projected to exceed budget)
  const highVelocityCategories = variableExpenses.filter(cat => 
    cat.projectedMonthlySpend && cat.projectedMonthlySpend > cat.budgetedAmount && cat.spentAmount <= cat.budgetedAmount
  );
  if (highVelocityCategories.length > 0) {
    const riskiestCategory = highVelocityCategories.sort((a, b) => 
      (b.projectedMonthlySpend - b.budgetedAmount) - (a.projectedMonthlySpend - a.budgetedAmount)
    )[0];
    const projectedOverage = riskiestCategory.projectedMonthlySpend - riskiestCategory.budgetedAmount;
    insights.push({
      type: 'spending_pattern' as const,
      title: 'Spending Velocity Alert',
      message: `${riskiestCategory.name} is on pace to exceed budget by $${formatNumber(projectedOverage)}. Slow down spending.`,
      severity: 'warning' as const,
      priority: 8,
      actionable: true,
      suggestions: ['Monitor daily spending', 'Set weekly limits', 'Find cost-saving alternatives'],
      data: { 
        amount: projectedOverage,
        categoryName: riskiestCategory.name,
        projectedSpend: riskiestCategory.projectedMonthlySpend,
        daysRemaining: riskiestCategory.daysRemaining
      }
    });
  }

  // Find under-utilized categories for reallocation opportunities
  const underUtilized = variableExpenses.filter(cat => cat.utilizationPercentage < 50 && cat.budgetedAmount > 50);
  if (underUtilized.length > 0) {
    const topUnderUtilized = underUtilized.sort((a, b) => b.remainingAmount - a.remainingAmount)[0];
    insights.push({
      type: 'reallocation_opportunity' as const,
      title: 'Reallocation Opportunity',
      message: `${topUnderUtilized.name} has $${formatNumber(topUnderUtilized.remainingAmount)} unused (${Math.round(topUnderUtilized.utilizationPercentage)}% used).`,
      severity: 'neutral' as const,
      priority: 6,
      actionable: true,
      suggestions: ['Move funds to over-budget categories', 'Increase goal contributions', 'Build emergency fund'],
      data: { 
        amount: topUnderUtilized.remainingAmount,
        categoryName: topUnderUtilized.name,
        utilizationPercentage: topUnderUtilized.utilizationPercentage
      }
    });
  } else if (currentMonth.remainingVariable > 100) {
    // If no individual categories are severely under-utilized, 
    // but there's significant total remaining variable budget
    insights.push({
      type: 'reallocation_opportunity' as const,
      title: 'Variable Budget Optimization',
      message: `You have $${formatNumber(currentMonth.remainingVariable)} unspent in variable expenses. Consider reallocating to goals.`,
      severity: 'neutral' as const,
      priority: 5,
      actionable: true,
      suggestions: ['Move to emergency fund', 'Increase goal contributions', 'Add debt payments'],
      data: { 
        amount: currentMonth.remainingVariable
      }
    });
  }

  // Check for inactive categories (no spending activity)
  const inactiveCategories = variableExpenses.filter(cat => !cat.hasActivity && cat.budgetedAmount > 0);
  if (inactiveCategories.length > 0 && insights.length < 2) {
    const largestInactive = inactiveCategories.sort((a, b) => b.budgetedAmount - a.budgetedAmount)[0];
    insights.push({
      type: 'spending_pattern' as const,
      title: 'Inactive Category Review',
      message: `${largestInactive.name} has no spending activity. Consider reallocating its $${formatNumber(largestInactive.budgetedAmount)} budget.`,
      severity: 'neutral' as const,
      priority: 4,
      actionable: true,
      suggestions: ['Move to active categories', 'Increase goal contributions', 'Delete if unnecessary'],
      data: { 
        amount: largestInactive.budgetedAmount,
        categoryName: largestInactive.name
      }
    });
  }

  const budgetHealth = Math.abs(currentMonth.leftToAllocate) < 0.01 ? 'excellent' : 
                      Math.abs(currentMonth.leftToAllocate) < 100 ? 'good' : 
                      Math.abs(currentMonth.leftToAllocate) < 500 ? 'needs_attention' : 'critical';

  // Calculate potential savings from under-utilized categories
  const potentialSavings = underUtilized.reduce((sum, cat) => sum + cat.remainingAmount, 0);

  return {
    insights: insights.slice(0, 2), // Limit to 2 insights for compact display
    summary: {
      budgetHealth: budgetHealth as 'excellent' | 'good' | 'needs_attention' | 'critical',
      keyRecommendation: insights[0]?.suggestions?.[0] || 'Continue tracking your budget regularly',
      potentialSavings: potentialSavings > 0 ? potentialSavings : undefined
    }
  };
} 