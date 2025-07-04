import type { RecurringItem, DebtAccount } from "@/types";
import { 
  addDays, addWeeks, addMonths, addQuarters, addYears, 
  isSameDay, setDate, startOfDay, subDays, getDay
} from "date-fns";

// US Federal Holidays for a given year
const getUSHolidays = (year: number): Date[] => {
  const holidays: Date[] = [];
  
  // New Year's Day
  holidays.push(new Date(year, 0, 1));
  
  // Martin Luther King Jr. Day (3rd Monday in January)
  const mlkDay = new Date(year, 0, 1);
  mlkDay.setDate(1 + ((1 - mlkDay.getDay() + 7) % 7) + 14); // 3rd Monday
  holidays.push(mlkDay);
  
  // Presidents Day (3rd Monday in February)
  const presidentsDay = new Date(year, 1, 1);
  presidentsDay.setDate(1 + ((1 - presidentsDay.getDay() + 7) % 7) + 14); // 3rd Monday
  holidays.push(presidentsDay);
  
  // Memorial Day (last Monday in May)
  const memorialDay = new Date(year, 4, 31);
  memorialDay.setDate(31 - ((memorialDay.getDay() + 6) % 7)); // Last Monday
  holidays.push(memorialDay);
  
  // Independence Day
  holidays.push(new Date(year, 6, 4));
  
  // Labor Day (1st Monday in September)
  const laborDay = new Date(year, 8, 1);
  laborDay.setDate(1 + ((1 - laborDay.getDay() + 7) % 7)); // 1st Monday
  holidays.push(laborDay);
  
  // Columbus Day (2nd Monday in October)
  const columbusDay = new Date(year, 9, 1);
  columbusDay.setDate(1 + ((1 - columbusDay.getDay() + 7) % 7) + 7); // 2nd Monday
  holidays.push(columbusDay);
  
  // Veterans Day
  holidays.push(new Date(year, 10, 11));
  
  // Thanksgiving (4th Thursday in November)
  const thanksgiving = new Date(year, 10, 1);
  thanksgiving.setDate(1 + ((4 - thanksgiving.getDay() + 7) % 7) + 21); // 4th Thursday
  holidays.push(thanksgiving);
  
  // Christmas Day
  holidays.push(new Date(year, 11, 25));
  
  return holidays.map(date => startOfDay(date));
};

// Check if a date is a weekend (Saturday or Sunday)
export const isWeekend = (date: Date): boolean => {
  const day = getDay(date);
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
};

// Check if a date is a US federal holiday
export const isUSHoliday = (date: Date): boolean => {
  const year = date.getFullYear();
  const holidays = getUSHolidays(year);
  return holidays.some(holiday => isSameDay(holiday, date));
};

// Check if a date is a business day (not weekend or holiday)
export const isBusinessDay = (date: Date): boolean => {
  return !isWeekend(date) && !isUSHoliday(date);
};

// Adjust date to previous business day if it falls on weekend or holiday
export const adjustToPreviousBusinessDay = (date: Date): Date => {
  let adjustedDate = startOfDay(new Date(date));
  
  while (!isBusinessDay(adjustedDate)) {
    adjustedDate = subDays(adjustedDate, 1);
  }
  
  return adjustedDate;
};

// Wrapper function to apply business day adjustment only for income items
const applyBusinessDayAdjustment = (date: Date, item: RecurringItem): Date => {
  if (item.type === 'income') {
    return adjustToPreviousBusinessDay(date);
  }
  return date;
};

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
  return applyBusinessDayAdjustment(nextOccurrence, item);
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