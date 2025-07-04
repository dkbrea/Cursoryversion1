"use client";

import { useState, useEffect } from "react";
import { RecurringCalendarView } from "@/components/recurring/recurring-calendar-view";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { UnifiedRecurringListItem } from "@/types";
import { cn } from "@/lib/utils";

interface RecurringCalendarOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  items: UnifiedRecurringListItem[];
  onItemClick?: (item: UnifiedRecurringListItem, date: Date) => void;
  completedItems?: Set<string>;
}

export function RecurringCalendarOverlay({ 
  isOpen, 
  onClose, 
  items,
  onItemClick,
  completedItems
}: RecurringCalendarOverlayProps) {
  const [displayedMonth, setDisplayedMonth] = useState<Date>(new Date());

  // Handle escape key to close overlay
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scrolling when overlay is open
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className={cn(
          "relative bg-background border rounded-lg shadow-lg",
          "w-full max-w-6xl max-h-[90vh] overflow-hidden"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold">Recurring Calendar</h2>
              <p className="text-sm text-muted-foreground">
                View all your recurring items and payments in calendar format
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10 rounded-full"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>

          {/* Calendar Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <RecurringCalendarView 
              items={items} 
              onMonthChange={setDisplayedMonth}
              onItemClick={onItemClick}
              completedItems={completedItems}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 