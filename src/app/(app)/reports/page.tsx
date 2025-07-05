"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Icons } from "@/components/icons"; // Corrected import
import { SpendingByCategoryReport } from "@/components/reports/spending-by-category-report";
import { IncomeAnalysisReport } from "@/components/reports/income-analysis-report";
import { SpendingTrendsReport } from "@/components/reports/spending-trends-report";
import { TaxReport } from "@/components/reports/tax-report";
import { NetWorthTrendReport } from "@/components/reports/net-worth-trend-report";
import { GoalProgressReport } from "@/components/reports/goal-progress-report";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

export type TimePeriod = 'last-30-days' | 'last-3-months' | 'last-6-months' | 'last-12-months' | 'last-2-years';

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('last-6-months');
  const isMobile = useIsMobile();

  const getPeriodLabel = (period: TimePeriod) => {
    switch (period) {
      case 'last-30-days': return 'Last 30 days';
      case 'last-3-months': return 'Last 3 months';
      case 'last-6-months': return 'Last 6 months';
      case 'last-12-months': return 'Last 12 months';
      case 'last-2-years': return 'Last 2 years';
      default: return 'Last 6 months';
    }
  };

  return (
    <div className="space-y-6">
      <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-col sm:flex-row justify-between items-start sm:items-center gap-4'}`}>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight text-foreground`}>Reports</h1>
        <div className={`flex ${isMobile ? 'flex-col gap-3 w-full' : 'items-center gap-2'}`}>
          <Select value={selectedPeriod} onValueChange={(value: TimePeriod) => setSelectedPeriod(value)}>
            <SelectTrigger className={`${isMobile ? 'w-full' : 'w-[180px]'}`}>
              <Icons.CalendarDays className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-30-days">Last 30 days</SelectItem>
              <SelectItem value="last-3-months">Last 3 months</SelectItem>
              <SelectItem value="last-6-months">Last 6 months</SelectItem>
              <SelectItem value="last-12-months">Last 12 months</SelectItem>
              <SelectItem value="last-2-years">Last 2 years</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" disabled className={isMobile ? 'w-full' : ''} size={isMobile ? 'default' : 'sm'}>
            <Icons.Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="spending-by-category" className="w-full">
        <TabsList className={`${isMobile ? 'grid w-full grid-cols-2 gap-1' : 'grid w-full grid-cols-2 sm:grid-cols-4 md:w-auto md:inline-flex'}`}>
          <TabsTrigger value="spending-by-category" className={`${isMobile ? 'text-xs px-2 py-2' : 'text-xs sm:text-sm'}`}>
            {isMobile ? (
              <>
                <Icons.History className="mr-1 h-3 w-3" /> Category
              </>
            ) : (
              <>
                <Icons.History className="mr-2 h-4 w-4" /> Spending by Category
              </>
            )}
          </TabsTrigger>
          <TabsTrigger value="income-analysis" className={`${isMobile ? 'text-xs px-2 py-2' : 'text-xs sm:text-sm'}`}>
            {isMobile ? (
              <>
                <Icons.BarChartBig className="mr-1 h-3 w-3" /> Income
              </>
            ) : (
              <>
                <Icons.BarChartBig className="mr-2 h-4 w-4" /> Income Analysis
              </>
            )}
          </TabsTrigger>
          {!isMobile && (
            <>
              <TabsTrigger value="spending-trends" className="text-xs sm:text-sm">
                <Icons.LineChartIcon className="mr-2 h-4 w-4" /> Spending Trends
              </TabsTrigger>
              <TabsTrigger value="tax-report" className="text-xs sm:text-sm">
                <Icons.FileTextIcon className="mr-2 h-4 w-4" /> Tax Report
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {isMobile && (
          <TabsList className="grid w-full grid-cols-2 gap-1 mt-2">
            <TabsTrigger value="spending-trends" className="text-xs px-2 py-2">
              <Icons.LineChartIcon className="mr-1 h-3 w-3" /> Trends
            </TabsTrigger>
            <TabsTrigger value="tax-report" className="text-xs px-2 py-2">
              <Icons.FileTextIcon className="mr-1 h-3 w-3" /> Tax
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="spending-by-category" className="mt-6">
          <SpendingByCategoryReport timePeriod={selectedPeriod} isMobile={isMobile} />
        </TabsContent>
        <TabsContent value="income-analysis" className="mt-6">
          <IncomeAnalysisReport timePeriod={selectedPeriod} isMobile={isMobile} />
        </TabsContent>
        <TabsContent value="spending-trends" className="mt-6">
          <SpendingTrendsReport timePeriod={selectedPeriod} isMobile={isMobile} />
        </TabsContent>
        <TabsContent value="tax-report" className="mt-6">
          <TaxReport timePeriod={selectedPeriod} isMobile={isMobile} />
        </TabsContent>
      </Tabs>

      {/* Creative Bottom Section */}
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'gap-6 mt-8 md:grid-cols-1 lg:grid-cols-2'}`}>
        <NetWorthTrendReport timePeriod={selectedPeriod} isMobile={isMobile} />
        <GoalProgressReport timePeriod={selectedPeriod} isMobile={isMobile} />
      </div>
    </div>
  );
}
