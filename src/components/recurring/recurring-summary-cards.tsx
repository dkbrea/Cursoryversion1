
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Icons from "@/components/icons"; // Assuming you have appropriate icons
import { ArrowUpCircle, FileText, CreditCard, TrendingDown } from "lucide-react";

interface MonthlySummary {
  income: number;
  fixedExpenses: number;
  subscriptions: number;
  debtPayments: number;
}

interface RecurringSummaryCardsProps {
  summaries: MonthlySummary;
}

export function RecurringSummaryCards({ summaries }: RecurringSummaryCardsProps) {
  const summaryItems = [
    {
      title: "Expected Monthly Income",
      amount: summaries.income,
      icon: <ArrowUpCircle className="h-6 w-6 text-green-600" />,
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-700",
      amountColor: "text-green-600 font-bold",
    },
    {
      title: "Monthly Fixed Expenses",
      amount: summaries.fixedExpenses,
      icon: <FileText className="h-6 w-6 text-purple-600" />,
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-700",
      amountColor: "text-purple-600 font-bold",
    },
    {
      title: "Monthly Subscriptions",
      amount: summaries.subscriptions,
      icon: <CreditCard className="h-6 w-6 text-blue-600" />,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-700",
      amountColor: "text-blue-600 font-bold",
    },
    {
      title: "Monthly Debt Payments",
      amount: summaries.debtPayments,
      icon: <TrendingDown className="h-6 w-6 text-red-600" />,
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-700",
      amountColor: "text-red-600 font-bold",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {summaryItems.map((item) => (
        <Card key={item.title} className={`${item.bgColor} ${item.borderColor} shadow-md hover:shadow-lg transition-shadow`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${item.textColor}`}>
              {item.title}
            </CardTitle>
            {item.icon}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl ${item.amountColor}`}>
              ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className={`text-xs ${item.textColor}/80 pt-1`}>
              Total for current month
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
