"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

interface CalendarAccessCardProps {
  onViewCalendar: () => void;
  isMobile?: boolean;
}

export function CalendarAccessCard({ onViewCalendar, isMobile = false }: CalendarAccessCardProps) {
  return (
    <Card className="h-fit shadow-lg">
      <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center justify-center">
          <Button 
            onClick={onViewCalendar}
            className="w-full flex items-center justify-center space-x-2"
            size={isMobile ? "default" : "lg"}
          >
            <CalendarDays className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            <span className={isMobile ? 'text-sm' : ''}>View Recurring Calendar</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 