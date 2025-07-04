// Use server directive is required for Genkit flows.
'use server';
/**
 * @fileOverview AI-powered transaction categorization flow.
 *
 * This file defines a Genkit flow that suggests expense categories for transactions
 * based on their description.
 *
 * @exports categorizeTransaction - The main function to categorize transactions.
 * @exports CategorizeTransactionInput - The input type for the categorizeTransaction function.
 * @exports CategorizeTransactionOutput - The output type for the categorizeTransaction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema for the categorizeTransaction function
const CategorizeTransactionInputSchema = z.object({
  transactionDescription: z
    .string()
    .describe('The description of the transaction from the bank.'),
});
export type CategorizeTransactionInput = z.infer<
  typeof CategorizeTransactionInputSchema
>;

// Define the output schema for the categorizeTransaction function
const CategorizeTransactionOutputSchema = z.object({
  suggestedCategory: z
    .string()
    .describe(
      'The AI-suggested category for the transaction (e.g., Groceries, Dining, Utilities).' // e.g., "Food", "Rent", "Transportation"
    ),
  confidenceScore: z
    .number()
    .describe(
      'A numerical score (0-1) representing the AI confidence in the suggested category.'
    ),
});
export type CategorizeTransactionOutput = z.infer<
  typeof CategorizeTransactionOutputSchema
>;

/**
 * Categorizes a transaction based on its description using AI.
 *
 * @param input - The input object containing the transaction description.
 * @returns A promise that resolves to the categorized transaction output.
 */
export async function categorizeTransaction(
  input: CategorizeTransactionInput
): Promise<CategorizeTransactionOutput> {
  return categorizeTransactionFlow(input);
}

// Define the prompt for the AI model
const categorizeTransactionPrompt = ai.definePrompt({
  name: 'categorizeTransactionPrompt',
  input: {schema: CategorizeTransactionInputSchema},
  output: {schema: CategorizeTransactionOutputSchema},
  prompt: `Given the following transaction description, suggest an appropriate expense category and a confidence score (0-1) for the suggestion.\n\nTransaction Description: {{{transactionDescription}}}\n\nCategory: {{{{suggestedCategory}}}}\nConfidence Score: {{{{confidenceScore}}}}`,
});

// Define the Genkit flow for categorizing transactions
const categorizeTransactionFlow = ai.defineFlow(
  {
    name: 'categorizeTransactionFlow',
    inputSchema: CategorizeTransactionInputSchema,
    outputSchema: CategorizeTransactionOutputSchema,
  },
  async input => {
    const {output} = await categorizeTransactionPrompt(input);
    return output!;
  }
);
