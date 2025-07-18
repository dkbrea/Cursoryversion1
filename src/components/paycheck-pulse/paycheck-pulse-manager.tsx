"use client";

import type {
  RecurringItem, DebtAccount, VariableExpense, FinancialGoal,
  PaycheckBreakdown, PaycheckTimeframe, MonthlyForecast, SinkingFund, PaycheckPreferences
} from "@/types";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaycheckBreakdownCard } from "./paycheck-breakdown-card";
import { PaycheckTimelineView } from "./paycheck-timeline-view";
import { PaycheckPreferencesDialog } from "./paycheck-preferences-dialog";
import { generatePaycheckPeriods, generatePaycheckBreakdownWithSinkingFunds, getOccurrencesInPeriod } from "@/lib/utils/paycheck-calculations";
import { calculateRecurringOccurrences } from "@/lib/utils/recurring-calculations";
import { getSinkingFundsWithProgress } from "@/lib/api/sinking-funds";
import { getUserPreferences, updateUserPreferences } from "@/lib/api/user-preferences";
import { getVariableExpenseSpending } from "@/lib/api/transactions";
import { isBefore, isAfter, startOfDay, startOfMonth, format, addDays, addWeeks, addMonths, addQuarters, addYears, getDate, endOfMonth, differenceInCalendarMonths, isPast } from "date-fns";
import { getForecastOverridesForMonth } from "@/lib/api/forecast-overrides";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { adjustToPreviousBusinessDay } from "@/lib/utils/date-calculations";
import { logger } from "@/lib/utils/logger";

// --- ManualExpenseTable component (moved above main component for scope) ---
function ManualExpenseTable({ items, prefix, manualOverrides, handleManualChange, minKey, showDefaults, hasManualOverridesForPeriod, manualStartDate, manualEndDate, onGetCurrentValues }: any) {
  // Local state for input values
  const [inputStates, setInputStates] = useState<Record<string, string>>({});

  // Expose current values to parent component (debounced to prevent excessive updates)
  useEffect(() => {
    if (onGetCurrentValues && typeof onGetCurrentValues === 'function') {
      const timeoutId = setTimeout(() => {
        onGetCurrentValues(inputStates);
      }, 100); // 100ms debounce
      
      return () => clearTimeout(timeoutId);
    }
  }, [inputStates, onGetCurrentValues]);

  useEffect(() => {
    // Reset local state when items or overrides change
    const newStates: Record<string, string> = {};
    items.forEach((item: any) => {
      const key = `${prefix}-${item.id}`;
      if (manualOverrides.hasOwnProperty(key)) {
        newStates[key] = String(manualOverrides[key]);
      } else {
        // Only auto-fill if this item has occurrences in the selected period
        let shouldAutoFill = false;
        
        // For recurring items, check occurrences in period
        if (manualStartDate && manualEndDate && (prefix === 'fixed' || prefix === 'subscription' || prefix === 'debt')) {
          
          logger.log(`🔍 AUTOFILL DEBUG: ${item.name} (${prefix}) - checking period ${manualStartDate.toISOString().split('T')[0]} to ${manualEndDate.toISOString().split('T')[0]}`);
          logger.log(`🔍 AUTOFILL DEBUG: Item data:`, { 
            name: item.name, 
            type: item.type, 
            frequency: item.frequency,
            startDate: item.startDate?.toISOString?.()?.split('T')[0],
            nextOccurrenceDate: item.nextOccurrenceDate?.toISOString?.()?.split('T')[0],
            lastRenewalDate: item.lastRenewalDate?.toISOString?.()?.split('T')[0],
            // Show all fields to debug
            allFields: Object.keys(item)
          });
          
          // Use the same occurrence calculation logic as the calendar
          if (prefix === 'debt') {
            // For debt items, treat them as recurring payments and use the same calculation logic
            if (item.nextOccurrenceDate) {
              const unifiedItem = {
                ...item,
                itemDisplayType: 'debt',
                frequency: item.paymentFrequency || 'monthly', // Most debt is monthly
                nextOccurrenceDate: item.nextOccurrenceDate,
                source: 'debt' as const,
                status: 'Upcoming' as const,
                isDebt: true,
                categoryId: item.categoryId
              };
              
              logger.log(`🔍 AUTOFILL DEBUG: DEBT ${item.name} - unified item:`, {
                name: unifiedItem.name,
                frequency: unifiedItem.frequency,
                nextOccurrenceDate: unifiedItem.nextOccurrenceDate?.toISOString?.()?.split('T')[0]
              });
              
              // Calculate all occurrences within the period
              const occurrences = calculateRecurringOccurrences(unifiedItem, manualStartDate, manualEndDate);
              
              // Filter occurrences to only include those within the manual date range
              const occurrencesInRange = occurrences.filter(date => 
                date >= manualStartDate && date <= manualEndDate
              );
              
              shouldAutoFill = occurrencesInRange.length > 0;
              
              logger.log(`🔍 AUTOFILL DEBUG: DEBT ${item.name} - total occurrences: ${occurrences.length}, occurrences in range: ${occurrencesInRange.length}, shouldAutoFill: ${shouldAutoFill}`);
              if (occurrences.length > 0) {
                logger.log(`🔍 AUTOFILL DEBUG: DEBT ${item.name} - all occurrence dates:`, occurrences.map(d => d.toISOString().split('T')[0]));
              }
              if (occurrencesInRange.length > 0) {
                logger.log(`🔍 AUTOFILL DEBUG: DEBT ${item.name} - occurrences in range:`, occurrencesInRange.map(d => d.toISOString().split('T')[0]));
              }
            }
          } else {
            // For recurring items (fixed and subscription), use the same logic as calendar
            // Create a UnifiedRecurringListItem-like object for the calculation functions
            const unifiedItem = {
              ...item,
              itemDisplayType: item.type || 'fixed-expense',
              nextOccurrenceDate: item.nextOccurrenceDate || item.startDate,
              source: 'recurring' as const,
              status: 'Upcoming' as const,
              isDebt: false,
              categoryId: item.categoryId
            };
            
            logger.log(`🔍 AUTOFILL DEBUG: RECURRING ${item.name} - unified item:`, {
              name: unifiedItem.name,
              itemDisplayType: unifiedItem.itemDisplayType,
              frequency: unifiedItem.frequency,
              nextOccurrenceDate: unifiedItem.nextOccurrenceDate?.toISOString?.()?.split('T')[0],
              startDate: unifiedItem.startDate?.toISOString?.()?.split('T')[0]
            });
            
            // Check if item has valid date information (including lastRenewalDate for subscriptions)
            const hasValidDates = unifiedItem.nextOccurrenceDate || unifiedItem.startDate || 
                                 (prefix === 'subscription' && item.lastRenewalDate);
            
            if (hasValidDates) {
              // For subscriptions with lastRenewalDate but no other dates, calculate the next occurrence
              if (prefix === 'subscription' && !unifiedItem.nextOccurrenceDate && !unifiedItem.startDate && item.lastRenewalDate) {
                let nextOccurrence = new Date(item.lastRenewalDate);
                switch (item.frequency) {
                  case "daily": nextOccurrence = addDays(nextOccurrence, 1); break;
                  case "weekly": nextOccurrence = addWeeks(nextOccurrence, 1); break;
                  case "bi-weekly": nextOccurrence = addWeeks(nextOccurrence, 2); break;
                  case "monthly": nextOccurrence = addMonths(nextOccurrence, 1); break;
                  case "quarterly": nextOccurrence = addQuarters(nextOccurrence, 1); break;
                  case "yearly": nextOccurrence = addYears(nextOccurrence, 1); break;
                  default: nextOccurrence = addDays(nextOccurrence, 1); break;
                }
                unifiedItem.nextOccurrenceDate = nextOccurrence;
                logger.log(`🔍 AUTOFILL DEBUG: SUBSCRIPTION ${item.name} - calculated nextOccurrence from lastRenewalDate: ${nextOccurrence.toISOString().split('T')[0]}`);
              }
            
            // Import and use the same calculation function as the calendar
            const occurrences = calculateRecurringOccurrences(unifiedItem, manualStartDate, manualEndDate);
              
              // Filter occurrences to only include those within the manual date range
              const occurrencesInRange = occurrences.filter(date => 
                date >= manualStartDate && date <= manualEndDate
              );
              
              shouldAutoFill = occurrencesInRange.length > 0;
              
              logger.log(`🔍 AUTOFILL DEBUG: RECURRING ${item.name} - total occurrences: ${occurrences.length}, occurrences in range: ${occurrencesInRange.length}, shouldAutoFill: ${shouldAutoFill}`);
              if (occurrences.length > 0) {
                logger.log(`🔍 AUTOFILL DEBUG: RECURRING ${item.name} - all occurrence dates:`, occurrences.map(d => d.toISOString().split('T')[0]));
              }
              if (occurrencesInRange.length > 0) {
                logger.log(`🔍 AUTOFILL DEBUG: RECURRING ${item.name} - occurrences in range:`, occurrencesInRange.map(d => d.toISOString().split('T')[0]));
              }
            } else {
              // If no valid date information, don't autofill
              shouldAutoFill = false;
              logger.log(`🔍 AUTOFILL DEBUG: RECURRING ${item.name} - no valid date information, shouldAutoFill: false`);
            }
          }
          
        } else {
          // For non-recurring items (goals, variable), check prefix for specific behavior
          if (prefix === 'goal') {
            // For savings goals, never auto-fill (always manual input)
            shouldAutoFill = false;
          } else {
            // For variable expenses, always auto-fill (they don't have scheduled occurrences)
          shouldAutoFill = true;
          }
        }
        
        if (shouldAutoFill && !hasManualOverridesForPeriod) {
          let autofillAmount = minKey ? item[minKey] : item.amount;
          
          // For variable expenses, prorate based on the timeframe
          if (prefix === 'variable' && manualStartDate && manualEndDate) {
            // Calculate days in selected timeframe
            const timeDiff = manualEndDate.getTime() - manualStartDate.getTime();
            const daysInTimeframe = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
            
            // Calculate total days in the month (using start date's month)
            const year = manualStartDate.getFullYear();
            const month = manualStartDate.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            // Prorate the amount
            const proratedAmount = (daysInTimeframe / daysInMonth) * autofillAmount;
            autofillAmount = Math.round(proratedAmount);
            
            logger.log(`🔍 VARIABLE PRORATION DEBUG: ${item.name} - timeframe: ${daysInTimeframe} days, month: ${daysInMonth} days, original: ${minKey ? item[minKey] : item.amount}, prorated: ${autofillAmount}`);
          }
          
          newStates[key] = String(autofillAmount);
        } else {
          newStates[key] = '';
        }
      }
    });
    setInputStates(newStates);
  }, [items, manualOverrides, prefix, minKey, hasManualOverridesForPeriod, manualStartDate, manualEndDate]);

  if (!items.length) return <div className="text-muted-foreground">No items in this category for the selected period.</div>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="text-left py-1">Name</th>
          <th className="text-right py-1">Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item: any) => {
          const key = `${prefix}-${item.id}`;
          let defaultValue = minKey ? item[minKey] : item.amount;
          
          // For savings goals, use budget forecast data for prorated estimated amount
          if (prefix === 'goal' && manualStartDate && manualEndDate) {
            // Get the budgeted amount from the forecast for the specific month
            const monthDate = new Date(manualStartDate.getFullYear(), manualStartDate.getMonth(), 1);
            const budgetForecast = generateBudgetForecastForMonth(monthDate, [item]);
            const goalContribution = budgetForecast.goalContributions.find(gc => gc.id === item.id);
            
            if (goalContribution && goalContribution.monthSpecificContribution > 0) {
              // Calculate days in selected timeframe
              const timeDiff = manualEndDate.getTime() - manualStartDate.getTime();
              const daysInTimeframe = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
              
              // Calculate total days in the month (using start date's month)
              const year = manualStartDate.getFullYear();
              const month = manualStartDate.getMonth();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              
              // Prorate the budgeted amount
              const proratedAmount = (daysInTimeframe / daysInMonth) * goalContribution.monthSpecificContribution;
              defaultValue = Math.round(proratedAmount);
              
              logger.log(`🔍 GOAL BUDGET FORECAST DEBUG: ${item.name} - budgeted: ${goalContribution.monthSpecificContribution}, timeframe: ${daysInTimeframe} days, month: ${daysInMonth} days, prorated: ${defaultValue}`);
            } else {
              defaultValue = 0; // No budgeted amount for this goal
              logger.log(`🔍 GOAL BUDGET FORECAST DEBUG: ${item.name} - no budgeted amount found`);
            }
          }

          // For sinking funds, show the monthly contribution as the budgeted amount
          if (prefix === 'sinking-funds' && item.monthlyContribution && manualStartDate && manualEndDate) {
            // Calculate days in selected timeframe
            const timeDiff = manualEndDate.getTime() - manualStartDate.getTime();
            const daysInTimeframe = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
            
            // Calculate total days in the month (using start date's month)
            const year = manualStartDate.getFullYear();
            const month = manualStartDate.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            // Prorate the monthly contribution based on the timeframe
            const proratedAmount = (daysInTimeframe / daysInMonth) * item.monthlyContribution;
            defaultValue = Math.round(proratedAmount);
            
            logger.log(`🔍 SINKING FUND BUDGET DEBUG: ${item.name} - monthlyContribution: ${item.monthlyContribution}, timeframe: ${daysInTimeframe} days, month: ${daysInMonth} days, prorated: ${defaultValue}`);
          }
          
          let value = inputStates[key] ?? '';
          // If override is 0, show 0
          if (manualOverrides[key] === 0 && value === '') value = '0';
          return (
            <tr key={item.id}>
              <td className="py-1">{item.name}</td>
              <td className="py-1 text-right">
                <div className="flex items-center gap-2 justify-end">
                <Input
                  type="text"
                    className="w-24 text-left"
                  value={value}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^\d*(\.\d*)?$/.test(val)) {
                      setInputStates(prev => ({ ...prev, [key]: val }));
                    }
                  }}
                  onBlur={e => {
                    const val = e.target.value;
                    if (val === '') {
                      setInputStates(prev => ({ ...prev, [key]: '0' }));
                      handleManualChange(key, 0);
                    } else if (!isNaN(Number(val))) {
                      handleManualChange(key, Number(val));
                    }
                  }}
                    placeholder={(prefix === 'goal' || prefix === 'sinking-funds') ? 'Enter amount' : (showDefaults ? 'Enter amount' : undefined)}
                  />
                  {(showDefaults || prefix === 'goal' || prefix === 'sinking-funds') && (
                    <span className="text-xs italic text-gray-400 w-12 text-left">
                      {defaultValue}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// Use the EXACT same logic as RecurringCalendarView to generate occurrences for a date range
function generateOccurrencesForPeriod(items: any[], startDate: Date, endDate: Date, itemType: 'recurring' | 'debt' = 'recurring') {
  const occurrences: Array<{ item: any, amount: number, date: Date }> = [];
  
  items.forEach(item => {
    if (itemType === 'debt') {
      // Use the EXACT same debt logic as RecurringCalendarView
      const referenceDate = new Date(item.nextOccurrenceDate);
      let allDebtDates: Date[] = [];
      
      if (item.paymentFrequency === 'monthly') {
        let tempDate = new Date(referenceDate);
        while (tempDate >= startDate) {
          if (tempDate >= startDate && tempDate <= endDate) {
            allDebtDates.push(new Date(tempDate));
          }
          tempDate = addMonths(tempDate, -1);
        }
        tempDate = addMonths(referenceDate, 1);
        while (tempDate <= endDate) {
          if (tempDate >= startDate) {
            allDebtDates.push(new Date(tempDate));
          }
          tempDate = addMonths(tempDate, 1);
        }
      } else {
        // For other frequencies, just use reference date if in range
        if (referenceDate >= startDate && referenceDate <= endDate) {
          allDebtDates.push(referenceDate);
        }
      }
      
      allDebtDates.forEach(date => {
        occurrences.push({
          item: item,
          amount: item.minimumPayment,
          date: date
        });
      });
      
    } else {
      // Use the EXACT same recurring logic as RecurringCalendarView
      if (item.status === "Ended") return;
      
      let allOccurrences: Date[] = [];
      
      // Handle semi-monthly frequency
      if (item.frequency === 'semi-monthly') {
        if (item.semiMonthlyFirstPayDate && item.semiMonthlySecondPayDate) {
          const firstPayDay = getDate(new Date(item.semiMonthlyFirstPayDate));
          const secondPayDay = getDate(new Date(item.semiMonthlySecondPayDate));
          
          const startYear = startDate.getFullYear();
          const endYear = endDate.getFullYear();
          
          for (let year = startYear; year <= endYear; year++) {
            for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
              const currentMonthStart = new Date(year, monthIndex, 1);
              const currentMonthEnd = endOfMonth(currentMonthStart);
              
              const firstPayDate = new Date(currentMonthStart);
              firstPayDate.setDate(Math.min(firstPayDay, getDate(currentMonthEnd)));
              
              const secondPayDate = new Date(currentMonthStart);
              secondPayDate.setDate(Math.min(secondPayDay, getDate(currentMonthEnd)));
              
              const adjustedFirstPayDate = item.type === 'income' 
                ? adjustToPreviousBusinessDay(firstPayDate) 
                : firstPayDate;
              const adjustedSecondPayDate = item.type === 'income' 
                ? adjustToPreviousBusinessDay(secondPayDate) 
                : secondPayDate;
              
              if (adjustedFirstPayDate >= startDate && adjustedFirstPayDate <= endDate) {
                if (!item.endDate || adjustedFirstPayDate <= startOfDay(new Date(item.endDate))) {
                  allOccurrences.push(adjustedFirstPayDate);
                }
              }
              if (adjustedSecondPayDate >= startDate && adjustedSecondPayDate <= endDate) {
                if (!item.endDate || adjustedSecondPayDate <= startOfDay(new Date(item.endDate))) {
                  allOccurrences.push(adjustedSecondPayDate);
                }
              }
            }
          }
        }
      } else {
        // Handle regular frequencies - use EXACT same logic as calendar
        let originalStartDate: Date = new Date();
        
        if (item.type === 'subscription' && item.lastRenewalDate) {
          originalStartDate = startOfDay(new Date(item.lastRenewalDate));
          switch (item.frequency) {
            case "daily": originalStartDate = addDays(originalStartDate, 1); break;
            case "weekly": originalStartDate = addWeeks(originalStartDate, 1); break;
            case "bi-weekly": originalStartDate = addWeeks(originalStartDate, 2); break;
            case "monthly": originalStartDate = addMonths(originalStartDate, 1); break;
            case "quarterly": originalStartDate = addQuarters(originalStartDate, 1); break;
            case "yearly": originalStartDate = addYears(originalStartDate, 1); break;
            default: originalStartDate = addDays(originalStartDate, 1); break;
          }
        } else if (item.startDate) {
          originalStartDate = startOfDay(new Date(item.startDate));
        } else {
          // Use nextOccurrenceDate but remove business day adjustment to get original date
          const nextDate = new Date(item.nextOccurrenceDate || startDate);
          if (item.type === 'income') {
            let foundOriginal = false;
            let testDate = new Date(nextDate);
            for (let i = 0; i <= 4; i++) {
              const candidateDate = addDays(testDate, i);
              if (adjustToPreviousBusinessDay(candidateDate).getTime() === nextDate.getTime()) {
                originalStartDate = candidateDate;
                foundOriginal = true;
                break;
              }
            }
            if (!foundOriginal) {
              originalStartDate = nextDate;
            }
          } else {
            originalStartDate = nextDate;
          }
        }
        
        // Generate occurrences based on frequency (EXACT same logic as calendar)
        if (item.frequency === 'monthly') {
          let tempDate = new Date(originalStartDate);
          
          while (tempDate >= startDate) {
            if (tempDate >= startDate && tempDate <= endDate && (!item.endDate || tempDate <= startOfDay(new Date(item.endDate)))) {
              allOccurrences.push(new Date(tempDate));
            }
            tempDate = addMonths(tempDate, -1);
          }
          
          tempDate = addMonths(originalStartDate, 1);
          while (tempDate <= endDate) {
            if (tempDate >= startDate && (!item.endDate || tempDate <= startOfDay(new Date(item.endDate)))) {
              allOccurrences.push(new Date(tempDate));
            }
            tempDate = addMonths(tempDate, 1);
          }
        } else if (item.frequency === 'weekly') {
          let tempDate = new Date(originalStartDate);
          
          while (tempDate >= startDate) {
            if (tempDate >= startDate && tempDate <= endDate && (!item.endDate || tempDate <= startOfDay(new Date(item.endDate)))) {
              allOccurrences.push(new Date(tempDate));
            }
            tempDate = addWeeks(tempDate, -1);
          }
          
          tempDate = addWeeks(originalStartDate, 1);
          while (tempDate <= endDate) {
            if (tempDate >= startDate && (!item.endDate || tempDate <= startOfDay(new Date(item.endDate)))) {
              allOccurrences.push(new Date(tempDate));
            }
            tempDate = addWeeks(tempDate, 1);
          }
        } else if (item.frequency === 'bi-weekly') {
          let tempDate = new Date(originalStartDate);
          
          while (tempDate >= startDate) {
            if (tempDate >= startDate && tempDate <= endDate && (!item.endDate || tempDate <= startOfDay(new Date(item.endDate)))) {
              allOccurrences.push(new Date(tempDate));
            }
            tempDate = addWeeks(tempDate, -2);
          }
          
          tempDate = addWeeks(originalStartDate, 2);
          while (tempDate <= endDate) {
            if (tempDate >= startDate && (!item.endDate || tempDate <= startOfDay(new Date(item.endDate)))) {
              allOccurrences.push(new Date(tempDate));
            }
            tempDate = addWeeks(tempDate, 2);
          }
        } else if (item.frequency === 'yearly') {
          if (originalStartDate >= startDate && originalStartDate <= endDate) {
            if (!item.endDate || originalStartDate <= startOfDay(new Date(item.endDate))) {
              allOccurrences.push(originalStartDate);
            }
          }
        }
      }
      
      allOccurrences.forEach(occurrenceDate => {
        const adjustedDate = item.type === 'income' 
          ? adjustToPreviousBusinessDay(occurrenceDate) 
          : occurrenceDate;
          
        if (adjustedDate >= startDate && adjustedDate <= endDate) {
          occurrences.push({
            item: item,
            amount: item.amount,
            date: adjustedDate
          });
        }
      });
    }
  });
  
  return occurrences;
}

// Helper to calculate total for a category using the same logic as the recurring calendar
function getManualTabTotal(items: any[], prefix: string, manualOverrides: Record<string, number>, minKey?: string, manualOnly?: boolean, hasManualOverridesForPeriod?: boolean, manualStartDate?: Date, manualEndDate?: Date) {
  // If in manual mode for this period, only sum manual overrides (or 0 if missing)
  if (manualOnly || hasManualOverridesForPeriod) {
    return items.reduce((acc, item) => {
      const key = `${prefix}-${item.id}`;
      return acc + (manualOverrides[key] !== undefined ? Number(manualOverrides[key]) : 0);
    }, 0);
  }
  
  // For recurring items, only include items that have actual occurrences in the period
  if (manualStartDate && manualEndDate && (prefix === 'fixed' || prefix === 'subscription' || prefix === 'debt' || prefix === 'income')) {
    return items.reduce((acc, item) => {
      const overrideKey = `${prefix}-${item.id}`;
      if (manualOverrides[overrideKey] !== undefined) {
        return acc + Number(manualOverrides[overrideKey]);
      }
      
      let hasOccurrences = false;
      let occurrenceCount = 0;
      
      if (prefix === 'debt') {
        // For debt items, treat them as recurring payments and use the same calculation logic
        if (item.nextOccurrenceDate) {
          const unifiedItem = {
            ...item,
            itemDisplayType: 'debt',
            frequency: item.paymentFrequency || 'monthly', // Most debt is monthly
            nextOccurrenceDate: item.nextOccurrenceDate,
            source: 'debt' as const,
            status: 'Upcoming' as const,
            isDebt: true,
            categoryId: item.categoryId
          };
          
          // Calculate all occurrences within the period
          const occurrences = calculateRecurringOccurrences(unifiedItem, manualStartDate, manualEndDate);
          
          // Filter occurrences to only include those within the manual date range
          const occurrencesInRange = occurrences.filter(date => 
            date >= manualStartDate && date <= manualEndDate
          );
          
          hasOccurrences = occurrencesInRange.length > 0;
          occurrenceCount = occurrencesInRange.length;
        }
      } else {
        // For recurring items (fixed, subscription, and income), use the same logic as calendar
        // Use startDate as fallback to avoid hydration issues with new Date()
        const unifiedItem = {
          ...item,
          itemDisplayType: item.type || prefix === 'income' ? 'income' : 'fixed-expense',
          nextOccurrenceDate: item.nextOccurrenceDate || item.startDate,
          source: 'recurring' as const,
          status: 'Upcoming' as const,
          isDebt: false,
          categoryId: item.categoryId
        };
        
        // For subscriptions with lastRenewalDate but no other dates, calculate the next occurrence
        if (prefix === 'subscription' && !unifiedItem.nextOccurrenceDate && !unifiedItem.startDate && item.lastRenewalDate) {
          let nextOccurrence = new Date(item.lastRenewalDate);
          switch (item.frequency) {
            case "daily": nextOccurrence = addDays(nextOccurrence, 1); break;
            case "weekly": nextOccurrence = addWeeks(nextOccurrence, 1); break;
            case "bi-weekly": nextOccurrence = addWeeks(nextOccurrence, 2); break;
            case "monthly": nextOccurrence = addMonths(nextOccurrence, 1); break;
            case "quarterly": nextOccurrence = addQuarters(nextOccurrence, 1); break;
            case "yearly": nextOccurrence = addYears(nextOccurrence, 1); break;
            default: nextOccurrence = addDays(nextOccurrence, 1); break;
          }
          unifiedItem.nextOccurrenceDate = nextOccurrence;
        }
        
        // Only calculate occurrences if we have valid date information
        if (unifiedItem.nextOccurrenceDate || unifiedItem.startDate) {
        const occurrences = calculateRecurringOccurrences(unifiedItem, manualStartDate, manualEndDate);
          // Filter occurrences to only include those within the manual date range
          const occurrencesInRange = occurrences.filter(date => 
            date >= manualStartDate && date <= manualEndDate
          );
          hasOccurrences = occurrencesInRange.length > 0;
          occurrenceCount = occurrencesInRange.length;
        } else {
          hasOccurrences = false;
          occurrenceCount = 0;
        }
        

      }
      
      if (hasOccurrences) {
        // For debt, use minKey (minimumPayment) if available, otherwise use amount
        const itemAmount = prefix === 'debt' ? (item[minKey || 'amount'] || item.amount) : item.amount;
        const itemTotal = occurrenceCount * itemAmount;
        return acc + itemTotal;
      }
      // If no occurrences in period, don't add anything (defaults to $0)
      return acc;
    }, 0);
  }
  
  // For non-recurring items (goals, variable expenses), use simple amount
  return items.reduce((acc, item) => {
    const overrideKey = `${prefix}-${item.id}`;
    if (manualOverrides[overrideKey] !== undefined) {
      return acc + Number(manualOverrides[overrideKey]);
    }
    
    // For savings goals, use budget forecast data for proration but only count manual overrides for totals
    if (prefix === 'goal') {
      return acc; // Don't add anything if no manual override - goals are manual input only
    }
    
    // For sinking funds, only count manual overrides like goals
    if (prefix === 'sinking-funds') {
      return acc; // Don't add anything if no manual override - sinking funds are manual input only
    }
    
    let itemAmount = minKey ? item[minKey] : item.amount;
    
    // For variable expenses, prorate based on the timeframe
    if (prefix === 'variable' && manualStartDate && manualEndDate) {
      // Calculate days in selected timeframe
      const timeDiff = manualEndDate.getTime() - manualStartDate.getTime();
      const daysInTimeframe = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
      
      // Calculate total days in the month (using start date's month)
      const year = manualStartDate.getFullYear();
      const month = manualStartDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      // Prorate the amount
      const proratedAmount = (daysInTimeframe / daysInMonth) * itemAmount;
      itemAmount = Math.round(proratedAmount);
    }
    
    return acc + itemAmount;
  }, 0);
}

// Add function to generate budget forecast data for a specific month
function generateBudgetForecastForMonth(
  monthDate: Date,
  goals: FinancialGoal[]
): { goalContributions: { id: string; name: string; monthSpecificContribution: number; }[] } {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const monthLabel = format(monthDate, 'MMMM yyyy');
  
  // Calculate goals with contributions (same logic as budget manager)
  const goalsWithContributions = goals.map(goal => {
    // Calculate based on the original timeframe between creation and target date
    const creationDate = startOfDay(new Date(goal.createdAt));
    const targetDate = startOfDay(new Date(goal.targetDate));
    const selectedMonthDate = startOfDay(monthDate);
    
    // Calculate total months in the goal's timeframe (from creation to target)
    const totalMonthsInGoal = Math.max(1, differenceInCalendarMonths(targetDate, creationDate));
    
    // Calculate months remaining from the selected month
    let monthsRemaining = Math.max(0, differenceInCalendarMonths(targetDate, selectedMonthDate));
    
    // Calculate the original target amount (when the goal was created)
    const originalTargetAmount = goal.targetAmount;
    
    // Calculate the consistent monthly contribution based on original timeframe
    let monthlyContribution = 0;
    const amountNeeded = goal.targetAmount - goal.currentAmount;
    
    logger.log(`🔍 BUDGET FORECAST DEBUG: ${goal.name}`, {
      creationDate: creationDate.toISOString().split('T')[0],
      targetDate: targetDate.toISOString().split('T')[0],
      selectedMonthDate: selectedMonthDate.toISOString().split('T')[0],
      totalMonthsInGoal,
      monthsRemaining,
      originalTargetAmount,
      currentAmount: goal.currentAmount,
      amountNeeded,
    });
    
    if (amountNeeded <= 0) {
      // Goal already achieved or overfunded - no further contributions needed
      monthsRemaining = 0;
      monthlyContribution = 0;
    } else if (isPast(targetDate)) {
      // Past due - show full remaining amount (but ensure it's positive)
      monthsRemaining = 0;
      monthlyContribution = Math.max(0, amountNeeded);
    } else {
      // Calculate the consistent monthly contribution based on original timeframe
      monthlyContribution = originalTargetAmount / totalMonthsInGoal;
      
      // Adjust if the remaining amount is less than the calculated contribution
      // But ensure we never go negative
      if (amountNeeded < monthlyContribution) {
        monthlyContribution = Math.max(0, amountNeeded);
      }
    }
    
    logger.log(`🔍 BUDGET FORECAST DEBUG: ${goal.name} - calculated monthlyContribution: ${monthlyContribution}`);
    
    return {
      ...goal,
      monthsRemaining: monthsRemaining,
      monthlyContribution: monthlyContribution > 0 ? monthlyContribution : 0,
    };
  });

  // Generate forecast goal contributions (same logic as budget manager)
  const forecastGoalContributions = goalsWithContributions
    .filter(goal => goal.currentAmount < goal.targetAmount) // Only active goals
    .map(goal => {
      const targetDate = startOfDay(new Date(goal.targetDate));
      
      // Use the consistent monthly contribution calculated earlier
      let contribution = goal.monthlyContribution;
      
      // Only include contributions for months before or equal to the target date
      if (isAfter(monthStart, targetDate)) {
        contribution = 0;
      }
      
      return {
        id: goal.id,
        name: goal.name,
        monthSpecificContribution: contribution > 0 ? parseFloat(contribution.toFixed(2)) : 0,
      };
    }).filter(gc => gc.monthSpecificContribution > 0); // Only include if there's a contribution

  return {
    goalContributions: forecastGoalContributions
  };
}

export function PaycheckPulseManager() {
  // Add userPreferences state at the very top of the component
  const [userPreferences, setUserPreferences] = useState<any>(null); // Replace 'any' with the correct type if available

  // --- PLAN SUPPORT: up to 3 plans, each with their own state ---
  const PLAN_KEYS = ['plan1', 'plan2', 'plan3'] as const;
  type PlanKey = typeof PLAN_KEYS[number];
  type PlanState = {
    manualOverrides: Record<string, number>;
    manualStartDate: Date | null;
    manualEndDate: Date | null;
    manualTab: string;
    hasManualOverridesForPeriod: boolean;
    shouldLoadMostRecentManual: boolean;
  };
  // Plan state: each plan gets its own overrides, dates, tab, etc.
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('plan1');
  const [planStates, setPlanStates] = useState<Record<PlanKey, PlanState>>({
    plan1: {
      manualOverrides: {},
      manualStartDate: null,
      manualEndDate: null,
      manualTab: 'fixed',
      hasManualOverridesForPeriod: false,
      shouldLoadMostRecentManual: false,
    },
    plan2: {
      manualOverrides: {},
      manualStartDate: null,
      manualEndDate: null,
      manualTab: 'fixed',
      hasManualOverridesForPeriod: false,
      shouldLoadMostRecentManual: false,
    },
    plan3: {
      manualOverrides: {},
      manualStartDate: null,
      manualEndDate: null,
      manualTab: 'fixed',
      hasManualOverridesForPeriod: false,
      shouldLoadMostRecentManual: false,
    },
  });

  // Helper to update a plan's state
  const updatePlanState = (plan: PlanKey, changes: Partial<PlanState>) => {
    setPlanStates(prev => ({ ...prev, [plan]: { ...prev[plan], ...changes } }));
  };

  // For convenience, get the current plan's state
  // Add debugging to see what's happening with plan switching
  logger.log(`🔍 RENDER: selectedPlan = ${selectedPlan}`);
  logger.log(`🔍 RENDER: planStates[${selectedPlan}] = `, planStates[selectedPlan]);
  
  const {
    manualOverrides,
    manualStartDate,
    manualEndDate,
    manualTab,
    hasManualOverridesForPeriod,
    shouldLoadMostRecentManual,
  } = planStates[selectedPlan];
  
  logger.log(`🔍 RENDER: destructured manualStartDate = `, manualStartDate);
  logger.log(`🔍 RENDER: destructured manualEndDate = `, manualEndDate);

  // All hooks at the very top, before any logic or early return
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [mainTab, setMainTab] = useState<'auto' | 'manual'>('auto');
  const [isLoading, setIsLoading] = useState(true);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [debtAccounts, setDebtAccounts] = useState<DebtAccount[]>([]);
  const [variableExpenses, setVariableExpenses] = useState<VariableExpense[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [sinkingFunds, setSinkingFunds] = useState<SinkingFund[]>([]);
  const [paycheckBreakdowns, setPaycheckBreakdowns] = useState<PaycheckBreakdown[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<PaycheckTimeframe>('current');
  const [currentMonthForecast, setCurrentMonthForecast] = useState<MonthlyForecast | null>(null);
  const [paycheckPreferences, setPaycheckPreferences] = useState<PaycheckPreferences>({
    timingMode: 'current-period',
    includeBufferDays: 3,
    prioritizeSinkingFunds: false,
    sinkingFundStrategy: 'frequency-based',
    allocationMode: 'auto',
    activeManualPlan: null
  });
  const [isPreferencesDialogOpen, setIsPreferencesDialogOpen] = useState(false);
  const [actualSpendingData, setActualSpendingData] = useState<{ categoryId: string; spent: number; budgeted: number }[]>([]);

  // --- Plan Tabs State ---
  const PLAN_LABELS = { plan1: 'Plan 1', plan2: 'Plan 2', plan3: 'Plan 3' };

  // Manual overrides state (plan-aware)
  const handleManualChange = useCallback((itemKey: string, value: number | '') => {
    setPlanStates(prev => {
      const prevOverrides = prev[selectedPlan].manualOverrides;
      let newOverrides = { ...prevOverrides };
      if (value === '' || value === null) {
        delete newOverrides[itemKey];
      } else {
        newOverrides[itemKey] = value;
      }
      return {
        ...prev,
        [selectedPlan]: {
          ...prev[selectedPlan],
          manualOverrides: newOverrides
        }
      };
    });
  }, [selectedPlan]);

  // State to track current form values from all ManualExpenseTable components
  const [currentFormValues, setCurrentFormValues] = useState<Record<string, Record<string, string>>>({
    fixed: {},
    subscription: {},
    variable: {},
    debt: {},
    goal: {},
    'sinking-funds': {}
  });

  // Temporary flag to disable form state tracking if causing performance issues
  const ENABLE_FORM_TRACKING = true;

  // Callbacks to receive current values from each ManualExpenseTable
  const handleFormValuesUpdate = useCallback((prefix: string, values: Record<string, string>) => {
    if (!ENABLE_FORM_TRACKING) return; // Skip if tracking disabled
    
    setCurrentFormValues(prev => {
      // Only update if values actually changed
      const prevValues = prev[prefix] || {};
      const hasChanged = JSON.stringify(prevValues) !== JSON.stringify(values);
      
      if (!hasChanged) {
        return prev; // Return same reference to prevent unnecessary re-renders
      }
      
      return {
        ...prev,
        [prefix]: values
      };
    });
  }, [ENABLE_FORM_TRACKING]);

  // Create stable callback functions for each prefix to prevent infinite re-renders
  const handleFixedValuesUpdate = useCallback((values: Record<string, string>) => {
    handleFormValuesUpdate('fixed', values);
  }, [handleFormValuesUpdate]);

  const handleSubscriptionValuesUpdate = useCallback((values: Record<string, string>) => {
    handleFormValuesUpdate('subscription', values);
  }, [handleFormValuesUpdate]);

  const handleVariableValuesUpdate = useCallback((values: Record<string, string>) => {
    handleFormValuesUpdate('variable', values);
  }, [handleFormValuesUpdate]);

  const handleDebtValuesUpdate = useCallback((values: Record<string, string>) => {
    handleFormValuesUpdate('debt', values);
  }, [handleFormValuesUpdate]);

  const handleGoalValuesUpdate = useCallback((values: Record<string, string>) => {
    handleFormValuesUpdate('goal', values);
  }, [handleFormValuesUpdate]);

  const handleSinkingFundsValuesUpdate = useCallback((values: Record<string, string>) => {
    handleFormValuesUpdate('sinking-funds', values);
  }, [handleFormValuesUpdate]);

  // Helper to normalize type from DB to UI prefix
  function normalizeType(type: string): string {
    if (type === 'fixed-expense') return 'fixed';
    if (type === 'variable-expense') return 'variable';
    return type;
  }

  // Fetch manual overrides for the selected period (plan-aware)
  const fetchManualOverrides = useCallback(async () => {
    if (!user?.id || !manualStartDate || !manualEndDate) return;
    if (isNaN(manualStartDate.getTime()) || isNaN(manualEndDate.getTime())) return;
    const paycheckId = `${user.id}-${manualStartDate.toISOString()}-${manualEndDate.toISOString()}-${selectedPlan}`;
    const { data, error } = await supabase
      .from('paycheckoverrides')
      .select('*')
      .eq('user_id', user.id)
      .eq('paycheck_id', paycheckId);
    if (error) {
      console.warn('Error fetching manual overrides:', error);
      updatePlanState(selectedPlan, { manualOverrides: {}, hasManualOverridesForPeriod: false });
      return;
    }
    const overrides: Record<string, number> = {};
    (data || []).forEach((row: any) => {
      const key = `${normalizeType(row.type)}-${row.item_id}`;
      overrides[key] = Number(row.amount);
    });
    updatePlanState(selectedPlan, { manualOverrides: overrides, hasManualOverridesForPeriod: (data || []).length > 0 });
  }, [user?.id, manualStartDate, manualEndDate, selectedPlan]);

  // Always call this useEffect, but only fetch when flag is set
  useEffect(() => {
    if (!shouldLoadMostRecentManual || !user?.id) return;
    (async () => {
      // Only fetch the most recent override for the selected plan
      const { data, error } = await supabase
        .from('paycheckoverrides')
        .select('*')
        .eq('user_id', user.id)
        .like('paycheck_id', `%-${selectedPlan}`)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!error && data && data.length > 0) {
        const row = data[0];
        const isoDateRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g;
        const matches = row.paycheck_id.match(isoDateRegex);
        const startDate = matches && matches[0] ? new Date(matches[0]) : null;
        const endDate = matches && matches[1] ? new Date(matches[1]) : null;
        if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          updatePlanState(selectedPlan, { manualStartDate: startDate, manualEndDate: endDate });
          // Immediately fetch and set manual overrides for these dates
          const paycheckId = `${user.id}-${startDate.toISOString()}-${endDate.toISOString()}-${selectedPlan}`;
          const { data: overrideData, error: overrideError } = await supabase
            .from('paycheckoverrides')
            .select('*')
            .eq('user_id', user.id)
            .eq('paycheck_id', paycheckId);
          if (!overrideError && overrideData) {
            const overrides: Record<string, number> = {};
            (overrideData || []).forEach((row: any) => {
              const key = `${normalizeType(row.type)}-${row.item_id}`;
              overrides[key] = Number(row.amount);
            });
            updatePlanState(selectedPlan, { manualOverrides: overrides });
          }
        } else {
          updatePlanState(selectedPlan, { manualStartDate: null, manualEndDate: null, manualOverrides: {} });
        }
      }
      updatePlanState(selectedPlan, { shouldLoadMostRecentManual: false });
    })();
  }, [shouldLoadMostRecentManual, user?.id, selectedPlan]);

  // When switching to manual tab, set flag to load most recent manual override (plan-aware)
  useEffect(() => {
    if (mainTab === 'manual' && user?.id) {
      updatePlanState(selectedPlan, { shouldLoadMostRecentManual: true });
    }
  }, [mainTab, user?.id, selectedPlan]);

  // When user changes start/end date, fetch overrides (plan-aware)
  useEffect(() => {
    fetchManualOverrides();
  }, [manualStartDate, manualEndDate, user?.id, fetchManualOverrides]);

  // When user changes start/end date (plan-aware)
  const handleManualDateChange = (setter: (date: Date | null) => void, value: Date | null) => {
    setter(value);
    // fetchManualOverrides will be triggered by useEffect
  };

  // Plan-aware setters for date and tab
  const setManualStartDate = (date: Date | null) => {
    updatePlanState(selectedPlan, { manualStartDate: date });
    if (date && manualEndDate) {
      updatePlanState(selectedPlan, { shouldLoadMostRecentManual: true });
      // Save date range to user preferences for dashboard access
      saveDateRangeToPreferences(selectedPlan, date, manualEndDate);
    }
  };
  const setManualEndDate = (date: Date | null) => {
    updatePlanState(selectedPlan, { manualEndDate: date });
    if (manualStartDate && date) {
      updatePlanState(selectedPlan, { shouldLoadMostRecentManual: true });
      // Save date range to user preferences for dashboard access
      saveDateRangeToPreferences(selectedPlan, manualStartDate, date);
    }
  };
  const setManualTab = (tab: string) => updatePlanState(selectedPlan, { manualTab: tab });

  // Save manual date range to user preferences for dashboard access
  const saveDateRangeToPreferences = async (plan: PlanKey, startDate: Date, endDate: Date) => {
    if (!user?.id) return;
    
    try {
      const { preferences } = await getUserPreferences(user.id);
      const currentDateRanges = preferences?.paycheckPreferences?.manualPlanDateRanges || {};
      
      const updatedPreferences = {
        ...preferences,
        paycheckPreferences: {
          ...paycheckPreferences,
          manualPlanDateRanges: {
            ...currentDateRanges,
            [plan]: {
              start: startDate.toISOString(),
              end: endDate.toISOString()
            }
          }
        }
      };
      
      await updateUserPreferences(user.id, updatedPreferences);
      logger.log(`📅 DASHBOARD SYNC: Saved ${plan} date range to preferences:`, {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        isActiveManualPlan: paycheckPreferences.activeManualPlan === plan,
        allocationMode: paycheckPreferences.allocationMode
      });
      
      // Debug: Show the complete updated preferences
      logger.log('📅 DASHBOARD SYNC: Complete updated preferences:', {
        allocationMode: updatedPreferences.paycheckPreferences?.allocationMode,
        activeManualPlan: updatedPreferences.paycheckPreferences?.activeManualPlan,
        manualPlanDateRanges: updatedPreferences.paycheckPreferences?.manualPlanDateRanges
      });
      
      // Update local paycheck preferences to keep in sync
      setPaycheckPreferences(prev => ({
        ...prev,
        manualPlanDateRanges: {
          ...currentDateRanges,
          [plan]: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          }
        }
      }));
      
      // Trigger dashboard refresh if it's mounted
      if (typeof window !== 'undefined') {
        logger.log('📅 DASHBOARD SYNC: Triggering dashboard refresh...');
        window.dispatchEvent(new Event('refreshDashboard'));
      }
      
    } catch (error) {
      console.error('Error saving date range to preferences:', error);
      toast({
        title: "Error saving date range",
        description: "Failed to save date range for dashboard sync",
        variant: "destructive",
      });
    }
  };

  // Save overrides to backend (plan-aware) - NEW IMPLEMENTATION
  const saveManualOverrides = async () => {
    if (!user?.id || !manualStartDate || !manualEndDate) return;
    if (isNaN(manualStartDate.getTime()) || isNaN(manualEndDate.getTime())) return;
    
    const paycheckId = `${user.id}-${manualStartDate.toISOString()}-${manualEndDate.toISOString()}-${selectedPlan}`;

    // First, delete all existing overrides for this plan to ensure only one set per plan
    const { error: deleteError } = await supabase
      .from('paycheckoverrides')
      .delete()
      .eq('user_id', user.id)
      .like('paycheck_id', `%-${selectedPlan}`);

    if (deleteError) {
      toast({ title: 'Error', description: `Failed to clear existing ${selectedPlan} overrides: ${deleteError.message}`, variant: 'destructive' });
      return;
    }

    // Build a complete set of overrides for ALL predetermined expense items
    const allOverrideRows: any[] = [];
    
    // Helper to get current form value for an item
    const getCurrentFormValue = (prefix: string, itemId: string, item: any, minKey?: string): number => {
      const key = `${prefix}-${itemId}`;
      
      // If form tracking is enabled, try to get the current form value
      if (ENABLE_FORM_TRACKING) {
        const formValue = currentFormValues[prefix]?.[key];
        
        // If there's a current form value, use it (even if it's empty string, convert to 0)
        if (formValue !== undefined) {
          return formValue === '' ? 0 : Number(formValue);
        }
      }
      
      // If form tracking is disabled or no current form value, check manual overrides first
      const manualOverrideKey = `${prefix}-${itemId}`;
      if (manualOverrides.hasOwnProperty(manualOverrideKey)) {
        return manualOverrides[manualOverrideKey];
      }
      
      // If no current form value, calculate the default value that would be shown
      if (prefix === 'goal') {
        // For goals, default to 0 unless manually set
        return 0;
      } else if (prefix === 'variable') {
        // For variable expenses, use prorated amount
        const timeDiff = manualEndDate!.getTime() - manualStartDate!.getTime();
        const daysInTimeframe = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
        const year = manualStartDate!.getFullYear();
        const month = manualStartDate!.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const proratedAmount = (daysInTimeframe / daysInMonth) * Number(item.amount);
        return Math.round(proratedAmount);
      } else if (prefix === 'income' || prefix === 'fixed' || prefix === 'subscription') {
        // For recurring items, check if they have occurrences in the period
        const occurrences = generateOccurrencesForPeriod([item], manualStartDate!, manualEndDate!, 'recurring');
        if (occurrences.length > 0) {
          // Has occurrences, use the item amount
          return Number(item.amount || 0);
        } else {
          // No occurrences in period, save as 0
          return 0;
        }
      } else if (prefix === 'debt') {
        // For debt items, check if they have occurrences in the period
        const occurrences = generateOccurrencesForPeriod([item], manualStartDate!, manualEndDate!, 'debt');
        if (occurrences.length > 0) {
          // Has occurrences, use the minimum payment amount
          return Number(item[minKey || 'amount'] || 0);
        } else {
          // No occurrences in period, save as 0
          return 0;
        }
      } else {
        // Fallback to 0
        return 0;
      }
    };

    // Helper to add overrides for a section
    const addOverrides = (items: any[], prefix: string, minKey?: string) => {
      // Save ALL items regardless of whether they have occurrences in the period
      // Items without occurrences will be saved as 0 or their manual override value
      
      // Add ALL items to the save list (no filtering)
      items.forEach(item => {
        const value = getCurrentFormValue(prefix, item.id, item, minKey);
        
        // Get item name and type for database
        let name = '';
        let itemType = prefix;
        if (prefix === 'income') {
          name = item.name || '';
          itemType = 'income';
        } else if (prefix === 'fixed') {
          name = item.name || '';
          itemType = 'fixed-expense';
        } else if (prefix === 'subscription') {
          name = item.name || '';
          itemType = 'subscription';
        } else if (prefix === 'variable') {
          name = item.name || '';
          itemType = 'variable-expense';
        } else if (prefix === 'debt') {
          name = item.name || '';
          itemType = 'debt';
        } else if (prefix === 'goal') {
          name = item.name || '';
          itemType = 'goal';
        } else if (prefix === 'sinking-funds') {
          name = item.name || '';
          itemType = 'sinking-funds';
        }
        
        allOverrideRows.push({
          paycheck_id: paycheckId,
          user_id: user.id,
          type: itemType,
          item_id: item.id,
          name,
          amount: value,
        });
      });
    };
    
    // Add overrides for ALL predetermined expense items
    addOverrides(
      recurringItems.filter(item => item.type === 'income'),
      'income'
    );
    addOverrides(
      recurringItems.filter(item => item.type === 'fixed-expense' && !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))),
      'fixed'
    );
    addOverrides(
      recurringItems.filter(item => item.type === 'subscription'),
      'subscription'
    );
    addOverrides(
      variableExpenses,
      'variable'
    );
    addOverrides(
      debtAccounts,
      'debt',
      'minimumPayment'
    );
    addOverrides(
      goals,
      'goal'
    );
    addOverrides(
      sinkingFunds,
      'sinking-funds'
    );

    logger.log(`💾 SAVE DEBUG: Saving ${allOverrideRows.length} items for ${selectedPlan}`);
    logger.log('Items being saved:', allOverrideRows.map(row => ({ name: row.name, type: row.type, amount: row.amount })));
    
    // Debug: Log counts by category
    const incomeItems = recurringItems.filter(item => item.type === 'income');
    const fixedItems = recurringItems.filter(item => item.type === 'fixed-expense' && !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder')));
    const subscriptionItems = recurringItems.filter(item => item.type === 'subscription');
    
    logger.log(`💾 SAVE DEBUG: Item counts - Income: ${incomeItems.length}, Fixed: ${fixedItems.length}, Subscription: ${subscriptionItems.length}, Variable: ${variableExpenses.length}, Debt: ${debtAccounts.length}, Goals: ${goals.length}`);
    logger.log(`💾 SAVE DEBUG: Total items available: ${incomeItems.length + fixedItems.length + subscriptionItems.length + variableExpenses.length + debtAccounts.length + goals.length}`);
    
    // Debug: Log what's being saved by category
    const savedByCategory = allOverrideRows.reduce((acc, row) => {
      acc[row.type] = (acc[row.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    logger.log('💾 SAVE DEBUG: Saved by category:', savedByCategory);

    const { error } = await supabase.from('paycheckoverrides').upsert(allOverrideRows, { onConflict: 'paycheck_id,user_id,item_id' });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Also save the current date range to preferences when saving overrides
      if (manualStartDate && manualEndDate) {
        logger.log('🚀 SAVE: About to save date range for plan:', selectedPlan);
        logger.log('🚀 SAVE: Start date:', manualStartDate.toISOString().split('T')[0]);
        logger.log('🚀 SAVE: End date:', manualEndDate.toISOString().split('T')[0]);
        logger.log('🚀 SAVE: Active manual plan:', paycheckPreferences.activeManualPlan);
        logger.log('🚀 SAVE: Allocation mode:', paycheckPreferences.allocationMode);
        await saveDateRangeToPreferences(selectedPlan, manualStartDate, manualEndDate);
      }
      
      toast({ title: `Manual overrides saved! (${allOverrideRows.length} items)` });
      fetchManualOverrides();
    }
  };

  // Revert manual changes (plan-aware)
  const revertManualOverrides = async () => {
    if (!user?.id || !manualStartDate || !manualEndDate) return;
    const paycheckId = `${user.id}-${manualStartDate.toISOString()}-${manualEndDate.toISOString()}-${selectedPlan}`;
    await supabase.from('paycheckoverrides').delete().match({ user_id: user.id, paycheck_id: paycheckId });
    updatePlanState(selectedPlan, { manualOverrides: {} });
    toast({ title: 'Reverted to Auto Mode' });
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        // Fetch user preferences first to get paycheck preferences
        const { preferences } = await getUserPreferences(user.id);
        if (preferences) setUserPreferences(preferences);
        if (preferences?.paycheckPreferences) {
          setPaycheckPreferences(preferences.paycheckPreferences);
          
          // Load saved manual date ranges into planStates
          const savedDateRanges = preferences.paycheckPreferences.manualPlanDateRanges;
          if (savedDateRanges) {
            logger.log('📅 Loading saved date ranges from preferences:', savedDateRanges);
            
            setPlanStates(prev => {
              const newStates = { ...prev };
              
              PLAN_KEYS.forEach(plan => {
                const savedRange = savedDateRanges[plan];
                if (savedRange) {
                  const startDate = new Date(savedRange.start);
                  const endDate = new Date(savedRange.end);
                  
                  // Only update if dates are valid
                  if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                    newStates[plan] = {
                      ...newStates[plan],
                      manualStartDate: startDate,
                      manualEndDate: endDate
                    };
                    logger.log(`📅 Restored ${plan} date range:`, {
                      start: startDate.toISOString().split('T')[0],
                      end: endDate.toISOString().split('T')[0]
                    });
                  }
                }
              });
              
              return newStates;
            });
          }
        }

        // Fetch recurring items
        const { data: recurringData, error: recurringError } = await supabase
          .from('recurring_items')
          .select('*')
          .eq('user_id', user.id);

        if (recurringError) throw new Error(recurringError.message);

        // Fetch debt accounts
        const { data: debtData, error: debtError } = await supabase
          .from('debt_accounts')
          .select('*')
          .eq('user_id', user.id);

        if (debtError) throw new Error(debtError.message);

        // Fetch variable expenses
        let variableExpensesData: any[] = [];
        try {
          const { data, error } = await supabase
            .from('variable_expenses')
            .select('*')
            .eq('user_id', user.id);
            
          if (error) {
            console.warn('Variable expenses table not available, using empty array');
            variableExpensesData = [];
          } else {
            variableExpensesData = data || [];
          }
        } catch (err) {
          console.warn('Error fetching variable expenses:', err);
          variableExpensesData = [];
        }

        // Fetch financial goals
        const { data: goalsData, error: goalsError } = await supabase
          .from('financial_goals')
          .select('*')
          .eq('user_id', user.id);

        if (goalsError) throw new Error(goalsError.message);

        // Fetch sinking funds
        const { sinkingFunds: sinkingFundsData, error: sinkingFundsError } = await getSinkingFundsWithProgress(user.id);
        
        if (sinkingFundsError) {
          console.warn('Error fetching sinking funds:', sinkingFundsError);
        }

        // Transform data
        const transformedRecurringItems = (recurringData?.map(item => ({
          id: item.id,
          name: item.name,
          amount: Number(item.amount),
          frequency: item.frequency,
          type: item.type,
          categoryId: item.category_id,
          startDate: item.start_date ? new Date(item.start_date) : undefined,
          endDate: item.end_date ? new Date(item.end_date) : undefined,
          lastRenewalDate: item.last_renewal_date ? new Date(item.last_renewal_date) : undefined,
          userId: item.user_id,
          createdAt: new Date(item.created_at!),
          updatedAt: item.updated_at ? new Date(item.updated_at) : undefined
        })) || []);

        const transformedDebtAccounts = debtData?.map(debt => ({
          id: debt.id,
          name: debt.name,
          type: debt.type,
          balance: Number(debt.balance),
          apr: Number(debt.apr),
          minimumPayment: Number(debt.minimum_payment),
          paymentDayOfMonth: debt.payment_day_of_month,
          nextDueDate: debt.next_due_date ? new Date(debt.next_due_date) : new Date(),
          nextOccurrenceDate: debt.next_due_date ? new Date(debt.next_due_date) : new Date(),
          paymentFrequency: debt.payment_frequency,
          userId: debt.user_id,
          createdAt: new Date(debt.created_at!)
        })) || [];

        const transformedVariableExpenses = (variableExpensesData?.map(expense => ({
          id: expense.id,
          name: expense.name,
          category: expense.category,
          amount: Number(expense.amount),
          userId: expense.user_id,
          createdAt: new Date(expense.created_at!),
          updatedAt: expense.updated_at ? new Date(expense.updated_at) : undefined
        })) || []);

        const transformedGoals = (goalsData?.map(goal => ({
          id: goal.id,
          name: goal.name,
          targetAmount: Number(goal.target_amount),
          currentAmount: Number(goal.current_amount),
          targetDate: new Date(goal.target_date),
          icon: goal.icon || 'default',
          userId: goal.user_id,
          createdAt: new Date(goal.created_at!)
        })) || []);

        // Set the transformed data
        setRecurringItems(transformedRecurringItems);
        setDebtAccounts(transformedDebtAccounts);
        setVariableExpenses(transformedVariableExpenses);
        setGoals(transformedGoals);
        setSinkingFunds(sinkingFundsData || []);
        
      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error loading data",
          description: error.message || "Failed to load paycheck data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id, toast]);

  // Fetch actual spending data for the current month when variable expenses change
  // Note: This data is only applied to paycheck periods in the current month
  // Future months will show full budget amounts (actualSpent = 0)
  useEffect(() => {
    const fetchActualSpendingData = async () => {
      if (!user?.id || variableExpenses.length === 0) return;

      try {
        // Get current month's date range
        const today = new Date();
        const startOfCurrentMonth = startOfMonth(today);
        const endOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        // Fetch actual spending for variable expenses (current month only)
        const { spendingData, error } = await getVariableExpenseSpending(
          user.id,
          startOfCurrentMonth,
          endOfCurrentMonth
        );

        if (error) {
          console.warn('Error fetching spending data:', error);
          return;
        }

        // Transform to expected format
        const actualSpending = variableExpenses.map(expense => {
          const spendingRecord = spendingData?.find(data => data.variableExpenseId === expense.id);
          return {
            categoryId: expense.id,
            spent: spendingRecord?.spent || 0,
            budgeted: expense.amount
          };
        });

        setActualSpendingData(actualSpending);
      } catch (error: any) {
        console.error('Error fetching actual spending data:', error);
      }
    };

    fetchActualSpendingData();
  }, [user?.id, variableExpenses]);

  // Generate paycheck breakdowns when data is loaded
  useEffect(() => {
    if (recurringItems.length > 0 || debtAccounts.length > 0) {
      // Use the user's financial tracking start date if available, otherwise default
      const trackingStart = userPreferences?.financialTrackingStartDate
        ? startOfDay(new Date(userPreferences.financialTrackingStartDate))
        : undefined;
      const periods = generatePaycheckPeriods(recurringItems, trackingStart);
      
      // Prepare current plan date ranges for immediate calculation
      const currentPlanDateRanges = {
        plan1: {
          start: planStates.plan1.manualStartDate,
          end: planStates.plan1.manualEndDate
        },
        plan2: {
          start: planStates.plan2.manualStartDate,
          end: planStates.plan2.manualEndDate
        },
        plan3: {
          start: planStates.plan3.manualStartDate,
          end: planStates.plan3.manualEndDate
        }
      };
      

      
      // Use the enhanced calculation with sinking funds integration and actual spending data
      const breakdowns = generatePaycheckBreakdownWithSinkingFunds(
        periods,
        recurringItems,
        debtAccounts,
        variableExpenses,
        goals,
        sinkingFunds,
        paycheckPreferences,
        actualSpendingData, // Pass actual spending data
        currentPlanDateRanges // Pass current date ranges for immediate calculation
      );
      
      setPaycheckBreakdowns(breakdowns);
    }
  }, [recurringItems, debtAccounts, variableExpenses, goals, sinkingFunds, paycheckPreferences, actualSpendingData, userPreferences, planStates]);

  const handlePreferencesChanged = async (newPreferences: PaycheckPreferences) => {
    if (!user?.id) return;

    try {
      // If switching to manual mode with an active plan, save current date range
      if (newPreferences.allocationMode === 'manual' && newPreferences.activeManualPlan) {
        const activePlan = newPreferences.activeManualPlan as PlanKey;
        const activePlanState = planStates[activePlan];
        
        if (activePlanState.manualStartDate && activePlanState.manualEndDate) {
          await saveDateRangeToPreferences(activePlan, activePlanState.manualStartDate, activePlanState.manualEndDate);
        }
      }

      await updateUserPreferences(user.id, { paycheckPreferences: newPreferences });
      setPaycheckPreferences(newPreferences);
      
      toast({
        title: "Preferences saved",
        description: "Your paycheck pulse preferences have been updated.",
      });
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error saving preferences",
        description: error.message || "Failed to save preferences",
        variant: "destructive",
      });
    }
  };

  // Categorize breakdowns by timeframe (robust for multiple income sources)
  const categorizeBreakdowns = () => {
    const today = startOfDay(new Date());
    const sorted = [...paycheckBreakdowns].sort((a, b) => new Date(a.period.paycheckDate).getTime() - new Date(b.period.paycheckDate).getTime());
    logger.log("First period paycheckDate:", sorted[0]?.period.paycheckDate); // Debug: log first period
    const past: PaycheckBreakdown[] = [];
    const current: PaycheckBreakdown[] = [];
    const future: PaycheckBreakdown[] = [];

    if (sorted.length === 0) return { past, current, future };

    // Get financial tracking start date from preferences (if available)
    const trackingStart = userPreferences?.financialTrackingStartDate
      ? startOfDay(new Date(userPreferences.financialTrackingStartDate))
      : null;

    // Build periods as intervals
    const periods: { start: Date, end: Date | null, breakdowns: PaycheckBreakdown[] }[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const start = startOfDay(new Date(sorted[i].period.paycheckDate));
      const end = i + 1 < sorted.length ? startOfDay(new Date(sorted[i + 1].period.paycheckDate)) : null;
      // Group all breakdowns with the same start date
      const group = sorted.filter(bd => startOfDay(new Date(bd.period.paycheckDate)).getTime() === start.getTime());
      periods.push({ start, end, breakdowns: group });
      // Skip over grouped items
      i += group.length - 1;
    }

    let foundCurrent = false;
    for (let i = 0; i < periods.length; i++) {
      const { start, end, breakdowns } = periods[i];
      // Only consider periods after tracking start date
      if (trackingStart && start < trackingStart) continue;
      if (!foundCurrent && today >= start && (!end || today < end)) {
        // All previous (after trackingStart) are past, this is current, all after are future
        for (let j = 0; j < i; j++) {
          if (!trackingStart || periods[j].start >= trackingStart) {
            past.push(...periods[j].breakdowns);
          }
        }
        current.push(...breakdowns);
        for (let j = i + 1; j < periods.length; j++) future.push(...periods[j].breakdowns);
        foundCurrent = true;
        break;
      }
    }
    // If not found and today is before the first period, all are future
    if (!foundCurrent && today < periods[0].start) {
      for (let j = 0; j < periods.length; j++) future.push(...periods[j].breakdowns);
    }
    // If not found and today is after the last period, last is current, rest are past
    if (!foundCurrent && today >= periods[periods.length - 1].start) {
      for (let j = 0; j < periods.length - 1; j++) {
        if (!trackingStart || periods[j].start >= trackingStart) {
          past.push(...periods[j].breakdowns);
        }
      }
      current.push(...periods[periods.length - 1].breakdowns);
    }
    return { past, current, future };
  };

  const { past, current, future } = categorizeBreakdowns();

  // Only sync selectedPlan from preferences on initial load (not on every preference change)
  useEffect(() => {
    if (paycheckPreferences.activeManualPlan && PLAN_KEYS.includes(paycheckPreferences.activeManualPlan as PlanKey)) {
      setSelectedPlan(paycheckPreferences.activeManualPlan as PlanKey);
    }
  }, [paycheckPreferences.activeManualPlan]); // Only react to activeManualPlan changes, not all preference changes

  // Filter items that have occurrences within the selected period
  const getFilteredItemsForPeriod = (items: any[], itemType: 'recurring' | 'debt' = 'recurring') => {
    // Return ALL items - the ManualExpenseTable component handles conditional autofill based on date range
    return items;
  };

  // Early return logic moved to before main return
  if (isLoading) {
    return (
      <div className="space-y-10">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading paycheck data...</span>
        </div>
      </div>
    );
  }
  if (paycheckBreakdowns.length === 0) {
    return (
      <div className="space-y-10">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No Paycheck Data Available</h3>
          <p className="text-sm text-muted-foreground">
            Add some recurring income items to get started with paycheck planning.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Segmented control for Auto/Manual tab switching */}
      <div className="flex justify-center mb-8">
        <div className={`inline-flex rounded-lg bg-gray-100 border border-gray-200 overflow-hidden ${isMobile ? 'w-full max-w-sm' : ''}`}>
          <button
            className={`${isMobile ? 'flex-1' : 'px-6'} py-2 text-sm font-semibold focus:outline-none transition-colors ${mainTab === 'auto' ? 'bg-white text-primary shadow' : 'text-gray-500 hover:bg-gray-200'}`}
            onClick={() => setMainTab('auto')}
            aria-pressed={mainTab === 'auto'}
            type="button"
          >
            Auto
          </button>
          <button
            className={`${isMobile ? 'flex-1' : 'px-6'} py-2 text-sm font-semibold focus:outline-none transition-colors border-l border-gray-200 ${mainTab === 'manual' ? 'bg-white text-primary shadow' : 'text-gray-500 hover:bg-gray-200'}`}
            onClick={() => setMainTab('manual')}
            aria-pressed={mainTab === 'manual'}
            type="button"
          >
            Manual
          </button>
        </div>
      </div>
      {/* Active Plan Toggle (visible on both tabs, directly below tabs) */}
      <div className="flex flex-col items-center mb-4">
        <div className={`flex ${isMobile ? 'flex-col w-full max-w-sm gap-3' : 'gap-2'}`}>
          <Button
            variant={paycheckPreferences.allocationMode === 'auto' ? 'default' : 'outline'}
            onClick={() => {
              setPaycheckPreferences(prev => ({ ...prev, allocationMode: 'auto', activeManualPlan: null }));
              if (user?.id) {
                updateUserPreferences(user.id, { paycheckPreferences: { ...paycheckPreferences, allocationMode: 'auto', activeManualPlan: null } });
              }
            }}
            aria-pressed={paycheckPreferences.allocationMode === 'auto'}
            className={isMobile ? 'w-full' : ''}
            size={isMobile ? 'default' : 'sm'}
          >
            Auto {paycheckPreferences.allocationMode === 'auto' && <span className="ml-2 text-xs text-green-600 font-semibold">Active</span>}
          </Button>
          <Button
            variant={paycheckPreferences.allocationMode === 'manual' ? 'default' : 'outline'}
            onClick={() => {
              setPaycheckPreferences(prev => ({ ...prev, allocationMode: 'manual', activeManualPlan: selectedPlan }));
              if (user?.id) {
                updateUserPreferences(user.id, { paycheckPreferences: { ...paycheckPreferences, allocationMode: 'manual', activeManualPlan: selectedPlan } });
              }
            }}
            aria-pressed={paycheckPreferences.allocationMode === 'manual'}
            className={isMobile ? 'w-full' : ''}
            size={isMobile ? 'default' : 'sm'}
          >
            Manual {paycheckPreferences.allocationMode === 'manual' && <span className="ml-2 text-xs text-green-600 font-semibold">Active</span>}
          </Button>
        </div>
        <div className={`mt-1 ${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 ${isMobile ? 'text-center px-4' : ''}`}>Mark which mode is considered the active plan. This affects which allocation is used across the app.</div>
      </div>
      {/* --- Existing content --- */}
      {mainTab === 'auto' && (
        <>
          {/* --- Existing Auto Tab content --- */}
          <div className="space-y-6">
            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                size={isMobile ? 'default' : 'sm'}
                onClick={() => setIsPreferencesDialogOpen(true)}
                className={`flex items-center gap-2 ${isMobile ? 'w-full max-w-sm' : ''}`}
              >
                <Settings className="h-4 w-4" />
                Preferences
              </Button>
            </div>

            {/* Current Paycheck Highlight */}
            {current.length > 0 && (
              <div className="space-y-4">
                <PaycheckBreakdownCard 
                  breakdown={{
                    ...current[0],
                    obligatedExpenses: current[0].obligatedExpenses?.filter(
                      (item: any) => !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))
                    ) || current[0].obligatedExpenses
                  }} 
                  isHighlighted={true}
                />
              </div>
            )}

            {/* Tabbed View */}
            <Tabs value={selectedTimeframe} onValueChange={(value) => setSelectedTimeframe(value as PaycheckTimeframe)}>
              <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3 text-xs' : 'grid-cols-3'}`}>
                <TabsTrigger value="past">{isMobile ? `Past (${past.length})` : `Past (${past.length})`}</TabsTrigger>
                <TabsTrigger value="current">Recent</TabsTrigger>
                <TabsTrigger value="future">{isMobile ? `Future (${future.length})` : `Upcoming (${future.length})`}</TabsTrigger>
              </TabsList>

              <TabsContent value="past" className="space-y-6">
                <PaycheckTimelineView 
                  breakdowns={past.map(bd => ({
                    ...bd,
                    obligatedExpenses: bd.obligatedExpenses?.filter(
                      (item: any) => !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))
                    ) || bd.obligatedExpenses
                  }))} 
                  title="Past Paychecks"
                />
              </TabsContent>

              <TabsContent value="current" className="space-y-6">
                {/* Show most recent income and breakdown */}
                {current.length > 0 ? (
                  <PaycheckTimelineView 
                    breakdowns={current.map(bd => ({
                      ...bd,
                      obligatedExpenses: bd.obligatedExpenses?.filter(
                        (item: any) => !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))
                      ) || bd.obligatedExpenses
                    }))} 
                    title="Most Recent Paycheck"
                  />
                ) : (
                  <div className="text-center py-8">
                    <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-muted-foreground mb-2`}>No Most Recent Paycheck</h3>
                    <p className="text-sm text-muted-foreground">
                      Your most recent paycheck information will appear here once you receive a paycheck.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="future" className="space-y-6">
                <PaycheckTimelineView 
                  breakdowns={future.map(bd => ({
                    ...bd,
                    obligatedExpenses: bd.obligatedExpenses?.filter(
                      (item: any) => !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))
                    ) || bd.obligatedExpenses
                  }))} 
                  title="Upcoming Paychecks"
                />
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
      {mainTab === 'manual' && (
        <>
          {/* --- Active Manual Plan Selector --- */}
          {paycheckPreferences.allocationMode === 'manual' && (
            <div className="mb-4">
              <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'} mb-2`}>
                <span className={`${isMobile ? 'text-sm text-center' : 'text-sm'} font-medium text-gray-700`}>🎯 Active Plan (affects whole app):</span>
                <span className="text-xs text-gray-500">This plan's data appears on your dashboard</span>
              </div>
              <div className={`flex ${isMobile ? 'flex-col gap-2' : 'gap-2'}`}>
                {PLAN_KEYS.map(plan => (
                  <Button
                    key={plan}
                    variant={paycheckPreferences.activeManualPlan === plan ? 'default' : 'outline'}
                    onClick={async () => {
                      // Save current plan's date range before switching
                      const currentPlanState = planStates[selectedPlan];
                      if (currentPlanState.manualStartDate && currentPlanState.manualEndDate) {
                        await saveDateRangeToPreferences(selectedPlan, currentPlanState.manualStartDate, currentPlanState.manualEndDate);
                      }
                      
                      setSelectedPlan(plan);
                      setPaycheckPreferences(prev => ({ ...prev, activeManualPlan: plan }));
                      if (user && user.id) {
                        const newPlanState = planStates[plan];
                        const updatedPreferences = { 
                          paycheckPreferences: { 
                            ...paycheckPreferences, 
                            activeManualPlan: plan 
                          } 
                        };
                        
                        // Also save the new plan's date range if it exists
                        if (newPlanState.manualStartDate && newPlanState.manualEndDate) {
                          await saveDateRangeToPreferences(plan, newPlanState.manualStartDate, newPlanState.manualEndDate);
                        }
                        
                        await updateUserPreferences(user.id, updatedPreferences);
                      }
                    }}
                    className={`${paycheckPreferences.activeManualPlan === plan ? 'font-bold' : ''} ${isMobile ? 'w-full' : ''}`}
                    aria-pressed={paycheckPreferences.activeManualPlan === plan}
                    size={isMobile ? 'default' : 'sm'}
                  >
                    {plan === 'plan1' ? 'Plan 1' : plan === 'plan2' ? 'Plan 2' : 'Plan 3'}
                    {paycheckPreferences.activeManualPlan === plan && (
                      <span className="ml-2 text-xs text-green-600 font-semibold">Active</span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {/* --- Plan Tabs Row --- */}
          <div className="mb-4">
            <div className={`flex items-center justify-between ${isMobile ? 'flex-col gap-2' : 'gap-4'} mb-2`}>
              <span className="text-sm font-medium text-gray-700">
                📝 Editing Plan: {selectedPlan === 'plan1' ? 'Plan 1' : selectedPlan === 'plan2' ? 'Plan 2' : 'Plan 3'}
                {selectedPlan !== paycheckPreferences.activeManualPlan && (
                  <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">Not Active</span>
                )}
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                  DEBUG: {selectedPlan}
                </span>
              </span>
              <span className="text-xs text-gray-500">
                You can edit any plan, even if it's not active
                <br />
                ⚠️ <strong>Switching plans does NOT save data</strong> - click "Save" to save changes
              </span>
            </div>
            <div className={`flex ${isMobile ? 'flex-col gap-2' : 'gap-2'}`}>
              {PLAN_KEYS.map(plan => (
                <Button
                  key={plan}
                  variant={selectedPlan === plan ? 'default' : 'outline'}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    logger.log(`🔄 PLAN SWITCH: Button clicked! Switching from ${selectedPlan} to ${plan}`);
                    logger.log(`🔄 PLAN SWITCH: Current planStates:`, planStates);
                    logger.log(`🔄 PLAN SWITCH: Current selectedPlan:`, selectedPlan);
                    
                    try {
                      // NO AUTO-SAVING! Only switch the plan view
                      logger.log(`🔄 PLAN SWITCH: Setting selected plan to ${plan} (NO AUTO-SAVE)`);
                      setSelectedPlan(plan);
                      
                      // Force re-render by updating state immediately
                      setTimeout(() => {
                        logger.log(`🔄 PLAN SWITCH: Post-switch selectedPlan should be ${plan}`);
                        logger.log(`🔄 PLAN SWITCH: Post-switch planStates:`, planStates);
                      }, 100);
                      
                      logger.log(`🔄 PLAN SWITCH: Successfully switched to ${plan}`);
                    } catch (error) {
                      console.error('🔄 PLAN SWITCH: Error switching plans:', error);
                    }
                  }}
                  className={`${selectedPlan === plan ? 'font-bold' : ''} ${isMobile ? 'w-full' : ''} transition-all duration-200 hover:scale-105 cursor-pointer`}
                  size={isMobile ? 'default' : 'sm'}
                  disabled={false}
                >
                  {plan === 'plan1' ? 'Plan 1' : plan === 'plan2' ? 'Plan 2' : 'Plan 3'}
                  {selectedPlan === plan && (
                    <span className="ml-1 text-xs">📝</span>
                  )}
                </Button>
              ))}
            </div>
          </div>
          {/* --- Manual Paycheck Budget Section (plan-aware) --- */}
          <section className={`bg-white rounded-xl ${isMobile ? 'p-4' : 'p-6'} shadow space-y-6 border border-gray-200`}>
            {/* Summary Card */}
            <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-col md:flex-row md:items-center md:justify-between gap-4'} mb-4 bg-gray-50 rounded-lg ${isMobile ? 'p-3' : 'p-4'} border border-gray-100`}>
              {/* Date selection row styled like screenshot */}
              <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center gap-4'}`}>
                <span className={`flex items-center gap-2 text-gray-600 font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" /></svg>
                  Budget Period
                </span>
                <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center gap-4'}`}>
                  <input
                    type="date"
                    className={`rounded-lg border border-gray-300 ${isMobile ? 'px-2 py-2 text-sm w-full' : 'px-3 py-2 text-base'} focus:outline-none focus:ring-2 focus:ring-primary-200`}
                    value={manualStartDate ? manualStartDate.toISOString().slice(0, 10) : ''}
                    onChange={e => handleManualDateChange(setManualStartDate, e.target.value ? new Date(e.target.value + 'T00:00:00') : null)}
                  />
                  {!isMobile && <span className="text-gray-400 font-semibold">to</span>}
                  {isMobile && <span className="text-gray-400 font-semibold text-center text-sm">to</span>}
                  <input
                    type="date"
                    className={`rounded-lg border border-gray-300 ${isMobile ? 'px-2 py-2 text-sm w-full' : 'px-3 py-2 text-base'} focus:outline-none focus:ring-2 focus:ring-primary-200`}
                    value={manualEndDate ? manualEndDate.toISOString().slice(0, 10) : ''}
                    onChange={e => handleManualDateChange(setManualEndDate, e.target.value ? new Date(e.target.value + 'T00:00:00') : null)}
                  />
                </div>
              </div>
              {manualStartDate && manualEndDate && (
                <div className={`flex flex-col ${isMobile ? 'items-center gap-2' : 'items-end gap-2'}`}>
                  <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 font-semibold`}>Left to Budget</div>
                  <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold flex items-center gap-2`}>
                    {/* Calculate total income for the selected period and render the result directly */}
                    {(() => {
                      // Calculate totals for each section using the same logic as the category chips
                      const totalIncome = getManualTabTotal(getFilteredItemsForPeriod(recurringItems.filter(item => item.type === 'income'), 'recurring'), 'income', manualOverrides, undefined, undefined, undefined, manualStartDate, manualEndDate);
                      const totalFixed = getManualTabTotal(getFilteredItemsForPeriod(recurringItems.filter(item => item.type === 'fixed-expense' && !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))), 'recurring'), 'fixed', manualOverrides, undefined, undefined, undefined, manualStartDate, manualEndDate);
                      const totalVariable = getManualTabTotal(getFilteredItemsForPeriod(variableExpenses, 'recurring'), 'variable', manualOverrides, undefined, undefined, undefined, manualStartDate, manualEndDate);
                      const totalSubscriptions = getManualTabTotal(getFilteredItemsForPeriod(recurringItems.filter(item => item.type === 'subscription'), 'recurring'), 'subscription', manualOverrides, undefined, undefined, undefined, manualStartDate, manualEndDate);
                      const totalDebt = getManualTabTotal(getFilteredItemsForPeriod(debtAccounts, 'debt'), 'debt', manualOverrides, 'minimumPayment', undefined, undefined, manualStartDate, manualEndDate);
                      const totalSavings = getManualTabTotal(goals, 'goal', manualOverrides, 'targetAmount', true, undefined, manualStartDate, manualEndDate);
                      const totalSinkingFunds = getManualTabTotal(sinkingFunds, 'sinking-funds', manualOverrides, 'monthlyContribution', true, undefined, manualStartDate, manualEndDate);
                      const totalAllocated = totalFixed + totalVariable + totalSubscriptions + totalDebt + totalSavings + totalSinkingFunds;
                      const leftToBudget = totalIncome - totalAllocated;
                      if (leftToBudget === 0) {
                        return <span className="text-green-600">All Allocated <span className="inline-block w-3 h-3 rounded-full bg-green-400 align-middle"></span></span>;
                      } else if (leftToBudget > 0) {
                        return <span className="text-green-600">${leftToBudget.toLocaleString(undefined, { minimumFractionDigits: 0 })} <span className="inline-block w-3 h-3 rounded-full bg-green-400 align-middle"></span></span>;
                      } else {
                        return <span className="text-red-600">-${Math.abs(leftToBudget).toLocaleString(undefined, { minimumFractionDigits: 0 })} <span className="inline-block w-3 h-3 rounded-full bg-red-400 align-middle"></span></span>;
                      }
                    })()}
                  </div>
                  {/* Category Chips */}
                  <div className={`flex flex-wrap gap-2 mt-2 ${isMobile ? 'justify-center' : ''}`}>
                    <span className={`px-2 py-1 rounded bg-green-100 text-green-700 ${isMobile ? 'text-xs' : 'text-xs'} font-semibold`}>Income: ${getManualTabTotal(getFilteredItemsForPeriod(recurringItems.filter(item => item.type === 'income'), 'recurring'), 'income', manualOverrides, undefined, undefined, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                    <span className={`px-2 py-1 rounded bg-blue-100 text-blue-700 ${isMobile ? 'text-xs' : 'text-xs'} font-semibold`}>Fixed: ${getManualTabTotal(getFilteredItemsForPeriod(recurringItems.filter(item => item.type === 'fixed-expense' && !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))), 'recurring'), 'fixed', manualOverrides, undefined, undefined, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                    <span className={`px-2 py-1 rounded bg-purple-100 text-purple-700 ${isMobile ? 'text-xs' : 'text-xs'} font-semibold`}>Variable: ${getManualTabTotal(getFilteredItemsForPeriod(variableExpenses, 'recurring'), 'variable', manualOverrides, undefined, undefined, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                    <span className={`px-2 py-1 rounded bg-indigo-100 text-indigo-700 ${isMobile ? 'text-xs' : 'text-xs'} font-semibold`}>Subscriptions: ${getManualTabTotal(getFilteredItemsForPeriod(recurringItems.filter(item => item.type === 'subscription'), 'recurring'), 'subscription', manualOverrides, undefined, undefined, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                    <span className={`px-2 py-1 rounded bg-red-100 text-red-700 ${isMobile ? 'text-xs' : 'text-xs'} font-semibold`}>Debt: ${getManualTabTotal(getFilteredItemsForPeriod(debtAccounts, 'debt'), 'debt', manualOverrides, 'minimumPayment', undefined, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                    <span className={`px-2 py-1 rounded bg-yellow-100 text-yellow-700 ${isMobile ? 'text-xs' : 'text-xs'} font-semibold`}>Savings: ${getManualTabTotal(goals, 'goal', manualOverrides, 'targetAmount', true, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                    {sinkingFunds.length > 0 && (
                      <span className={`px-2 py-1 rounded bg-teal-100 text-teal-700 ${isMobile ? 'text-xs' : 'text-xs'} font-semibold`}>Sinking Funds: ${getManualTabTotal(sinkingFunds, 'sinking-funds', manualOverrides, 'monthlyContribution', true, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Category Tabs and Card */}
            {manualStartDate && manualEndDate && (
              <>
                <Tabs value={manualTab} onValueChange={setManualTab} className="w-full mb-4">
                  <TabsList className={`${isMobile ? 'grid grid-cols-2 mb-4' : `grid ${sinkingFunds.length > 0 ? 'grid-cols-6' : 'grid-cols-5'} mb-4`}`}>
                    {!isMobile ? (
                      <>
                        <TabsTrigger value="fixed">
                          Fixed Expenses
                          <span className="block text-xs text-muted-foreground font-normal">{getManualTabTotal(getFilteredItemsForPeriod(recurringItems.filter(item => item.type === 'fixed-expense' && !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))), 'recurring'), 'fixed', manualOverrides, undefined, undefined, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </TabsTrigger>
                        <TabsTrigger value="subscription">
                          Subscriptions
                          <span className="block text-xs text-muted-foreground font-normal">{getManualTabTotal(getFilteredItemsForPeriod(recurringItems.filter(item => item.type === 'subscription'), 'recurring'), 'subscription', manualOverrides, undefined, undefined, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </TabsTrigger>
                        <TabsTrigger value="variable">
                          Variable Expenses
                          <span className="block text-xs text-muted-foreground font-normal">{getManualTabTotal(getFilteredItemsForPeriod(variableExpenses, 'recurring'), 'variable', manualOverrides, undefined, undefined, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </TabsTrigger>
                        <TabsTrigger value="debt">
                          Debt
                          <span className="block text-xs text-muted-foreground font-normal">{getManualTabTotal(getFilteredItemsForPeriod(debtAccounts, 'debt'), 'debt', manualOverrides, 'minimumPayment', undefined, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </TabsTrigger>
                        <TabsTrigger value="goal">
                          Savings Goals
                          <span className="block text-xs text-muted-foreground font-normal">{getManualTabTotal(goals, 'goal', manualOverrides, 'targetAmount', true, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </TabsTrigger>
                        {sinkingFunds.length > 0 && (
                          <TabsTrigger value="sinking-funds">
                            Sinking Funds
                            <span className="block text-xs text-muted-foreground font-normal">{getManualTabTotal(sinkingFunds, 'sinking-funds', manualOverrides, 'monthlyContribution', true, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </TabsTrigger>
                        )}
                      </>
                    ) : (
                      <>
                        <TabsTrigger value="fixed" className="text-xs">
                          Fixed
                          <span className="block text-xs text-muted-foreground font-normal">${getManualTabTotal(getFilteredItemsForPeriod(recurringItems.filter(item => item.type === 'fixed-expense' && !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))), 'recurring'), 'fixed', manualOverrides, undefined, undefined, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                        </TabsTrigger>
                        <TabsTrigger value="subscription" className="text-xs">
                          Subs
                          <span className="block text-xs text-muted-foreground font-normal">${getManualTabTotal(getFilteredItemsForPeriod(recurringItems.filter(item => item.type === 'subscription'), 'recurring'), 'subscription', manualOverrides, undefined, undefined, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                        </TabsTrigger>
                      </>
                    )}
                  </TabsList>
                  {isMobile && (
                    <TabsList className={`grid ${sinkingFunds.length > 0 ? 'grid-cols-4' : 'grid-cols-3'} mb-4`}>
                      <TabsTrigger value="variable" className="text-xs">
                        Variable
                        <span className="block text-xs text-muted-foreground font-normal">${getManualTabTotal(getFilteredItemsForPeriod(variableExpenses, 'recurring'), 'variable', manualOverrides, undefined, undefined, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                      </TabsTrigger>
                      <TabsTrigger value="debt" className="text-xs">
                        Debt
                        <span className="block text-xs text-muted-foreground font-normal">${getManualTabTotal(getFilteredItemsForPeriod(debtAccounts, 'debt'), 'debt', manualOverrides, 'minimumPayment', undefined, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                      </TabsTrigger>
                      <TabsTrigger value="goal" className="text-xs">
                        Goals
                        <span className="block text-xs text-muted-foreground font-normal">${getManualTabTotal(goals, 'goal', manualOverrides, 'targetAmount', true, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                      </TabsTrigger>
                      {sinkingFunds.length > 0 && (
                        <TabsTrigger value="sinking-funds" className="text-xs">
                          Sinking
                          <span className="block text-xs text-muted-foreground font-normal">${getManualTabTotal(sinkingFunds, 'sinking-funds', manualOverrides, 'monthlyContribution', true, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                        </TabsTrigger>
                      )}
                    </TabsList>
                  )}
                  <TabsContent value="fixed">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-blue-700 text-lg">Fixed Expenses</span>
                        <span className="font-bold text-blue-700">${getManualTabTotal(getFilteredItemsForPeriod(recurringItems.filter(item => item.type === 'fixed-expense' && !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))), 'recurring'), 'fixed', manualOverrides, undefined, undefined, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                      </div>
                      <ManualExpenseTable
                        items={getFilteredItemsForPeriod(
                          recurringItems.filter(
                          item =>
                            item.type === 'fixed-expense' &&
                            !(typeof item.name === 'string' && item.name.startsWith('Debt Payment Placeholder'))
                          ),
                          'recurring'
                        )}
                        prefix="fixed"
                        manualOverrides={manualOverrides}
                        handleManualChange={handleManualChange}
                        showDefaults={true}
                        hasManualOverridesForPeriod={hasManualOverridesForPeriod}
                        manualStartDate={manualStartDate}
                        manualEndDate={manualEndDate}
                        onGetCurrentValues={ENABLE_FORM_TRACKING ? handleFixedValuesUpdate : undefined}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="subscription">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-indigo-700 text-lg">Subscriptions</span>
                        <span className="font-bold text-indigo-700">${getManualTabTotal(getFilteredItemsForPeriod(recurringItems.filter(item => item.type === 'subscription'), 'recurring'), 'subscription', manualOverrides, undefined, undefined, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                      </div>
                      <ManualExpenseTable
                        items={getFilteredItemsForPeriod(
                          recurringItems.filter(item => item.type === 'subscription'),
                          'recurring'
                        )}
                        prefix="subscription"
                        manualOverrides={manualOverrides}
                        handleManualChange={handleManualChange}
                        showDefaults={true}
                        hasManualOverridesForPeriod={hasManualOverridesForPeriod}
                        manualStartDate={manualStartDate}
                        manualEndDate={manualEndDate}
                        onGetCurrentValues={ENABLE_FORM_TRACKING ? handleSubscriptionValuesUpdate : undefined}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="variable">
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-purple-700 text-lg">Variable Expenses</span>
                        <span className="font-bold text-purple-700">${getManualTabTotal(getFilteredItemsForPeriod(variableExpenses, 'recurring'), 'variable', manualOverrides, undefined, undefined, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                      </div>
                      <ManualExpenseTable
                        items={getFilteredItemsForPeriod(variableExpenses, 'recurring')}
                        prefix="variable"
                        manualOverrides={manualOverrides}
                        handleManualChange={handleManualChange}
                        showDefaults={true}
                        hasManualOverridesForPeriod={hasManualOverridesForPeriod}
                        manualStartDate={manualStartDate}
                        manualEndDate={manualEndDate}
                        onGetCurrentValues={ENABLE_FORM_TRACKING ? handleVariableValuesUpdate : undefined}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="debt">
                    <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-red-700 text-lg">Debt</span>
                        <span className="font-bold text-red-700">${getManualTabTotal(getFilteredItemsForPeriod(debtAccounts, 'debt'), 'debt', manualOverrides, 'minimumPayment', undefined, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                      </div>
                      <ManualExpenseTable
                        items={getFilteredItemsForPeriod(debtAccounts, 'debt')}
                        prefix="debt"
                        manualOverrides={manualOverrides}
                        handleManualChange={handleManualChange}
                        minKey="minimumPayment"
                        showDefaults={true}
                        hasManualOverridesForPeriod={hasManualOverridesForPeriod}
                        manualStartDate={manualStartDate}
                        manualEndDate={manualEndDate}
                        onGetCurrentValues={ENABLE_FORM_TRACKING ? handleDebtValuesUpdate : undefined}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="goal">
                    <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-yellow-700 text-lg">Savings Goals</span>
                        <span className="font-bold text-yellow-700">${getManualTabTotal(goals, 'goal', manualOverrides, 'targetAmount', true, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                      </div>
                      <ManualExpenseTable
                        items={goals}
                        prefix="goal"
                        manualOverrides={manualOverrides}
                        handleManualChange={handleManualChange}
                        minKey={undefined} // Do not autofill with targetAmount
                        manualOnly={true}
                        showDefaults={true}
                        hasManualOverridesForPeriod={hasManualOverridesForPeriod}
                        manualStartDate={manualStartDate}
                        manualEndDate={manualEndDate}
                        onGetCurrentValues={ENABLE_FORM_TRACKING ? handleGoalValuesUpdate : undefined}
                      />
                    </div>
                  </TabsContent>
                  {sinkingFunds.length > 0 && (
                    <TabsContent value="sinking-funds">
                      <div className="bg-teal-50 border border-teal-100 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-teal-700 text-lg">Sinking Funds</span>
                          <span className="font-bold text-teal-700">${getManualTabTotal(sinkingFunds, 'sinking-funds', manualOverrides, 'monthlyContribution', true, undefined, manualStartDate, manualEndDate).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                        </div>
                        <ManualExpenseTable
                          items={sinkingFunds}
                          prefix="sinking-funds"
                          manualOverrides={manualOverrides}
                          handleManualChange={handleManualChange}
                          minKey={undefined} // Do not autofill with monthlyContribution
                          manualOnly={true}
                          showDefaults={true}
                          hasManualOverridesForPeriod={hasManualOverridesForPeriod}
                          manualStartDate={manualStartDate}
                          manualEndDate={manualEndDate}
                          onGetCurrentValues={ENABLE_FORM_TRACKING ? handleSinkingFundsValuesUpdate : undefined}
                        />
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </>
            )}
            <div className={`flex ${isMobile ? 'flex-col gap-3 mt-6' : 'gap-4 mt-6'}`}>
              <Button 
                variant="default" 
                onClick={saveManualOverrides} 
                className={`${isMobile ? 'w-full' : ''} bg-green-600 hover:bg-green-700`} 
                size={isMobile ? 'default' : 'sm'}
              >
                💾 Save {selectedPlan === 'plan1' ? 'Plan 1' : selectedPlan === 'plan2' ? 'Plan 2' : 'Plan 3'} Overrides
                {selectedPlan !== paycheckPreferences.activeManualPlan && (
                  <span className="ml-1 text-xs opacity-80">(Not Active)</span>
                )}
              </Button>
              <Button variant="outline" onClick={revertManualOverrides} className={isMobile ? 'w-full' : ''} size={isMobile ? 'default' : 'sm'}>
                🔄 Revert {selectedPlan === 'plan1' ? 'Plan 1' : selectedPlan === 'plan2' ? 'Plan 2' : 'Plan 3'} to Auto
              </Button>
            </div>
          </section>
        </>
      )}
      {/* Preferences Dialog */}
      <PaycheckPreferencesDialog
        isOpen={isPreferencesDialogOpen}
        onOpenChange={setIsPreferencesDialogOpen}
        preferences={paycheckPreferences}
        onPreferencesChanged={handlePreferencesChanged}
      />
    </div>
  );
}