import { ai } from '../genkit';
import { z } from 'zod';
import { DashboardJadeContext } from '@/types';
import { formatNumber } from '../../lib/utils';

const DashboardInsightSchema = z.object({
  insights: z.array(z.object({
    type: z.enum(['budget_health', 'spending_trend', 'goal_progress', 'cash_flow', 'debt_optimization', 'seasonal_pattern']),
    title: z.string(),
    message: z.string(),
    severity: z.enum(['positive', 'neutral', 'warning', 'alert']),
    priority: z.number().min(1).max(10), // Higher number = higher priority
    actionable: z.boolean(),
    suggestions: z.array(z.string()).optional(),
    data: z.object({
      percentage: z.number().optional(),
      amount: z.number().optional(),
      timeframe: z.string().optional(),
      trend: z.enum(['improving', 'stable', 'declining']).optional(),
    }).optional(),
  })),
  summary: z.object({
    overallHealth: z.enum(['excellent', 'good', 'fair', 'needs_attention']),
    keyMetrics: z.object({
      monthlySpending: z.number(),
      budgetUtilization: z.number(),
      goalProgress: z.number(),
      debtPaymentRatio: z.number().optional(),
    }),
    topPriority: z.string(),
  }),
});

export const generateDashboardInsights = ai.defineFlow(
  {
    name: 'generateDashboardInsights',
    inputSchema: z.object({
      dashboardContext: z.custom<DashboardJadeContext>(),
    }),
    outputSchema: DashboardInsightSchema,
  },
  async ({ dashboardContext }) => {
    const { timeframe, financialData, userPreferences } = dashboardContext;
    
    // Create context for Jade analysis
    const prompt = `
You are Jade, a financial advisor assistant. Analyze this user's complete financial picture and provide 3-4 most valuable dashboard insights to help them master their money.

FINANCIAL OVERVIEW:
- Monthly Income: $${formatNumber(financialData.totalIncome, 2)}
- Monthly Expenses: $${formatNumber(financialData.totalExpenses, 2)}
- Net Worth: $${formatNumber(financialData.netWorth, 2)}
- Budget Utilization: ${financialData.monthlyBudgetUtilization}%

GOALS PROGRESS:
${financialData.goalProgress.map(goal => 
  `- ${goal.name}: ${goal.progress}% ($${formatNumber(goal.target, 2)} target)`
).join('\n')}

USER PREFERENCES:
- Focus Areas: ${userPreferences?.focusAreas?.join(', ') || 'General financial health'}
- Detail Level: ${userPreferences?.insightLevel || 'moderate'}

Provide actionable insights that help them improve their financial situation. Focus on:
1. Most impactful opportunities for improvement
2. Progress recognition where appropriate
3. Specific, measurable recommendations
4. Areas that align with their focus preferences

Keep insights encouraging and specific with dollar amounts when relevant.
    `.trim();

    try {
      const result = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        prompt: prompt,
        output: { schema: DashboardInsightSchema },
      });

      // Return the Jade result or fallback
      return result.output || createFallbackInsights();
    } catch (error) {
      console.error('Jade generation failed:', error);
      // Return fallback insights if Jade fails
      return createFallbackInsights();
    }
  }
);

// Fallback function to create basic insights when Jade fails
function createFallbackInsights() {
  const monthlySpending = 0;
  const budgetUtilization = 0;
  const goalProgress = 0;

  return {
    insights: [
      {
        type: 'spending_trend' as const,
        title: 'Welcome to Jade AI',
        message: `I'm getting to know your financial patterns. You've spent $${formatNumber(monthlySpending, 2)} this month. As you add more transactions, I'll provide more valuable insights to help you master your money.`,
        severity: 'neutral' as const,
        priority: 5,
        actionable: true,
        suggestions: ['Continue tracking your expenses consistently', 'Set up your budget categories for better insights'],
      }
    ],
    summary: {
      overallHealth: 'good' as const,
      keyMetrics: {
        monthlySpending: monthlySpending,
        budgetUtilization: Math.max(0, budgetUtilization),
        goalProgress: Math.max(0, goalProgress),
      },
      topPriority: 'Build consistent financial tracking habits to unlock Jade\'s full potential',
    },
  };
} 