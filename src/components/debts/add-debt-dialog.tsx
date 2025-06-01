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
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DebtAccount, DebtAccountType, PaymentFrequency } from "@/types";
import { debtAccountTypes, paymentFrequencies } from "@/types"; // Import the array of types
import { useState, type ReactNode, useEffect } from "react";
import { Loader2, CalendarIcon } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(2, { message: "Debt name must be at least 2 characters." }).max(50),
  type: z.enum(debtAccountTypes as [DebtAccountType, ...DebtAccountType[]], { required_error: "Please select a debt type." }),
  balance: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]+/g,"")) : val),
    z.number({ invalid_type_error: "Balance must be a number." }).positive({ message: "Balance must be positive." })
  ),
  apr: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]+/g,"")) : val),
    z.number({ invalid_type_error: "APR must be a number." }).min(0, { message: "APR cannot be negative." }).max(100, {message: "APR seems too high (max 100%)."})
  ),
  minimumPayment: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]+/g,"")) : val),
    z.number({ invalid_type_error: "Minimum payment must be a number." }).positive({ message: "Minimum payment must be positive." })
  ),
  nextDueDate: z.date({ required_error: "Next due date is required." }),
  paymentFrequency: z.enum(paymentFrequencies as [PaymentFrequency, ...PaymentFrequency[]], { required_error: "Please select a payment frequency." }),
});

type AddDebtFormValues = z.infer<typeof formSchema>;

interface AddDebtDialogProps {
  children: ReactNode; // Trigger button
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDebtAdded: (debtData: Omit<DebtAccount, "id" | "userId" | "createdAt">, keepOpen?: boolean) => void;
  initialValues?: DebtAccount; // Add support for initialValues for editing
  isEditing?: boolean;
  onDebtEdited?: (debtId: string, debtData: Omit<DebtAccount, "id" | "userId" | "createdAt">) => void;
}

export function AddDebtDialog({ children, isOpen, onOpenChange, onDebtAdded, initialValues, isEditing = false, onDebtEdited }: AddDebtDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0); // Add a key to force re-render
  const [isNextDueDatePickerOpen, setIsNextDueDatePickerOpen] = useState(false);

  // Define default values based on whether we're editing or adding
  const getDefaultValues = () => {
    if (isEditing && initialValues) {
      // When editing, use the initial values
      return {
        name: initialValues.name || "",
        type: initialValues.type || (undefined as unknown as DebtAccountType),
        balance: initialValues.balance || undefined,
        apr: initialValues.apr || undefined,
        minimumPayment: initialValues.minimumPayment || undefined,
        nextDueDate: initialValues.nextDueDate ? startOfDay(new Date(initialValues.nextDueDate)) : startOfDay(new Date()),
        paymentFrequency: initialValues.paymentFrequency || (undefined as unknown as PaymentFrequency),
      };
    } else {
      // When adding new, always use empty/default values
      return {
        name: "",
        type: undefined as unknown as DebtAccountType,
        balance: undefined,
        apr: undefined,
        minimumPayment: undefined,
        nextDueDate: startOfDay(new Date()),
        paymentFrequency: undefined as unknown as PaymentFrequency,
      };
    }
  };

  const form = useForm<AddDebtFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  // State to track if we should keep the dialog open after submission
  const [keepOpen, setKeepOpen] = useState(false);

  // Function to reset the form to its initial state
  const resetFormFields = () => {
    // Clear all form fields and errors
    form.clearErrors();
    
    // Reset to completely fresh state for adding (not editing)
    const freshValues = {
      name: "",
      type: undefined as unknown as DebtAccountType,
      balance: undefined,
      apr: undefined,
      minimumPayment: undefined,
      nextDueDate: startOfDay(new Date()),
      paymentFrequency: undefined as unknown as PaymentFrequency,
    };
    
    form.reset(freshValues, {
      keepDefaultValues: false,
      keepErrors: false,
      keepDirty: false,
      keepIsSubmitted: false,
      keepTouched: false,
      keepIsValid: false,
      keepSubmitCount: false
    });
    
    // Force re-render with a new key
    setFormResetKey(prev => prev + 1);
  };

  // Reset form when switching between edit/add modes or when dialog opens
  useEffect(() => {
    if (isOpen) {
      const values = getDefaultValues();
      form.reset(values, {
        keepDefaultValues: false,
        keepErrors: false,
        keepDirty: false,
        keepIsSubmitted: false,
        keepTouched: false,
        keepIsValid: false,
        keepSubmitCount: false
      });
      setFormResetKey(prev => prev + 1);
    }
  }, [isOpen, isEditing, initialValues?.id]);

  async function onSubmit(values: AddDebtFormValues, keepOpenSubmit: boolean = false) {
    setIsLoading(true);
    
    // Ensure the values are properly typed before passing to onDebtAdded
    const debtData: Omit<DebtAccount, "id" | "userId" | "createdAt"> = {
      name: values.name,
      type: values.type,
      balance: values.balance,
      apr: values.apr,
      minimumPayment: values.minimumPayment,
      nextDueDate: values.nextDueDate,
      paymentDayOfMonth: values.nextDueDate.getDate(), // Store the day for backward compatibility
      paymentFrequency: values.paymentFrequency
    };
    
    if (isEditing && initialValues && onDebtEdited) {
      // If editing, call the edit function
      onDebtEdited(initialValues.id, debtData);
      onOpenChange(false);
    } else {
      // If adding new, call the add function
      onDebtAdded(debtData, keepOpenSubmit); // Pass the keepOpen flag to the parent component
      
      // If not keeping open, close the dialog
      if (!keepOpenSubmit) {
        onOpenChange(false);
      } else {
        // For "Save & Add Another", just reset the form
        resetFormFields();
      }
    }
    
    setIsLoading(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) resetFormFields();
      onOpenChange(open);
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Debt Account' : 'Add New Debt Account'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details for your debt account.' : 'Enter the details for your debt account (e.g., credit card, loan).'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form} key={`debt-form-${formResetKey}`}>
          <form onSubmit={form.handleSubmit((values) => onSubmit(values, false))} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Debt Account Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Chase Sapphire, Federal Student Loan" {...field} />
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
                  <FormLabel>Debt Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a debt type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {debtAccountTypes.map(type => (
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
            <FormField
              control={form.control}
              name="balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Balance ($) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="1500.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interest Rate (APR %) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="19.9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minimumPayment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Monthly Payment ($) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="50.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="nextDueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Next Due Date *</FormLabel>
                  <Popover open={isNextDueDatePickerOpen} onOpenChange={setIsNextDueDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
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
                          setIsNextDueDatePickerOpen(false);
                        }}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
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
              name="paymentFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Frequency *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentFrequencies.map(freq => (
                        <SelectItem key={freq} value={freq} className="capitalize">
                          {freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <div className="flex-1 flex justify-start">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)} 
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                {!isEditing && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={isLoading}
                    className="flex-1"
                    onClick={() => {
                      const values = form.getValues();
                      if (form.formState.isValid) {
                        onSubmit(values, true);
                      } else {
                        form.handleSubmit((values) => onSubmit(values, true))();
                      }
                    }}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save & Add Another
                  </Button>
                )}
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isEditing ? 'Update' : 'Save'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
