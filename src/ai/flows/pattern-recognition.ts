import { ai } from '../genkit';
import { z } from 'zod';

const PatternRecognitionSchema = z.object({
  anomalies: z.array(z.object({
    type: z.enum(['unusual_amount', 'missing_recurring', 'frequency_change', 'new_merchant', 'timing_irregular']),
    message: z.string(),
    confidence: z.number().min(0).max(1),
    severity: z.enum(['low', 'medium', 'high']),
    suggestedAction: z.string().optional(),
    questions: z.array(z.string()).optional(),
  })),
  patterns: z.array(z.object({
    type: z.string(),
    description: z.string(),
    strength: z.number().min(0).max(1),
  })).optional(),
});

export interface PatternContext {
  currentTransaction: {
    amount: number;
    description: string;
    detailedType: string;
    categoryId?: string;
    date: Date;
  };
  userPatterns: {
    recurringTransactions: Array<{
      description: string;
      amount: number;
      frequency: string;
      lastOccurrence: Date;
      expectedNext?: Date;
      categoryId?: string;
    }>;
    merchantHistory: Array<{
      merchant: string;
      averageAmount: number;
      frequencyDays: number;
      lastTransaction: Date;
      transactionCount: number;
      amountRange: { min: number; max: number };
    }>;
    categoryPatterns: Array<{
      categoryId: string;
      averageAmount: number;
      typicalRange: { min: number; max: number };
      frequencyDays: number;
      timeOfMonth?: 'early' | 'mid' | 'late';
    }>;
    weeklyPatterns: Array<{
      dayOfWeek: number;
      averageTransactions: number;
      commonCategories: string[];
    }>;
  };
  timeContext: {
    dayOfWeek: number;
    dayOfMonth: number;
    isWeekend: boolean;
    isHoliday?: boolean;
  };
}

export const analyzeTransactionPatterns = ai.defineFlow(
  {
    name: 'analyzeTransactionPatterns',
    inputSchema: z.object({
      patternContext: z.custom<PatternContext>(),
    }),
    outputSchema: PatternRecognitionSchema,
  },
  async ({ patternContext }) => {
    const { currentTransaction, userPatterns, timeContext } = patternContext;
    
    // Create context for AI pattern analysis
    const analysisPrompt = `
As a financial pattern recognition AI, analyze this transaction against the user's historical patterns and identify any anomalies or concerning patterns.

CURRENT TRANSACTION:
- Amount: $${currentTransaction.amount}
- Description: ${currentTransaction.description}
- Type: ${currentTransaction.detailedType}
- Date: ${currentTransaction.date.toDateString()}
- Day of Week: ${timeContext.dayOfWeek} (0=Sunday)
- Day of Month: ${timeContext.dayOfMonth}

USER'S FINANCIAL PATTERNS:

Recurring Transactions: ${JSON.stringify(userPatterns.recurringTransactions)}

Merchant History: ${JSON.stringify(userPatterns.merchantHistory)}

Category Patterns: ${JSON.stringify(userPatterns.categoryPatterns)}

Weekly Patterns: ${JSON.stringify(userPatterns.weeklyPatterns)}

DETECTION GUIDELINES:
1. Look for transactions that deviate significantly from established patterns
2. Identify potential missing recurring transactions based on expected timing
3. Flag unusual amounts compared to historical spending at similar merchants
4. Detect changes in spending frequency or timing
5. Notice new merchants or categories that might need verification

ANOMALY TYPES:
- unusual_amount: Amount significantly different from typical spending
- missing_recurring: Expected recurring transaction hasn't appeared
- frequency_change: Sudden change in spending frequency
- new_merchant: First time transaction with a merchant
- timing_irregular: Transaction at unusual time/day for this category

CONFIDENCE LEVELS (0-1):
- 0.8-1.0: Very confident anomaly
- 0.6-0.8: Likely anomaly worth noting
- 0.4-0.6: Possible anomaly for user consideration
- Below 0.4: Don't report

SEVERITY:
- high: Needs immediate attention (large deviations, missing important payments)
- medium: Worth user review (moderate deviations, timing questions)
- low: Minor observations for awareness

For each anomaly, provide:
1. Clear explanation of what's unusual
2. Helpful questions to prompt user reflection
3. Suggested actions if appropriate

Focus on helping users catch missed transactions and verify unusual spending while maintaining their active role in financial management.
`;

    const result = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: analysisPrompt,
      output: { schema: PatternRecognitionSchema },
    });

    return result.output;
  }
); 