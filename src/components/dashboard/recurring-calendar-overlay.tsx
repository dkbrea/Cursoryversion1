"use client";

import { useState, useEffect } from "react";
import { RecurringCalendarView } from "@/components/recurring/recurring-calendar-view";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { UnifiedRecurringListItem } from "@/types";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

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
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${isMobile ? 'p-2' : 'p-4 sm:p-6 lg:p-8'}`}>
        <div className={cn(
          "relative bg-background border rounded-lg shadow-lg overflow-hidden",
          isMobile 
            ? "w-full h-full max-w-full max-h-full" 
            : "w-full max-w-6xl max-h-[90vh]"
        )}>
          {/* Header */}
          <div className={`flex items-center justify-between border-b ${isMobile ? 'p-4' : 'p-6'}`}>
            <div>
              <h2 className={`font-bold ${isMobile ? 'text-lg' : 'text-2xl'}`}>Recurring Calendar</h2>
              {!isMobile && (
                <p className="text-sm text-muted-foreground">
                  View all your recurring items and payments in calendar format
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className={isMobile ? "h-8 w-8 rounded-full" : "h-10 w-10 rounded-full"}
            >
              <X className={isMobile ? "h-3 w-3" : "h-4 w-4"} />
              <span className="sr-only">Close</span>
            </Button>
          </div>

          {/* Calendar Content */}
          <div className={`overflow-y-auto ${isMobile ? 'p-2 max-h-[calc(100vh-80px)]' : 'p-6 max-h-[calc(90vh-120px)]'}`}>
            <RecurringCalendarView 
              items={items} 
              onMonthChange={setDisplayedMonth}
              onItemClick={onItemClick}
              completedItems={completedItems}
              isMobile={isMobile}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 