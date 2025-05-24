"use client";

import type { RecurringItem, DebtAccount, UnifiedRecurringListItem } from "@/types";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, List, CalendarDays, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { AddRecurringItemDialog } from "./add-recurring-item-dialog";
import { RecurringList } from "./recurring-list";
import { RecurringCalendarView } from "./recurring-calendar-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecurringSummaryCards } from "./recurring-summary-cards";
import { 
  addDays, addWeeks, addMonths, addQuarters, addYears, 
  isSameDay, setDate, getDate, startOfDay, 
  startOfMonth, endOfMonth, isWithinInterval
} from "date-fns";

interface MonthlySummary {
  income: number;
  fixedExpenses: number;
  subscriptions: number;
  debtPayments: number;
}

// Helper to calculate the single next occurrence for list view
const calculateNextRecurringItemOccurrence = (item: RecurringItem): Date => {
  const today = startOfDay(new Date());
  const itemEndDate = item.endDate ? startOfDay(new Date(item.endDate)) : null;

  if (itemEndDate && itemEndDate < today) {
    return itemEndDate; 
  }
  
  let nextOccurrence: Date;

  if (item.type === 'subscription') {
    if (!item.lastRenewalDate) return itemEndDate || today;
    const baseDate = startOfDay(new Date(item.lastRenewalDate));
    nextOccurrence = new Date(baseDate.getTime()); 
    
    do {
      switch (item.frequency) {
        case "daily": nextOccurrence = addDays(nextOccurrence, 1); break;
        case "weekly": nextOccurrence = addWeeks(nextOccurrence, 1); break;
        case "bi-weekly": nextOccurrence = addWeeks(nextOccurrence, 2); break;
        case "monthly": nextOccurrence = addMonths(nextOccurrence, 1); break;
        case "quarterly": nextOccurrence = addQuarters(nextOccurrence, 1); break;
        case "yearly": nextOccurrence = addYears(nextOccurrence, 1); break;
        default: return itemEndDate || today;
      }
      if (itemEndDate && nextOccurrence > itemEndDate) return itemEndDate;
    } while (nextOccurrence < today);
  } else if (item.frequency === 'semi-monthly') {
    const date1 = item.semiMonthlyFirstPayDate ? startOfDay(new Date(item.semiMonthlyFirstPayDate)) : null;
    const date2 = item.semiMonthlySecondPayDate ? startOfDay(new Date(item.semiMonthlySecondPayDate)) : null;
    
    let upcomingDates = [];
    if (date1 && (!itemEndDate || date1 <= itemEndDate) && date1 >= today) upcomingDates.push(date1);
    if (date2 && (!itemEndDate || date2 <= itemEndDate) && date2 >= today) upcomingDates.push(date2);
    
    if (upcomingDates.length > 0) {
      nextOccurrence = upcomingDates.sort((a,b) => a.getTime() - b.getTime())[0];
    } else { 
      const lastSemiMonthlyDate = date2 && date1 ? (date2 > date1 ? date2 : date1) : (date2 || date1 || today);
      return itemEndDate && itemEndDate < lastSemiMonthlyDate ? itemEndDate : lastSemiMonthlyDate;
    }
  } else {
    if (!item.startDate) return itemEndDate || today;
    const baseDate = startOfDay(new Date(item.startDate));
    nextOccurrence = new Date(baseDate.getTime());
    
    while (nextOccurrence < today) {
      if (itemEndDate && nextOccurrence >= itemEndDate) return itemEndDate;
      switch (item.frequency) {
        case "daily": nextOccurrence = addDays(nextOccurrence, 1); break;
        case "weekly": nextOccurrence = addWeeks(nextOccurrence, 1); break;
        case "bi-weekly": nextOccurrence = addWeeks(nextOccurrence, 2); break;
        case "monthly": nextOccurrence = addMonths(nextOccurrence, 1); break;
        case "quarterly": nextOccurrence = addQuarters(nextOccurrence, 1); break;
        case "yearly": nextOccurrence = addYears(nextOccurrence, 1); break;
        default: return nextOccurrence;
      }
    }
  }

  if (itemEndDate && nextOccurrence > itemEndDate) return itemEndDate;
  return nextOccurrence;
};

const calculateNextDebtOccurrence = (debt: DebtAccount): Date => {
  const today = startOfDay(new Date());
  const debtCreatedAt = startOfDay(new Date(debt.createdAt));
  let currentDate = setDate(today, debt.paymentDayOfMonth);

  if (currentDate < today) { 
    currentDate = addMonths(currentDate, 1);
  }
  
  if (currentDate < debtCreatedAt) {
    currentDate = setDate(debtCreatedAt, debt.paymentDayOfMonth);
    if (currentDate < debtCreatedAt) { 
      currentDate = addMonths(currentDate, 1);
    }
  }

  let nextDate = startOfDay(new Date(currentDate));
  
  if (debt.paymentFrequency !== 'monthly') {
    let checkDate = setDate(debtCreatedAt, debt.paymentDayOfMonth);
    if (checkDate < debtCreatedAt) checkDate = addMonths(checkDate, 1);

    while(checkDate < today) {
      switch (debt.paymentFrequency) {
        case "bi-weekly": checkDate = addWeeks(checkDate, 2); break;
        case "weekly": checkDate = addWeeks(checkDate, 1); break;
        case "annually": checkDate = addYears(checkDate, 1); break;
        default: checkDate = addMonths(checkDate, 1); break; 
      }
    }
    nextDate = checkDate;
  }
  
  return nextDate;
};

export function RecurringManager() {
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [debtAccounts, setDebtAccounts] = useState<DebtAccount[]>([]);
  const [unifiedList, setUnifiedList] = useState<UnifiedRecurringListItem[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<RecurringItem | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [displayedMonth, setDisplayedMonth] = useState<Date>(startOfMonth(new Date())); // Track displayed month
  const { toast } = useToast();
  const { user } = useAuth();
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummary>({
    income: 0,
    fixedExpenses: 0,
    subscriptions: 0,
    debtPayments: 0,
  });

  // Effect to fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        // Fetch recurring items
        const { data: recurringData, error: recurringError } = await supabase
          .from('recurring_items')
          .select('*')
          .eq('user_id', user.id);

        if (recurringError) {
          throw new Error(recurringError.message);
        }

        // Fetch debt accounts
        const { data: debtData, error: debtError } = await supabase
          .from('debt_accounts')
          .select('*')
          .eq('user_id', user.id);

        if (debtError) {
          throw new Error(debtError.message);
        }

        // Transform the data to match our types
        const formattedRecurringItems: RecurringItem[] = recurringData?.map(item => ({
          id: item.id,
          name: item.name,
          type: item.type,
          amount: item.amount,
          frequency: item.frequency,
          startDate: item.start_date ? new Date(item.start_date) : undefined,
          lastRenewalDate: item.last_renewal_date ? new Date(item.last_renewal_date) : undefined,
          endDate: item.end_date ? new Date(item.end_date) : undefined,
          semiMonthlyFirstPayDate: item.semi_monthly_first_pay_date ? new Date(item.semi_monthly_first_pay_date) : undefined,
          semiMonthlySecondPayDate: item.semi_monthly_second_pay_date ? new Date(item.semi_monthly_second_pay_date) : undefined,
          userId: item.user_id,
          createdAt: new Date(item.created_at),
          categoryId: item.category_id,
          notes: item.notes
        })) || [];

        const formattedDebtAccounts: DebtAccount[] = debtData?.map(debt => ({
          id: debt.id,
          name: debt.name,
          type: debt.type,
          balance: debt.balance,
          apr: debt.apr,
          minimumPayment: debt.minimum_payment,
          paymentDayOfMonth: debt.payment_day_of_month,
          paymentFrequency: debt.payment_frequency,
          userId: debt.user_id,
          createdAt: new Date(debt.created_at)
        })) || [];

        setRecurringItems(formattedRecurringItems);
        setDebtAccounts(formattedDebtAccounts);
      } catch (error) {
        console.error('Error fetching recurring data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load recurring items and debt accounts.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id, toast]);

  // Effect for Unified List (for display)
  useEffect(() => {
    const today = startOfDay(new Date());
    const transformedRecurringItems: UnifiedRecurringListItem[] = recurringItems.map(item => {
      const nextOccurrenceDate = calculateNextRecurringItemOccurrence(item);
      const itemEndDate = item.endDate ? startOfDay(new Date(item.endDate)) : null;
      let status: UnifiedRecurringListItem['status'] = "Upcoming";

      if (itemEndDate && itemEndDate < today && isSameDay(nextOccurrenceDate, itemEndDate)) {
         status = "Ended";
      } else if (isSameDay(nextOccurrenceDate, today)) {
        status = "Today";
      } else if (nextOccurrenceDate < today) {
        status = "Ended";
      }
      
      return {
        id: item.id,
        name: item.name,
        itemDisplayType: item.type,
        amount: item.amount,
        frequency: item.frequency,
        nextOccurrenceDate,
        status,
        isDebt: false,
        endDate: item.endDate,
        startDate: item.startDate,
        lastRenewalDate: item.lastRenewalDate,
        semiMonthlyFirstPayDate: item.semiMonthlyFirstPayDate,
        semiMonthlySecondPayDate: item.semiMonthlySecondPayDate,
        notes: item.notes,
        categoryId: item.categoryId,
        source: 'recurring',
      };
    });

    const transformedDebtItems: UnifiedRecurringListItem[] = debtAccounts.map(debt => {
      const nextOccurrenceDate = calculateNextDebtOccurrence(debt);
      return {
        id: debt.id, 
        name: `${debt.name} (Payment)`, 
        itemDisplayType: 'debt-payment',
        amount: debt.minimumPayment, 
        frequency: debt.paymentFrequency, 
        nextOccurrenceDate,
        status: isSameDay(nextOccurrenceDate, today) ? "Today" : "Upcoming",
        isDebt: true, 
        source: 'debt',
      };
    });

    const combined = [...transformedRecurringItems, ...transformedDebtItems];
    combined.sort((a, b) => {
        if (a.status === "Ended" && b.status !== "Ended") return 1;
        if (b.status === "Ended" && a.status !== "Ended") return -1;
        return new Date(a.nextOccurrenceDate).getTime() - new Date(b.nextOccurrenceDate).getTime();
    });
    setUnifiedList(combined);

  }, [recurringItems, debtAccounts]);

  // Effect for Monthly Summaries - calculate for the displayed month
  useEffect(() => {
    const currentMonthStart = startOfMonth(displayedMonth);
    const currentMonthEnd = endOfMonth(displayedMonth);
    
    let currentIncome = 0;
    let currentFixedExpenses = 0;
    let currentSubscriptions = 0;
    let currentDebtPayments = 0;

    recurringItems.forEach(item => {
      if (item.endDate && startOfDay(new Date(item.endDate)) < currentMonthStart) return; 

      let itemMonthlyTotal = 0;
      
      if (item.frequency === 'semi-monthly') {
        if (item.semiMonthlyFirstPayDate && isWithinInterval(startOfDay(new Date(item.semiMonthlyFirstPayDate)), { start: currentMonthStart, end: currentMonthEnd })) {
          if (!item.endDate || startOfDay(new Date(item.semiMonthlyFirstPayDate)) <= startOfDay(new Date(item.endDate))) {
            itemMonthlyTotal += item.amount;
          }
        }
        if (item.semiMonthlySecondPayDate && isWithinInterval(startOfDay(new Date(item.semiMonthlySecondPayDate)), { start: currentMonthStart, end: currentMonthEnd })) {
           if (!item.endDate || startOfDay(new Date(item.semiMonthlySecondPayDate)) <= startOfDay(new Date(item.endDate))) {
            itemMonthlyTotal += item.amount;
          }
        }
      } else {
        let baseIterationDate: Date | null = null;
        if (item.type === 'subscription') {
            if (!item.lastRenewalDate) return;
            baseIterationDate = startOfDay(new Date(item.lastRenewalDate));
        } else {
            if (!item.startDate) return;
            baseIterationDate = startOfDay(new Date(item.startDate));
        }

        if (baseIterationDate > currentMonthEnd) return;

        let tempDate = new Date(baseIterationDate);
        
        // For subscriptions, first actual payment is *after* last renewal. For others, it *is* the start date.
        if(item.type === 'subscription') {
            switch (item.frequency) {
                case "daily": tempDate = addDays(tempDate, 1); break;
                case "weekly": tempDate = addWeeks(tempDate, 1); break;
                case "bi-weekly": tempDate = addWeeks(tempDate, 2); break;
                case "monthly": tempDate = addMonths(tempDate, 1); break;
                case "quarterly": tempDate = addQuarters(tempDate, 1); break;
                case "yearly": tempDate = addYears(tempDate, 1); break;
            }
        }

        while (tempDate <= currentMonthEnd) {
          if (item.endDate && tempDate > startOfDay(new Date(item.endDate))) break;

          if (tempDate >= currentMonthStart) { 
             if (isWithinInterval(tempDate, { start: currentMonthStart, end: currentMonthEnd })) {
                itemMonthlyTotal += item.amount;
             }
          }
          
          if (tempDate > currentMonthEnd && item.frequency !== 'daily') break; 

          switch (item.frequency) {
            case "daily": tempDate = addDays(tempDate, 1); break;
            case "weekly": tempDate = addWeeks(tempDate, 1); break;
            case "bi-weekly": tempDate = addWeeks(tempDate, 2); break;
            case "monthly": tempDate = addMonths(tempDate, 1); break;
            case "quarterly": tempDate = addQuarters(tempDate, 1); break;
            case "yearly": tempDate = addYears(tempDate, 1); break;
            default: tempDate = addYears(tempDate, 100); break; 
          }
        }
      }

      if (item.type === 'income') currentIncome += itemMonthlyTotal;
      else if (item.type === 'fixed-expense') currentFixedExpenses += itemMonthlyTotal;
      else if (item.type === 'subscription') currentSubscriptions += itemMonthlyTotal;
    });

    debtAccounts.forEach(debt => {
      let debtMonthlyTotal = 0;
      let paymentDateForMonth = setDate(currentMonthStart, debt.paymentDayOfMonth);
      
      // Make sure the first potential payment day for this month isn't before the debt was created
      const debtCreationMonthStart = startOfMonth(new Date(debt.createdAt));
      if (paymentDateForMonth < debtCreationMonthStart && debt.paymentDayOfMonth < getDate(new Date(debt.createdAt))) {
           paymentDateForMonth = setDate(addMonths(paymentDateForMonth,1), debt.paymentDayOfMonth);
      } else if (paymentDateForMonth < debtCreationMonthStart) {
          paymentDateForMonth = setDate(debtCreationMonthStart, debt.paymentDayOfMonth);
      }

      let checkDate = new Date(paymentDateForMonth);
      if (checkDate < currentMonthStart) { // if payment day already passed for current month's start, advance to next cycle start
          switch (debt.paymentFrequency) {
            case "weekly": checkDate = addWeeks(checkDate, 1); break;
            case "bi-weekly": checkDate = addWeeks(checkDate, 2); break;
            case "monthly": checkDate = addMonths(checkDate, 1); break;
            case "annually": checkDate = addYears(checkDate, 1); break;
            default: break; // 'other' assumes one check
          }
      }
      
      // Iterate through possible pay dates in the current month
      while(isWithinInterval(checkDate, { start: currentMonthStart, end: currentMonthEnd })) {
        if (checkDate >= startOfDay(new Date(debt.createdAt))) { // Ensure payment is on or after debt creation
            debtMonthlyTotal += debt.minimumPayment;
        }
        switch (debt.paymentFrequency) {
            case "weekly": checkDate = addWeeks(checkDate, 1); break;
            case "bi-weekly": checkDate = addWeeks(checkDate, 2); break;
            // For monthly and annually, we only expect one payment per month (or less)
            // so we break after the first valid one.
            case "monthly": 
            case "annually":
            default: 
                checkDate = addMonths(checkDate, 1); // Effectively break by moving out of current month
                break; 
        }
      }
      currentDebtPayments += debtMonthlyTotal;
    });

    setMonthlySummaries({
      income: currentIncome,
      fixedExpenses: currentFixedExpenses,
      subscriptions: currentSubscriptions,
      debtPayments: currentDebtPayments,
    });

  }, [recurringItems, debtAccounts, displayedMonth]);

  const handleAddRecurringItem = (newItemData: Omit<RecurringItem, "id" | "userId" | "createdAt">) => {
    if (!user?.id) return;
    
    // Create a new item with a temporary ID
    const newItem: RecurringItem = {
      ...newItemData,
      id: `rec-${Date.now()}`,
      userId: user.id, 
      createdAt: new Date(),
      categoryId: newItemData.categoryId || undefined,
    };
    
    // Add to local state
    setRecurringItems((prevItems) => [...prevItems, newItem]);
    
    // Save to Supabase
    const saveToSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from('recurring_items')
          .insert({
            name: newItem.name,
            type: newItem.type,
            amount: newItem.amount,
            frequency: newItem.frequency,
            start_date: newItem.startDate,
            last_renewal_date: newItem.lastRenewalDate,
            end_date: newItem.endDate,
            semi_monthly_first_pay_date: newItem.semiMonthlyFirstPayDate,
            semi_monthly_second_pay_date: newItem.semiMonthlySecondPayDate,
            user_id: user.id,
            category_id: newItem.categoryId
          })
          .select()
          .single();
          
        if (error) throw error;
        
        // Update the local state with the real ID from Supabase
        if (data) {
          setRecurringItems(prevItems => 
            prevItems.map(item => 
              item.id === newItem.id ? {
                ...item,
                id: data.id
              } : item
            )
          );
        }
      } catch (error) {
        console.error('Error saving recurring item:', error);
        toast({
          title: 'Error',
          description: 'Failed to save recurring item to database.',
          variant: 'destructive'
        });
      }
    };
    
    saveToSupabase();
    
    toast({
      title: "Recurring Item Added",
      description: `"${newItem.name}" has been successfully added.`,
    });
    
    setIsAddDialogOpen(false);
  };

  const handleDeleteRecurringItem = (itemId: string, source: 'recurring' | 'debt') => {
    if (source === 'recurring') {
      const itemToDelete = recurringItems.find(item => item.id === itemId);
      if (!itemToDelete) return;
      
      // Remove from local state
      setRecurringItems((prevItems) => prevItems.filter(item => item.id !== itemId));
      
      // Delete from Supabase
      const deleteFromSupabase = async () => {
        try {
          const { error } = await supabase
            .from('recurring_items')
            .delete()
            .eq('id', itemId);
            
          if (error) throw error;
        } catch (error) {
          console.error('Error deleting recurring item:', error);
          toast({
            title: 'Error',
            description: 'Failed to delete recurring item from database.',
            variant: 'destructive'
          });
        }
      };
      
      deleteFromSupabase();
      
      toast({
        title: "Recurring Item Deleted",
        description: `"${itemToDelete.name}" has been deleted.`,
        variant: "destructive",
      });
    }
  };
  
  const handleUpdateRecurringItem = async (updatedItem: RecurringItem) => {
    if (!user?.id) return;
    
    // Update in local state first for immediate UI feedback
    setRecurringItems(prevItems => 
        prevItems.map(item => item.id === updatedItem.id ? updatedItem : item)
    );
    
    try {
      // Save to Supabase
      const { error } = await supabase
        .from('recurring_items')
        .update({
          name: updatedItem.name,
          type: updatedItem.type,
          amount: updatedItem.amount,
          frequency: updatedItem.frequency,
          start_date: updatedItem.startDate,
          last_renewal_date: updatedItem.lastRenewalDate,
          end_date: updatedItem.endDate,
          semi_monthly_first_pay_date: updatedItem.semiMonthlyFirstPayDate,
          semi_monthly_second_pay_date: updatedItem.semiMonthlySecondPayDate,
          category_id: updatedItem.categoryId,
          notes: updatedItem.notes
        })
        .eq('id', updatedItem.id);
        
      if (error) throw error;
      
      toast({
        title: "Recurring Item Updated",
        description: `"${updatedItem.name}" has been updated.`,
      });
    } catch (error) {
      console.error('Error updating recurring item:', error);
      toast({
        title: 'Error',
        description: 'Failed to update recurring item in database.',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Recurring Items</h2>
            <p className="text-muted-foreground">Manage your recurring income, expenses, and subscriptions.</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6 flex justify-center items-center min-h-[300px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading your recurring items...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Recurring Items</h2>
          <p className="text-muted-foreground">Manage your recurring income, expenses, and subscriptions.</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </div>

      <RecurringSummaryCards summaries={monthlySummaries} />

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[300px]">
          <TabsTrigger value="list"><List className="mr-2 h-4 w-4" /> List View</TabsTrigger>
          <TabsTrigger value="calendar"><CalendarDays className="mr-2 h-4 w-4" /> Calendar View</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <Card className="shadow-lg mt-4">
            <CardHeader>
              <CardTitle>All Recurring Items & Debt Payments</CardTitle>
              <CardDescription>View and manage your scheduled income, expenses, and debt payments.</CardDescription>
            </CardHeader>
            <CardContent>
              {unifiedList.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No recurring items found.</p>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Item
                  </Button>
                </div>
              ) : (
                <RecurringList
                  items={unifiedList}
                  onDeleteItem={handleDeleteRecurringItem}
                  onEditItem={(item) => { 
                    const originalItem = recurringItems.find(ri => ri.id === item.id);
                    if (originalItem) {
                      setItemToEdit(originalItem);
                      setIsEditDialogOpen(true);
                      setDialogKey(prev => prev + 1); // Force dialog recreation
                    }
                  }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="calendar">
          <RecurringCalendarView 
            items={unifiedList} 
            onMonthChange={setDisplayedMonth}
          />
        </TabsContent>
      </Tabs>

      <AddRecurringItemDialog
        key={`add-dialog-${dialogKey}`}
        isOpen={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            setDialogKey(prev => prev + 1); // Force dialog recreation when closed
          }
        }}
        onRecurringItemAdded={handleAddRecurringItem}
      >
        <Button type="button">Add Recurring Item</Button>
      </AddRecurringItemDialog>

      {/* Edit Recurring Item Dialog */}
      {itemToEdit && (
        <AddRecurringItemDialog
          key={`edit-dialog-${dialogKey}`}
          isOpen={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setItemToEdit(null);
              setDialogKey(prev => prev + 1); // Force dialog recreation when closed
            }
          }}
          initialType={itemToEdit.type}
          initialValues={itemToEdit}
          onRecurringItemAdded={(updatedItemData) => {
            // Create updated item with original ID and creation date
            const updatedItem: RecurringItem = {
              ...updatedItemData as RecurringItem,
              id: itemToEdit.id,
              userId: itemToEdit.userId,
              createdAt: itemToEdit.createdAt
            };
            
            handleUpdateRecurringItem(updatedItem);
            setIsEditDialogOpen(false);
          }}
        >
          <Button type="button">Edit Recurring Item</Button>
        </AddRecurringItemDialog>
      )}
    </div>
  );
}
