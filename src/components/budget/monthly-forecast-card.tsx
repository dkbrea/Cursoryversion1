
"use client";

import * as React from "react";
import type { MonthlyForecast, MonthlyForecastDebtPaymentItem, MonthlyForecastGoalContribution, MonthlyForecastSinkingFundContribution, MonthlyForecastVariableExpense, MonthlyForecastIncomeItem, MonthlyForecastFixedExpenseItem, MonthlyForecastSubscriptionItem } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, ListChecks, ShieldCheck, Building, CreditCard, DollarSign, Info, FileText } from "lucide-react";

interface MonthlyForecastCardProps {
  monthData: MonthlyForecast;
  monthIndex: number;
  onUpdateVariableAmount: (monthIndex: number, variableExpenseId: string, newAmount: number) => void;
  onUpdateGoalContribution: (monthIndex: number, goalId: string, newAmount: number) => void;
  onUpdateSinkingFundContribution: (monthIndex: number, sinkingFundId: string, newAmount: number) => void;
  onUpdateDebtAdditionalPayment: (monthIndex: number, debtId: string, newAdditionalAmount: number) => void;
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
};

interface ForecastItemDisplayProps {
    items: Array<{ id: string; name: string; totalAmountInMonth?: number; monthSpecificAmount?: number; monthSpecificContribution?: number; [key: string]: any }>;
    title: string;
    icon: React.ReactNode;
    sectionTotal: number; // Total for the section header badge
    emptyMessage?: string;
    itemClassName?: string;
    monthIndex: number;
    editableSection?: 'variable' | 'goal' | 'sinking-fund';
    onUpdateAmount?: (monthIndex: number, itemId: string, newAmount: number) => void;
}

const ForecastItemsSection: React.FC<ForecastItemDisplayProps> = ({ 
    items, title, icon, sectionTotal, emptyMessage = "No items this month.", itemClassName, 
    monthIndex, editableSection, onUpdateAmount
}) => {
    
    const [editingValues, setEditingValues] = React.useState<Record<string, string>>({});

    React.useEffect(() => { 
        const initialValues: Record<string, string> = {};
        items.forEach(item => {
            if (editableSection === 'variable' && item.monthSpecificAmount !== undefined) {
                initialValues[item.id] = item.monthSpecificAmount.toString();
            } else if (editableSection === 'goal' && item.monthSpecificContribution !== undefined) {
                initialValues[item.id] = item.monthSpecificContribution.toString();
            } else if (editableSection === 'sinking-fund' && item.monthSpecificContribution !== undefined) {
                initialValues[item.id] = item.monthSpecificContribution.toString();
            }
        });
        setEditingValues(initialValues);
    }, [items, editableSection]);


    const handleInputChange = (itemId: string, value: string) => {
        setEditingValues(prev => ({ ...prev, [itemId]: value }));
    };

    const handleInputBlur = (itemId: string) => {
        if (!onUpdateAmount || !editableSection) return;
        const stringValue = editingValues[itemId];
        const numericValue = parseFloat(stringValue);

        const originalItem = items.find(i => i.id === itemId);
        let originalNumericValue: number | undefined;

        if (originalItem) {
             if (editableSection === 'variable') originalNumericValue = originalItem.monthSpecificAmount;
             else if (editableSection === 'goal') originalNumericValue = originalItem.monthSpecificContribution;
             else if (editableSection === 'sinking-fund') originalNumericValue = originalItem.monthSpecificContribution;
        }

        if (!isNaN(numericValue) && numericValue >= 0) {
            if (numericValue !== originalNumericValue) {
                onUpdateAmount(monthIndex, itemId, numericValue);
            }
        } else { 
            if (originalNumericValue !== undefined) {
                setEditingValues(prev => ({ ...prev, [itemId]: originalNumericValue!.toString() }));
            }
        }
    };
    
    return (
        <div className="space-y-1">
            <h4 className="font-semibold text-foreground flex items-center mb-1">
                {icon}
                {title}
                <Badge variant="outline" className="ml-auto text-xs">
                    {formatCurrency(sectionTotal)}
                </Badge>
            </h4>
            {items.length > 0 ? items.map(item => (
                <div key={item.id || item.name} className="flex justify-between items-center pl-1 text-xs gap-2">
                    <span className="text-muted-foreground truncate shrink min-w-0" title={item.name}>{item.name}</span>
                    {editableSection ? (
                        <Input
                            type="number"
                            step="0.01"
                            value={editingValues[item.id] ?? ''}
                            onChange={(e) => handleInputChange(item.id, e.target.value)}
                            onBlur={() => handleInputBlur(item.id)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                            className={cn("h-6 py-1 px-1.5 text-xs text-right w-20", itemClassName)}
                            placeholder="0.00"
                        />
                    ) : (
                        <span className={cn("text-foreground/90", itemClassName)}>{formatCurrency(item.totalAmountInMonth || 0)}</span>
                    )}
                </div>
            )) : <p className="text-xs text-muted-foreground pl-1 italic">{emptyMessage}</p>}
        </div>
    );
};


export function MonthlyForecastCard({ 
    monthData, monthIndex, 
    onUpdateVariableAmount, onUpdateGoalContribution, onUpdateSinkingFundContribution, onUpdateDebtAdditionalPayment 
}: MonthlyForecastCardProps) {

  return (
    <Card className="w-[380px] min-w-[380px] flex flex-col shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">{monthData.monthLabel}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 text-sm overflow-y-auto max-h-[500px] pr-1">
        
        <ForecastItemsSection
            items={monthData.incomeItems}
            title="Income"
            icon={<TrendingUp className="h-5 w-5 mr-2 text-green-500" />}
            sectionTotal={monthData.totalIncome}
            emptyMessage="No income projected."
            itemClassName="text-green-600"
            monthIndex={monthIndex}
        />
        <Separator className="my-2" />

        <ForecastItemsSection
            items={monthData.fixedExpenseItems}
            title="Fixed Expenses"
            icon={<FileText className="h-5 w-5 mr-2 text-purple-500" />}
            sectionTotal={monthData.totalFixedExpenses}
            emptyMessage="No fixed expenses."
            itemClassName="text-purple-600"
            monthIndex={monthIndex}
        />
        <Separator className="my-2" />

        <ForecastItemsSection
            items={monthData.subscriptionItems}
            title="Subscriptions"
            icon={<CreditCard className="h-5 w-5 mr-2 text-blue-500" />}
            sectionTotal={monthData.totalSubscriptions}
            emptyMessage="No subscriptions."
            itemClassName="text-blue-600"
            monthIndex={monthIndex}
        />
        <Separator className="my-2" />
        
        <ForecastItemsSection
            items={monthData.variableExpenses}
            title="Variable Expenses"
            icon={<ListChecks className="h-5 w-5 mr-2 text-orange-500"/>}
            sectionTotal={monthData.totalVariableExpenses}
            emptyMessage="No variable categories."
            itemClassName="text-orange-600"
            monthIndex={monthIndex}
            editableSection="variable"
            onUpdateAmount={onUpdateVariableAmount}
        />
        <Separator className="my-2" />

        <div className="space-y-1">
            <h4 className="font-semibold text-foreground flex items-center mb-1">
                <TrendingDown className="h-5 w-5 mr-2 text-red-500" />
                Debt Payments
                <Badge variant="outline" className="ml-auto text-xs">
                  {formatCurrency(
                    monthData.debtPaymentItems.reduce((sum, item) => sum + item.totalAmountInMonth + (item.additionalPayment || 0),0)
                  )}
                </Badge>
            </h4>
            {monthData.debtPaymentItems.length > 0 ? monthData.debtPaymentItems.map(dp => {
                const [additionalPmtStr, setAdditionalPmtStr] = React.useState((dp.additionalPayment || 0).toString());
                React.useEffect(() => setAdditionalPmtStr((dp.additionalPayment || 0).toString()), [dp.additionalPayment]);

                const handleAdditionalPmtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                    setAdditionalPmtStr(e.target.value);
                };
                const handleAdditionalPmtBlur = () => {
                    const numericValue = parseFloat(additionalPmtStr);
                    if (!isNaN(numericValue) && numericValue >= 0) {
                        if (numericValue !== (dp.additionalPayment || 0)) {
                           onUpdateDebtAdditionalPayment(monthIndex, dp.id, numericValue);
                        }
                    } else {
                        setAdditionalPmtStr((dp.additionalPayment || 0).toString()); // Revert
                    }
                };

                return (
                    <div key={dp.id} className="flex justify-between items-center pl-1 text-xs gap-2">
                        <span className="text-muted-foreground truncate shrink min-w-0 flex-1" title={dp.name}>{dp.name}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-red-600 min-w-[60px] text-right">{formatCurrency(dp.totalAmountInMonth)}</span>
                            <span className="text-muted-foreground text-[10px]">(Min)</span>
                        </div>
                        <Input
                            type="number"
                            step="0.01"
                            value={additionalPmtStr}
                            onChange={handleAdditionalPmtChange}
                            onBlur={handleAdditionalPmtBlur}
                            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                            className="h-6 py-1 px-1.5 text-xs text-right w-20 text-red-600"
                            placeholder="0.00"
                            title="Additional Payment"
                        />
                    </div>
                );
            }) : <p className="text-xs text-muted-foreground pl-1 italic">No debt payments.</p>}
        </div>
        <Separator className="my-2" />
        
        <ForecastItemsSection
            items={monthData.goalContributions}
            title="Goal Contributions"
            icon={<ShieldCheck className="h-5 w-5 mr-2 text-teal-500"/>}
            sectionTotal={monthData.totalGoalContributions}
            emptyMessage="No goals being funded."
            itemClassName="text-teal-600"
            monthIndex={monthIndex}
            editableSection="goal"
            onUpdateAmount={onUpdateGoalContribution}
        />
        
        {monthData.sinkingFundContributions && monthData.sinkingFundContributions.length > 0 && (
          <>
            <Separator className="my-2" />
            <ForecastItemsSection
                items={monthData.sinkingFundContributions}
                title="Sinking Funds"
                icon={<Building className="h-5 w-5 mr-2 text-cyan-500"/>}
                sectionTotal={monthData.totalSinkingFundContributions}
                emptyMessage="No sinking funds being funded."
                itemClassName="text-cyan-600"
                monthIndex={monthIndex}
                editableSection="sinking-fund"
                onUpdateAmount={onUpdateSinkingFundContribution}
            />
          </>
        )}

      </CardContent>
      <CardFooter className="flex flex-col items-start pt-4 border-t mt-auto bg-muted/30">
        <div className="flex justify-between w-full font-semibold text-md mb-1">
          <span>Remaining to Budget:</span>
          <span className={cn(
            "font-bold",
            monthData.isBalanced && "text-green-600",
            !monthData.isBalanced && monthData.remainingToBudget > 0 && "text-orange-600",
            !monthData.isBalanced && monthData.remainingToBudget < 0 && "text-red-600"
          )}>
            {formatCurrency(monthData.remainingToBudget)}
          </span>
        </div>
        {monthData.isBalanced ? (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-primary-foreground w-full justify-center py-1.5">
            <CheckCircle2 className="mr-2 h-4 w-4" /> Balanced
          </Badge>
        ) : (
          <Badge variant="outline" className={cn("w-full justify-center py-1.5", monthData.remainingToBudget < 0 ? "border-red-500 text-red-500 bg-red-50" : "border-orange-500 text-orange-500 bg-orange-50")}>
            <AlertTriangle className="mr-2 h-4 w-4" /> {monthData.remainingToBudget < 0 ? "Over Budget" : "Needs Allocation"}
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}

