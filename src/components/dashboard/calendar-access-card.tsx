"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

interface CalendarAccessCardProps {
  onViewCalendar: () => void;
}

export function CalendarAccessCard({ onViewCalendar }: CalendarAccessCardProps) {
  return (
    <Card className="h-fit shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-center">
          <Button 
            onClick={onViewCalendar}
            className="w-full flex items-center justify-center space-x-2"
            size="lg"
          >
            <CalendarDays className="h-5 w-5" />
            <span>View Recurring Calendar</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 