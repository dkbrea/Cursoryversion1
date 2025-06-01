"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Clock, CreditCard, Briefcase, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import type { UnifiedRecurringListItem } from "@/types";
import { format, isToday, isPast } from "date-fns";

interface UpcomingExpensesCardProps {
  items: UnifiedRecurringListItem[];
}

const getItemIcon = (itemType: UnifiedRecurringListItem['itemDisplayType']) => {
  switch (itemType) {
    case 'income':
      return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
    case 'subscription':
      return <CreditCard className="h-4 w-4 text-blue-600" />;
    case 'fixed-expense':
      return <Briefcase className="h-4 w-4 text-orange-600" />;
    case 'debt-payment':
      return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
    default:
      return <DollarSign className="h-4 w-4 text-gray-600" />;
  }
};

const getItemColor = (itemType: UnifiedRecurringListItem['itemDisplayType']) => {
  switch (itemType) {
    case 'income':
      return 'bg-green-500';
    case 'subscription':
      return 'bg-blue-500';
    case 'fixed-expense':
      return 'bg-orange-500';
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

export function UpcomingExpensesCard({ items }: UpcomingExpensesCardProps) {
  // Show only the next 5 upcoming items
  const upcomingItems = items
    .filter(item => item.status !== 'Ended')
    .slice(0, 5)
    .map(item => ({
      ...item,
      isToday: isToday(item.nextOccurrenceDate),
      isPastDue: isPast(item.nextOccurrenceDate) && !isToday(item.nextOccurrenceDate)
    }));

  if (upcomingItems.length === 0) {
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
          {upcomingItems.map((item) => (
            <div key={item.id + item.source} className="space-y-2">
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
        
        {items.filter(i => i.status !== 'Ended').length > 5 && (
          <div className="text-center pt-2 mt-auto">
            <p className="text-xs text-muted-foreground">
              Showing 5 of {items.filter(i => i.status !== 'Ended').length} upcoming payments
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 