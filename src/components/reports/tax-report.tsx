"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import type { TimePeriod } from "@/app/(app)/reports/page";
import { getPeriodLabel } from "@/lib/utils/date-utils";

interface TaxReportProps {
  timePeriod: TimePeriod;
}

export function TaxReport({ timePeriod }: TaxReportProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold flex items-center">
          <Icons.FileTextIcon className="mr-3 h-6 w-6 text-primary" />
          Tax Report
        </CardTitle>
        <CardDescription>Tax-related summary for the {getPeriodLabel(timePeriod).toLowerCase()}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col justify-center items-center h-[300px] space-y-4">
        <Icons.FileTextIcon className="h-16 w-16 text-muted-foreground" />
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-muted-foreground">Tax Report Coming Soon</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Comprehensive tax reporting features including deduction tracking, 
            tax-deductible expense categorization, and annual summaries will be available in a future update.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
