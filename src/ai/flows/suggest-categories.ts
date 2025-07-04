'use server';

/**
 * @fileOverview AI-powered tool to suggest relevant expense categories based on a description the user enters.
 *
 * - suggestCategories - A function that suggests expense categories.
 * - SuggestCategoriesInput - The input type for the suggestCategories function.
 * - SuggestCategoriesOutput - The return type for the suggestCategories function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestCategoriesInputSchema = z.object({
  description: z.string().describe('The description of the expense.'),
});
export type SuggestCategoriesInput = z.infer<typeof SuggestCategoriesInputSchema>;

const SuggestCategoriesOutputSchema = z.object({
  categories: z
    .array(z.string())
    .describe('An array of suggested expense categories.'),
});
export type SuggestCategoriesOutput = z.infer<typeof SuggestCategoriesOutputSchema>;

export async function suggestCategories(input: SuggestCategoriesInput): Promise<SuggestCategoriesOutput> {
  return suggestCategoriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCategoriesPrompt',
  input: {schema: SuggestCategoriesInputSchema},
  output: {schema: SuggestCategoriesOutputSchema},
  prompt: `You are an AI assistant helping users categorize their expenses.

  Given the following expense description, suggest up to 5 relevant expense categories.
  Return only the categories in a JSON array of strings.

  Description: {{{description}}}
  `,
});

const suggestCategoriesFlow = ai.defineFlow(
  {
    name: 'suggestCategoriesFlow',
    inputSchema: SuggestCategoriesInputSchema,
    outputSchema: SuggestCategoriesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
