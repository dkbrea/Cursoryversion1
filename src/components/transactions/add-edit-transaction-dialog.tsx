"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { Transaction, Category, Account, TransactionDetailedType, RecurringItem, DebtAccount, FinancialGoalWithContribution, VariableExpense } from "@/types";
import { transactionDetailedTypes } from "@/types";
import { useState, useEffect, type ReactNode } from "react";
import { Loader2, CalendarIcon, ShoppingBag, Repeat, Landmark, Flag, FileText, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { getAvailablePeriodsForItem, markPeriodComplete, type RecurringPeriod } from "@/lib/api/recurring-completions";


const formSchema = z.object({
  date: z.date({ required_error: "Date is required.", invalid_type_error: "Please select a valid date." }),
  detailedType: z.enum(transactionDetailedTypes, { required_error: "Transaction type is required." }),
  description: z.string().optional(),
  sourceId: z.string().optional(),
  recurringPeriodId: z.string().optional(), // New field for specific period selection
  amount: z.number({ required_error: "Amount is required.", invalid_type_error: "Amount must be a number." }).min(0, { message: "Amount cannot be negative." }).optional(),
  categoryId: z.string().nullable().optional(),
  accountId: z.string().optional(), // Now optional since we might use debt account
  toAccountId: z.string().nullable().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(),
  isDebtTransaction: z.boolean().optional(),
}).superRefine((data, ctx) => {
    // Require sourceId for all types except manual variable expenses
    if (!data.sourceId) {
        if (data.detailedType !== 'variable-expense') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["sourceId"],
                message: "Please select an item or source for this transaction type.",
            });
        } else {
            // For manual variable expenses, require description and categoryId
            if (!data.description || data.description.trim() === '') {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["description"],
                    message: "Description is required for variable expenses.",
                });
            }
            if (!data.categoryId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["categoryId"],
                    message: "Budget category is required for variable expenses.",
                });
            }
        }
    }
    
    // Require amount to be greater than 0 when submitting
    if (data.amount === undefined || data.amount <= 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["amount"],
            message: "Amount must be greater than 0.",
        });
    }
    
    // Require accountId selection
    if (!data.accountId || data.accountId.trim() === '') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["accountId"],
            message: "Account selection is required.",
        });
    }
    
    if (data.detailedType === 'goal-contribution') {
      if (!data.toAccountId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["toAccountId"],
            message: "Destination account is required for goal contributions.",
        });
      }
      if (data.accountId && data.toAccountId && data.accountId === data.toAccountId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["toAccountId"],
            message: "From and To accounts cannot be the same for a goal contribution.",
        });
      }
    }
});

type TransactionFormValues = z.infer<typeof formSchema>;

interface AddEditTransactionDialogProps {
  children?: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<Transaction, "id" | "userId" | "source" | "createdAt" | "updatedAt">, id?: string) => Promise<Transaction | void>;
  categories: Category[]; 
  accounts: Account[]; 
  recurringItems: RecurringItem[];
  debtAccounts: DebtAccount[];
  goals: FinancialGoalWithContribution[];
  variableExpenses: VariableExpense[];
  transactionToEdit?: Transaction | null;
}

const detailedTypeButtonConfig: { type: TransactionDetailedType; label: string; icon: React.ElementType }[] = [
  { type: 'income', label: 'Income', icon: TrendingUp },
  { type: 'fixed-expense', label: 'Fixed Expense', icon: FileText },
  { type: 'subscription', label: 'Subscription', icon: Repeat },
  { type: 'variable-expense', label: 'Variable Expense', icon: ShoppingBag },
  { type: 'debt-payment', label: 'Debt Payment', icon: Landmark }, 
  { type: 'goal-contribution', label: 'Goal Contribution', icon: Flag },
];

export function AddEditTransactionDialog({
  children, isOpen, onOpenChange, onSave,
  categories, accounts, recurringItems, debtAccounts, goals, variableExpenses, transactionToEdit
}: AddEditTransactionDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [availablePeriods, setAvailablePeriods] = useState<RecurringPeriod[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const { user } = useAuth();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: startOfDay(new Date()),
      detailedType: 'income', // Default to income
      description: "",
      sourceId: undefined,
      amount: undefined,
      categoryId: null,
      accountId: '',
      toAccountId: null,
      notes: "",
      tags: "",
      isDebtTransaction: false,
    },
  });

  const selectedDetailedType = form.watch("detailedType");
  const isDebtTransaction = form.watch("isDebtTransaction");

  // Helper function to get predefined category labels
  const getPredefinedCategoryLabel = (value: string) => {
    const categoryLabels: Record<string, string> = {
      'housing': 'Housing',
      'food': 'Food',
      'utilities': 'Utilities',
      'transportation': 'Transportation',
      'health': 'Health',
      'personal': 'Personal',
      'home-family': 'Home/Family',
      'media-productivity': 'Media/Productivity'
    };
    return categoryLabels[value] || value;
  };

  useEffect(() => {
    if (transactionToEdit && isOpen) {
      form.reset({
        date: startOfDay(new Date(transactionToEdit.date)),
        detailedType: transactionToEdit.detailedType || 'variable-expense',
        description: transactionToEdit.description || "",
        sourceId: transactionToEdit.sourceId || undefined,
        amount: Math.abs(transactionToEdit.amount), // User always edits positive amount
        categoryId: transactionToEdit.categoryId || null,
        accountId: transactionToEdit.accountId || '',
        toAccountId: transactionToEdit.toAccountId || null,
        notes: transactionToEdit.notes || "",
        tags: transactionToEdit.tags?.join(", ") || "",
        isDebtTransaction: false, // Default to false, let user check if needed
      });
    } else if (!isOpen && !transactionToEdit) { 
      form.reset({
        date: startOfDay(new Date()), detailedType: 'income', description: "", sourceId: undefined,
        amount: undefined, categoryId: null, accountId: '', toAccountId: null, notes: "", tags: "",
        isDebtTransaction: false,
      });
    }
  }, [transactionToEdit, isOpen, form]);

  const handleItemSelection = async (itemId: string) => {
    form.setValue('sourceId', itemId, {shouldValidate: true});
    form.setValue('recurringPeriodId', undefined, {shouldValidate: true}); // Reset period selection
    
    let selectedItemName = "";
    let selectedItemAmount: number | undefined;
    let selectedCategoryId: string | null = null;

    if (selectedDetailedType === 'income') {
        const item = recurringItems.find(ri => ri.id === itemId && ri.type === 'income');
        if (item) { 
          selectedItemName = item.name; 
          selectedItemAmount = item.amount; 
        }
    } else if (selectedDetailedType === 'fixed-expense') {
        const item = recurringItems.find(ri => ri.id === itemId && ri.type === 'fixed-expense');
        if (item) { 
          selectedItemName = item.name; 
          selectedItemAmount = item.amount;
          // Set category based on the recurring item's categoryId (already a UUID)
          selectedCategoryId = item.categoryId || null;
        }
    } else if (selectedDetailedType === 'subscription') {
        const item = recurringItems.find(ri => ri.id === itemId && ri.type === 'subscription');
        if (item) { 
          selectedItemName = item.name; 
          selectedItemAmount = item.amount;
          // Set category based on the recurring item's categoryId (already a UUID)
          selectedCategoryId = item.categoryId || null;
        }
    } else if (selectedDetailedType === 'variable-expense') {
        const item = variableExpenses.find(ve => ve.id === itemId);
        if (item) { 
          selectedItemName = item.name; 
          // Do NOT autopopulate the amount for variable expenses
          selectedItemAmount = undefined;
          // For variable expenses, the predefined category IS the category
          selectedCategoryId = item.category; // This will be 'home-family', 'transportation', etc.
        }
    } else if (selectedDetailedType === 'debt-payment') {
        const item = debtAccounts.find(da => da.id === itemId);
        if (item) { selectedItemName = item.name; selectedItemAmount = item.minimumPayment; }
    } else if (selectedDetailedType === 'goal-contribution') {
        const item = goals.find(g => g.id === itemId);
        if (item) { selectedItemName = item.name; selectedItemAmount = item.monthlyContribution; }
    }
    
    if (selectedItemName) form.setValue('description', selectedItemName, {shouldValidate: true});
    // Only autopopulate amount for non-variable-expense types
    if (selectedDetailedType !== 'variable-expense' && selectedItemAmount !== undefined && selectedItemAmount > 0) {
      form.setValue('amount', parseFloat(selectedItemAmount.toFixed(2)), {shouldValidate: true});
    } else {
      form.setValue('amount', undefined, { shouldValidate: true }); 
    }
    
    // Set the category automatically for expense types that have predefined categories
    if (selectedCategoryId) {
      form.setValue('categoryId', selectedCategoryId, {shouldValidate: true});
    }

    // Load available periods for ALL recurring items (income, fixed-expense, subscription, debt-payment)
    if ((selectedDetailedType === 'income' || selectedDetailedType === 'fixed-expense' || selectedDetailedType === 'subscription' || selectedDetailedType === 'debt-payment') && user?.id) {
      setLoadingPeriods(true);
      try {
        const itemType = selectedDetailedType === 'debt-payment' ? 'debt' : 'recurring';
        let allItems: any[] = [];

        if (selectedDetailedType === 'debt-payment') {
          // Convert debt accounts to UnifiedRecurringListItem format
          allItems = debtAccounts.filter(debt => debt.id === itemId).map(debt => ({
            id: debt.id,
            name: debt.name,
            itemDisplayType: 'debt-payment' as const,
            amount: debt.minimumPayment,
            frequency: debt.paymentFrequency || 'monthly',
            nextOccurrenceDate: debt.nextDueDate ? new Date(debt.nextDueDate) : new Date(),
            status: 'Upcoming' as const,
            isDebt: true,
            source: 'debt' as const,
            type: 'debt-payment' as const,
            // Required fields for period calculation
            startDate: debt.nextDueDate ? new Date(debt.nextDueDate) : new Date(),
            lastRenewalDate: debt.nextDueDate ? new Date(debt.nextDueDate) : new Date(),
            endDate: undefined,
          }));
        } else {
          // Use existing recurring items
          allItems = recurringItems.filter(item => 
            item.id === itemId && item.type === selectedDetailedType
          ).map(item => ({
            id: item.id,
            name: item.name,
            itemDisplayType: item.type,
            amount: item.amount,
            frequency: item.frequency,
            nextOccurrenceDate: new Date(), // This would need proper calculation
            status: 'Upcoming' as const,
            isDebt: false,
            source: 'recurring' as const,
            type: item.type,
            // Required fields for period calculation
            startDate: item.startDate,
            lastRenewalDate: item.lastRenewalDate,
            endDate: item.endDate,
            semiMonthlyFirstPayDate: item.semiMonthlyFirstPayDate,
            semiMonthlySecondPayDate: item.semiMonthlySecondPayDate,
          }));
        }

        console.log('Dialog: Loading periods for item:', {
          itemId,
          itemType,
          allItemsCount: allItems.length,
          userId: user.id
        });

        const { availablePeriods: periods, error } = await getAvailablePeriodsForItem(
          user.id,
          itemId,
          itemType,
          allItems
        );

        if (error) {
          console.error('Dialog: Error loading periods:', error);
          setAvailablePeriods([]);
        } else {
          const periodsArray = periods || [];
          console.log('Dialog: Loaded periods:', periodsArray.length, periodsArray);
          setAvailablePeriods(periodsArray);

          // Auto-select the most overdue period, or the earliest unpaid period
          if (periodsArray.length > 0) {
            // First, try to find overdue periods
            const overduePeriods = periodsArray.filter(p => p.isOverdue && !p.isCompleted);
            
            let selectedPeriod: any = null;
            if (overduePeriods.length > 0) {
              // Select the oldest overdue period
              selectedPeriod = overduePeriods.sort((a, b) => a.periodDate.getTime() - b.periodDate.getTime())[0];
            } else {
              // If no overdue periods, select the earliest unpaid period
              const unpaidPeriods = periodsArray.filter(p => !p.isCompleted);
              if (unpaidPeriods.length > 0) {
                selectedPeriod = unpaidPeriods.sort((a, b) => a.periodDate.getTime() - b.periodDate.getTime())[0];
              }
            }

            // Set the auto-selected period
            if (selectedPeriod) {
              const periodKey = `${selectedPeriod.itemId}-${format(selectedPeriod.periodDate, 'yyyy-MM-dd')}`;
              console.log('Dialog: Auto-selecting period:', {
                selectedPeriod,
                periodKey,
                isOverdue: selectedPeriod.isOverdue,
                isCompleted: selectedPeriod.isCompleted
              });
              form.setValue('recurringPeriodId', periodKey, {shouldValidate: true});
            } else {
              console.log('Dialog: No period auto-selected - no suitable periods found');
            }
          }
        }
      } catch (error) {
        console.error('Error loading periods:', error);
        setAvailablePeriods([]);
      } finally {
        setLoadingPeriods(false);
      }
    } else {
      setAvailablePeriods([]);
    }
  };
  
  useEffect(() => { 
    form.setValue('sourceId', undefined);
    form.setValue('description', '');
    if (selectedDetailedType !== 'goal-contribution') {
      form.setValue('toAccountId', null); 
    }
    // Clear categoryId when changing transaction type, it will be set automatically when an item is selected
    form.setValue('categoryId', null);
  }, [selectedDetailedType, form]);


  async function onSubmit(values: TransactionFormValues) {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    let baseTransactionType: Transaction['type'] = 'expense';
    if (values.detailedType === 'income') {
        baseTransactionType = 'income';
    } else if (values.detailedType === 'goal-contribution') {
        baseTransactionType = 'transfer'; // Goal contributions are transfers
    }

    // Check if categoryId is a predefined category value that needs to be mapped to a UUID
    let finalCategoryId = values.categoryId === "_UNCATEGORIZED_" ? null : values.categoryId;
    
    // If categoryId is a predefined category value, mark it with a prefix so the parent can handle mapping
    // Exception: Income, goal contribution, and debt payment transactions don't need this since they always use specific categories
    if (finalCategoryId && typeof finalCategoryId === 'string' && values.detailedType !== 'income' && values.detailedType !== 'goal-contribution' && values.detailedType !== 'debt-payment') {
      const predefinedCategories = ['housing', 'food', 'utilities', 'transportation', 'health', 'personal', 'home-family', 'media-productivity'];
      if (predefinedCategories.includes(finalCategoryId)) {
        finalCategoryId = `PREDEFINED:${finalCategoryId}`;
      }
    }

    // Determine if this is a debt account transaction
    const isDebtAccountTransaction = values.isDebtTransaction && 
      (values.detailedType === 'variable-expense' || values.detailedType === 'fixed-expense' || values.detailedType === 'subscription');

    const transactionData = {
      date: startOfDay(values.date),
      description: values.description || "",
      amount: values.amount || 0, 
      type: baseTransactionType, 
      detailedType: values.detailedType,
      sourceId: values.sourceId || undefined,
      categoryId: finalCategoryId,
      // Use accountId or debtAccountId based on whether this is a debt transaction
      accountId: isDebtAccountTransaction ? undefined : values.accountId,
      debtAccountId: isDebtAccountTransaction ? values.accountId : undefined,
      toAccountId: values.detailedType === 'goal-contribution' ? values.toAccountId : null,
      notes: values.notes || undefined,
      tags: values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      isDebtTransaction: values.isDebtTransaction,
      recurringPeriodId: values.recurringPeriodId || undefined, // Include period ID for completion tracking
    };
    
    // Save the transaction first
    const savedTransaction = await onSave(transactionData, transactionToEdit?.id);
    
    // Period completion is now handled by the dashboard's handleSaveTransaction function
    // This ensures the completion is created before the calendar refresh happens
    console.log('Dialog: Transaction saved, period completion will be handled by parent component');
    
    setIsLoading(false);
    onOpenChange(false); 
  }
  
  const getSourceSelectItems = () => {
    switch(selectedDetailedType) {
        case 'income':
            return recurringItems.filter(item => item.type === 'income').map(item => ({value: item.id, label: item.name}));
        case 'fixed-expense':
            return recurringItems.filter(item => item.type === 'fixed-expense').map(item => ({value: item.id, label: item.name}));
        case 'subscription':
            return recurringItems.filter(item => item.type === 'subscription').map(item => ({value: item.id, label: item.name}));
        case 'variable-expense':
            return variableExpenses.map(item => ({value: item.id, label: item.name}));
        case 'debt-payment':
            return debtAccounts.map(item => ({value: item.id, label: item.name}));
        case 'goal-contribution':
            return goals.filter(g => g.currentAmount < g.targetAmount).map(item => ({value: item.id, label: item.name})); 
        default:
            return [];
    }
  };

  const getSourceSelectLabel = () => {
     switch(selectedDetailedType) {
        case 'income': return "Select Income Source";
        case 'fixed-expense': return "Select Fixed Expense";
        case 'subscription': return "Select Subscription";
        case 'variable-expense': return "Select Variable Expense";
        case 'debt-payment': return "Select Debt Account";
        case 'goal-contribution': return "Financial Goal"; 
        default: return "Select Item";
    }
  }

  const availableAssetAccounts = accounts.filter(acc => acc.type !== 'credit card' || acc.balance >=0);

  // Get the appropriate accounts list based on transaction type and debt checkbox
  const getAvailableAccounts = () => {
    // For expense types with debt checkbox checked, show only revolving debt accounts
    if ((selectedDetailedType === 'variable-expense' || selectedDetailedType === 'fixed-expense' || selectedDetailedType === 'subscription') && isDebtTransaction) {
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
    return availableAssetAccounts;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!isLoading && !open) {
        form.reset({ 
            date: startOfDay(new Date()), detailedType: 'income', description: "", sourceId: undefined,
            amount: undefined, categoryId: null, accountId: '', toAccountId: null, notes: "", tags: "",
            isDebtTransaction: false,
        });
      }
      if (!isLoading) onOpenChange(open); 
    }}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{transactionToEdit ? "Edit Transaction" : "Record Transaction"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 py-2 max-h-[80vh] overflow-y-auto pr-2">
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date *</FormLabel>
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          onClick={() => setIsDatePickerOpen(true)}
                        >
                          {field.value ? format(field.value, "MM/dd/yyyy") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => { if(date) field.onChange(startOfDay(date)); setIsDatePickerOpen(false); }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="detailedType"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Transaction Type *</FormLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {detailedTypeButtonConfig.map(config => (
                        <Button
                            key={config.type}
                            type="button"
                            variant={field.value === config.type ? 'secondary' : 'outline'}
                            onClick={() => {
                              field.onChange(config.type);
                              form.setValue('sourceId', undefined, {shouldValidate: true}); 
                              form.setValue('description', '', {shouldValidate: true});
                              form.setValue('amount', undefined, {shouldValidate: true});
                              form.setValue('categoryId', null, {shouldValidate: true});
                              form.setValue('accountId', '', {shouldValidate: true});
                              // Reset debt transaction checkbox for non-expense types
                              if (config.type !== 'variable-expense' && config.type !== 'fixed-expense' && config.type !== 'subscription') {
                                form.setValue('isDebtTransaction', false, {shouldValidate: true});
                              }
                              if (config.type !== 'goal-contribution') {
                                form.setValue('toAccountId', null, {shouldValidate: true});
                              }
                            }}
                            className={cn("w-full justify-start text-left h-auto py-2 px-3", 
                                         field.value === config.type && "ring-2 ring-primary shadow-md"
                            )}
                        >
                            <config.icon className={cn("mr-2 h-4 w-4", field.value === config.type ? "text-primary" : "text-muted-foreground")} />
                            <span className="text-xs">{config.label}</span>
                        </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Conditional field for selecting the specific item (goal, recurring income/expense, debt, variable expense) */}
            <FormField
                control={form.control}
                name="sourceId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{getSourceSelectLabel()} *</FormLabel>
                    <Select onValueChange={(value) => handleItemSelection(value)} value={field.value || ""} >
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={getSourceSelectLabel()} />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {getSourceSelectItems().map(item => (
                            <SelectItem key={item.value} value={item.value}>
                            {item.label}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />

            {/* Period Selection - For all recurring items (income, fixed expenses, subscriptions, and debt payments) */}
            {form.watch('sourceId') && (selectedDetailedType === 'income' || selectedDetailedType === 'fixed-expense' || selectedDetailedType === 'subscription' || selectedDetailedType === 'debt-payment') && (
              <FormField
                control={form.control}
                name="recurringPeriodId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Which period does this transaction cover? *</FormLabel>
                    <FormDescription className="text-xs">
                      Select the specific period this transaction covers (helps track recurring schedules)
                    </FormDescription>
                    {loadingPeriods ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-sm text-muted-foreground">Loading periods...</span>
                      </div>
                    ) : (
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select period" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availablePeriods.map(period => {
                            const periodKey = `${period.itemId}-${format(period.periodDate, 'yyyy-MM-dd')}`;
                            const periodLabel = format(period.periodDate, 'MMM d, yyyy');
                            
                            return (
                              <SelectItem key={periodKey} value={periodKey}>
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    {period.isCompleted && (
                                      <span className="text-green-600">✓</span>
                                    )}
                                    {period.isOverdue && !period.isCompleted && (
                                      <span className="text-red-600">🔴</span>
                                    )}
                                    <span>{periodLabel}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    {period.isOverdue && !period.isCompleted && (
                                      <span className="text-red-600">
                                        ({period.daysPastDue} days overdue)
                                      </span>
                                    )}
                                    {period.isCompleted && (
                                      <span className="text-green-600">
                                        (Paid {format(period.completedDate!, 'MMM d')})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </SelectItem>
                            );
                          })}
                          {availablePeriods.length === 0 && (
                            <SelectItem value="_no_periods" disabled>
                              No periods available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* Category Display - Show the category of the selected item (read-only) */}
            {form.watch('sourceId') && (selectedDetailedType === 'income' || selectedDetailedType === 'variable-expense' || selectedDetailedType === 'fixed-expense' || selectedDetailedType === 'subscription' || selectedDetailedType === 'goal-contribution' || selectedDetailedType === 'debt-payment') && (
                <FormItem>
                    <FormLabel>Category</FormLabel>
                    <div className="flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm items-center">
                        {(() => {
                            const categoryId = form.watch('categoryId');
                            
                            if (selectedDetailedType === 'variable-expense') {
                                const selectedExpense = variableExpenses.find(ve => ve.id === form.watch('sourceId'));
                                if (selectedExpense) {
                                    return (
                                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                            {getPredefinedCategoryLabel(selectedExpense.category)}
                                        </span>
                                    );
                                }
                            }
                            
                            // For income, fixed expenses and subscriptions
                            if (selectedDetailedType === 'income' || selectedDetailedType === 'fixed-expense' || selectedDetailedType === 'subscription') {
                                if (selectedDetailedType === 'income') {
                                    // For income transactions, always show "Income" category
                                    return (
                                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                            Income
                                        </span>
                                    );
                                }
                                
                                const recurringItem = recurringItems.find(ri => ri.id === form.watch('sourceId'));
                                if (recurringItem?.categoryId) {
                                    return (
                                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                            {getPredefinedCategoryLabel(recurringItem.categoryId)}
                                        </span>
                                    );
                                }
                                return (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                                        No category assigned
                                    </span>
                                );
                            }
                            
                            // For goal contribution transactions, always show "Savings" category
                            if (selectedDetailedType === 'goal-contribution') {
                                return (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                        Savings
                                    </span>
                                );
                            }
                            
                            // For debt payment transactions, always show "Debt" category
                            if (selectedDetailedType === 'debt-payment') {
                                return (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                        Debt
                                    </span>
                                );
                            }
                            
                            return (
                                <span className="text-muted-foreground text-xs">
                                    No category information available
                                </span>
                            );
                        })()}
                    </div>
                    <FormDescription className="text-xs">
                        This category will be automatically assigned to your transaction
                    </FormDescription>
                </FormItem>
            )}
            
             {/* Description field (primarily for variable expenses when no item selected, or if no item selected for others) */}
            {((selectedDetailedType === 'variable-expense' && !form.watch('sourceId')) || (selectedDetailedType !== 'variable-expense' && !form.watch('sourceId'))) && (
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Description {selectedDetailedType === 'variable-expense' ? '*' : '(Optional)'}</FormLabel>
                        <FormControl><Input placeholder="e.g., Coffee, Lunch with client" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}
            
             <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount *</FormLabel>
                  <FormControl>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className="text-muted-foreground sm:text-sm">$</span>
                        </div>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} 
                               onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value) || undefined)}
                               value={field.value ?? ''}
                               className="pl-7" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Debt Transaction Checkbox - Only for expense types */}
            {(selectedDetailedType === 'variable-expense' || selectedDetailedType === 'fixed-expense' || selectedDetailedType === 'subscription') && (
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
            
            {/* From Account - Always present */}
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {selectedDetailedType === 'goal-contribution' 
                      ? 'From Account *' 
                      : isDebtTransaction && (selectedDetailedType === 'variable-expense' || selectedDetailedType === 'fixed-expense' || selectedDetailedType === 'subscription')
                        ? 'Debt Account *'
                        : 'Account *'
                    }
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""} >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          isDebtTransaction && (selectedDetailedType === 'variable-expense' || selectedDetailedType === 'fixed-expense' || selectedDetailedType === 'subscription')
                            ? "Select debt account"
                            : "Select account"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getAvailableAccounts().map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* To Account - Only for Goal Contribution */}
            {selectedDetailedType === 'goal-contribution' && (
                <FormField
                control={form.control}
                name="toAccountId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>To Account *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} >
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select destination account" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {getAvailableAccounts().map(account => (
                            <SelectItem key={account.id} value={account.id}>
                            {account.name} ({account.type})
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormDescription>Select the account where this goal contribution will be stored.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
            
            {/* Budget Category - Only for manual Variable Expense (no source selected) */}
            {selectedDetailedType === 'variable-expense' && !form.watch('sourceId') && (
                <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Budget Category *</FormLabel>
                    <Select 
                        onValueChange={(value) => field.onChange(value === "_UNCATEGORIZED_" ? null : value)} 
                        value={field.value === null || field.value === undefined ? "_UNCATEGORIZED_" : field.value}
                    >
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="_UNCATEGORIZED_">Uncategorized</SelectItem>
                        {categories.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                            {category.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
            
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., vacation, business, family (comma separated)" {...field} />
                  </FormControl>
                  {/* <FormDescription>Comma-separated tags for easy filtering.</FormDescription> */}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any additional details..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => {
                onOpenChange(false);
                if (!transactionToEdit) { 
                     form.reset({
                        date: startOfDay(new Date()), detailedType: 'income', description: "", sourceId: undefined,
                        amount: undefined, categoryId: null, accountId: '', toAccountId: null, notes: "", tags: "",
                        isDebtTransaction: false,
                     });
                }
              }} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="animate-spin mr-2" />}
                {transactionToEdit ? "Save Changes" : "Save Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

