
"use client";

import type { DebtPayoffStrategy } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { CheckCircle2, TrendingUp, TrendingDown } from "lucide-react";

interface PayoffStrategySelectorProps {
  selectedStrategy: DebtPayoffStrategy | null;
  onStrategySelect: (strategy: DebtPayoffStrategy) => void;
}

const strategies = [
  { 
    value: "snowball", 
    title: "Snowball Method", 
    icon: <TrendingUp className="h-6 w-6 text-green-500" />,
    description: "Pay off debts from smallest balance to largest, regardless of interest rate. Builds momentum and motivation." 
  },
  { 
    value: "avalanche", 
    title: "Avalanche Method", 
    icon: <TrendingDown className="h-6 w-6 text-red-500" />,
    description: "Pay off debts from highest interest rate to lowest. Saves the most money on interest over time." 
  },
] as const;


export function PayoffStrategySelector({ selectedStrategy, onStrategySelect }: PayoffStrategySelectorProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Choose Your Debt Payoff Strategy</CardTitle>
        <CardDescription>Select a method to guide how you'll prioritize your debt payments beyond the minimums.</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
            value={selectedStrategy || undefined}
            onValueChange={(value: DebtPayoffStrategy) => onStrategySelect(value)}
            className="grid gap-4 md:grid-cols-2"
        >
            {strategies.map((strategy) => (
                <Label 
                    key={strategy.value}
                    htmlFor={strategy.value}
                    className={`flex flex-col items-start space-y-2 rounded-lg border p-4 transition-all hover:shadow-md cursor-pointer
                                ${selectedStrategy === strategy.value ? 'border-primary ring-2 ring-primary shadow-lg' : 'border-border'}`}
                >
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                            {strategy.icon}
                            <span className="font-semibold text-lg text-foreground">{strategy.title}</span>
                        </div>
                        <RadioGroupItem value={strategy.value} id={strategy.value} className="h-5 w-5" />
                    </div>
                    <p className="text-sm text-muted-foreground pt-1">{strategy.description}</p>
                    {selectedStrategy === strategy.value && (
                         <div className="pt-2 flex items-center text-primary font-medium">
                            <CheckCircle2 className="h-4 w-4 mr-2"/>
                            Selected
                         </div>
                    )}
                </Label>
            ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
