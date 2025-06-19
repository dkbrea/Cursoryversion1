import { 
  addDays, addWeeks, addMonths, addQuarters, addYears, 
  isSameDay, setDate, startOfDay, isAfter, isBefore, format, endOfMonth, getDate, isSameMonth
} from "date-fns";
import { adjustToPreviousBusinessDay } from './date-calculations';
import type { UnifiedRecurringListItem, RecurringItem, DebtAccount } from '@/types';

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

/**
 * Calculate all occurrences for a recurring item within a date range
 * Uses the EXACT same logic as the calendar view for consistency
 */
export function calculateRecurringOccurrences(
  item: UnifiedRecurringListItem,
  startDate: Date,
  endDate: Date
): Date[] {
  const allOccurrences: Date[] = [];
  
  if (item.status === "Ended") return allOccurrences;

  // Handle semi-monthly frequency (special case)
  if (item.frequency === 'semi-monthly') {
    if (item.semiMonthlyFirstPayDate && item.semiMonthlySecondPayDate) {
      const firstPayDay = getDate(new Date(item.semiMonthlyFirstPayDate));
      const secondPayDay = getDate(new Date(item.semiMonthlySecondPayDate));
      
      // Generate semi-monthly occurrences for the date range
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();
      
      for (let year = startYear; year <= endYear; year++) {
        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
          const currentMonthStart = new Date(year, monthIndex, 1);
          const currentMonthEnd = endOfMonth(currentMonthStart);
          
          // First payment of the month
          const firstPayDate = new Date(currentMonthStart);
          firstPayDate.setDate(Math.min(firstPayDay, getDate(currentMonthEnd)));
          
          // Second payment of the month
          const secondPayDate = new Date(currentMonthStart);
          secondPayDate.setDate(Math.min(secondPayDay, getDate(currentMonthEnd)));
          
          // Apply business day adjustment for income items
          const adjustedFirstPayDate = item.itemDisplayType === 'income' 
            ? adjustToPreviousBusinessDay(firstPayDate) 
            : firstPayDate;
          const adjustedSecondPayDate = item.itemDisplayType === 'income' 
            ? adjustToPreviousBusinessDay(secondPayDate) 
            : secondPayDate;
          
          // Add if within date range and not ended
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
    return allOccurrences;
  }

  // Determine original start date (EXACT same logic as calendar)
  let originalStartDate: Date = new Date();
  
  if (item.itemDisplayType === 'subscription' && item.lastRenewalDate) {
    originalStartDate = startOfDay(new Date(item.lastRenewalDate));
    // For subscriptions, first payment is after last renewal
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
    const nextDate = new Date(item.nextOccurrenceDate);
    // For income items, we need to reverse the business day adjustment
    if (item.itemDisplayType === 'income') {
      // Find the original date by checking if current date is a business day adjustment
      let foundOriginal = false;
      let testDate = new Date(nextDate);
      // Check a few days forward to find the original date
      for (let i = 0; i <= 4; i++) {
        const candidateDate = addDays(testDate, i);
        if (adjustToPreviousBusinessDay(candidateDate).getTime() === nextDate.getTime()) {
          originalStartDate = candidateDate;
          foundOriginal = true;
          break;
        }
      }
      if (!foundOriginal) {
        originalStartDate = nextDate; // fallback
      }
    } else {
      originalStartDate = nextDate;
    }
  }

  // Calculate all occurrences based on frequency (EXACT same logic as calendar)
  if (item.frequency === 'daily') {
    let tempDate = new Date(originalStartDate);
    
    // Work backwards to start date
    while (tempDate >= startDate) {
      if (tempDate >= startDate && (!item.endDate || tempDate <= startOfDay(new Date(item.endDate)))) {
        allOccurrences.push(new Date(tempDate));
      }
      tempDate = addDays(tempDate, -1);
    }
    
    // Work forwards to end date
    tempDate = addDays(originalStartDate, 1);
    while (tempDate <= endDate) {
      if (!item.endDate || tempDate <= startOfDay(new Date(item.endDate))) {
        allOccurrences.push(new Date(tempDate));
      }
      tempDate = addDays(tempDate, 1);
    }
  } else if (item.frequency === 'weekly') {
    let tempDate = new Date(originalStartDate);
    
    // Work backwards to start date
    while (tempDate >= startDate) {
      if (tempDate >= startDate && (!item.endDate || tempDate <= startOfDay(new Date(item.endDate)))) {
        allOccurrences.push(new Date(tempDate));
      }
      tempDate = addWeeks(tempDate, -1);
    }
    
    // Work forwards to end date
    tempDate = addWeeks(originalStartDate, 1);
    while (tempDate <= endDate) {
      if (!item.endDate || tempDate <= startOfDay(new Date(item.endDate))) {
        allOccurrences.push(new Date(tempDate));
      }
      tempDate = addWeeks(tempDate, 1);
    }
  } else if (item.frequency === 'bi-weekly') {
    let tempDate = new Date(originalStartDate);
    
    // Work backwards to start date
    while (tempDate >= startDate) {
      if (tempDate >= startDate && (!item.endDate || tempDate <= startOfDay(new Date(item.endDate)))) {
        allOccurrences.push(new Date(tempDate));
      }
      tempDate = addWeeks(tempDate, -2);
    }
    
    // Work forwards to end date
    tempDate = addWeeks(originalStartDate, 2);
    while (tempDate <= endDate) {
      if (!item.endDate || tempDate <= startOfDay(new Date(item.endDate))) {
        allOccurrences.push(new Date(tempDate));
      }
      tempDate = addWeeks(tempDate, 2);
    }
  } else if (item.frequency === 'monthly') {
    let tempDate = new Date(originalStartDate);
    
    // Work backwards to start date
    while (tempDate >= startDate) {
      if (tempDate >= startDate && (!item.endDate || tempDate <= startOfDay(new Date(item.endDate)))) {
        allOccurrences.push(new Date(tempDate));
      }
      tempDate = addMonths(tempDate, -1);
    }
    
    // Work forwards to end date
    tempDate = addMonths(originalStartDate, 1);
    while (tempDate <= endDate) {
      if (!item.endDate || tempDate <= startOfDay(new Date(item.endDate))) {
        allOccurrences.push(new Date(tempDate));
      }
      tempDate = addMonths(tempDate, 1);
    }
  } else if (item.frequency === 'quarterly') {
    let tempDate = new Date(originalStartDate);
    
    // Work backwards to start date
    while (tempDate >= startDate) {
      if (tempDate >= startDate && (!item.endDate || tempDate <= startOfDay(new Date(item.endDate)))) {
        allOccurrences.push(new Date(tempDate));
      }
      tempDate = addQuarters(tempDate, -1);
    }
    
    // Work forwards to end date
    tempDate = addQuarters(originalStartDate, 1);
    while (tempDate <= endDate) {
      if (!item.endDate || tempDate <= startOfDay(new Date(item.endDate))) {
        allOccurrences.push(new Date(tempDate));
      }
      tempDate = addQuarters(tempDate, 1);
    }
  } else if (item.frequency === 'yearly') {
    // For yearly, just use the original start date if it's in range
    if (originalStartDate >= startDate && originalStartDate <= endDate) {
      if (!item.endDate || originalStartDate <= startOfDay(new Date(item.endDate))) {
        allOccurrences.push(originalStartDate);
      }
    }
  }

  // Apply business day adjustment for income items AFTER calculating raw occurrences
  return allOccurrences.map(occurrenceDate => {
    return item.itemDisplayType === 'income' 
      ? adjustToPreviousBusinessDay(occurrenceDate) 
      : occurrenceDate;
  });
}

/**
 * Calculate debt payment occurrences using the same logic as calendar
 */
export function calculateDebtOccurrences(
  item: UnifiedRecurringListItem,
  startDate: Date,
  endDate: Date
): Date[] {
  const allOccurrences: Date[] = [];
  
  // Start with next occurrence date as reference point (same as calendar)
  const referenceDate = new Date(item.nextOccurrenceDate);
  
  if (item.frequency === 'weekly') {
    let tempDate = new Date(referenceDate);
    
    // Work backwards to find earlier dates in the range
    while (tempDate >= startDate) {
      if (tempDate >= startDate && tempDate <= endDate) {
        allOccurrences.push(new Date(tempDate));
      }
      tempDate = addWeeks(tempDate, -1);
    }
    
    // Work forwards to find later dates in the range
    tempDate = addWeeks(referenceDate, 1);
    while (tempDate <= endDate) {
      allOccurrences.push(new Date(tempDate));
      tempDate = addWeeks(tempDate, 1);
    }
  } else if (item.frequency === 'bi-weekly') {
    let tempDate = new Date(referenceDate);
    
    // Work backwards to find earlier dates in the range
    while (tempDate >= startDate) {
      if (tempDate >= startDate && tempDate <= endDate) {
        allOccurrences.push(new Date(tempDate));
      }
      tempDate = addWeeks(tempDate, -2);
    }
    
    // Work forwards to find later dates in the range
    tempDate = addWeeks(referenceDate, 2);
    while (tempDate <= endDate) {
      allOccurrences.push(new Date(tempDate));
      tempDate = addWeeks(tempDate, 2);
    }
  } else if (item.frequency === 'monthly') {
    let tempDate = new Date(referenceDate);
    
    // Work backwards to find earlier dates in the range
    while (tempDate >= startDate) {
      if (tempDate >= startDate && tempDate <= endDate) {
        allOccurrences.push(new Date(tempDate));
      }
      tempDate = addMonths(tempDate, -1);
    }
    
    // Work forwards to find later dates in the range
    tempDate = addMonths(referenceDate, 1);
    while (tempDate <= endDate) {
      allOccurrences.push(new Date(tempDate));
      tempDate = addMonths(tempDate, 1);
    }
  } else if (item.frequency === 'annually') {
    // For yearly debt payments, just use reference date if in range
    if (referenceDate >= startDate && referenceDate <= endDate) {
      allOccurrences.push(referenceDate);
    }
  } else {
    // For 'other' frequency, use reference date if in range
    if (referenceDate >= startDate && referenceDate <= endDate) {
      allOccurrences.push(referenceDate);
    }
  }

  return allOccurrences;
} 