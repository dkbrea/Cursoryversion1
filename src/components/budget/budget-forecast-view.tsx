"use client";

import type { MonthlyForecast } from "@/types";
import { MonthlyForecastCard } from "./monthly-forecast-card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BudgetForecastViewProps {
  forecastData: MonthlyForecast[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  onUpdateVariableAmount: (monthIndex: number, variableExpenseId: string, newAmount: number) => void;
  onUpdateGoalContribution: (monthIndex: number, goalId: string, newAmount: number) => void;
  onUpdateSinkingFundContribution: (monthIndex: number, sinkingFundId: string, newAmount: number) => void;
  onUpdateDebtAdditionalPayment: (monthIndex: number, debtId: string, newAdditionalAmount: number) => void;
}

export function BudgetForecastView({ 
    forecastData, 
    selectedYear,
    onYearChange,
    onUpdateVariableAmount, 
    onUpdateGoalContribution,
    onUpdateSinkingFundContribution,
    onUpdateDebtAdditionalPayment 
}: BudgetForecastViewProps) {
  if (!forecastData || forecastData.length === 0) {
    return (
        <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No Forecast Data</AlertTitle>
            <AlertDescription>
                Forecast data is being generated or is not available. Please check your recurring items, debts, and goals.
            </AlertDescription>
        </Alert>
    );
  }

  // Generate available years (current year and next 5 years)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 6 }, (_, i) => currentYear + i);

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">12-Month Budget Forecast</h2>
                <p className="text-muted-foreground">
                    Review and adjust your projected finances for each month of {selectedYear}. 
                    Changes made here only affect the specific forecast month.
                </p>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Year:</span>
                <Select value={selectedYear.toString()} onValueChange={(value) => onYearChange(parseInt(value))}>
                    <SelectTrigger className="w-[120px] h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {availableYears.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                                {year}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <div className="flex w-max space-x-4 p-4">
            {forecastData.map((monthData, index) => (
                <MonthlyForecastCard
                  key={monthData.monthLabel}
                  monthData={monthData}
                  monthIndex={index} 
                  onUpdateVariableAmount={onUpdateVariableAmount}
                  onUpdateGoalContribution={onUpdateGoalContribution}
                  onUpdateSinkingFundContribution={onUpdateSinkingFundContribution}
                  onUpdateDebtAdditionalPayment={onUpdateDebtAdditionalPayment}
                />
            ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    </div>
  );
}
