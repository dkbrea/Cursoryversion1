import React from "react";
import type { PaycheckBreakdown, PaycheckPreferences } from "@/types";
import { format } from "date-fns";

interface PayPeriodSummaryProps {
  breakdown: PaycheckBreakdown | null;
  preferences: PaycheckPreferences | undefined;
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

export const PayPeriodSummary: React.FC<PayPeriodSummaryProps> = ({ breakdown, preferences }) => {
  if (!breakdown) return null;
  const { period, finalRemaining } = breakdown;
  // Try to get the user's preferred timezone from preferences
  // (If you want to use the global userPreferences object, pass it as a prop)
  const timeZone = (preferences as any)?.timezone;
  return (
    <div className="mb-4 p-4 rounded-lg bg-blue-50 border border-blue-200 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <div>
        <div className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Current Pay Period</div>
        <div className="text-base font-bold text-blue-900">
          {formatDateWithTimezone(period.periodStart, timeZone)} – {formatDateWithTimezone(period.periodEnd, timeZone)}
        </div>
      </div>
      <div className="flex flex-col items-end">
        <div className="text-xs text-blue-700 font-semibold">Available to Spend</div>
        <div className={`text-2xl font-bold ${finalRemaining >= 0 ? 'text-green-700' : 'text-red-700'}`}>${finalRemaining.toLocaleString(undefined, { minimumFractionDigits: 0 })}</div>
      </div>
    </div>
  );
};
