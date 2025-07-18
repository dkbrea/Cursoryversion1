import { RecurringManager } from "@/components/recurring/recurring-manager";
import { MinimalDatePickerTest } from "@/components/recurring/minimal-date-picker-test";
import { SimplifiedPrimaryDateField } from "@/components/recurring/simplified-primary-date-field";
import { RecordDialogDateTest } from "@/components/recurring/record-dialog-date-test";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recurring Items - Unbroken Pockets",
  description: "Manage your recurring income, subscriptions, and fixed expenses.",
};

export default function RecurringPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Recurring Items</h1>
      <p className="text-muted-foreground">
        Set up and track your regular income and expenses. Switch between list and calendar views.
      </p>
      
      {/* Temporary test components - remove after testing */}
      <div className="border-2 border-dashed border-yellow-300 bg-yellow-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">🧪 Mobile Date Picker Tests</h2>
        <p className="text-sm text-yellow-700 mb-4">
          Three test components to isolate the mobile date picker issue. Test all on mobile to see which work and identify the differences.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-yellow-200 rounded p-3">
            <h3 className="font-medium text-yellow-800 mb-2">Test 1: Minimal</h3>
            <MinimalDatePickerTest />
          </div>
          
          <div className="border border-yellow-200 rounded p-3">
            <h3 className="font-medium text-yellow-800 mb-2">Test 2: Add Dialog Style</h3>
            <SimplifiedPrimaryDateField />
          </div>
          
          <div className="border border-yellow-200 rounded p-3">
            <h3 className="font-medium text-yellow-800 mb-2">Test 3: Record Dialog Style</h3>
            <RecordDialogDateTest />
          </div>
        </div>
      </div>
      
      <RecurringManager />
    </div>
  );
}
