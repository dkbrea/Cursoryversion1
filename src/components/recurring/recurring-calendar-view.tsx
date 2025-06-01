"use client";

import { useState, useEffect, useMemo } from 'react';
import type { UnifiedRecurringListItem } from '@/types';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, isSameDay, startOfMonth, isSameMonth, startOfDay, endOfMonth, isWithinInterval, setDate, addDays, addWeeks, addMonths, addQuarters, addYears, getDate, isBefore, isAfter, getYear } from 'date-fns';
import type { DayContentProps, CaptionProps } from 'react-day-picker';
import { CalendarDays, DollarSign, CreditCard, Users, Briefcase, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecurringCalendarViewProps {
  items: UnifiedRecurringListItem[];
  onMonthChange?: (month: Date) => void;
}

interface DayItem {
  id: string;
  name: string;
  amount: number;
  type: UnifiedRecurringListItem['itemDisplayType'];
  source: 'recurring' | 'debt';
}

interface DayData {
  items: DayItem[];
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
}

const getItemIcon = (itemType: UnifiedRecurringListItem['itemDisplayType']) => {
  switch (itemType) {
    case 'income':
      return <ArrowUpCircle className="h-3 w-3 text-green-600" />;
    case 'subscription':
      return <CreditCard className="h-3 w-3 text-blue-600" />;
    case 'fixed-expense':
      return <Briefcase className="h-3 w-3 text-orange-600" />;
    case 'debt-payment':
      return <ArrowDownCircle className="h-3 w-3 text-red-600" />;
    default:
      return <DollarSign className="h-3 w-3 text-gray-600" />;
  }
};

const getItemTextColor = (itemType: UnifiedRecurringListItem['itemDisplayType']) => {
  switch (itemType) {
    case 'income':
      return "text-green-700";
    case 'subscription':
      return "text-blue-700";
    case 'fixed-expense':
      return "text-orange-700";
    case 'debt-payment':
      return "text-red-700";
    default:
      return "text-gray-700";
  }
};

const getItemBackgroundColor = (itemType: UnifiedRecurringListItem['itemDisplayType']) => {
  switch (itemType) {
    case 'income':
      return "bg-green-100 border-green-200";
    case 'subscription':
      return "bg-blue-100 border-blue-200";
    case 'fixed-expense':
      return "bg-orange-100 border-orange-200";
    case 'debt-payment':
      return "bg-red-100 border-red-200";
    default:
      return "bg-gray-100 border-gray-200";
  }
};

export function RecurringCalendarView({ items, onMonthChange }: RecurringCalendarViewProps) {
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Notify parent when month changes
  useEffect(() => {
    if (onMonthChange) {
      onMonthChange(month);
    }
  }, [month, onMonthChange]);

  // Calculate all occurrences for the displayed month using comprehensive logic similar to budget forecast
  const monthlyOccurrences = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const dayMap = new Map<string, DayData>();

    // Helper function to add occurrence to a specific day
    const addOccurrenceToDay = (date: Date, item: DayItem) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const existingDay = dayMap.get(dateKey) || {
        items: [],
        totalIncome: 0,
        totalExpenses: 0,
        netAmount: 0
      };

      existingDay.items.push(item);
      
      if (item.type === 'income') {
        existingDay.totalIncome += item.amount;
      } else {
        existingDay.totalExpenses += item.amount;
      }
      
      existingDay.netAmount = existingDay.totalIncome - existingDay.totalExpenses;
      dayMap.set(dateKey, existingDay);
    };

    // Calculate year-wide pattern for each item, then filter to displayed month
    items.forEach(unifiedItem => {
      if (unifiedItem.source === 'debt') {
        // For debt payments, calculate full year pattern based on payment frequency
        const currentYear = getYear(month);
        const yearStart = new Date(currentYear, 0, 1);
        const yearEnd = new Date(currentYear, 11, 31);
        
        // Start with next occurrence date as reference point
        const referenceDate = new Date(unifiedItem.nextOccurrenceDate);
        
        // Calculate all debt payment dates for the year
        let allDebtDates: Date[] = [];
        
        if (unifiedItem.frequency === 'weekly') {
          // Find first occurrence of the year by working backwards/forwards from reference
          let tempDate = new Date(referenceDate);
          
          // Work backwards to find earlier dates in the year
          while (tempDate >= yearStart) {
            if (tempDate >= yearStart) {
              allDebtDates.push(new Date(tempDate));
            }
            tempDate = addWeeks(tempDate, -1);
          }
          
          // Work forwards from reference to find later dates in the year
          tempDate = addWeeks(referenceDate, 1);
          while (tempDate <= yearEnd) {
            allDebtDates.push(new Date(tempDate));
            tempDate = addWeeks(tempDate, 1);
          }
        } else if (unifiedItem.frequency === 'bi-weekly') {
          // Find first occurrence of the year by working backwards/forwards from reference
          let tempDate = new Date(referenceDate);
          
          // Work backwards to find earlier dates in the year
          while (tempDate >= yearStart) {
            if (tempDate >= yearStart) {
              allDebtDates.push(new Date(tempDate));
            }
            tempDate = addWeeks(tempDate, -2);
          }
          
          // Work forwards from reference to find later dates in the year
          tempDate = addWeeks(referenceDate, 2);
          while (tempDate <= yearEnd) {
            allDebtDates.push(new Date(tempDate));
            tempDate = addWeeks(tempDate, 2);
          }
        } else if (unifiedItem.frequency === 'monthly') {
          // Calculate all monthly occurrences for the year
          let tempDate = new Date(referenceDate);
          
          // Work backwards to find earlier dates in the year
          while (tempDate >= yearStart) {
            if (tempDate >= yearStart) {
              allDebtDates.push(new Date(tempDate));
            }
            tempDate = addMonths(tempDate, -1);
          }
          
          // Work forwards from reference to find later dates in the year
          tempDate = addMonths(referenceDate, 1);
          while (tempDate <= yearEnd) {
            allDebtDates.push(new Date(tempDate));
            tempDate = addMonths(tempDate, 1);
          }
        } else if (unifiedItem.frequency === 'annually') {
          // For yearly debt payments, just use reference date if in this year
          if (referenceDate >= yearStart && referenceDate <= yearEnd) {
            allDebtDates.push(referenceDate);
          }
        } else {
          // For 'other' frequency, use reference date if in this year
          if (referenceDate >= yearStart && referenceDate <= yearEnd) {
            allDebtDates.push(referenceDate);
          }
        }
        
        // Filter to current month and add to calendar
        allDebtDates.forEach(debtDate => {
          if (isSameMonth(debtDate, month)) {
            addOccurrenceToDay(debtDate, {
              id: `${unifiedItem.id}-${format(debtDate, 'yyyy-MM-dd')}`,
              name: unifiedItem.name,
              amount: unifiedItem.amount,
              type: unifiedItem.itemDisplayType,
              source: unifiedItem.source
            });
          }
        });
        
      } else {
        // For recurring items, calculate full year pattern
        if (unifiedItem.status === "Ended") return;

        const currentYear = getYear(month);
        const yearStart = new Date(currentYear, 0, 1);
        const yearEnd = new Date(currentYear, 11, 31);
        
        let allOccurrences: Date[] = [];

        // Handle semi-monthly frequency
        if (unifiedItem.frequency === 'semi-monthly') {
          if (unifiedItem.semiMonthlyFirstPayDate && unifiedItem.semiMonthlySecondPayDate) {
            // Get the day of month for each payment
            const firstPayDay = getDate(new Date(unifiedItem.semiMonthlyFirstPayDate));
            const secondPayDay = getDate(new Date(unifiedItem.semiMonthlySecondPayDate));
            
            // Generate all semi-monthly dates for the year
            for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
              const currentMonthStart = new Date(currentYear, monthIndex, 1);
              const currentMonthEnd = endOfMonth(currentMonthStart);
              
              // First payment of the month
              const firstPayDate = new Date(currentMonthStart);
              firstPayDate.setDate(Math.min(firstPayDay, getDate(currentMonthEnd)));
              
              // Second payment of the month
              const secondPayDate = new Date(currentMonthStart);
              secondPayDate.setDate(Math.min(secondPayDay, getDate(currentMonthEnd)));
              
              // Add both dates if they're valid and not ended
              if (!unifiedItem.endDate || firstPayDate <= startOfDay(new Date(unifiedItem.endDate))) {
                allOccurrences.push(firstPayDate);
              }
              if (!unifiedItem.endDate || secondPayDate <= startOfDay(new Date(unifiedItem.endDate))) {
                allOccurrences.push(secondPayDate);
              }
            }
          }
        } else {
          // Handle regular frequencies - calculate full year pattern
          const referenceDate = new Date(unifiedItem.nextOccurrenceDate);
          let startDate: Date;
          
          // Determine proper start date for calculations
          if (unifiedItem.itemDisplayType === 'subscription' && unifiedItem.lastRenewalDate) {
            startDate = startOfDay(new Date(unifiedItem.lastRenewalDate));
            // For subscriptions, first payment is after last renewal
            switch (unifiedItem.frequency) {
              case "daily": startDate = addDays(startDate, 1); break;
              case "weekly": startDate = addWeeks(startDate, 1); break;
              case "bi-weekly": startDate = addWeeks(startDate, 2); break;
              case "monthly": startDate = addMonths(startDate, 1); break;
              case "quarterly": startDate = addQuarters(startDate, 1); break;
              case "yearly": startDate = addYears(startDate, 1); break;
              default: startDate = addDays(startDate, 1); break;
            }
          } else if (unifiedItem.startDate) {
            startDate = startOfDay(new Date(unifiedItem.startDate));
          } else {
            // Use reference date as fallback
            startDate = new Date(referenceDate);
          }
          
          // Calculate all occurrences for the year based on frequency
          if (unifiedItem.frequency === 'daily') {
            let tempDate = new Date(referenceDate);
            
            // Work backwards to start of year
            while (tempDate >= yearStart) {
              if (tempDate >= yearStart && (!unifiedItem.endDate || tempDate <= startOfDay(new Date(unifiedItem.endDate)))) {
                allOccurrences.push(new Date(tempDate));
              }
              tempDate = addDays(tempDate, -1);
            }
            
            // Work forwards to end of year
            tempDate = addDays(referenceDate, 1);
            while (tempDate <= yearEnd) {
              if (!unifiedItem.endDate || tempDate <= startOfDay(new Date(unifiedItem.endDate))) {
                allOccurrences.push(new Date(tempDate));
              }
              tempDate = addDays(tempDate, 1);
            }
          } else if (unifiedItem.frequency === 'weekly') {
            let tempDate = new Date(referenceDate);
            
            // Work backwards to start of year
            while (tempDate >= yearStart) {
              if (tempDate >= yearStart && (!unifiedItem.endDate || tempDate <= startOfDay(new Date(unifiedItem.endDate)))) {
                allOccurrences.push(new Date(tempDate));
              }
              tempDate = addWeeks(tempDate, -1);
            }
            
            // Work forwards to end of year
            tempDate = addWeeks(referenceDate, 1);
            while (tempDate <= yearEnd) {
              if (!unifiedItem.endDate || tempDate <= startOfDay(new Date(unifiedItem.endDate))) {
                allOccurrences.push(new Date(tempDate));
              }
              tempDate = addWeeks(tempDate, 1);
            }
          } else if (unifiedItem.frequency === 'bi-weekly') {
            let tempDate = new Date(referenceDate);
            
            // Work backwards to start of year
            while (tempDate >= yearStart) {
              if (tempDate >= yearStart && (!unifiedItem.endDate || tempDate <= startOfDay(new Date(unifiedItem.endDate)))) {
                allOccurrences.push(new Date(tempDate));
              }
              tempDate = addWeeks(tempDate, -2);
            }
            
            // Work forwards to end of year
            tempDate = addWeeks(referenceDate, 2);
            while (tempDate <= yearEnd) {
              if (!unifiedItem.endDate || tempDate <= startOfDay(new Date(unifiedItem.endDate))) {
                allOccurrences.push(new Date(tempDate));
              }
              tempDate = addWeeks(tempDate, 2);
            }
          } else if (unifiedItem.frequency === 'monthly') {
            let tempDate = new Date(referenceDate);
            
            // Work backwards to start of year
            while (tempDate >= yearStart) {
              if (tempDate >= yearStart && (!unifiedItem.endDate || tempDate <= startOfDay(new Date(unifiedItem.endDate)))) {
                allOccurrences.push(new Date(tempDate));
              }
              tempDate = addMonths(tempDate, -1);
            }
            
            // Work forwards to end of year
            tempDate = addMonths(referenceDate, 1);
            while (tempDate <= yearEnd) {
              if (!unifiedItem.endDate || tempDate <= startOfDay(new Date(unifiedItem.endDate))) {
                allOccurrences.push(new Date(tempDate));
              }
              tempDate = addMonths(tempDate, 1);
            }
          } else if (unifiedItem.frequency === 'quarterly') {
            let tempDate = new Date(referenceDate);
            
            // Work backwards to start of year
            while (tempDate >= yearStart) {
              if (tempDate >= yearStart && (!unifiedItem.endDate || tempDate <= startOfDay(new Date(unifiedItem.endDate)))) {
                allOccurrences.push(new Date(tempDate));
              }
              tempDate = addQuarters(tempDate, -1);
            }
            
            // Work forwards to end of year
            tempDate = addQuarters(referenceDate, 1);
            while (tempDate <= yearEnd) {
              if (!unifiedItem.endDate || tempDate <= startOfDay(new Date(unifiedItem.endDate))) {
                allOccurrences.push(new Date(tempDate));
              }
              tempDate = addQuarters(tempDate, 1);
            }
          } else if (unifiedItem.frequency === 'yearly') {
            // For yearly, just use the reference date if it's in this year
            if (referenceDate >= yearStart && referenceDate <= yearEnd) {
              if (!unifiedItem.endDate || referenceDate <= startOfDay(new Date(unifiedItem.endDate))) {
                allOccurrences.push(referenceDate);
              }
            }
          }
        }
        
        // Filter occurrences to current month and add to calendar
        allOccurrences.forEach(occurrenceDate => {
          if (isSameMonth(occurrenceDate, month)) {
            addOccurrenceToDay(occurrenceDate, {
              id: `${unifiedItem.id}-${format(occurrenceDate, 'yyyy-MM-dd')}`,
              name: unifiedItem.name,
              amount: unifiedItem.amount,
              type: unifiedItem.itemDisplayType,
              source: unifiedItem.source
            });
          }
        });
      }
    });

    return dayMap;
  }, [items, month]);

  const CustomDayContent = ({ date, displayMonth }: DayContentProps) => {
    const dayOfMonth = format(date, "d");
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayData = monthlyOccurrences.get(dateKey);
    const isToday = isSameDay(date, new Date());
    
    if (!dayData || dayData.items.length === 0) {
      return (
        <div className="h-32 w-full flex flex-col p-2">
          <span className={cn(
            "text-sm font-medium self-start",
            isToday && "bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold text-xs"
          )}>{dayOfMonth}</span>
        </div>
      );
    }
    
    return (
      <div className="h-32 w-full flex flex-col p-2">
        <span className={cn(
          "text-sm font-medium self-start mb-1 flex-shrink-0",
          isToday && "bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold text-xs"
        )}>{dayOfMonth}</span>
        
        <div className="flex-1 min-h-0 space-y-1 overflow-hidden">
          {dayData.items.slice(0, 2).map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center space-x-1 text-[11px] leading-tight truncate font-medium px-1 py-0.5 rounded border",
                getItemTextColor(item.type),
                getItemBackgroundColor(item.type)
              )}
            >
              <div className="flex-shrink-0">
                {getItemIcon(item.type)}
              </div>
              <span className="truncate flex-1 text-[11px]">{item.name}</span>
            </div>
          ))}
          
          {dayData.items.length > 2 && (
            <div className="text-[11px] text-muted-foreground leading-tight font-medium px-1">
              +{dayData.items.length - 2} more
            </div>
          )}
        </div>
        
        <div className="flex-shrink-0 mt-1 pt-1 border-t border-muted/20">
          <div className={cn(
            "text-[11px] font-bold leading-tight truncate",
            dayData.netAmount >= 0 ? "text-green-600" : "text-red-600"
          )}>
            ${Math.abs(dayData.netAmount).toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>
    );
  };

  // Custom caption component for consolidated month selector
  const CustomCaption = ({ displayMonth }: CaptionProps) => {
    const goToPreviousMonth = () => {
      const newMonth = addMonths(displayMonth, -1);
      setMonth(newMonth);
    };

    const goToNextMonth = () => {
      const newMonth = addMonths(displayMonth, 1);
      setMonth(newMonth);
    };

    return (
      <div className="flex items-center justify-center gap-1 py-2">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousMonth}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-xl font-semibold px-4 min-w-[200px] text-center">
          {format(displayMonth, 'MMMM yyyy')}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextMonth}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <Card className="shadow-lg mt-4">
      <CardContent className="flex justify-center p-2 sm:p-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          month={month}
          onMonthChange={setMonth}
          components={{ DayContent: CustomDayContent, Caption: CustomCaption }}
          className="p-0 rounded-md border w-full" 
          classNames={{
              day_selected: "bg-primary/20 text-primary-foreground ring-1 ring-primary",
              day_today: "",
              head_cell: "w-[14.28%] text-muted-foreground font-semibold text-sm pb-2 text-center table-cell",
              head_row: "table-row",
              table: "w-full border-collapse table-fixed",
              row: "table-row border-t", 
              cell: cn( 
                "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 table-cell align-top",
                "[&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                "border-l w-[14.28%]" 
              ),
              day: cn( 
                "h-32 w-full rounded-none p-0 font-normal aria-selected:opacity-100 transition-colors hover:bg-accent/50",
                "focus:bg-accent/70 focus:outline-none block"
              ),
              day_outside: "text-muted-foreground/50 aria-selected:bg-accent/30",
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
              month: "space-y-2 w-full",
          }}
          showOutsideDays={true}
          formatters={{
            formatWeekdayName: (date) => {
              return format(date, 'EEE'); // This will show Sun, Mon, Tue, Wed, Thu, Fri, Sat
            }
          }}
        />
      </CardContent>
    </Card>
  );
} 