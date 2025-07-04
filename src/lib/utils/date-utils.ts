import type { TimePeriod } from "@/app/(app)/reports/page";

export function getDateRangeForPeriod(period: TimePeriod): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case 'last-30-days':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case 'last-3-months':
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case 'last-6-months':
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case 'last-12-months':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case 'last-2-years':
      startDate.setFullYear(startDate.getFullYear() - 2);
      break;
    default:
      startDate.setMonth(startDate.getMonth() - 6);
  }

  return { startDate, endDate };
}

export function getPeriodLabel(period: TimePeriod): string {
  switch (period) {
    case 'last-30-days': return 'Last 30 days';
    case 'last-3-months': return 'Last 3 months';
    case 'last-6-months': return 'Last 6 months';
    case 'last-12-months': return 'Last 12 months';
    case 'last-2-years': return 'Last 2 years';
    default: return 'Last 6 months';
  }
} 