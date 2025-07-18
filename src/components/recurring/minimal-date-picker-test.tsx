"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/**
 * Minimal test component to isolate the mobile date picker issue
 * This removes all complex conditional logic and form integration
 * to test if the issue is with the Popover/Calendar components themselves
 */
export function MinimalDatePickerTest() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-lg font-semibold mb-4">Minimal Date Picker Test</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Simple Date Field
          </label>
          
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full pl-3 text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                {selectedDate ? (
                  format(selectedDate, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-0" 
              align="start" 
              side="bottom" 
              sideOffset={4}
            >
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setIsOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="text-sm text-gray-600">
          <p>Selected: {selectedDate ? format(selectedDate, "PPP") : "None"}</p>
        </div>

        <div className="text-xs text-gray-500">
          <p>This is a minimal test to isolate the mobile date picker issue.</p>
          <p>Test on mobile to see if the calendar opens properly.</p>
        </div>
      </div>
    </div>
  );
}