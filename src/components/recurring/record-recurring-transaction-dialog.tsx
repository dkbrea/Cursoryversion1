"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FormDescription } from "@/components/ui/form";
import type { UnifiedRecurringListItem, Account, DebtAccount, Transaction, Category } from "@/types";
import React, { useState } from "react";
import { Loader2, CalendarIcon, CheckCircle2, DollarSign, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { markPeriodComplete } from "@/lib/api/recurring-completions";

const formSchema = z.object({
  date: z.date({ required_error: "Date is required." }),
  amount: z.number({ 
    required_error: "Amount is required.", 
    invalid_type_error: "Amount must be a number." 
  }).min(0.01, { message: "Amount must be greater than 0." }),
  accountId: z.string().min(1, { message: "Account selection is required." }),
  isDebtTransaction: z.boolean().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.amount <= 0) {
    return false;
  }
  return true;
}, {
  message: "Amount must be greater than 0",
  path: ["amount"],
});

type FormValues = z.infer<typeof formSchema>;

interface RecordRecurringTransactionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  recurringItem: UnifiedRecurringListItem | null;
  selectedDate: Date;
  accounts: Account[];
  debtAccounts: DebtAccount[];
  categories: Category[];
  onSave: (transactionData: Omit<Transaction, "id" | "userId" | "source" | "createdAt" | "updatedAt">) => Promise<Transaction | void>;
}

export function RecordRecurringTransactionDialog({
  isOpen,
  onOpenChange,
  recurringItem,
  selectedDate,
  accounts,
  debtAccounts,
  categories,
  onSave
}: RecordRecurringTransactionDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Find the primary account as default
  const primaryAccount = accounts.find(acc => acc.isPrimary) || accounts[0];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: startOfDay(selectedDate),
      amount: recurringItem?.amount || 0,
      accountId: primaryAccount?.id || '',
      notes: "",
    },
  });

  // Reset form when dialog opens with new data
  React.useEffect(() => {
    if (isOpen && recurringItem) {
          form.reset({
      date: startOfDay(selectedDate),
      amount: recurringItem.amount,
      accountId: primaryAccount?.id || '',
      isDebtTransaction: false,
      notes: `${recurringItem.name} - recorded from calendar`,
    });
    }
  }, [isOpen, recurringItem, selectedDate, primaryAccount, form]);

  const onSubmit = async (values: FormValues) => {
    if (!recurringItem) return;

    setIsLoading(true);
    try {

      // Determine transaction type and details based on recurring item
      let transactionType: Transaction['type'] = 'expense';
      let detailedType: Transaction['detailedType'] = 'fixed-expense';
      let amount = values.amount;

      if (recurringItem.itemDisplayType === 'income') {
        transactionType = 'income';
        detailedType = 'income';
      } else if (recurringItem.itemDisplayType === 'subscription') {
        detailedType = 'subscription';
      } else if (recurringItem.itemDisplayType === 'debt-payment') {
        detailedType = 'debt-payment';
      }

      // For expenses, amount should be negative in the database
      if (transactionType === 'expense') {
        amount = -Math.abs(amount);
      }

      // Determine if this is a debt account transaction
      const isDebtAccountTransaction = values.isDebtTransaction && recurringItem.source !== 'debt';

      // Handle category assignment based on transaction type
      let finalCategoryId = recurringItem.categoryId || null;
      
      // For income transactions, always use "Income" category
      if (detailedType === 'income') {
        const incomeCategoryName = 'Income';
        let incomeCategory = categories.find(cat => cat.name === incomeCategoryName);
        
        if (incomeCategory) {
          finalCategoryId = incomeCategory.id;
        } else {
          // If Income category doesn't exist, it will be created by the parent component
          finalCategoryId = 'PREDEFINED:income';
        }
      } 
      // For debt payments, always use "Debt" category  
      else if (detailedType === 'debt-payment') {
        const debtCategoryName = 'Debt';
        let debtCategory = categories.find(cat => cat.name === debtCategoryName);
        
        if (debtCategory) {
          finalCategoryId = debtCategory.id;
        } else {
          // If Debt category doesn't exist, it will be created by the parent component
          finalCategoryId = 'PREDEFINED:debt';
        }
      }
      // Handle predefined category values for other transaction types
      else if (finalCategoryId && typeof finalCategoryId === 'string') {
        const predefinedCategories = ['housing', 'food', 'utilities', 'transportation', 'health', 'personal', 'home-family', 'media-productivity'];
        if (predefinedCategories.includes(finalCategoryId)) {
          finalCategoryId = `PREDEFINED:${finalCategoryId}`;
        }
      }

      const transactionData = {
        date: startOfDay(values.date),
        description: recurringItem.name,
        amount: amount,
        type: transactionType,
        detailedType: detailedType,
        sourceId: recurringItem.source === 'debt' ? recurringItem.id : recurringItem.id,
        categoryId: finalCategoryId,
        // Use accountId or debtAccountId based on whether this is a debt transaction
        accountId: isDebtAccountTransaction ? undefined : values.accountId,
        debtAccountId: isDebtAccountTransaction ? values.accountId : undefined,
        toAccountId: null,
        notes: values.notes || undefined,
        tags: ['calendar-recorded'],
      };

      const savedTransaction = await onSave(transactionData);
      
      // Mark the period as complete in the completion tracking system
      if (savedTransaction && savedTransaction.id) {
        try {
          const occurrenceId = `${recurringItem.id}-${format(startOfDay(selectedDate), 'yyyy-MM-dd')}`;
          console.log('RecordDialog: Attempting to mark period complete with data:', {
            recurringItemId: recurringItem.source === 'recurring' ? recurringItem.id : undefined,
            debtAccountId: recurringItem.source === 'debt' ? recurringItem.id : undefined,
            periodDate: startOfDay(selectedDate),
            completedDate: startOfDay(values.date),
            transactionId: savedTransaction.id,
            userId: savedTransaction.userId,
            selectedDate: selectedDate.toISOString(),
            recurringItemSource: recurringItem.source,
            recurringItemId: recurringItem.id,
            generatedOccurrenceId: occurrenceId
          });
          
          const result = await markPeriodComplete({
            recurringItemId: recurringItem.source === 'recurring' ? recurringItem.id : undefined,
            debtAccountId: recurringItem.source === 'debt' ? recurringItem.id : undefined,
            periodDate: startOfDay(selectedDate), // Use the calendar date that was clicked (June 28)
            completedDate: startOfDay(values.date), // Keep transaction date for when it was actually paid
            transactionId: savedTransaction.id,
            userId: savedTransaction.userId,
          });
          
          console.log('RecordDialog: markPeriodComplete result:', result);
          
          if (result.error) {
            console.error('RecordDialog: Error from markPeriodComplete:', result.error);
          } else {
            console.log('RecordDialog: Successfully marked period as complete:', result.completion);
            console.log('RecordDialog: Completion record created with:', {
              transactionId: result.completion?.transaction_id,
              periodDate: result.completion?.period_date,
              recurringItemId: result.completion?.recurring_item_id,
              debtAccountId: result.completion?.debt_account_id
            });
          }
        } catch (completionError) {
          console.error('RecordDialog: Exception in markPeriodComplete:', completionError);
          // Don't fail the whole operation if completion tracking fails
        }
      } else {
        console.log('RecordDialog: Skipping period completion - missing savedTransaction or savedTransaction.id', {
          hasSavedTransaction: !!savedTransaction,
          savedTransactionId: savedTransaction?.id
        });
      }
      
      toast({
        title: "Transaction Recorded",
        description: `${recurringItem.name} has been marked as complete and recorded as a transaction.`,
        duration: 3000,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error recording transaction:", error);
      toast({
        title: "Error",
        description: "Failed to record transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get the appropriate accounts list based on transaction type and debt checkbox
  const getAvailableAccounts = () => {
    const isDebtTransaction = form.watch('isDebtTransaction');
    
    // For debt payments, always show regular accounts (where payment comes FROM)
    if (recurringItem?.source === 'debt') {
      return accounts;
    }
    
    // For regular expenses with debt checkbox checked, show only revolving debt accounts
    if (isDebtTransaction && (recurringItem?.itemDisplayType === 'fixed-expense' || recurringItem?.itemDisplayType === 'subscription')) {
      // Filter to only include revolving debt accounts (credit cards and lines of credit)
      const revolvingDebtAccounts = debtAccounts.filter(debt => 
        debt.type === 'credit-card' || debt.type === 'line-of-credit'
      );
      return revolvingDebtAccounts.map(debt => ({
        id: debt.id,
        name: debt.name,
        type: debt.type,
        balance: debt.balance
      }));
    }
    
    // Otherwise show regular asset accounts
    return accounts;
  };

  const availableAccounts = getAvailableAccounts();

  if (!recurringItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Record as Complete
          </DialogTitle>
          <DialogDescription>
            Record "{recurringItem.name}" as a completed transaction
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Item Summary */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{recurringItem.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {recurringItem.itemDisplayType.replace('-', ' ')} • {recurringItem.frequency}
                  </p>
                  {/* Category Display */}
                  {(() => {
                    // Helper function to get predefined category labels (matching types/index.ts)
                    const getPredefinedCategoryLabel = (value: string) => {
                      const categoryLabels: Record<string, string> = {
                        'housing': 'Housing (Rent/Mortgage)',
                        'utilities': 'Utilities (Energy, Water, Internet, Phone)',
                        'transportation': 'Transportation (Insurance, Gasoline, Maint.)',
                        'food': 'Food (Groceries, Restaurants)',
                        'health': 'Health (Meds, Insurance, Gym)',
                        'personal': 'Personal (Toiletries, Salon, Daycare, etc.)',
                        'home-family': 'Home/Family (Kids, Household needs)',
                        'media-productivity': 'Media/Productivity (Netflix, iCloud, etc.)',
                        'gifts': 'Gifts & Holidays',
                        'pets': 'Pets (Vet, Food, Grooming)',
                        'education': 'Education (Tuition, Supplies)',
                        'subscriptions': 'Other Subscriptions (Apps, Tools, Software)',
                        'self-care': 'Self-Care (Wellness, Hobbies)',
                        'clothing': 'Clothing & Shoes',
                        'home-maintenance': 'Home Maintenance & Repairs',
                        'car-replacement': 'Vehicle Replacement',
                        'vacation': 'Vacation & Travel'
                      };
                      return categoryLabels[value] || `Unknown: ${value}`;
                    };



                    const categoryName = recurringItem.categoryId 
                      ? getPredefinedCategoryLabel(recurringItem.categoryId)
                      : 'Uncategorized';
                    
                    return (
                      <p className="text-xs text-muted-foreground mt-1">
                        Category: {categoryName}
                      </p>
                    );
                  })()}
                  {recurringItem.source === 'debt' && (
                    <p className="text-xs text-blue-600 mt-1">
                      Payment will be applied to the debt account
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    ${Math.abs(recurringItem.amount).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">Original amount</p>
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Date</FormLabel>
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setIsDatePickerOpen(false);
                        }}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-10"
                        {...field}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? undefined : value);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Debt Transaction Checkbox - Only for expenses that aren't debt payments */}
            {recurringItem.source !== 'debt' && (recurringItem.itemDisplayType === 'fixed-expense' || recurringItem.itemDisplayType === 'subscription') && (
              <FormField
                control={form.control}
                name="isDebtTransaction"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox 
                        checked={field.value || false}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          // Reset account selection when toggling debt transaction
                          form.setValue('accountId', '');
                        }}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>This expense occurred on a debt account (like a credit card or line of credit)</FormLabel>
                      <FormDescription>
                        Check this if you used a credit card, line of credit, or other revolving debt account for this expense
                      </FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Account Selection */}
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => {
                const isDebtTransaction = form.watch('isDebtTransaction');
                return (
                  <FormItem>
                    <FormLabel>
                      {recurringItem.source === 'debt' 
                        ? 'Payment From Account' 
                        : isDebtTransaction && (recurringItem.itemDisplayType === 'fixed-expense' || recurringItem.itemDisplayType === 'subscription')
                          ? 'Debt Account'
                          : 'Account'
                      }
                    </FormLabel>
                    {recurringItem.source === 'debt' && (
                      <p className="text-sm text-muted-foreground">
                        Select the account where the payment will come from
                      </p>
                    )}
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder={
                              isDebtTransaction && (recurringItem.itemDisplayType === 'fixed-expense' || recurringItem.itemDisplayType === 'subscription')
                                ? "Select debt account"
                                : "Select account"
                            } />
                          </div>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{account.name}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                                 );
               }}
             />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional details..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Transaction
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 