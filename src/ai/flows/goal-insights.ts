import { ai } from '../genkit';
import { z } from 'zod';

const GoalInsightSchema = z.object({
  insights: z.array(z.object({
    type: z.enum(['progress_analysis', 'timeline_prediction', 'savings_pattern', 'goal_prioritization']),
    message: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    data: z.object({
      goalName: z.string().optional(),
      timeframe: z.string().optional(),
      amount: z.number().optional(),
      percentage: z.number().optional(),
    }).optional(),
  })),
});

export interface GoalContext {
  goalsData: {
    goals: Array<{
      id: string;
      name: string;
      targetAmount: number;
      currentAmount: number;
      targetDate: string;
      monthlyContribution: number;
      monthsRemaining: number;
      progressPercentage: number;
    }>;
    totalSavedThisMonth: number;
    activeGoalsCount: number;
    completedGoalsCount: number;
  };
  recentTransactions: Array<{
    amount: number;
    detailed_type: string;
    date: string;
  }>;
  userId: string;
}

export const generateGoalInsights = ai.defineFlow(
  {
    name: 'generateGoalInsights',
    inputSchema: z.object({
      goalContext: z.custom<GoalContext>(),
    }),
    outputSchema: GoalInsightSchema,
  },
  async ({ goalContext }) => {
    const { goalsData, recentTransactions } = goalContext;

    // Create a concise summary of the user's goals
    const goalsSummary = goalsData.goals.map(goal => ({
      name: goal.name,
      progress: `${goal.progressPercentage.toFixed(0)}%`,
      remaining: `$${(goal.targetAmount - goal.currentAmount).toFixed(0)}`,
      monthsLeft: goal.monthsRemaining,
      monthlyNeeded: `$${goal.monthlyContribution.toFixed(0)}`
    }));

    // Recent savings activity
    const goalContributions = recentTransactions
      .filter(t => t.detailed_type === 'goal-contribution')
      .slice(0, 10);

    const prompt = `
You are Jade, a friendly AI financial advisor with emerald wisdom. Analyze the user's financial goals and provide ONE concise, actionable insight.

CURRENT GOALS STATUS:
${goalsSummary.map(g => `• ${g.name}: ${g.progress} complete, ${g.remaining} remaining, ${g.monthlyNeeded}/month needed`).join('\n')}

RECENT SAVINGS ACTIVITY:
• Total saved this month: $${goalsData.totalSavedThisMonth}
• Recent goal contributions: ${goalContributions.length} transactions
• Active goals: ${goalsData.activeGoalsCount}
• Completed goals: ${goalsData.completedGoalsCount}

JADE'S ANALYSIS RULES:
1. Focus on the MOST IMPORTANT insight only
2. Be encouraging and motivational with gem-like wisdom
3. Keep message under 120 characters
4. Include specific numbers when relevant
5. Prioritize urgent timeline issues over general progress
6. Use warm, supportive language that builds confidence

INSIGHT TYPES:
- progress_analysis: When a goal is >80% complete
- timeline_prediction: When target date is <3 months away
- savings_pattern: General encouragement about savings progress
- goal_prioritization: When multiple goals need attention

Provide ONE insight that will motivate and guide the user toward their financial goals.
`;

    const result = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt,
      output: { schema: GoalInsightSchema },
    });

    // Ensure we always return a valid result with fallback
    if (!result.output || !result.output.insights || result.output.insights.length === 0) {
      return {
        insights: [{
          type: 'savings_pattern' as const,
          message: goalsData.goals.length > 0 
            ? `You have ${goalsData.activeGoalsCount} active goals. Stay focused and you'll reach them!`
            : 'Set your first financial goal to start building your future!',
          priority: 'low' as const
        }]
      };
    }

    return result.output;
  }
); 