"use client";

import type { PaycheckBreakdown } from "@/types";
import { PaycheckBreakdownCard } from "./paycheck-breakdown-card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PaycheckTimelineViewProps {
  breakdowns: PaycheckBreakdown[];
  title: string;
}

export function PaycheckTimelineView({ breakdowns, title }: PaycheckTimelineViewProps) {
  if (breakdowns.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-muted-foreground mb-2">No {title}</h3>
        <p className="text-sm text-muted-foreground">
          {title === "Past Paychecks" 
            ? "Past paycheck data will appear here."
            : title === "Most Recent Paycheck"
            ? "Your most recent paycheck information will appear here once you receive a paycheck."
            : "Future paycheck planning will appear here."
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <ScrollArea className="h-[600px] w-full">
        <div className="space-y-4 pr-4">
          {breakdowns.map((breakdown, index) => (
            <PaycheckBreakdownCard 
              key={breakdown.period.id} 
              breakdown={breakdown}
              isHighlighted={index === 0 && title === "Current Paycheck"}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
} 