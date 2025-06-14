import { ai } from '../genkit';
import { z } from 'zod';

const FinancialInsightSchema = z.object({
  insights: z.array(z.object({
    type: z.enum(['spending_comparison', 'budget_progress', 'category_analysis', 'frequency_analysis']),
    message: z.string(),
    severity: z.enum(['info', 'warning', 'alert']),
    data: z.object({
      percentage: z.number().optional(),
      amount: z.number().optional(),
      timeframe: z.string().optional(),
    }).optional(),
  })),
  suggestions: z.array(z.string()).optional(),
});

export interface TransactionContext {
  currentTransaction: {
    amount: number;
    description: string;
    detailedType: string;
    categoryId?: string;
    date: Date;
  };
  historicalData: {
    recentTransactions: Array<{
      amount: number;
      description: string;
      detailedType: string;
      categoryId?: string;
      date: Date;
    }>;
    categorySpending: Array<{
      categoryId: string;
      categoryName: string;
      totalAmount: number;
      transactionCount: number;
      averageAmount: number;
      timeframe: string;
    }>;
    merchantSpending?: Array<{
      merchant: string;
      totalAmount: number;
      transactionCount: number;
      averageAmount: number;
      lastTransactionDate: Date;
    }>;
  };
  budgetData?: {
    categoryBudgets: Array<{
      categoryId: string;
      budgetedAmount: number;
      spentAmount: number;
      timeframe: string;
    }>;
  };
  userPreferences?: {
    insightLevel: 'minimal' | 'moderate' | 'detailed';
  };
}

export const generateFinancialInsights = ai.defineFlow(
  {
    name: 'generateFinancialInsights',
    inputSchema: z.object({
      transactionContext: z.custom<TransactionContext>(),
    }),
    outputSchema: FinancialInsightSchema,
  },
  async ({ transactionContext }) => {
    const { currentTransaction, historicalData, budgetData } = transactionContext;
    
    // Create context for Jade analysis
    const prompt = `
As Jade, your financial advisor, analyze this transaction and provide helpful insights to help the user master their money.

CONTEXT:
Transaction: $${currentTransaction.amount} for "${currentTransaction.description}"
Category: ${currentTransaction.categoryId || 'Uncategorized'}
Date: ${currentTransaction.date}

RECENT SPENDING (30 days):
${historicalData.recentTransactions.slice(0, 10).map(t => `$${t.amount} - ${t.description} (${t.categoryId || 'Uncategorized'})`).join('\n')}

Provide 2-3 brief, actionable insights about this transaction in the context of their recent spending patterns.
Each insight should:
- Be specific and actionable
- Reference concrete dollar amounts when relevant
- Help them make better financial decisions

Focus on patterns, anomalies, or optimization opportunities.
  `.trim();

    const result = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: prompt,
      output: { schema: FinancialInsightSchema },
    });

    return result.output;
  }
); 