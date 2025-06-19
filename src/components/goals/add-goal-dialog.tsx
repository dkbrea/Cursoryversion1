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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FinancialGoal, GoalIconKey } from "@/types";
import { goalIconKeys } from "@/types";
import { Icons } from "@/components/icons"; // Ensure this is a named import
import { useState, useEffect, type ReactNode } from "react";
import { Loader2, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addMonths, startOfDay, isBefore } from "date-fns";

const goalIconDisplay: { key: GoalIconKey, label: string, IconComponent: React.ElementType }[] = [
    { key: 'default', label: 'Default', IconComponent: Icons.GoalDefault },
    { key: 'home', label: 'House', IconComponent: Icons.Home },
    { key: 'car', label: 'Car', IconComponent: Icons.Car },
    { key: 'plane', label: 'Travel/Vacation', IconComponent: Icons.Plane },
    { key: 'briefcase', label: 'Business/Career', IconComponent: Icons.Briefcase },
    { key: 'graduation-cap', label: 'Education', IconComponent: Icons.GraduationCap },
    { key: 'gift', label: 'Gift/Large Purchase', IconComponent: Icons.Gift },
    { key: 'piggy-bank', label: 'Savings', IconComponent: Icons.PiggyBank },
    { key: 'trending-up', label: 'Investment', IconComponent: Icons.TrendingUp },
    { key: 'shield-check', label: 'Emergency Fund', IconComponent: Icons.ShieldCheck },
];


const formSchema = z.object({
  name: z.string().min(2, { message: "Goal name must be at least 2 characters." }).max(50),
  targetAmount: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]+/g,"")) : val),
    z.number({ required_error: "Target amount is required.", invalid_type_error: "Amount must be a number." }).positive({ message: "Target amount must be positive." })
  ),
  currentAmount: z.preprocess(
    (val) => {
        if (typeof val === 'string' && val.trim() === '') return 0; // Default to 0 if empty string
        return typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]+/g,"")) : val;
    },
    z.number({ invalid_type_error: "Amount must be a number." }).min(0, { message: "Current amount cannot be negative." }).default(0)
  ),
  targetDate: z.date({ required_error: "Target date is required." }).refine(
    (date) => {
        const today = startOfDay(new Date());
        const oneMonthFromToday = addMonths(today, 1);
        return !isBefore(startOfDay(date), oneMonthFromToday);
    },
    { message: "Target date must be at least one month in the future." }
  ),
  icon: z.enum(goalIconKeys).default('default'),
}).refine(data => data.currentAmount <= data.targetAmount, {
  message: "Current amount cannot exceed target amount.",
  path: ["currentAmount"],
});

type AddGoalFormValues = z.infer<typeof formSchema>;

interface AddGoalDialogProps {
  children: ReactNode; // Trigger button
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onGoalAdded: (goalData: Omit<FinancialGoal, "id" | "userId" | "createdAt">, keepOpen?: boolean) => void;
  initialValues?: FinancialGoal; // For editing later
  isEditing?: boolean;
  onGoalEdited?: (goalId: string, goalData: Omit<FinancialGoal, "id" | "userId" | "createdAt">) => void;
}

export function AddGoalDialog({ children, isOpen, onOpenChange, onGoalAdded, initialValues, isEditing = false, onGoalEdited }: AddGoalDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0); // Add a key to force re-render
  const [keepOpen, setKeepOpen] = useState(false);

  // Define fresh default values - only use initialValues when editing
  const getFreshDefaultValues = () => ({
    name: isEditing && initialValues ? initialValues.name : "",
    targetAmount: isEditing && initialValues ? initialValues.targetAmount : undefined,
    currentAmount: isEditing && initialValues ? initialValues.currentAmount : 0,
    targetDate: isEditing && initialValues ? initialValues.targetDate : undefined,
    icon: isEditing && initialValues ? initialValues.icon : 'default',
  });

  const form = useForm<AddGoalFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getFreshDefaultValues(),
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      resetFormFields();
    }
  }, [isOpen]);

  async function onSubmit(values: AddGoalFormValues, keepOpenSubmit: boolean = false) {
    setIsLoading(true);
    
    const goalData = {
      name: values.name,
      targetAmount: values.targetAmount,
      currentAmount: values.currentAmount,
      targetDate: startOfDay(values.targetDate), // Ensure time is stripped
      icon: values.icon,
    };
    
    if (isEditing && initialValues && onGoalEdited) {
      // If editing, call the edit function
      onGoalEdited(initialValues.id, goalData);
      onOpenChange(false);
    } else {
      // If adding new, call the add function
      onGoalAdded(goalData, keepOpenSubmit);
      
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
  
  const resetFormFields = () => {
    // Clear all form fields and errors
    form.clearErrors();
    
    // Get fresh default values (empty for new goals, populated for editing)
    const freshDefaults = getFreshDefaultValues();
    
    // Reset to completely fresh state
    form.reset(freshDefaults, {
      keepDefaultValues: false,
      keepErrors: false,
      keepDirty: false,
      keepIsSubmitted: false,
      keepTouched: false,
      keepIsValid: false,
      keepSubmitCount: false
    });
    
    // Reset date picker state
    setIsDatePickerOpen(false);
    
    // Force re-render with a new key
    setFormResetKey(prev => prev + 1);
  }


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) resetFormFields();
      onOpenChange(open);
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Financial Goal' : 'Add New Financial Goal'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update your financial goal details.' : 'Define your financial target, how much you\'ve saved, and by when you want to achieve it.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form} key={`goal-form-${formResetKey}`}>
          <form onSubmit={form.handleSubmit((values) => onSubmit(values, false))} className="flex flex-col flex-1">
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Dream Vacation, New Laptop" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Amount ($) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="5000.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Amount Saved ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Target Date *</FormLabel>
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            onClick={() => setIsDatePickerOpen(true)}
                          >
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto p-0 max-h-[300px] overflow-y-auto" 
                        align="start" 
                        side="bottom" 
                        sideOffset={4} 
                        avoidCollisions={false}
                        sticky="always"
                      >
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => { field.onChange(date); setIsDatePickerOpen(false); }}
                          disabled={(date) => isBefore(date, startOfDay(addMonths(new Date(), 1)))} // Disable past dates and current month
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
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Icon (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {goalIconDisplay.map(iconItem => (
                          <SelectItem key={iconItem.key} value={iconItem.key}>
                            <div className="flex items-center gap-2">
                              <iconItem.IconComponent className="h-4 w-4" />
                              {iconItem.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 pt-4 border-t">
              <div className="flex-1 flex justify-start">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { onOpenChange(false); resetFormFields(); }} 
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
