"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Clock, CreditCard, Briefcase, ArrowDownCircle, ArrowUpCircle, AlertTriangle } from "lucide-react";
import type { UnifiedRecurringListItem } from "@/types";
import { format, isToday, isPast, startOfDay, differenceInDays, addDays, addWeeks, addMonths, addQuarters, addYears } from "date-fns";

import { generateOccurrenceId } from "@/lib/utils/recurring-calculations";
import { adjustToPreviousBusinessDay } from "@/lib/utils/date-calculations";
import { calculateRecurringOccurrences, calculateDebtOccurrences } from '@/lib/api/recurring-completions';
import type { UserPreferences } from "@/lib/api/user-preferences";

interface PastDueItemsCardProps {
  items: UnifiedRecurringListItem[];
  completedItems: Set<string>;
  userPreferences: UserPreferences | null;
  onItemClick?: (item: UnifiedRecurringListItem, date: Date) => void;
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

const getSeverityBadge = (daysOverdue: number) => {
  if (daysOverdue >= 30) {
    return { variant: "destructive" as const, label: "Critical", color: "text-red-600" };
  } else if (daysOverdue >= 7) {
    return { variant: "destructive" as const, label: "Urgent", color: "text-red-600" };
  } else {
    return { variant: "destructive" as const, label: "Overdue", color: "text-red-600" };
  }
};

export function PastDueItemsCard({ items, completedItems, userPreferences, onItemClick }: PastDueItemsCardProps) {
  const today = startOfDay(new Date());

  // Generate all occurrences from tracking start date to today
  // This finds ALL missed payments within the tracking period
  const allOccurrences: UnifiedRecurringListItem[] = [];
  
  // Determine the tracking start date
  const trackingStartDate = userPreferences?.financialTrackingStartDate 
    ? startOfDay(new Date(userPreferences.financialTrackingStartDate))
    : (() => {
        const fallback = new Date();
        fallback.setMonth(fallback.getMonth() - 6); // Default to 6 months ago
        return startOfDay(fallback);
      })();
  
  items.filter(item => item.status !== 'Ended').forEach(item => {
    console.log(`Processing item: ${item.name}, type: ${item.itemDisplayType}`);
    
    // Use the same calculation method as the calendar
    let occurrenceDates: Date[];
    
    if (item.source === 'debt') {
      // For debt items, use debt-specific calculation
      occurrenceDates = calculateDebtOccurrences(item as any, trackingStartDate, today);
    } else {
      // For recurring items, use recurring-specific calculation
      occurrenceDates = calculateRecurringOccurrences(item, trackingStartDate, today);
    }
    
    console.log(`Found ${occurrenceDates.length} occurrences for ${item.name}:`, 
      occurrenceDates.map(d => d.toISOString().split('T')[0]));
    
    // Convert dates to past due items
    occurrenceDates.forEach(occurrenceDate => {
      // Only include past dates (not today or future)
      if (isPast(occurrenceDate) && !isToday(occurrenceDate)) {
        allOccurrences.push({
          ...item,
          nextOccurrenceDate: occurrenceDate
        });
      }
    });
   });
  
  // Debug: Log what we found (reduced logging)
  // console.log('PastDueItemsCard - Tracking period:', { trackingStartDate, today, totalOccurrencesFound: allOccurrences.length });

  // Filter to only past due items that haven't been completed
  const pastDueItems = allOccurrences
    .map(item => ({
      ...item,
      occurrenceId: generateOccurrenceId(item.id, item.nextOccurrenceDate),
      daysOverdue: differenceInDays(today, item.nextOccurrenceDate)
    }))
    .filter(item => {
      const isPastDue = isPast(item.nextOccurrenceDate) && !isToday(item.nextOccurrenceDate);
      const isNotCompleted = !completedItems.has(item.occurrenceId);
      
      // Reduced logging
      // if (!isPastDue) console.log(`  Filtered out ${item.name}: not past due`);
      // if (!isNotCompleted) console.log(`  Filtered out ${item.name}: marked as completed`);
      
      return isPastDue && isNotCompleted;
    })
    .sort((a, b) => {
      // Sort by severity (most overdue first), then by amount (highest first)
      const severityDiff = b.daysOverdue - a.daysOverdue;
      if (severityDiff !== 0) return severityDiff;
      return b.amount - a.amount;
    })
    .slice(0, 10); // Limit to top 10 most critical

  // Debug: Log the final past due items (reduced logging)
  console.log('PastDueItemsCard - Final past due items:', pastDueItems.length);
  console.log('PastDueItemsCard - DEBUGGING IS ACTIVE - Processing items now');
  
  // Debug: Specifically log income items and their occurrence IDs
  const incomeItems = pastDueItems.filter(item => item.itemDisplayType === 'income');
  if (incomeItems.length > 0) {
    console.log('PastDueItemsCard - Income items showing as past due:', incomeItems.map(item => ({
      name: item.name,
      date: item.nextOccurrenceDate.toISOString().split('T')[0],
      occurrenceId: item.occurrenceId,
      isInCompletedSet: completedItems.has(item.occurrenceId)
    })));
  }

  if (pastDueItems.length === 0) {
    return null; // Don't show the card if there are no past due items
  }

  const totalPastDue = pastDueItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card className="h-full w-full flex flex-col shadow-lg border-l-4 border-l-red-500 bg-red-50/30">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Past Due Items
            </CardTitle>
            <p className="text-sm text-red-600">
              {pastDueItems.length} overdue payment{pastDueItems.length !== 1 ? 's' : ''} • ${totalPastDue.toFixed(0)} total
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-3 flex-1">
          {pastDueItems.map((item) => {
            const severity = getSeverityBadge(item.daysOverdue);
            
            return (
              <div 
                key={item.occurrenceId} 
                className="space-y-2 p-3 rounded-lg bg-white border border-red-200 hover:bg-red-50 cursor-pointer transition-colors"
                onClick={() => onItemClick?.(item, item.nextOccurrenceDate)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getItemColor(item.itemDisplayType)}`} />
                    <span className="text-sm font-medium truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={severity.variant} className="text-xs">
                      {severity.label}
                    </Badge>
                    <span className="text-sm font-semibold text-red-600">${item.amount.toFixed(0)}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    {getItemIcon(item.itemDisplayType)}
                    <span>{formatDisplayType(item.itemDisplayType)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span className="text-red-500 font-medium">
                      {format(item.nextOccurrenceDate, "MMM d, yyyy")} ({item.daysOverdue} days ago)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {pastDueItems.length >= 10 && (
          <div className="text-center pt-2 mt-auto">
            <p className="text-xs text-muted-foreground">
              Showing top 10 most critical overdue items
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 