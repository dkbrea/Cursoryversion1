"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription as FormDesc,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import type { RecurringItem, RecurringItemType, RecurringFrequency, PredefinedRecurringCategoryValue } from "@/types";
import { recurringItemTypes, recurringFrequencies, predefinedRecurringCategories } from "@/types";
import { useState, type ReactNode, useEffect } from "react";
import { Loader2, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfDay } from "date-fns";

const formSchemaBase = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name cannot exceed 50 characters."),
  type: z.enum(recurringItemTypes, { required_error: "Please select a type." }),
  amount: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]+/g,"")) : val),
    z.number({ invalid_type_error: "Amount must be a number." }).positive({ message: "Amount must be positive." })
  ),
  frequency: z.enum(recurringFrequencies, { required_error: "Please select a frequency." }),
  startDate: z.date().nullable().optional(), // Next Pay Date / Next Due Date
  lastRenewalDate: z.date().nullable().optional(), // For subscriptions
  semiMonthlyFirstPayDate: z.date().nullable().optional(),
  semiMonthlySecondPayDate: z.date().nullable().optional(),
  endDate: z.date().nullable().optional(), // Only for subscriptions
  notes: z.string().max(200, "Notes cannot exceed 200 characters.").optional(),
  categoryId: z.string().nullable().optional() as z.ZodType<PredefinedRecurringCategoryValue | null | undefined>,
});

const refinedFormSchema = formSchemaBase.superRefine((data, ctx) => {
  // Date field requirements and validations based on type and frequency
  if (data.type === 'subscription') {
    if (!data.lastRenewalDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Last renewal date is required for subscriptions.", path: ["lastRenewalDate"] });
    }
    if (data.endDate && data.lastRenewalDate && data.endDate < data.lastRenewalDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date cannot be before the last renewal date for subscriptions.",
        path: ["endDate"],
      });
    }
  } else if (data.frequency === 'semi-monthly') { // Typically income or fixed-expense
    if (!data.semiMonthlyFirstPayDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "First upcoming pay date is required.", path: ["semiMonthlyFirstPayDate"] });
    }
    if (!data.semiMonthlySecondPayDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Second upcoming pay date is required.", path: ["semiMonthlySecondPayDate"] });
    }
    if (data.semiMonthlyFirstPayDate && data.semiMonthlySecondPayDate && data.semiMonthlySecondPayDate <= data.semiMonthlyFirstPayDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Second pay date must be after the first.", path: ["semiMonthlySecondPayDate"] });
    }
  } else { // Income or Fixed Expense (not semi-monthly, not subscription)
    if (!data.startDate) {
      const message = data.type === 'income' ? "Next pay date is required." : "Next due date is required.";
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ["startDate"] });
    }
  }

  // Category ID requirement
  if ((data.type === 'subscription' || data.type === 'fixed-expense') && !data.categoryId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Category is required for subscriptions and fixed expenses.", path: ["categoryId"] });
  }
});


type AddRecurringItemFormValues = z.infer<typeof refinedFormSchema>;

interface AddRecurringItemDialogProps {
  children: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRecurringItemAdded: (item: Omit<RecurringItem, "id" | "userId" | "createdAt">, keepOpen?: boolean) => void;
  initialType?: RecurringItem['type'];
  initialValues?: RecurringItem; // Add support for initialValues for editing
}

export function AddRecurringItemDialog({ children, isOpen, onOpenChange, onRecurringItemAdded, initialType, initialValues }: AddRecurringItemDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false); // For Next Pay/Due Date
  const [isLastRenewalDatePickerOpen, setIsLastRenewalDatePickerOpen] = useState(false);
  const [isSemiMonthlyFirstDatePickerOpen, setIsSemiMonthlyFirstDatePickerOpen] = useState(false);
  const [isSemiMonthlySecondDatePickerOpen, setIsSemiMonthlySecondDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0); // Add a key to force re-render

  // Define default values outside to reuse them
  const defaultValues = {
    name: initialValues?.name || "", 
    type: initialValues?.type || initialType || undefined, 
    amount: initialValues?.amount || 0, 
    frequency: initialValues?.frequency || undefined,
    startDate: initialValues?.startDate ? startOfDay(new Date(initialValues.startDate)) : startOfDay(new Date()), 
    lastRenewalDate: initialValues?.lastRenewalDate ? startOfDay(new Date(initialValues.lastRenewalDate)) : null,
    semiMonthlyFirstPayDate: initialValues?.semiMonthlyFirstPayDate ? startOfDay(new Date(initialValues.semiMonthlyFirstPayDate)) : null, 
    semiMonthlySecondPayDate: initialValues?.semiMonthlySecondPayDate ? startOfDay(new Date(initialValues.semiMonthlySecondPayDate)) : null,
    endDate: initialValues?.endDate ? startOfDay(new Date(initialValues.endDate)) : null, 
    notes: initialValues?.notes || "", 
    categoryId: initialValues?.categoryId || null,
  };

  const form = useForm<AddRecurringItemFormValues>({
    resolver: zodResolver(refinedFormSchema),
    defaultValues,
  });

  const selectedType = form.watch("type");
  const selectedFrequency = form.watch("frequency");

  const resetFormFields = () => {
    // Clear all form fields and errors
    form.clearErrors();
    
    // Reset to completely fresh state, preserving only the initialType if provided
    form.reset(defaultValues, {
      keepDefaultValues: false,
      keepErrors: false,
      keepDirty: false,
      keepIsSubmitted: false,
      keepTouched: false,
      keepIsValid: false,
      keepSubmitCount: false
    });
    
    // Reset all date picker states
    setIsStartDatePickerOpen(false);
    setIsLastRenewalDatePickerOpen(false);
    setIsSemiMonthlyFirstDatePickerOpen(false);
    setIsSemiMonthlySecondDatePickerOpen(false);
    setIsEndDatePickerOpen(false);
  }

  useEffect(() => {
    // Clear/set date fields based on type and frequency
    if (selectedType === 'subscription') {
      form.setValue('startDate', null);
      form.setValue('semiMonthlyFirstPayDate', null);
      form.setValue('semiMonthlySecondPayDate', null);
      if (!form.getValues('lastRenewalDate')) form.setValue('lastRenewalDate', startOfDay(new Date()));
      // endDate is allowed for subscriptions
    } else if (selectedFrequency === 'semi-monthly') { // Typically Income or Fixed Expense
      form.setValue('startDate', null);
      form.setValue('lastRenewalDate', null);
      if (!form.getValues('semiMonthlyFirstPayDate')) form.setValue('semiMonthlyFirstPayDate', startOfDay(new Date()));
      if (!form.getValues('semiMonthlySecondPayDate')) form.setValue('semiMonthlySecondPayDate', startOfDay(new Date(new Date().setDate(new Date().getDate() + 15))));
      if (selectedType === 'income') form.setValue('categoryId', null);
      // endDate is NOT allowed for semi-monthly income/fixed-expense
      form.setValue('endDate', null);
      setIsEndDatePickerOpen(false);
    } else { // Income or Fixed Expense (not semi-monthly, not subscription)
      form.setValue('lastRenewalDate', null);
      form.setValue('semiMonthlyFirstPayDate', null);
      form.setValue('semiMonthlySecondPayDate', null);
      if (!form.getValues('startDate')) form.setValue('startDate', startOfDay(new Date()));
       if (selectedType === 'income') {
         form.setValue('categoryId', null);
       }
      // endDate is NOT allowed for these types either
      form.setValue('endDate', null);
      setIsEndDatePickerOpen(false);
    }

    // General rule for categoryId and endDate based on type
    if (selectedType === 'income' || selectedType === 'fixed-expense') {
        form.setValue('endDate', null);
        setIsEndDatePickerOpen(false);
        if (selectedType === 'income') {
            form.setValue('categoryId', null);
        }
    }
    if (selectedType !== 'subscription' && selectedType !== 'fixed-expense') {
        form.setValue('categoryId', null);
    }


  }, [selectedType, selectedFrequency, form]);


  async function onSubmit(values: AddRecurringItemFormValues, keepOpen: boolean = false) {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 700));
    
    const itemData: Partial<RecurringItem> = {
        name: values.name,
        type: values.type,
        amount: values.amount,
        frequency: values.frequency,
        notes: values.notes || undefined,
        categoryId: (values.type === 'subscription' || values.type === 'fixed-expense') ? values.categoryId : null,
        endDate: values.type === 'subscription' ? (values.endDate || undefined) : undefined,
    };

    if (values.type === 'subscription') {
        itemData.lastRenewalDate = values.lastRenewalDate ? startOfDay(values.lastRenewalDate) : null;
        itemData.startDate = null;
        itemData.semiMonthlyFirstPayDate = null;
        itemData.semiMonthlySecondPayDate = null;
    } else if (values.frequency === 'semi-monthly') {
        itemData.semiMonthlyFirstPayDate = values.semiMonthlyFirstPayDate ? startOfDay(values.semiMonthlyFirstPayDate) : null;
        itemData.semiMonthlySecondPayDate = values.semiMonthlySecondPayDate ? startOfDay(values.semiMonthlySecondPayDate) : null;
        itemData.startDate = null;
        itemData.lastRenewalDate = null;
    } else { // Income or Fixed Expense (not semi-monthly, not subscription)
        itemData.startDate = values.startDate ? startOfDay(values.startDate) : null;
        itemData.lastRenewalDate = null;
        itemData.semiMonthlyFirstPayDate = null;
        itemData.semiMonthlySecondPayDate = null;
    }
    
    // Call the callback with the item data and keepOpen flag
    onRecurringItemAdded(itemData as Omit<RecurringItem, "id" | "userId" | "createdAt">, keepOpen);
    
    // If not keeping open, close the dialog
    if (!keepOpen) {
      onOpenChange(false);
    } else {
      // For "Save & Add Another", just reset the form
      form.reset(defaultValues);
      
      // Reset all date picker states
      setIsStartDatePickerOpen(false);
      setIsLastRenewalDatePickerOpen(false);
      setIsSemiMonthlyFirstDatePickerOpen(false);
      setIsSemiMonthlySecondDatePickerOpen(false);
      setIsEndDatePickerOpen(false);
    }
    
    setIsLoading(false);
  }
  
  const getPrimaryDateLabel = () => {
    if (selectedType === 'income') return "Next Pay Date *";
    if (selectedType === 'fixed-expense') return "Next Due Date *";
    return "Primary Date Field *"; // Should not be visible if logic is correct
  };

  // Determine which date fields to show based on type and frequency
  const showPrimaryDateField = selectedType !== 'subscription' && selectedFrequency !== 'semi-monthly';
  const showLastRenewalDateField = selectedType === 'subscription';
  const showSemiMonthlyDateFields = selectedType !== 'subscription' && selectedFrequency === 'semi-monthly';
  
  const showCategoryField = selectedType === 'subscription' || selectedType === 'fixed-expense';
  const showEndDateField = selectedType === 'subscription';


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) resetFormFields();
      onOpenChange(open);
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{initialValues ? 'Edit Recurring Item' : 'Add New Recurring Item'}</DialogTitle>
          <DialogDescription>
            Set up your regular income, subscriptions, or fixed expenses.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => onSubmit(values, false))} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Salary, Netflix, Rent" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined} >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {recurringItemTypes.map(type => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showCategoryField && (
                 <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {predefinedRecurringCategories.map(category => (
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
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($) *</FormLabel>
                  <FormControl>
                    <Input 
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*\.?[0-9]*"
                      placeholder="e.g., 15.99 or 2500" 
                      {...field} 
                      value={field.value || ''} 
                    />
                  </FormControl>
                  <FormDesc>Enter a positive value. 'Type' determines if it's income or expense.</FormDesc>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {recurringFrequencies.map(freq => (
                        <SelectItem key={freq} value={freq} className="capitalize">
                          {freq.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showLastRenewalDateField && (
              <FormField
                control={form.control}
                name="lastRenewalDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Last Renewal Date *</FormLabel>
                    <Popover open={isLastRenewalDatePickerOpen} onOpenChange={setIsLastRenewalDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            onClick={() => setIsLastRenewalDatePickerOpen(true)}
                          >
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => { field.onChange(date); setIsLastRenewalDatePickerOpen(false); }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {showPrimaryDateField && (
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{getPrimaryDateLabel()}</FormLabel>
                    <Popover open={isStartDatePickerOpen} onOpenChange={setIsStartDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            onClick={() => setIsStartDatePickerOpen(true)}
                          >
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => { field.onChange(date); setIsStartDatePickerOpen(false); }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {showSemiMonthlyDateFields && (
              <>
                <FormField
                  control={form.control}
                  name="semiMonthlyFirstPayDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>First Upcoming Pay Date *</FormLabel>
                      <Popover open={isSemiMonthlyFirstDatePickerOpen} onOpenChange={setIsSemiMonthlyFirstDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                              onClick={() => setIsSemiMonthlyFirstDatePickerOpen(true)}
                            >
                              {field.value ? format(new Date(field.value), "PPP") : <span>Pick first pay date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => { field.onChange(date); setIsSemiMonthlyFirstDatePickerOpen(false); }}
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
                  name="semiMonthlySecondPayDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Second Upcoming Pay Date *</FormLabel>
                      <Popover open={isSemiMonthlySecondDatePickerOpen} onOpenChange={setIsSemiMonthlySecondDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                              onClick={() => setIsSemiMonthlySecondDatePickerOpen(true)}
                            >
                              {field.value ? format(new Date(field.value), "PPP") : <span>Pick second pay date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => { field.onChange(date); setIsSemiMonthlySecondDatePickerOpen(false); }}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            
            {showEndDateField && (
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date (Optional)</FormLabel>
                    <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            onClick={() => setIsEndDatePickerOpen(true)}
                          >
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick an end date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => { field.onChange(date); setIsEndDatePickerOpen(false); }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
             <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any additional details..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => { onOpenChange(false); resetFormFields();}} disabled={isLoading}>
                Cancel
              </Button>
              <div className="flex gap-2">
                {!initialValues && (
                  <Button 
                    type="button" 
                    variant="secondary" 
                    disabled={isLoading}
                    onClick={() => {
                      form.handleSubmit(values => {
                        onSubmit(values, true);
                        // Force complete form recreation
                        setFormResetKey(prev => prev + 1);
                      })();
                    }}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save & Add Another
                  </Button>
                )}
                <Button 
                  type="button" 
                  disabled={isLoading}
                  onClick={() => form.handleSubmit(values => onSubmit(values, false))()}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {initialValues ? 'Save Changes' : 'Save'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
