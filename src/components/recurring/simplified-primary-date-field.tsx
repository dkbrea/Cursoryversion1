"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/**
 * Simplified version of the primary date field from add-recurring-item-dialog
 * This matches the structure but removes all complex conditional logic
 * to test if the issue is with the form context or the field implementation
 */
export function SimplifiedPrimaryDateField() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-lg font-semibold mb-4">Simplified Primary Date Field</h2>
      
      <div className="space-y-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-2">
            Next Due Date *
          </label>
          
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full pl-3 text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
                onClick={() => setIsDatePickerOpen(true)}
              >
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-0" 
              align="start" 
              side="bottom" 
              sideOffset={4} 
              avoidCollisions={true}
              collisionPadding={16}
            >
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setIsDatePickerOpen(false);
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
          <p>This replicates the structure from the add-recurring-item-dialog but without form integration.</p>
          <p>It uses the same PopoverContent props: avoidCollisions=true, collisionPadding=16</p>
        </div>
      </div>
    </div>
  );
}