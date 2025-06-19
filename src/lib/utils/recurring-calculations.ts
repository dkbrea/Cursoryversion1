import type { RecurringItem, DebtAccount, UnifiedRecurringListItem } from "@/types";
import { 
  addDays, addWeeks, addMonths, addQuarters, addYears, 
  isSameDay, setDate, startOfDay, isAfter, isBefore, format
} from "date-fns";
import { adjustToPreviousBusinessDay } from './date-calculations';
import { calculateRecurringOccurrences, calculateDebtOccurrences } from '@/lib/api/recurring-completions';

// This function generates a unique ID for a specific occurrence of a recurring item.
export const generateOccurrenceId = (itemId: string, date: Date): string => {
  return `${itemId}-${format(date, 'yyyy-MM-dd')}`;
};

// Generates all possible occurrence dates for a given item within a date range
const generateOccurrences = (item: UnifiedRecurringListItem, startDate: Date, endDate: Date): Date[] => {
  const occurrences: Date[] = [];
  let currentDate = startOfDay(new Date(item.startDate || new Date()));

  if (item.source === 'debt') {
    // Basic debt occurrence logic, can be expanded
    const paymentDay = (item as any).paymentDayOfMonth || 1;
    currentDate = setDate(new Date(), paymentDay);
    if(currentDate < new Date()) {
      currentDate = addMonths(currentDate, 1);
    }
  }

  while (currentDate <= endDate) {
    if (currentDate >= startDate) {
      occurrences.push(new Date(currentDate));
    }

    switch (item.frequency) {
      case "daily": currentDate = addDays(currentDate, 1); break;
      case "weekly": currentDate = addWeeks(currentDate, 1); break;
      case "bi-weekly": currentDate = addWeeks(currentDate, 2); break;
      case "monthly": currentDate = addMonths(currentDate, 1); break;
      case "quarterly": currentDate = addQuarters(currentDate, 1); break;
      case "yearly": currentDate = addYears(currentDate, 1); break;
      // Semi-monthly needs special handling based on its own dates,
      // this is a simplified example.
      default:
        // Move to next month to avoid infinite loop for unhandled frequencies
        currentDate = addMonths(currentDate, 1);
        break;
    }
  }

  return occurrences;
};


export const processUpcomingItems = (
  items: UnifiedRecurringListItem[],
  completedItems: Set<string>,
  rangeInDays: number = 90 // How far out to look for upcoming items
): UnifiedRecurringListItem[] => {
  const today = startOfDay(new Date());
  const endDate = addDays(today, rangeInDays);
  const openOccurrences: UnifiedRecurringListItem[] = [];

  items.forEach(item => {
    // Determine the start date for generating occurrences.
    // Go back a few months to find past-due items.
    const lookbackDate = addMonths(today, -3);

    let allPossibleOccurrences: Date[];

    if (item.source === 'debt') {
      // The item is a debt account, so we can cast it
      allPossibleOccurrences = calculateDebtOccurrences(item as any, lookbackDate, endDate);
    } else {
      // The item is a recurring item
      allPossibleOccurrences = calculateRecurringOccurrences(item, lookbackDate, endDate);
    }
      
    const unpaidOccurrences = allPossibleOccurrences
      .map(occDate => ({
        ...item,
        nextOccurrenceDate: occDate,
        occurrenceId: generateOccurrenceId(item.id, occDate)
      }))
      .filter(occ => !completedItems.has(occ.occurrenceId));
      
    if (unpaidOccurrences.length > 0) {
      // Find the most relevant occurrence.
      // This is either the first one after today, or the last one before today (if any).
      const futureOccurrences = unpaidOccurrences.filter(o => !isBefore(o.nextOccurrenceDate, today));
      const pastOccurrences = unpaidOccurrences.filter(o => isBefore(o.nextOccurrenceDate, today));

      if (pastOccurrences.length > 0) {
        // If there are past due items, the most relevant is the OLDEST one (most overdue)
        openOccurrences.push(pastOccurrences[0]); 
      } else if (futureOccurrences.length > 0) {
        // If no past due items, show the soonest upcoming one
        openOccurrences.push(futureOccurrences[0]);
      }
    }
  });

  return openOccurrences;
}; 