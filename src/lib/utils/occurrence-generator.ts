import type { UnifiedRecurringListItem } from "@/types";
import {
  startOfMonth,
  endOfMonth,
  format,
  getYear,
  isSameMonth,
  addWeeks,
  addMonths,
  addYears,
  setDate,
  getDate,
} from "date-fns";
import { adjustToPreviousBusinessDay } from "./date-calculations";

/**
 * Generates all possible occurrences for a given list of recurring items over a full year.
 * This logic is adapted directly from the RecurringCalendarView to ensure consistency.
 */
export const getYearlyOccurrences = (
  items: UnifiedRecurringListItem[],
  referenceMonth: Date = new Date(),
  trackingStartDate?: Date | string | null
): UnifiedRecurringListItem[] => {
  const currentYear = getYear(referenceMonth);
  // Use the later of the tracking start date or the beginning of the current year
  const yearStart = 
    trackingStartDate && new Date(trackingStartDate) > new Date(currentYear, 0, 1) 
    ? new Date(trackingStartDate) 
    : new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31);
  const allOccurrences: UnifiedRecurringListItem[] = [];

  items.forEach((item) => {
    if (item.status === "Ended") return;

    let dates: Date[] = [];

    if (item.frequency === 'semi-monthly') {
      if (item.semiMonthlyFirstPayDate && item.semiMonthlySecondPayDate) {
        const firstPayDay = getDate(new Date(item.semiMonthlyFirstPayDate));
        const secondPayDay = getDate(new Date(item.semiMonthlySecondPayDate));
        for (let i = 0; i < 12; i++) {
          const monthStart = new Date(currentYear, i, 1);
          const monthEnd = endOfMonth(monthStart);
          const d1 = setDate(monthStart, Math.min(firstPayDay, getDate(monthEnd)));
          const d2 = setDate(monthStart, Math.min(secondPayDay, getDate(monthEnd)));
          dates.push(d1, d2);
        }
      }
    } else {
      let currentDate = new Date(item.nextOccurrenceDate);
      // Go back to the start of the year or the item's start date
      while (currentDate > yearStart && currentDate > (item.startDate || yearStart)) {
          switch (item.frequency) {
              case 'weekly': currentDate = addWeeks(currentDate, -1); break;
              case 'bi-weekly': currentDate = addWeeks(currentDate, -2); break;
              case 'monthly': currentDate = addMonths(currentDate, -1); break;
              case 'annually': currentDate = addYears(currentDate, -1); break;
              default: break; // stop for other frequencies
          }
          if(item.frequency === 'other') break;
      }

      // Generate dates for the whole year
      while (currentDate <= yearEnd) {
        if (currentDate >= (item.startDate || yearStart)) {
          dates.push(new Date(currentDate));
        }
        switch (item.frequency) {
            case 'weekly': currentDate = addWeeks(currentDate, 1); break;
            case 'bi-weekly': currentDate = addWeeks(currentDate, 2); break;
            case 'monthly': currentDate = addMonths(currentDate, 1); break;
            case 'annually': currentDate = addYears(currentDate, 1); break;
            default: currentDate = addYears(currentDate, 100); break; // effectively stop
        }
      }
    }

    dates.forEach(occurrenceDate => {
      const finalDate = item.itemDisplayType === 'income'
        ? adjustToPreviousBusinessDay(occurrenceDate)
        : occurrenceDate;

      if (!item.endDate || finalDate <= new Date(item.endDate)) {
        allOccurrences.push({
          ...item,
          nextOccurrenceDate: finalDate,
        });
      }
    });
  });

  return allOccurrences;
}; 