"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/**
 * Test component based on the record-recurring-transaction-dialog date picker
 * This uses the same PopoverContent props as the record dialog
 */
export function RecordDialogDateTest() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-lg font-semibold mb-4">Record Dialog Date Test</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Transaction Date
          </label>
          
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
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
              avoidCollisions={false}
              sticky="always"
            >
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setIsDatePickerOpen(false);
                }}
                disabled={(date) =>
                  date > new Date() || date < new Date("1900-01-01")
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="text-sm text-gray-600">
          <p>Selected: {selectedDate ? format(selectedDate, "PPP") : "None"}</p>
        </div>

        <div className="text-xs text-gray-500">
          <p>This replicates the record dialog structure with:</p>
          <p>• avoidCollisions=false (different from add dialog)</p>
          <p>• sticky="always" (different from add dialog)</p>
          <p>• Date validation disabled for future dates</p>
        </div>
      </div>
    </div>
  );
}