"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/auth-context";
import { getUserPreferences, updateUserPreferences, type UserPreferences } from "@/lib/api/user-preferences";
import { autoCompletePeriodsBeforeTrackingStart } from "@/lib/api/recurring-completions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon } from "lucide-react";
import { format, startOfDay, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

// Common currencies
const CURRENCIES = [
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "CAD", label: "Canadian Dollar (CAD)" },
  { value: "AUD", label: "Australian Dollar (AUD)" },
  { value: "JPY", label: "Japanese Yen (JPY)" },
  { value: "CHF", label: "Swiss Franc (CHF)" },
  { value: "CNY", label: "Chinese Yuan (CNY)" },
  { value: "INR", label: "Indian Rupee (INR)" },
];

// Common timezones
const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
  { value: "Europe/Moscow", label: "Moscow Time (MSK)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Asia/Shanghai", label: "China Standard Time (CST)" },
  { value: "Asia/Kolkata", label: "India Standard Time (IST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
];

const settingsSchema = z.object({
  currency: z.string().min(1, "Please select a currency"),
  timezone: z.string().min(1, "Please select a timezone"),
  financialTrackingStartDate: z.date().optional(),
});

interface UserSettingsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserSettingsModal({ isOpen, onOpenChange }: UserSettingsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      currency: "USD",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      financialTrackingStartDate: undefined,
    },
  });

  // Load user preferences when modal opens
  useEffect(() => {
    if (isOpen && user?.id) {
      loadPreferences();
    }
  }, [isOpen, user?.id]);

  const loadPreferences = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { preferences: userPrefs, error } = await getUserPreferences(user.id);
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to load preferences",
          variant: "destructive",
        });
        return;
      }

      if (userPrefs) {
        setPreferences(userPrefs);
        form.reset({
          currency: userPrefs.currency,
          timezone: userPrefs.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          financialTrackingStartDate: userPrefs.financialTrackingStartDate ? new Date(userPrefs.financialTrackingStartDate) : undefined,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load preferences",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof settingsSchema>) => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { preferences: updatedPrefs, error } = await updateUserPreferences(user.id, {
        currency: values.currency,
        timezone: values.timezone,
        financialTrackingStartDate: values.financialTrackingStartDate,
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to save settings",
          variant: "destructive",
        });
        return;
      }

      // Auto-complete periods before the tracking start date if it was set
      if (values.financialTrackingStartDate) {
        try {
          const { success, autoCompletedCount, error: autoCompleteError } = 
            await autoCompletePeriodsBeforeTrackingStart(user.id, values.financialTrackingStartDate);
          
          if (autoCompleteError) {
            console.warn('Failed to auto-complete periods:', autoCompleteError);
          } else if (success && autoCompletedCount > 0) {
            console.log(`Auto-completed ${autoCompletedCount} periods before tracking start date`);
          }
        } catch (autoCompleteErr) {
          console.warn('Error during auto-completion:', autoCompleteErr);
        }
      }

      setPreferences(updatedPrefs);
      toast({
        title: "Success",
        description: values.financialTrackingStartDate 
          ? "Settings saved successfully! Historical periods have been automatically marked as completed."
          : "Settings saved successfully!",
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error", 
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your preferences for currency and timezone.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading preferences...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIMEZONES.map((timezone) => (
                          <SelectItem key={timezone.value} value={timezone.value}>
                            {timezone.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                                      <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="financialTrackingStartDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Financial Tracking Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date (optional)</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("2020-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Sets the point where your financial tracking begins. Recurring items are generated from January 1 of this year — items before this date will be marked as completed, so you won't need to record payments for them. If left blank, defaults to 6 months ago.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Settings
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
} 