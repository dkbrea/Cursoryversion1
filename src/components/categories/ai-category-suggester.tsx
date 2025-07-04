"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { suggestCategories as suggestCategoriesFlow } from "@/ai/flows/suggest-categories"; // Ensure this path is correct

const formSchema = z.object({
  description: z.string().min(5, { message: "Description must be at least 5 characters." }).max(200, { message: "Description must be at most 200 characters." }),
});

interface AiCategorySuggesterProps {
  onSuggestionSelected?: (suggestion: string) => void;
}

export function AiCategorySuggester({ onSuggestionSelected }: AiCategorySuggesterProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setSuggestions([]);
    try {
      const result = await suggestCategoriesFlow({ description: values.description });
      if (result && result.categories) {
        setSuggestions(result.categories);
        if (result.categories.length === 0) {
          toast({
            title: "AI Suggestions",
            description: "No specific categories found for this description.",
          });
        }
      } else {
        throw new Error("Invalid response from AI");
      }
    } catch (error) {
      console.error("AI suggestion error:", error);
      toast({
        title: "Error",
        description: "Could not get AI suggestions. Please try again.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-primary" />
          AI Category Suggester
        </CardTitle>
        <CardDescription>
          Describe an expense, and let AI suggest relevant categories for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expense Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., 'Monthly Netflix subscription', 'Coffee with client'"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Get Suggestions
            </Button>
          </form>
        </Form>

        {suggestions.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold mb-2 text-foreground">Suggested Categories:</h4>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={() => {
                    if(onSuggestionSelected) {
                      onSuggestionSelected(suggestion);
                      toast({ title: "Suggestion Applied", description: `"${suggestion}" added to new category form.`})
                    }
                  }}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
             {onSuggestionSelected && <p className="text-xs text-muted-foreground mt-2">Click a suggestion to use it in the 'Add Category' form.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
