import type { RecurringItem, DebtAccount } from "@/types";
import { 
  addDays, addWeeks, addMonths, addQuarters, addYears, 
  isSameDay, setDate, startOfDay 
} from "date-fns";

// Helper to calculate the single next occurrence for list view
export const calculateNextRecurringItemOccurrence = (item: RecurringItem): Date => {
  const today = startOfDay(new Date());
  const itemEndDate = item.endDate ? startOfDay(new Date(item.endDate)) : null;

  if (itemEndDate && itemEndDate < today) {
    return itemEndDate; 
  }
  
  let nextOccurrence: Date;

  if (item.type === 'subscription') {
    if (!item.lastRenewalDate) return itemEndDate || today;
    const baseDate = startOfDay(new Date(item.lastRenewalDate));
    nextOccurrence = new Date(baseDate.getTime()); 
    
    do {
      switch (item.frequency) {
        case "daily": nextOccurrence = addDays(nextOccurrence, 1); break;
        case "weekly": nextOccurrence = addWeeks(nextOccurrence, 1); break;
        case "bi-weekly": nextOccurrence = addWeeks(nextOccurrence, 2); break;
        case "monthly": nextOccurrence = addMonths(nextOccurrence, 1); break;
        case "quarterly": nextOccurrence = addQuarters(nextOccurrence, 1); break;
        case "yearly": nextOccurrence = addYears(nextOccurrence, 1); break;
        default: return itemEndDate || today;
      }
      if (itemEndDate && nextOccurrence > itemEndDate) return itemEndDate;
    } while (nextOccurrence < today);
  } else if (item.frequency === 'semi-monthly') {
    const date1 = item.semiMonthlyFirstPayDate ? startOfDay(new Date(item.semiMonthlyFirstPayDate)) : null;
    const date2 = item.semiMonthlySecondPayDate ? startOfDay(new Date(item.semiMonthlySecondPayDate)) : null;
    
    let upcomingDates = [];
    if (date1 && (!itemEndDate || date1 <= itemEndDate) && date1 >= today) upcomingDates.push(date1);
    if (date2 && (!itemEndDate || date2 <= itemEndDate) && date2 >= today) upcomingDates.push(date2);
    
    if (upcomingDates.length > 0) {
      nextOccurrence = upcomingDates.sort((a,b) => a.getTime() - b.getTime())[0];
    } else { 
      const lastSemiMonthlyDate = date2 && date1 ? (date2 > date1 ? date2 : date1) : (date2 || date1 || today);
      return itemEndDate && itemEndDate < lastSemiMonthlyDate ? itemEndDate : lastSemiMonthlyDate;
    }
  } else {
    if (!item.startDate) return itemEndDate || today;
    const baseDate = startOfDay(new Date(item.startDate));
    nextOccurrence = new Date(baseDate.getTime());
    
    while (nextOccurrence < today) {
      if (itemEndDate && nextOccurrence >= itemEndDate) return itemEndDate;
      switch (item.frequency) {
        case "daily": nextOccurrence = addDays(nextOccurrence, 1); break;
        case "weekly": nextOccurrence = addWeeks(nextOccurrence, 1); break;
        case "bi-weekly": nextOccurrence = addWeeks(nextOccurrence, 2); break;
        case "monthly": nextOccurrence = addMonths(nextOccurrence, 1); break;
        case "quarterly": nextOccurrence = addQuarters(nextOccurrence, 1); break;
        case "yearly": nextOccurrence = addYears(nextOccurrence, 1); break;
        default: return nextOccurrence;
      }
    }
  }

  if (itemEndDate && nextOccurrence > itemEndDate) return itemEndDate;
  return nextOccurrence;
};

export const calculateNextDebtOccurrence = (debt: DebtAccount): Date => {
  const today = startOfDay(new Date());
  const debtCreatedAt = startOfDay(new Date(debt.createdAt));
  const paymentDay = debt.paymentDayOfMonth ?? 1; // Default to 1st of month if undefined
  
  let currentDate = setDate(today, paymentDay);

  if (currentDate < today) { 
    currentDate = addMonths(currentDate, 1);
  }
  
  if (currentDate < debtCreatedAt) {
    currentDate = setDate(debtCreatedAt, paymentDay);
    if (currentDate < debtCreatedAt) { 
      currentDate = addMonths(currentDate, 1);
    }
  }

  let nextDate = startOfDay(new Date(currentDate));
  
  if (debt.paymentFrequency !== 'monthly') {
    let checkDate = setDate(debtCreatedAt, paymentDay);
    if (checkDate < debtCreatedAt) checkDate = addMonths(checkDate, 1);

    while(checkDate < today) {
      switch (debt.paymentFrequency) {
        case "bi-weekly": checkDate = addWeeks(checkDate, 2); break;
        case "weekly": checkDate = addWeeks(checkDate, 1); break;
        case "annually": checkDate = addYears(checkDate, 1); break;
        default: checkDate = addMonths(checkDate, 1); break; 
      }
    }
    nextDate = checkDate;
  }
  
  return nextDate;
}; 