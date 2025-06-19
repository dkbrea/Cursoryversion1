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
}

const getItemIcon = (itemType: UnifiedRecurringListItem['itemDisplayType']) => {
  switch (itemType) {
    case 'income':
      return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
    case 'subscription':
      return <CreditCard className="h-4 w-4 text-blue-500" />;
    case 'fixed-expense':
      return <Briefcase className="h-4 w-4 text-purple-500" />;
    case 'debt-payment':
      return <ArrowDownCircle className="h-4 w-4 text-red-500" />;
    default:
      return <DollarSign className="h-4 w-4 text-gray-500" />;
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

export function UpcomingExpensesCard({ items, completedItems, userPreferences }: UpcomingExpensesCardProps) {
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
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle>Upcoming Expenses</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center py-4">
            <p className="text-muted-foreground text-sm">No upcoming payments found.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full w-full flex flex-col shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle>Upcoming Expenses</CardTitle>
            {items.length > 0 && (
              <p className="text-sm text-muted-foreground">You have {items.filter(i => i.status !== 'Ended').length} upcoming payments</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-3 flex-1">
          {displayItems.map((item) => (
            <div key={item.occurrenceId} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getItemColor(item.itemDisplayType)}`} />
                  <span className="text-sm font-medium truncate">{item.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {item.isToday && (
                    <Badge variant="default" className="bg-blue-500 text-white text-xs">
                      Today
                    </Badge>
                  )}
                  {item.isPastDue && (
                    <Badge variant="destructive" className="text-xs">
                      Overdue
                    </Badge>
                  )}
                  <span className="text-sm font-semibold">${item.amount.toFixed(0)}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  {getItemIcon(item.itemDisplayType)}
                  <span>{formatDisplayType(item.itemDisplayType)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span className={item.isToday ? "text-blue-600 font-medium" : item.isPastDue ? "text-red-500" : ""}>
                    {format(item.nextOccurrenceDate, "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {combinedItems.length > 5 && (
          <div className="text-center pt-2 mt-auto">
            <p className="text-xs text-muted-foreground">
              Showing 5 of {combinedItems.length} upcoming payments
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 