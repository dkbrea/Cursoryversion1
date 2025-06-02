"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";

export function TaxReport() {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold flex items-center">
            <Icons.FileTextIcon className="mr-3 h-6 w-6 text-primary" />
            Tax Report
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Tax reporting features are coming soon. This section will help you track tax-deductible expenses and generate reports for tax season.
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Planned Features:</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Track tax-deductible business expenses</li>
              <li>• Generate year-end tax summaries</li>
              <li>• Export data for tax software</li>
              <li>• Categorize income and expenses by tax category</li>
              <li>• Track charitable donations and other deductions</li>
            </ul>
          </div>

          {/* Placeholder for future chart or data */}
          <div className="mt-6 h-60 flex items-center justify-center border-2 border-dashed border-border rounded-md bg-muted/30">
              <div className="text-center space-y-2">
                <Icons.FileTextIcon className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">Tax Report Charts Coming Soon</p>
              </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
