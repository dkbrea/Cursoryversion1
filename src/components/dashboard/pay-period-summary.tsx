import React from "react";
import type { PaycheckBreakdown, PaycheckPreferences } from "@/types";
import { format } from "date-fns";

interface PayPeriodSummaryProps {
  breakdown: PaycheckBreakdown | null;
  preferences: PaycheckPreferences | undefined;
  isMobile?: boolean;
}

function formatDateWithTimezone(date: Date, timeZone?: string) {
  // For manual plan dates, we want to display the calendar date, not timezone-adjusted
  // Check if this is a UTC date that represents a calendar day
  const dateStr = date.toISOString();
  
  // If it's a UTC date at midnight, extract the date part to avoid timezone conversion
  if (dateStr.includes('T00:00:00.000Z')) {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    const calendarDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    return calendarDate.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  
  // Otherwise, use the original logic with timezone
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: timeZone || undefined,
  });
}

export const PayPeriodSummary: React.FC<PayPeriodSummaryProps> = ({ breakdown, preferences, isMobile = false }) => {
  if (!breakdown) return null;
  const { period, finalRemaining } = breakdown;
  // Try to get the user's preferred timezone from preferences
  // (If you want to use the global userPreferences object, pass it as a prop)
  const timeZone = (preferences as any)?.timezone;
  return (
    <div className={`mb-4 ${isMobile ? 'p-3' : 'p-4'} rounded-lg bg-blue-50 border border-blue-200 flex flex-col ${isMobile ? 'gap-3' : 'md:flex-row md:items-center md:justify-between gap-2'}`}>
      <div className={isMobile ? 'text-center' : ''}>
        <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-blue-700 font-semibold uppercase tracking-wide`}>Current Pay Period</div>
        <div className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-blue-900 ${isMobile ? 'mt-1' : ''}`}>
          {formatDateWithTimezone(period.periodStart, timeZone)} – {formatDateWithTimezone(period.periodEnd, timeZone)}
        </div>
      </div>
      <div className={`flex flex-col ${isMobile ? 'items-center' : 'items-end'}`}>
        <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-blue-700 font-semibold`}>Available to Spend</div>
        <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold ${finalRemaining >= 0 ? 'text-green-700' : 'text-red-700'} ${isMobile ? 'mt-1' : ''}`}>${finalRemaining.toLocaleString(undefined, { minimumFractionDigits: 0 })}</div>
      </div>
    </div>
  );
};
