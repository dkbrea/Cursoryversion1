"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Clock, CreditCard, Briefcase, ArrowDownCircle, ArrowUpCircle, AlertTriangle } from "lucide-react";
import type { UnifiedRecurringListItem } from "@/types";
import { format, isToday, isPast, startOfDay, differenceInDays, addDays, addWeeks, addMonths, addQuarters, addYears } from "date-fns";

import { generateOccurrenceId, calculateRecurringOccurrences, calculateDebtOccurrences } from "@/lib/utils/recurring-calculations";
import { adjustToPreviousBusinessDay } from "@/lib/utils/date-calculations";
import type { UserPreferences } from "@/lib/api/user-preferences";

interface PastDueItemsCardProps {
  items: UnifiedRecurringListItem[];
  completedItems: Set<string>;
  userPreferences: UserPreferences | null;
  onItemClick?: (item: UnifiedRecurringListItem, date: Date) => void;
  isMobile?: boolean;
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

export function PastDueItemsCard({ items, completedItems, userPreferences, onItemClick, isMobile = false }: PastDueItemsCardProps) {
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
    
    // Skip placeholder recurring items created for debt accounts
    if (item.source === 'recurring' && item.name.startsWith('Debt Payment Placeholder -')) {
      console.log(`Skipping placeholder item: ${item.name}`);
      return;
    }
    
    // Use the EXACT same calculation functions as the calendar for perfect consistency
    let occurrenceDates: Date[] = [];
    
    if (item.source === 'debt') {
      // For debt items, use the shared debt calculation function
      occurrenceDates = calculateDebtOccurrences(item, trackingStartDate, today);
    } else {
      // For recurring items, use the shared recurring calculation function
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
  let pastDueItems = allOccurrences
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
  
  // Get total count before slicing for mobile counter
  const totalPastDueCount = allOccurrences
    .map(item => ({
      ...item,
      occurrenceId: generateOccurrenceId(item.id, item.nextOccurrenceDate),
      daysOverdue: differenceInDays(today, item.nextOccurrenceDate)
    }))
    .filter(item => {
      const isPastDue = isPast(item.nextOccurrenceDate) && !isToday(item.nextOccurrenceDate);
      const isNotCompleted = !completedItems.has(item.occurrenceId);
      return isPastDue && isNotCompleted;
    }).length;
    
  pastDueItems = pastDueItems.slice(0, isMobile ? 3 : 10); // Limit to top 3 on mobile, 10 on desktop

  // Debug: Log the final past due items (reduced logging)
  console.log('PastDueItemsCard - Final past due items:', pastDueItems.length);
  console.log('PastDueItemsCard - DEBUGGING IS ACTIVE - Processing items now');
  
  // Debug: Specifically log debt items and their occurrence IDs
  const debtItems = pastDueItems.filter(item => item.source === 'debt');
  if (debtItems.length > 0) {
    console.log('🔴🔴🔴 DEBT ITEMS REAPPEARING 🔴🔴🔴');
    console.log('🔴 Count:', debtItems.length);
    console.log('🔴 CompletedItems Set Size:', completedItems.size);
    console.log('🔴 All CompletedItems IDs:', Array.from(completedItems));
    debtItems.forEach(item => {
      console.log(`🔴 ${item.name} - Date: ${item.nextOccurrenceDate.toISOString().split('T')[0]} - ID: ${item.occurrenceId} - In Completed Set: ${completedItems.has(item.occurrenceId)}`);
    });
    console.log('🔴🔴🔴 END DEBT ITEMS 🔴🔴🔴');
  } else {
    console.log('✅ No debt items in past due list');
  }
  
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
    <Card className={`h-full w-full flex flex-col shadow-lg border-l-4 border-l-red-500 bg-red-50/30 ${isMobile ? 'max-w-full overflow-hidden' : ''}`}>
      <CardHeader className={isMobile ? 'pb-3' : ''}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className={`flex items-center gap-2 text-red-700 ${isMobile ? 'text-base' : ''}`}>
              <AlertTriangle className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              Past Due Items
            </CardTitle>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-red-600`}>
              {pastDueItems.length} overdue payment{pastDueItems.length !== 1 ? 's' : ''} • ${totalPastDue.toFixed(0)} total
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className={`${isMobile ? 'space-y-2' : 'space-y-3'} flex-1`}>
          {pastDueItems.map((item) => {
            const severity = getSeverityBadge(item.daysOverdue);
            
            return (
              <div 
                key={item.occurrenceId} 
                className={`${isMobile ? 'p-2' : 'space-y-2 p-3'} rounded-lg bg-white border border-red-200 hover:bg-red-50 cursor-pointer transition-colors`}
                onClick={() => {
                  console.log('🔴 PastDueItem clicked:', {
                    itemId: item.id,
                    itemName: item.name,
                    itemSource: item.source,
                    itemDisplayType: item.itemDisplayType,
                    nextOccurrenceDate: item.nextOccurrenceDate.toISOString().split('T')[0],
                    occurrenceId: item.occurrenceId,
                    amount: item.amount,
                    daysOverdue: item.daysOverdue
                  });
                  onItemClick?.(item, item.nextOccurrenceDate);
                }}
              >
                {isMobile ? (
                  // Compact Mobile Layout - Single Row
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getItemColor(item.itemDisplayType)}`} />
                      <span className="text-xs font-medium truncate">{item.name}</span>
                      <Badge variant={severity.variant} className="text-xs flex-shrink-0">
                        {severity.label}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <span className="text-xs font-semibold text-red-600">${item.amount.toFixed(0)}</span>
                      <span className="text-xs text-red-500">({item.daysOverdue}d)</span>
                    </div>
                  </div>
                ) : (
                  // Desktop Layout
                  <>
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
                  </>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Show remaining items count */}
        {isMobile && totalPastDueCount > 3 && (
          <div className="text-center pt-2 mt-auto">
            <p className="text-xs text-red-600">
              +{totalPastDueCount - 3} more overdue items
            </p>
          </div>
        )}
        {!isMobile && pastDueItems.length >= 10 && (
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