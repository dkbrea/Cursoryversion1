"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VariableExpense, PredefinedRecurringCategoryValue } from "@/types";
import { predefinedRecurringCategories } from "@/types";
import { useState, useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50, { message: "Name cannot exceed 50 characters."}),
  category: z.enum(['housing', 'utilities', 'transportation', 'food', 'health', 'personal', 'home-family', 'media-productivity', 'gifts', 'pets', 'education', 'subscriptions', 'self-care', 'clothing', 'home-maintenance', 'car-replacement', 'vacation'] as const, {
    required_error: "Please select a category.",
  }),
  amount: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]+/g,"")) : val),
    z.number({ required_error: "Amount is required.", invalid_type_error: "Amount must be a number." }).min(0, { message: "Amount cannot be negative." })
  ),
});

type AddEditBudgetCategoryFormValues = z.infer<typeof formSchema>;

interface AddEditVariableExpenseDialogProps {
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onExpenseAdded?: (expenseData: Omit<VariableExpense, "id" | "userId" | "createdAt">) => void;
  onExpenseUpdated?: (expenseId: string, expenseData: Omit<VariableExpense, "id" | "userId" | "createdAt">) => void;
  expenseToEdit?: VariableExpense | null;
}

export function AddEditVariableExpenseDialog({ 
  children, 
  isOpen, 
  onOpenChange, 
  onExpenseAdded, 
  onExpenseUpdated, 
  expenseToEdit 
}: AddEditVariableExpenseDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<AddEditBudgetCategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", category: undefined, amount: undefined },
  });

  // Update form when expenseToEdit changes
  useEffect(() => {
    if (expenseToEdit && isOpen) {
      form.reset({
        name: expenseToEdit.name,
        category: expenseToEdit.category,
        amount: expenseToEdit.amount,
      });
    } else if (!isOpen) {
      form.reset({ name: "", category: undefined, amount: undefined });
    }
  }, [expenseToEdit, isOpen, form]);

  async function onSubmit(values: AddEditBudgetCategoryFormValues) {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (expenseToEdit && onExpenseUpdated) {
      onExpenseUpdated(expenseToEdit.id, values);
    } else if (onExpenseAdded) {
      onExpenseAdded(values);
    }
    
    form.reset();
    setIsLoading(false);
    onOpenChange(false);
  }

  const isEditing = !!expenseToEdit;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { 
      if (!open) form.reset(); 
      onOpenChange(open); 
    }}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Variable Expense" : "Add Variable Expense"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the variable expense details below." 
              : "Add a new variable expense with name, category, and monthly budget amount."
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl><Input placeholder="e.g., Groceries, Dining Out" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {predefinedRecurringCategories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($) *</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="100.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : (isEditing ? "Update Expense" : "Add Expense")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Keep the old export for backward compatibility
export { AddEditVariableExpenseDialog as AddVariableExpenseDialog };
