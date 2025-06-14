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
  startOfMonth, endOfMonth, isWithinInterval, isSameMonth, getYear
} from "date-fns";
import { calculateNextRecurringItemOccurrence, calculateNextDebtOccurrence, adjustToPreviousBusinessDay } from "@/lib/utils/date-calculations";

interface MonthlySummary {
  income: number;
  fixedExpenses: number;
  subscriptions: number;
  debtPayments: number;
}

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

    // Use the same comprehensive calculation logic as the calendar
    unifiedList.forEach(unifiedItem => {
      if (unifiedItem.source === 'debt') {
        // For debt payments, calculate occurrences in the displayed month
        const currentYear = getYear(displayedMonth);
        const yearStart = new Date(currentYear, 0, 1);
        const yearEnd = new Date(currentYear, 11, 31);
        
        const referenceDate = new Date(unifiedItem.nextOccurrenceDate);
        let allDebtDates: Date[] = [];
        
        if (unifiedItem.frequency === 'weekly') {
          let tempDate = new Date(referenceDate);
          while (tempDate >= yearStart) {
            if (tempDate >= yearStart) {
              allDebtDates.push(new Date(tempDate));
            }
            tempDate = addWeeks(tempDate, -1);
          }
          tempDate = addWeeks(referenceDate, 1);
          while (tempDate <= yearEnd) {
            allDebtDates.push(new Date(tempDate));
            tempDate = addWeeks(tempDate, 1);
          }
        } else if (unifiedItem.frequency === 'bi-weekly') {
          let tempDate = new Date(referenceDate);
          while (tempDate >= yearStart) {
            if (tempDate >= yearStart) {
              allDebtDates.push(new Date(tempDate));
            }
            tempDate = addWeeks(tempDate, -2);
          }
          tempDate = addWeeks(referenceDate, 2);
          while (tempDate <= yearEnd) {
            allDebtDates.push(new Date(tempDate));
            tempDate = addWeeks(tempDate, 2);
          }
        } else if (unifiedItem.frequency === 'monthly') {
          let tempDate = new Date(referenceDate);
          while (tempDate >= yearStart) {
            if (tempDate >= yearStart) {
              allDebtDates.push(new Date(tempDate));
            }
            tempDate = addMonths(tempDate, -1);
          }
          tempDate = addMonths(referenceDate, 1);
          while (tempDate <= yearEnd) {
            allDebtDates.push(new Date(tempDate));
            tempDate = addMonths(tempDate, 1);
          }
        } else if (unifiedItem.frequency === 'annually') {
          if (referenceDate >= yearStart && referenceDate <= yearEnd) {
            allDebtDates.push(referenceDate);
          }
        } else {
          if (referenceDate >= yearStart && referenceDate <= yearEnd) {
            allDebtDates.push(referenceDate);
          }
        }
        
        // Count occurrences in the displayed month
        allDebtDates.forEach(debtDate => {
          if (isSameMonth(debtDate, displayedMonth)) {
            currentDebtPayments += unifiedItem.amount;
          }
        });
        
      } else {
        // For recurring items (income, subscriptions, fixed expenses)
        if (unifiedItem.status === "Ended") return;

        const currentYear = getYear(displayedMonth);
        const yearStart = new Date(currentYear, 0, 1);
        const yearEnd = new Date(currentYear, 11, 31);
        
        let allOccurrences: Date[] = [];

        if (unifiedItem.frequency === 'semi-monthly') {
          if (unifiedItem.semiMonthlyFirstPayDate && unifiedItem.semiMonthlySecondPayDate) {
            const firstPayDay = getDate(new Date(unifiedItem.semiMonthlyFirstPayDate));
            const secondPayDay = getDate(new Date(unifiedItem.semiMonthlySecondPayDate));
            
            for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
              const currentMonthStart = new Date(currentYear, monthIndex, 1);
              const currentMonthEnd = endOfMonth(currentMonthStart);
              
              const firstPayDate = new Date(currentMonthStart);
              firstPayDate.setDate(Math.min(firstPayDay, getDate(currentMonthEnd)));
              
              const secondPayDate = new Date(currentMonthStart);
              secondPayDate.setDate(Math.min(secondPayDay, getDate(currentMonthEnd)));
              
              // Apply business day adjustment for income items
              const adjustedFirstPayDate = unifiedItem.itemDisplayType === 'income' 
                ? adjustToPreviousBusinessDay(firstPayDate) 
                : firstPayDate;
              const adjustedSecondPayDate = unifiedItem.itemDisplayType === 'income' 
                ? adjustToPreviousBusinessDay(secondPayDate) 
                : secondPayDate;
              
              if (!unifiedItem.endDate || adjustedFirstPayDate <= startOfDay(new Date(unifiedItem.endDate))) {
                allOccurrences.push(adjustedFirstPayDate);
              }
              if (!unifiedItem.endDate || adjustedSecondPayDate <= startOfDay(new Date(unifiedItem.endDate))) {
                allOccurrences.push(adjustedSecondPayDate);
              }
            }
          }
        } else {
          const referenceDate = new Date(unifiedItem.nextOccurrenceDate);
          
          if (unifiedItem.frequency === 'daily') {
            let tempDate = new Date(referenceDate);
            while (tempDate >= yearStart) {
              if (tempDate >= yearStart && (!unifiedItem.endDate || tempDate <= startOfDay(new Date(unifiedItem.endDate)))) {
                allOccurrences.push(new Date(tempDate));
              }
              tempDate = addDays(tempDate, -1);
            }
            tempDate = addDays(referenceDate, 1);
            while (tempDate <= yearEnd) {
              if (!unifiedItem.endDate || tempDate <= startOfDay(new Date(unifiedItem.endDate))) {
                allOccurrences.push(new Date(tempDate));
              }
              tempDate = addDays(tempDate, 1);
            }
          } else if (unifiedItem.frequency === 'weekly') {
            let tempDate = new Date(referenceDate);
            while (tempDate >= yearStart) {
              if (tempDate >= yearStart && (!unifiedItem.endDate || tempDate <= startOfDay(new Date(unifiedItem.endDate)))) {
                allOccurrences.push(new Date(tempDate));
              }
              tempDate = addWeeks(tempDate, -1);
            }
            tempDate = addWeeks(referenceDate, 1);
            while (tempDate <= yearEnd) {
              if (!unifiedItem.endDate || tempDate <= startOfDay(new Date(unifiedItem.endDate))) {
                allOccurrences.push(new Date(tempDate));
              }
              tempDate = addWeeks(tempDate, 1);
            }
          } else if (unifiedItem.frequency === 'bi-weekly') {
            let tempDate = new Date(referenceDate);
            while (tempDate >= yearStart) {
              if (tempDate >= yearStart && (!unifiedItem.endDate || tempDate <= startOfDay(new Date(unifiedItem.endDate)))) {
                allOccurrences.push(new Date(tempDate));
              }
              tempDate = addWeeks(tempDate, -2);
            }
            tempDate = addWeeks(referenceDate, 2);
            while (tempDate <= yearEnd) {
              if (!unifiedItem.endDate || tempDate <= startOfDay(new Date(unifiedItem.endDate))) {
                allOccurrences.push(new Date(tempDate));
              }
              tempDate = addWeeks(tempDate, 2);
            }
          } else if (unifiedItem.frequency === 'monthly') {
            let tempDate = new Date(referenceDate);
            while (tempDate >= yearStart) {
              if (tempDate >= yearStart && (!unifiedItem.endDate || tempDate <= startOfDay(new Date(unifiedItem.endDate)))) {
                allOccurrences.push(new Date(tempDate));
              }
              tempDate = addMonths(tempDate, -1);
            }
            tempDate = addMonths(referenceDate, 1);
            while (tempDate <= yearEnd) {
              if (!unifiedItem.endDate || tempDate <= startOfDay(new Date(unifiedItem.endDate))) {
                allOccurrences.push(new Date(tempDate));
              }
              tempDate = addMonths(tempDate, 1);
            }
          } else if (unifiedItem.frequency === 'quarterly') {
            let tempDate = new Date(referenceDate);
            while (tempDate >= yearStart) {
              if (tempDate >= yearStart && (!unifiedItem.endDate || tempDate <= startOfDay(new Date(unifiedItem.endDate)))) {
                allOccurrences.push(new Date(tempDate));
              }
              tempDate = addQuarters(tempDate, -1);
            }
            tempDate = addQuarters(referenceDate, 1);
            while (tempDate <= yearEnd) {
              if (!unifiedItem.endDate || tempDate <= startOfDay(new Date(unifiedItem.endDate))) {
                allOccurrences.push(new Date(tempDate));
              }
              tempDate = addQuarters(tempDate, 1);
            }
          } else if (unifiedItem.frequency === 'yearly') {
            if (referenceDate >= yearStart && referenceDate <= yearEnd) {
              if (!unifiedItem.endDate || referenceDate <= startOfDay(new Date(unifiedItem.endDate))) {
                allOccurrences.push(referenceDate);
              }
            }
          }
        }
        
        // Count occurrences in the displayed month
        allOccurrences.forEach(occurrenceDate => {
          // Apply business day adjustment for income items
          const adjustedDate = unifiedItem.itemDisplayType === 'income' 
            ? adjustToPreviousBusinessDay(occurrenceDate) 
            : occurrenceDate;
            
          if (isSameMonth(adjustedDate, displayedMonth)) {
            if (unifiedItem.itemDisplayType === 'income') {
              currentIncome += unifiedItem.amount;
            } else if (unifiedItem.itemDisplayType === 'fixed-expense') {
              currentFixedExpenses += unifiedItem.amount;
            } else if (unifiedItem.itemDisplayType === 'subscription') {
              currentSubscriptions += unifiedItem.amount;
            }
          }
        });
      }
    });

    setMonthlySummaries({
      income: currentIncome,
      fixedExpenses: currentFixedExpenses,
      subscriptions: currentSubscriptions,
      debtPayments: currentDebtPayments,
    });

  }, [unifiedList, displayedMonth]);

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
