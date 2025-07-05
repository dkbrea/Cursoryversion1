"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Clock, CreditCard, Briefcase, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import type { UnifiedRecurringListItem } from "@/types";
import { format, isToday, isPast, startOfDay } from "date-fns";
import { getYearlyOccurrences } from "@/lib/utils/occurrence-generator";
import { generateOccurrenceId } from "@/lib/utils/recurring-calculations";
import type { UserPreferences } from "@/lib/api/user-preferences";

interface UpcomingExpensesCardProps {
  items: UnifiedRecurringListItem[];
  completedItems: Set<string>;
  userPreferences: UserPreferences | null;
  isMobile?: boolean;
}

const getItemIcon = (itemType: UnifiedRecurringListItem['itemDisplayType'], isMobile = false) => {
  const iconClass = isMobile ? 'h-4 w-4' : 'h-4 w-4';
  switch (itemType) {
    case 'income':
      return <ArrowUpCircle className={`${iconClass} text-green-500`} />;
    case 'subscription':
      return <CreditCard className={`${iconClass} text-blue-500`} />;
    case 'fixed-expense':
      return <Briefcase className={`${iconClass} text-purple-500`} />;
    case 'debt-payment':
      return <ArrowDownCircle className={`${iconClass} text-red-500`} />;
    default:
      return <DollarSign className={`${iconClass} text-gray-500`} />;
  }
};

const getItemColor = (itemType: UnifiedRecurringListItem['itemDisplayType']) => {
  switch (itemType) {
    case 'income':
      return 'bg-green-500';
    case 'subscription':
      return 'bg-blue-500';
    case 'fixed-expense':
      return 'bg-purple-500';
    case 'debt-payment':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

const formatDisplayType = (type: UnifiedRecurringListItem['itemDisplayType']) => {
  switch (type) {
    case 'income': return 'Income';
    case 'subscription': return 'Subscription';
    case 'fixed-expense': return 'Fixed Expense';
    case 'debt-payment': return 'Debt Payment';
    default: return String(type).replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }
};

export function UpcomingExpensesCard({ items, completedItems, userPreferences, isMobile = false }: UpcomingExpensesCardProps) {
  const today = startOfDay(new Date());

  // 1. Generate individual occurrences including past due ones
  // Use occurrence generator to get all individual occurrences, not just next occurrence dates
  const allOccurrences = getYearlyOccurrences(items, new Date(), userPreferences?.financialTrackingStartDate);

  // 2. Filter out completed items and items that are too far in the future
  const unpaidOccurrences = allOccurrences
    .map(item => ({
      ...item,
      occurrenceId: generateOccurrenceId(item.id, item.nextOccurrenceDate)
    }))
    .filter(item => !completedItems.has(item.occurrenceId));

  // 3. Filter to only current and future items (past due items are shown in separate Past Due card)
  const upcomingItems = unpaidOccurrences
    .filter(item => !isPast(item.nextOccurrenceDate) || isToday(item.nextOccurrenceDate))
    .sort((a, b) => a.nextOccurrenceDate.getTime() - b.nextOccurrenceDate.getTime()); // Soonest first

  // 4. Take first 5 items for display
  const combinedItems = upcomingItems;
  const displayItems = combinedItems.slice(0, 5).map(item => ({
    ...item,
    isToday: isToday(item.nextOccurrenceDate),
    isPastDue: isPast(item.nextOccurrenceDate) && !isToday(item.nextOccurrenceDate),
  }));

  if (displayItems.length === 0) {
    return (
      <Card className="h-full w-full flex flex-col shadow-lg">
        <CardHeader className={isMobile ? 'pb-2' : 'pb-1'}>
          <div className="flex items-start justify-between">
            <div className="space-y-0">
              <CardTitle className={isMobile ? 'text-base' : 'text-lg'}>Upcoming Expenses</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className={`flex-1 flex items-center justify-center ${isMobile ? 'pt-2 pb-3' : 'pt-1 pb-2'}`}>
          <div className="text-center py-2">
            <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-xs'}`}>No upcoming payments found.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full w-full flex flex-col shadow-lg">
      <CardHeader className={isMobile ? 'pb-2' : 'pb-1'}>
        <div className="flex items-start justify-between">
          <div className="space-y-0">
            <CardTitle className={isMobile ? 'text-base' : 'text-lg'}>Upcoming Expenses</CardTitle>
            {items.length > 0 && (
              <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-muted-foreground`}>You have {items.filter(i => i.status !== 'Ended').length} upcoming payments</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={`flex-1 flex flex-col ${isMobile ? 'pt-2 pb-3' : 'pt-1 pb-2'}`}>
        <div className={`${isMobile ? 'space-y-3' : 'space-y-1'} flex-1`}>
          {displayItems.slice(0, isMobile ? 4 : 5).map((item) => (
            <div key={item.occurrenceId} className={isMobile ? 'space-y-1' : 'space-y-0'}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`${isMobile ? 'w-2 h-2' : 'w-1.5 h-1.5'} rounded-full ${getItemColor(item.itemDisplayType)}`} />
                  <span className={`${isMobile ? 'text-sm' : 'text-xs'} font-medium truncate`}>{item.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {item.isToday && (
                    <Badge variant="default" className={`bg-blue-500 text-white ${isMobile ? 'text-xs py-1 px-2 h-auto' : 'text-xs py-0 px-1 h-4'}`}>
                      Today
                    </Badge>
                  )}
                  {item.isPastDue && (
                    <Badge variant="destructive" className={`${isMobile ? 'text-xs py-1 px-2 h-auto' : 'text-xs py-0 px-1 h-4'}`}>
                      Overdue
                    </Badge>
                  )}
                  <span className={`${isMobile ? 'text-sm' : 'text-xs'} font-semibold`}>${item.amount.toFixed(0)}</span>
                </div>
              </div>
              
              <div className={`flex ${isMobile ? 'flex-col space-y-1' : 'items-center justify-between'} ${isMobile ? 'text-sm' : 'text-xs'} text-muted-foreground`}>
                <div className="flex items-center space-x-1">
                  {getItemIcon(item.itemDisplayType, isMobile)}
                  <span className={isMobile ? 'text-sm' : 'text-xs'}>{formatDisplayType(item.itemDisplayType)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'}`} />
                  <span className={`${isMobile ? 'text-sm' : 'text-xs'} ${item.isToday ? "text-blue-600 font-medium" : item.isPastDue ? "text-red-500" : ""}`}>
                    {format(item.nextOccurrenceDate, "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {combinedItems.length > (isMobile ? 4 : 5) && (
          <div className="text-center pt-0.5 mt-auto">
            <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-muted-foreground`}>
              Showing {isMobile ? 4 : 5} of {combinedItems.length} upcoming payments
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 