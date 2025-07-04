"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, Plus, Calculator } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, endOfYear, differenceInDays, differenceInWeeks, differenceInMonths } from "date-fns";
import { cn } from "@/lib/utils";
import type { SinkingFund, ContributionFrequency, RecurringItem, VariableExpense, PredefinedRecurringCategoryValue } from "@/types";
import { contributionFrequencies, predefinedRecurringCategories } from "@/types";
import { getRecurringItems } from "@/lib/api/recurring";
import { getVariableExpenses } from "@/lib/api/variable-expenses";
import { useAuth } from "@/contexts/auth-context";

interface AddSinkingFundDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSinkingFundAdded: (sinkingFundData: Omit<SinkingFund, "id" | "userId" | "createdAt" | "updatedAt">, keepOpen?: boolean) => void;
  children?: React.ReactNode;
  initialValues?: SinkingFund; // For editing mode
  isEditing?: boolean;
  onSinkingFundEdited?: (sinkingFundId: string, updatedData: Partial<Omit<SinkingFund, "id" | "userId" | "createdAt" | "updatedAt">>) => void;
}

const frequencyDisplayNames: Record<ContributionFrequency, string> = {
  'weekly': 'Weekly',
  'bi-weekly': 'Bi-weekly',
  'monthly': 'Monthly',
  'quarterly': 'Quarterly',
  'annually': 'Annually'
};

// Helper function to calculate months remaining in current year
const getMonthsRemainingInYear = (): number => {
  const now = new Date();
  const endOfYearDate = endOfYear(now);
  return Math.max(1, differenceInMonths(endOfYearDate, now) + 1); // +1 to include current month
};

// Helper function to calculate contribution amount based on frequency
const calculateContributionAmount = (
  targetAmount: number,
  currentAmount: number,
  targetDate: Date,
  frequency: ContributionFrequency
): number => {
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) return 0;
  
  const today = new Date();
  const daysDiff = differenceInDays(targetDate, today);
  
  if (daysDiff <= 0) return remaining;
  
  let periods: number;
  
  switch (frequency) {
    case 'weekly':
      periods = Math.ceil(daysDiff / 7);
      break;
    case 'bi-weekly':
      periods = Math.ceil(daysDiff / 14);
      break;
    case 'monthly':
      periods = differenceInMonths(targetDate, today) || 1;
      break;
    case 'quarterly':
      periods = Math.ceil(differenceInMonths(targetDate, today) / 3) || 1;
      break;
    case 'annually':
      periods = Math.ceil(differenceInMonths(targetDate, today) / 12) || 1;
      break;
    default:
      periods = Math.ceil(daysDiff / 30); // Default to monthly
  }
  
  return Math.ceil(remaining / periods);
};

// Helper function to map variable expense category string to PredefinedRecurringCategoryValue
const mapVariableCategoryToPredefined = (category: string): PredefinedRecurringCategoryValue => {
  // Direct mapping if it's already a valid predefined category
  const validCategories: PredefinedRecurringCategoryValue[] = [
    'housing', 'food', 'utilities', 'transportation', 'health', 'personal', 'home-family', 'media-productivity'
  ];
  
  if (validCategories.includes(category as PredefinedRecurringCategoryValue)) {
    return category as PredefinedRecurringCategoryValue;
  }
  
  // Default fallback
  return 'personal';
};

export function AddSinkingFundDialog({ isOpen, onOpenChange, onSinkingFundAdded, children, initialValues, isEditing, onSinkingFundEdited }: AddSinkingFundDialogProps) {
  const { user } = useAuth();
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [variableExpenses, setVariableExpenses] = useState<VariableExpense[]>([]);
  const [loadingRecurring, setLoadingRecurring] = useState(false);
  const [loadingVariable, setLoadingVariable] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    targetAmount: "",
    currentAmount: "",
    nextExpenseDate: undefined as Date | undefined,
    category: "personal" as PredefinedRecurringCategoryValue,
    isLinkedToExpense: false,
    linkedExpenseType: "recurring" as "recurring" | "variable",
    recurringExpenseId: "",
    variableExpenseId: "",
    contributionFrequency: "monthly" as ContributionFrequency,
    autoCalculate: true, // New field to control auto calculation
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load expenses when dialog opens
  useEffect(() => {
    if (isOpen && user?.id) {
      // Load recurring items
      setLoadingRecurring(true);
      getRecurringItems(user.id).then(({ items, error }) => {
        if (!error && items) {
          // Filter for expense items only (fixed-expense and subscription)
          const expenseItems = items.filter(item => 
            item.type === 'fixed-expense' || item.type === 'subscription'
          );
          setRecurringItems(expenseItems);
        }
        setLoadingRecurring(false);
      });

      // Load variable expenses
      setLoadingVariable(true);
      getVariableExpenses(user.id).then(({ expenses, error }) => {
        if (!error && expenses) {
          setVariableExpenses(expenses);
        }
        setLoadingVariable(false);
      });
    }
  }, [isOpen, user?.id]);

  // Handle expense selection and auto-population
  useEffect(() => {
    if (formData.isLinkedToExpense) {
      let selectedExpense: RecurringItem | VariableExpense | undefined;
      
      if (formData.linkedExpenseType === "recurring" && formData.recurringExpenseId) {
        selectedExpense = recurringItems.find(item => item.id === formData.recurringExpenseId);
      } else if (formData.linkedExpenseType === "variable" && formData.variableExpenseId) {
        selectedExpense = variableExpenses.find(item => item.id === formData.variableExpenseId);
      }

      if (selectedExpense) {
        // Both recurring and variable expenses use the same calculation:
        // monthly amount × months remaining in current year
        const monthsRemaining = getMonthsRemainingInYear();
        const calculatedTarget = selectedExpense.amount * monthsRemaining;
        const targetDate = endOfYear(new Date());
        
        // Get category based on expense type
        let category: PredefinedRecurringCategoryValue = 'personal';
        if (formData.linkedExpenseType === "recurring") {
          const recurringExpense = selectedExpense as RecurringItem;
          category = recurringExpense.categoryId || 'personal';
        } else {
          const variableExpense = selectedExpense as VariableExpense;
          category = mapVariableCategoryToPredefined(variableExpense.category);
        }
        
        // Auto-populate fields
        setFormData(prev => ({
          ...prev,
          name: prev.name || `${selectedExpense!.name} Fund`,
          targetAmount: calculatedTarget.toString(),
          nextExpenseDate: targetDate,
          category: category,
        }));
      }
    }
  }, [
    formData.isLinkedToExpense, 
    formData.linkedExpenseType, 
    formData.recurringExpenseId, 
    formData.variableExpenseId, 
    recurringItems, 
    variableExpenses
  ]);

  // Calculate contribution amount automatically
  const calculatedContribution = useMemo(() => {
    if (!formData.autoCalculate || !formData.targetAmount || !formData.nextExpenseDate) {
      return 0;
    }
    
    const targetAmount = parseFloat(formData.targetAmount) || 0;
    const currentAmount = parseFloat(formData.currentAmount) || 0;
    
    return calculateContributionAmount(
      targetAmount,
      currentAmount,
      formData.nextExpenseDate,
      formData.contributionFrequency
    );
  }, [
    formData.autoCalculate,
    formData.targetAmount,
    formData.currentAmount,
    formData.nextExpenseDate,
    formData.contributionFrequency
  ]);

  // Initialize form with existing data when editing
  useEffect(() => {
    if (isEditing && initialValues) {
      setFormData({
        name: initialValues.name,
        description: initialValues.description || "",
        targetAmount: initialValues.targetAmount.toString(),
        currentAmount: initialValues.currentAmount.toString(),
        nextExpenseDate: initialValues.nextExpenseDate,
        category: initialValues.category,
        isLinkedToExpense: initialValues.isRecurring,
        linkedExpenseType: initialValues.recurringExpenseId ? "recurring" : "variable",
        recurringExpenseId: initialValues.recurringExpenseId || "",
        variableExpenseId: initialValues.variableExpenseId || "",
        contributionFrequency: initialValues.contributionFrequency,
        autoCalculate: true,
      });
    } else if (!isEditing) {
      // Reset to defaults when switching to add mode
      resetForm();
    }
  }, [isEditing, initialValues]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Fund name is required";
    }

    if (!formData.targetAmount || parseFloat(formData.targetAmount) <= 0) {
      newErrors.targetAmount = "Target amount must be greater than 0";
    }

    const currentAmount = parseFloat(formData.currentAmount) || 0;
    const targetAmount = parseFloat(formData.targetAmount) || 0;
    
    if (currentAmount < 0) {
      newErrors.currentAmount = "Current amount cannot be negative";
    }

    if (currentAmount > targetAmount) {
      newErrors.currentAmount = "Current amount cannot exceed target amount";
    }

    if (formData.isLinkedToExpense) {
      if (formData.linkedExpenseType === "recurring" && !formData.recurringExpenseId) {
        newErrors.recurringExpenseId = "Please select a recurring expense";
      } else if (formData.linkedExpenseType === "variable" && !formData.variableExpenseId) {
        newErrors.variableExpenseId = "Please select a variable expense";
      }
    }

    if (!formData.nextExpenseDate) {
      newErrors.nextExpenseDate = "Expected date is required for calculation";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (keepOpen = false) => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && initialValues && onSinkingFundEdited) {
        // Edit mode
        const updatedData: Partial<Omit<SinkingFund, "id" | "userId" | "createdAt" | "updatedAt">> = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          targetAmount: parseFloat(formData.targetAmount),
          currentAmount: parseFloat(formData.currentAmount) || 0,
          monthlyContribution: calculatedContribution,
          nextExpenseDate: formData.nextExpenseDate,
          category: formData.category,
          isRecurring: formData.isLinkedToExpense,
          recurringExpenseId: formData.isLinkedToExpense && formData.linkedExpenseType === "recurring" ? formData.recurringExpenseId : undefined,
          variableExpenseId: formData.isLinkedToExpense && formData.linkedExpenseType === "variable" ? formData.variableExpenseId : undefined,
          contributionFrequency: formData.contributionFrequency,
          isActive: true,
        };

        await onSinkingFundEdited(initialValues.id, updatedData);
      } else {
        // Add mode
        const sinkingFundData: Omit<SinkingFund, "id" | "userId" | "createdAt" | "updatedAt"> = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          targetAmount: parseFloat(formData.targetAmount),
          currentAmount: parseFloat(formData.currentAmount) || 0,
          monthlyContribution: calculatedContribution,
          nextExpenseDate: formData.nextExpenseDate,
          category: formData.category,
          isRecurring: formData.isLinkedToExpense, // Keep the same logic for backwards compatibility
          recurringExpenseId: formData.isLinkedToExpense && formData.linkedExpenseType === "recurring" ? formData.recurringExpenseId : undefined,
          variableExpenseId: formData.isLinkedToExpense && formData.linkedExpenseType === "variable" ? formData.variableExpenseId : undefined,
          contributionFrequency: formData.contributionFrequency,
          isActive: true,
        };

        await onSinkingFundAdded(sinkingFundData, keepOpen);
      }

      if (!keepOpen) {
        resetForm();
      } else if (!isEditing) {
        // Reset form but keep common fields if user wants to add multiple (only in add mode)
        setFormData(prev => ({
          ...prev,
          name: "",
          description: "",
          targetAmount: "",
          currentAmount: "",
          nextExpenseDate: undefined,
          isLinkedToExpense: false,
          recurringExpenseId: "",
          variableExpenseId: "",
        }));
      }
    } catch (error) {
      console.error('Error in form submission:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      targetAmount: "",
      currentAmount: "",
      nextExpenseDate: undefined,
      category: "personal",
      isLinkedToExpense: false,
      linkedExpenseType: "recurring",
      recurringExpenseId: "",
      variableExpenseId: "",
      contributionFrequency: "monthly",
      autoCalculate: true,
    });
    setErrors({});
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isEditing) {
      // Only reset form when closing and NOT in edit mode
      resetForm();
    }
    onOpenChange(open);
  };

  // Get currently selected expense for display purposes
  const selectedExpense = useMemo(() => {
    if (!formData.isLinkedToExpense) return null;
    
    if (formData.linkedExpenseType === "recurring" && formData.recurringExpenseId) {
      return recurringItems.find(item => item.id === formData.recurringExpenseId);
    } else if (formData.linkedExpenseType === "variable" && formData.variableExpenseId) {
      return variableExpenses.find(item => item.id === formData.variableExpenseId);
    }
    
    return null;
  }, [formData.isLinkedToExpense, formData.linkedExpenseType, formData.recurringExpenseId, formData.variableExpenseId, recurringItems, variableExpenses]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Sinking Fund" : "Add Sinking Fund"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update your sinking fund details and settings." 
              : "Create a new sinking fund to save for specific upcoming expenses. Link to existing expenses for automatic setup."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Link to Expense Toggle - First */}
          <div className="flex items-center space-x-2 p-4 bg-muted/30 rounded-lg">
            <Switch
              id="isLinkedToExpense"
              checked={formData.isLinkedToExpense}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                isLinkedToExpense: checked,
                recurringExpenseId: "",
                variableExpenseId: "",
                targetAmount: "",
                nextExpenseDate: checked ? endOfYear(new Date()) : undefined
              }))}
            />
            <Label htmlFor="isLinkedToExpense" className="font-medium">Link to existing expense</Label>
          </div>

          {/* Expense Type Selection */}
          {formData.isLinkedToExpense && (
            <div className="space-y-3">
              <Label>Expense Type</Label>
              <RadioGroup 
                value={formData.linkedExpenseType} 
                onValueChange={(value: "recurring" | "variable") => setFormData(prev => ({ 
                  ...prev, 
                  linkedExpenseType: value,
                  recurringExpenseId: "",
                  variableExpenseId: ""
                }))}
                className="flex space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="recurring" id="recurring" />
                  <Label htmlFor="recurring">Recurring Expense</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="variable" id="variable" />
                  <Label htmlFor="variable">Variable Expense</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Expense Selection */}
          {formData.isLinkedToExpense && (
            <div className="space-y-2">
              <Label>
                Select {formData.linkedExpenseType === "recurring" ? "Recurring" : "Variable"} Expense
              </Label>
              
              {formData.linkedExpenseType === "recurring" ? (
                <Select 
                  value={formData.recurringExpenseId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, recurringExpenseId: value }))}
                  disabled={loadingRecurring}
                >
                  <SelectTrigger className={errors.recurringExpenseId ? "border-red-500" : ""}>
                    <SelectValue placeholder={loadingRecurring ? "Loading expenses..." : "Select a recurring expense"} />
                  </SelectTrigger>
                  <SelectContent>
                    {recurringItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} (${item.amount}/month)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select 
                  value={formData.variableExpenseId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, variableExpenseId: value }))}
                  disabled={loadingVariable}
                >
                  <SelectTrigger className={errors.variableExpenseId ? "border-red-500" : ""}>
                    <SelectValue placeholder={loadingVariable ? "Loading expenses..." : "Select a variable expense"} />
                  </SelectTrigger>
                  <SelectContent>
                    {variableExpenses.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} (${item.amount}/month)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {(errors.recurringExpenseId || errors.variableExpenseId) && (
                <p className="text-sm text-red-500">
                  {errors.recurringExpenseId || errors.variableExpenseId}
                </p>
              )}
            </div>
          )}

          {/* Fund Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Fund Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Car Maintenance, Annual Insurance"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Additional details about this fund..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Target Amount and Current Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetAmount">Target Amount *</Label>
              <Input
                id="targetAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="1000.00"
                value={formData.targetAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, targetAmount: e.target.value }))}
                className={errors.targetAmount ? "border-red-500" : ""}
                readOnly={!!(formData.isLinkedToExpense && selectedExpense)}
              />
              {errors.targetAmount && <p className="text-sm text-red-500">{errors.targetAmount}</p>}
              {formData.isLinkedToExpense && selectedExpense && (
                <p className="text-xs text-muted-foreground">
                  Auto-calculated: $${selectedExpense.amount}/month × ${getMonthsRemainingInYear()} months remaining in year
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentAmount">Current Amount</Label>
              <Input
                id="currentAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.currentAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, currentAmount: e.target.value }))}
                className={errors.currentAmount ? "border-red-500" : ""}
              />
              {errors.currentAmount && <p className="text-sm text-red-500">{errors.currentAmount}</p>}
            </div>
          </div>

          {/* Expected Date */}
          <div className="space-y-2">
            <Label>Expected Expense Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.nextExpenseDate && "text-muted-foreground",
                    errors.nextExpenseDate && "border-red-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.nextExpenseDate ? format(formData.nextExpenseDate, "PPP") : "Select expected date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.nextExpenseDate}
                  onSelect={(date) => setFormData(prev => ({ ...prev, nextExpenseDate: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.nextExpenseDate && <p className="text-sm text-red-500">{errors.nextExpenseDate}</p>}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value: PredefinedRecurringCategoryValue) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {predefinedRecurringCategories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.isLinkedToExpense && selectedExpense && (
              <p className="text-xs text-muted-foreground">
                Auto-selected based on {formData.linkedExpenseType} expense category
              </p>
            )}
          </div>

          {/* Contribution Frequency and Auto Calculation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contributionFrequency">Contribution Frequency</Label>
              <Select value={formData.contributionFrequency} onValueChange={(value: ContributionFrequency) => setFormData(prev => ({ ...prev, contributionFrequency: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contributionFrequencies.map(frequency => (
                    <SelectItem key={frequency} value={frequency}>
                      {frequencyDisplayNames[frequency]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Auto-Calculated Contribution</Label>
              <div className="flex items-center space-x-2 p-2 bg-green-50 border border-green-200 rounded">
                <Calculator className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-700">
                  ${calculatedContribution.toLocaleString()}/{formData.contributionFrequency}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            onClick={() => handleSubmit(false)} 
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting 
              ? (isEditing ? "Updating..." : "Adding...") 
              : (isEditing ? "Update Fund" : "Add Fund")
            }
          </Button>
          {!isEditing && (
            <Button 
              onClick={() => handleSubmit(true)} 
              disabled={isSubmitting}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add & Create Another
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 